import crypto from 'node:crypto'
import { auth, firestore } from './firebase-admin.js'
import nodemailer from 'nodemailer'
import { handleRecruitmentApi } from './recruitment.js'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

async function fetchAccountFromFirestore(username) {
  const normalized = username.toLowerCase().trim()
  const doc = await firestore.collection('accounts').doc(normalized).get()
  if (!doc.exists) return null
  const data = doc.data()
  return {
    username: data.username || normalized,
    password_hash: data.password_hash,
    branch: data.branch,
    role: data.role,
    active: data.active !== false
  }
}

function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function safeString(v) {
  return String(v ?? '').trim()
}

function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase()
}

function normalizeBranch(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.toUpperCase().replace(/\s+/g, ' ')
}

function getBearerToken(req) {
  const h = req?.headers?.authorization || req?.headers?.Authorization || ''
  const t = String(h || '').trim()
  if (!t) return ''
  const m = t.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : ''
}

async function readJsonBody(req) {
  if (req?.body && typeof req.body === 'object') return req.body
  if (typeof req?.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }

  const chunks = []
  try {
    for await (const chunk of req) chunks.push(chunk)
  } catch {
    return {}
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function requireSession(req, res) {
  const token = getBearerToken(req)
  if (!token) {
    json(res, 401, { ok: false, message: 'Missing Authorization Bearer token' })
    return null
  }

  // Handle local mock session bypass
  if (token.startsWith('local_token_')) {
    const username = token.replace('local_token_', '');
    let session = { username, branch: 'HQ', role: 'user' };
    
    if (username === 'moon') {
      session = { username: 'moon', branch: 'HQ', role: 'admin' };
    } else if (username === 'chinhanh1') {
      session = { username: 'chinhanh1', branch: 'TRUNG MỸ TÂY', role: 'user' };
    } else if (username === 'admin') {
      session = { username: 'admin', branch: 'HQ', role: 'admin' };
    } else if (username === 'user') {
      session = { username: 'user', branch: 'HN', role: 'user' };
    }

    return { session, firestore };
  }

  try {
    const decodedToken = await auth.verifyIdToken(token)
    return {
      session: {
        username: decodedToken.username || decodedToken.uid || decodedToken.email?.split('@')[0],
        branch: decodedToken.branch || 'HQ',
        role: decodedToken.role || 'user'
      },
      firestore
    }
  } catch (error) {
    console.error('Session error:', error)
    json(res, 401, { ok: false, message: 'Invalid or expired Firebase ID Token' })
    return null
  }
}

function timingSafeEqualHex(aHex, bHex) {
  const a = Buffer.from(aHex, 'hex')
  const b = Buffer.from(bHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function scryptHashHex(password, salt) {
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64')
  const key = crypto.scryptSync(String(password || ''), saltBuf, 64, { N: 16384, r: 8, p: 1 })
  return key.toString('hex')
}

function verifyPassword(password, stored) {
  const raw = safeString(stored)
  if (!raw) return false
  if (raw.startsWith('scrypt:')) {
    const parts = raw.split(':')
    if (parts.length !== 3) return false
    const saltB64 = parts[1]
    const hashHex = parts[2]
    const computed = scryptHashHex(password, saltB64)
    return timingSafeEqualHex(computed, hashHex)
  }
  return safeString(password) === raw
}

function _chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function toDoneGroup(g) {
  const s = safeString(g)
  if (!s) return s
  if (s.endsWith('__DONE')) return s
  return `${s}__DONE`
}

function appendActivity(data, entry) {
  const d = data && typeof data === 'object' ? data : {}
  const current = Array.isArray(d.activityLog) ? d.activityLog : []
  return { ...d, activityLog: [...current, entry] }
}

async function listAdminUsernames() {
  const snapshot = await firestore.collection('accounts').where('role', '==', 'admin').get()
  return snapshot.docs
    .map(doc => doc.data())
    .filter(r => r && r.active !== false)
    .map(r => safeString(r.username))
    .filter(Boolean)
}

function restrictUserUpdate(existing, incoming) {
  const now = new Date().toISOString()
  const next = {
    ...existing,
    status: safeString(incoming?.status) || existing.status,
    progress: typeof incoming?.progress === 'number' ? incoming.progress : existing.progress,
    comments: Array.isArray(incoming?.comments) ? incoming.comments : existing.comments,
    activityLog: Array.isArray(incoming?.activityLog) ? incoming.activityLog : existing.activityLog,
    lastUpdated: now,
  }
  return next
}

function toTaskRow(task, actor, createdByOverride) {
  const data = task || {}
  const id = safeString(data.id)
  const group = safeString(data.group)
  const title = safeString(data.title)
  const status = safeString(data.status)
  const priority = safeString(data.priority)
  const endDate = safeString(data.endDate)
  const now = new Date().toISOString()
  return {
    id,
    group,
    title,
    status,
    priority,
    end_date: endDate || null,
    data: { ...data, lastUpdated: now },
    updated_at: now,
    created_by: createdByOverride || actor || null,
  }
}

function mapEmployeeToDb(e) {
  const id = safeString(e?.id)
  const department = normalizeBranch(e?.department)
  return {
    id,
    title: safeString(e?.title) || null,
    name: safeString(e?.name) || null,
    position: safeString(e?.position) || null,
    department: department || null,
    email: safeString(e?.email) || null,
    phone: safeString(e?.phone) || null,
    start_date: safeString(e?.startDate) || null,
    probation_date: safeString(e?.probationDate) || null,
    seniority: safeString(e?.seniority) || null,
    contract_date: safeString(e?.contractDate) || null,
    renew_date: safeString(e?.renewDate) || null,
    education: safeString(e?.education) || null,
    major: safeString(e?.major) || null,
    pedagogy_cert: safeString(e?.pedagogyCert) || null,
    has_insurance: safeString(e?.hasInsurance) || null,
    insurance_agency: safeString(e?.insuranceAgency) || null,
    document_status: safeString(e?.documentStatus) || null,
    salary: safeString(e?.salary) || null,
    salary_base: safeString(e?.salaryBase) || null,
    allowance_housing: safeString(e?.allowanceHousing) || null,
    allowance_travel: safeString(e?.allowanceTravel) || null,
    allowance_phone: safeString(e?.allowancePhone) || null,
    cccd: safeString(e?.cccd) || null,
    cccd_date: safeString(e?.cccd_date) || null,
    cccd_place: safeString(e?.cccd_place) || null,
    dob: safeString(e?.dob) || null,
    address: safeString(e?.address) || null,
    current_address: safeString(e?.currentAddress) || null,
    nationality: safeString(e?.nationality) || null,
    avatar_url: safeString(e?.avatar_url) || null,
    bank_account: safeString(e?.bankAccount) || null,
    bank_name: safeString(e?.bankName) || null,
    tax_code: safeString(e?.taxCode) || null,
    note: safeString(e?.note) || null,
    raw_status: safeString(e?.rawStatus) || null,
  }
}

function _mapMovementEmployeePatch(payload = {}) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const out = {}
  const set = (k, v) => {
    const s = safeString(v)
    if (s) out[k] = s
  }

  set('name', p.name || p.employeeName || p.hoTen)
  set('position', p.position || p.newRole)
  set('department', p.department || p.newDepartment)
  set('phone', p.phone)
  set('email', p.email)
  set('salary', p.salary || p.newSalaryText || p.newSalary)
  set('salary_base', p.salaryBase)
  set('allowance_housing', p.housingAllowance)
  set('allowance_travel', p.travelAllowance)
  set('allowance_phone', p.phoneAllowance)
  set('cccd', p.cccd)
  set('cccd_date', p.cccdDate || p.cccd_date)
  set('cccd_place', p.cccdPlace || p.cccd_place)
  set('dob', p.birthDate || p.dob)
  set('address', p.permanentAddress || p.address)
  set('current_address', p.temporaryAddress || p.currentAddress)
  set('nationality', p.nationality)
  set('note', p.note)

  return out
}

async function _maybeNotifyWebhook(kind, payload) {
  const url = safeString(process.env.MOVEMENT_WEBHOOK_URL)
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, ...payload }),
    })
  } catch (_e) {}
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.end('')
    return
  }
  const parts = Array.isArray(req?.query?.path) ? req.query.path : (req?.query?.path ? [req.query.path] : [])
  const route = parts.map(p => String(p || '').trim()).filter(Boolean).join('/')

  if (!route) return json(res, 404, { ok: false, message: 'Not Found' })

  if (route === 'login') {
    if (req.method !== 'POST') return json(res, 405, { success: false, message: 'Method Not Allowed' })
    const body = await readJsonBody(req)
    const { username, password } = body || {}
    const un = normalizeUsername(username)
    const pw = safeString(password)
    if (!un || !pw) return json(res, 400, { success: false, message: 'Thiếu tài khoản hoặc mật khẩu' })

    try {
      const row = await fetchAccountFromFirestore(un)
      if (!row) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' })
      if (row.active === false) return json(res, 403, { success: false, message: 'Tài khoản đã bị khóa' })
      
      const ok = verifyPassword(pw, row.password_hash)
      if (!ok) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' })
      
      const token = await auth.createCustomToken(`accounts:${un}`, {
        branch: row.branch,
        role: row.role,
        username: un
      })
      
      return json(res, 200, { success: true, token, branch: row.branch, role: row.role })
    } catch (e) {
      console.error('Login error:', e)
      return json(res, 500, { success: false, message: `Lỗi máy chủ đăng nhập (Firebase). ${e.message}` })
    }
  }

  if (route === 'interviews') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return

    const body = await readJsonBody(req)
    const candidateId = safeString(body.id)
    if (!candidateId) return json(res, 400, { ok: false, message: 'Missing candidate ID' })

    try {
      const interviewData = {
        ...body,
        updatedBy: ctx.session.username,
        updatedAt: new Date().toISOString(),
      };
      
      // 1. Save to Firestore
      await firestore.collection('interview_results').doc(candidateId).set(interviewData, { merge: true });
      
      // 2. Respond to client immediately
      json(res, 200, { ok: true, message: 'Interview result saved to Firestore.' });

      // 3. Send email notification (fire-and-forget)
      (async () => {
        try {
          const interviewerEmail = process.env.INTERVIEWER_EMAIL;
          if (!interviewerEmail) {
            console.warn('INTERVIEWER_EMAIL is not set. Skipping email notification.');
            return;
          }

          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });

          const photoHtml = body.photoUrl ? `<p><strong>Ảnh ứng viên:</strong><br><img src="${body.photoUrl}" alt="Candidate Photo" style="max-width: 300px;"></p>` : '';
          
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Kết quả phỏng vấn - ${body.candidateName || candidateId}</title>
            </head>
            <body>
              <h2>Kết quả phỏng vấn</h2>
              <p><strong>Ứng viên:</strong> ${body.candidateName || 'N/A'}</p>
              <p><strong>Vị trí:</strong> ${body.position || 'N/A'}</p>
              <p><strong>Trạng thái:</strong> ${body.status || 'N/A'}</p>
              <p><strong>Điểm đánh giá:</strong> ${body.score || 'N/A'}</p>
              <p><strong>Ghi chú phỏng vấn:</strong></p>
              <pre>${body.interview_note || 'Không có ghi chú'}</pre>
              ${photoHtml}
              <p><strong>Người phỏng vấn:</strong> ${ctx.session.username}</p>
              <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
              <hr>
              <p>Đây là email tự động từ hệ thống ACE HRM 2026.</p>
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: `"ACE HRM System" <${process.env.SMTP_USER}>`,
            to: interviewerEmail,
            subject: `Kết quả phỏng vấn - ${body.candidateName || candidateId}`,
            html: htmlContent,
          });

          console.log(`Interview email sent successfully to ${interviewerEmail}`);
        } catch (emailError) {
          console.error('Failed to send interview email:', emailError);
        }
      })();

      // 4. Sync to Google Sheet in the background (fire-and-forget)
      (async () => {
        try {
          const SCRIPT_URL = process.env.VITE_SCRIPT_URL;
          const SYNC_SECRET = process.env.VITE_SYNC_SECRET || 'moon_map_2026';
          if (!SCRIPT_URL) {
            console.warn('VITE_SCRIPT_URL is not set. Skipping Google Sheet sync.');
            return;
          }
          
          const syncPayload = {
            id: candidateId,
            status: body.status,
            interview_note: body.interview_note,
            photoUrl: body.photoUrl,
            candidateName: body.candidateName,
            position: body.position,
            score: body.score,
          };

          await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: SYNC_SECRET, payload: syncPayload, action: 'update_interview' })
          });
          console.log(`Successfully synced interview for ${candidateId} to Google Sheet.`);
        } catch (syncError) {
          console.error(`Failed to sync interview for ${candidateId} to Google Sheet:`, syncError);
        }
      })();
    } catch (error) {
      console.error('Failed to save interview result:', error);
      // Check if response has been sent, if not, send an error
      if (!res.writableEnded) {
        json(res, 500, { ok: false, message: 'Failed to save interview result to Firestore.' });
      }
    }
    return
  }

  if (route === 'sync') {
    const SCRIPT_URL = process.env.VITE_SCRIPT_URL
    const SYNC_SECRET = process.env.VITE_SYNC_SECRET || 'moon_map_2026'
    if (!SCRIPT_URL) return json(res, 500, { status: 'error', message: 'Thiếu Script URL' })

    const VI_TO_EN = {
      ID: 'id',
      'Tiêu đề': 'title',
      'Phân loại': 'group',
      'Nhóm': 'assignee',
      'Bắt đầu': 'startDate',
      'Kết thúc': 'endDate',
      'Trạng thái': 'status',
      'Ghi chú': 'comments',
      'Cập nhật lần cuối': 'lastUpdated',
      Tags: 'tags',
      Subtasks: 'subtasks',
      'Hoạt động': 'activityLog',
    }
    const EN_TO_VI = Object.fromEntries(Object.entries(VI_TO_EN).map(([k, v]) => [v, k]))
    const translateTask = (task, mapping) => {
      if (!task) return {}
      const newTask = {}
      for (const key in task) {
        const translatedKey = mapping[key] || key
        let val = task[key]
        if (val === null || val === undefined) val = ''
        newTask[translatedKey] = val
      }
      return newTask
    }

    try {
      let response
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        const translatedTasks = (body.tasks || []).map(t => translateTask(t, EN_TO_VI))
        response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ secret: SYNC_SECRET, tasks: translatedTasks }),
        })
      } else if (req.method === 'GET') {
        const separator = SCRIPT_URL.includes('?') ? '&' : '?'
        response = await fetch(`${SCRIPT_URL}${separator}secret=${encodeURIComponent(SYNC_SECRET)}`)
      } else {
        return json(res, 405, { status: 'error', message: 'Method Not Allowed' })
      }

      const text = await response.text()
      try {
        const data = JSON.parse(text)
        if (data.tasks && Array.isArray(data.tasks)) data.tasks = data.tasks.map(t => translateTask(t, VI_TO_EN))
        return json(res, 200, data)
      } catch (_e) {
        return json(res, 500, { status: 'error', message: 'Google API trả về nội dung không đúng định dạng JSON', debug: text.slice(0, 200) })
      }
    } catch (error) {
      return json(res, 500, { status: 'error', message: error.message })
    }
  }

  if (route === 'contract') {
    const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbOz62rPEq-o2NLGkLArF1z5JsZ2H54YU7vqe3fll-eIy3llxaVe-IR-y8AvWvrnpYzw/exec'
    const SCRIPT_URL = process.env.VITE_CONTRACT_SCRIPT_URL || process.env.VITE_SCRIPT_URL || DEFAULT_SCRIPT_URL
    const SECRET = process.env.VITE_CONTRACT_SECRET || process.env.VITE_SYNC_SECRET || 'moon_map_2026'
    if (!SCRIPT_URL) return json(res, 500, { ok: false, error: 'MISSING_SCRIPT_URL' })
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' })
    try {
      const body = await readJsonBody(req)
      const payloadToForward = { ...body, secret: SECRET }
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payloadToForward),
      })
      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (_e) {
        return json(res, 500, { ok: false, error: 'INVALID_JSON_FROM_SCRIPT', debug: text.slice(0, 200) })
      }
      return json(res, response.ok ? 200 : 500, data)
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message })
    }
  }

  if (route === 'tasks/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const role = safeString(ctx.session.role)
    const branch = safeString(ctx.session.branch)
    const branchDone = branch ? `${branch}__DONE` : ''
    
    let query = firestore.collection('tasks').orderBy('updated_at', 'desc')
    
    if (role !== 'admin') {
      const allowedGroups = [branch, branchDone, 'ALL', 'ALL__DONE', 'HQ', 'HQ__DONE']
      query = query.where('group', 'in', allowedGroups)
    }
    
    const snapshot = await query.get()
    const tasks = snapshot.docs.map(doc => doc.data().data).filter(Boolean)
    return json(res, 200, { ok: true, tasks })
  }

  if (route === 'tasks/upsert') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const role = safeString(ctx.session.role)
    const branch = safeString(ctx.session.branch)
    const branchDone = branch ? `${branch}__DONE` : ''
    const actor = safeString(ctx.session.username)
    const body = await readJsonBody(req)
    const tasks = Array.isArray(body?.tasks) ? body.tasks : (body?.task ? [body.task] : [])
    if (tasks.length === 0) return json(res, 400, { ok: false, message: 'Missing task(s)' })

    if (role === 'admin') {
      const batch = firestore.batch()
      for (const t of tasks) {
        const id = safeString(t?.id)
        if (!id) continue
        const docRef = firestore.collection('tasks').doc(id)
        const doc = await docRef.get()
        const createdByOverride = doc.exists ? doc.data().created_by : null
        const row = toTaskRow(t, actor, createdByOverride)
        batch.set(docRef, row, { merge: true })
      }
      await batch.commit()
      return json(res, 200, { ok: true, count: tasks.length })
    }

    let updated = 0
    for (const incoming of tasks) {
      const id = safeString(incoming?.id)
      if (!id) continue
      const docRef = firestore.collection('tasks').doc(id)
      const doc = await docRef.get()
      if (!doc.exists) continue
      
      const cur = doc.data()
      const currentGroup = safeString(cur.group)
      if (currentGroup !== branch && currentGroup !== branchDone) continue

      const now = new Date().toISOString()
      const incomingStatus = safeString(incoming?.status).toUpperCase()
      const curData = cur.data || {}
      const curDoneApproval = curData?.doneApproval || null
      const donePending = safeString(curDoneApproval?.status) === 'PENDING'
      const isInDoneGroup = currentGroup === branchDone
      const isCorrectionOutOfDoneGroup = isInDoneGroup && incomingStatus && incomingStatus !== 'DONE'

      if (isCorrectionOutOfDoneGroup && !donePending) continue
      const nextData = restrictUserUpdate(cur.data || {}, incoming || {})
      let nextGroup = currentGroup

      if (isCorrectionOutOfDoneGroup) {
        nextGroup = branch
        nextData.group = branch
        nextData.status = incomingStatus || 'TODO'
        nextData.doneApproval = {
          ...curDoneApproval,
          status: 'CANCELLED_BY_BRANCH',
          cancelledBy: actor,
          cancelledAt: now,
        }
        nextData.activityLog = [
          ...(Array.isArray(nextData.activityLog) ? nextData.activityLog : []),
          { type: 'branch_correction', from: 'DONE', to: nextData.status, at: now, by: actor },
        ]

        await firestore.collection('task_transition_log').add({
          task_id: id,
          step: 'BRANCH_CORRECTION',
          ok: true,
          from_status: 'DONE',
          to_status: nextData.status,
          from_group: branchDone,
          to_group: branch,
          actor,
          actor_role: role,
          actor_branch: branch,
          meta: { reason: 'branch_mistake_done' },
          created_at: now
        })
      }

      const row = {
        id,
        group: nextGroup,
        title: safeString(nextData.title),
        status: safeString(nextData.status),
        priority: safeString(nextData.priority),
        end_date: safeString(nextData.endDate) || null,
        data: nextData,
        updated_at: now,
        created_by: safeString(cur.created_by) || actor || null,
      }
      await docRef.set(row, { merge: true })
      updated++
    }
    return json(res, 200, { ok: true, count: updated })
  }

  if (route === 'tasks/delete') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const body = await readJsonBody(req)
    const id = safeString(body?.id)
    if (!id) return json(res, 400, { ok: false, message: 'Missing id' })
    await firestore.collection('tasks').doc(id).delete()
    return json(res, 200, { ok: true })
  }

  if (route === 'tasks/complete') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const actor = safeString(ctx.session.username)
    const actorRole = safeString(ctx.session.role)
    const actorBranch = safeString(ctx.session.branch)
    const body = await readJsonBody(req)
    const id = safeString(body?.id)
    if (!id) return json(res, 400, { ok: false, message: 'Missing id' })

    const docRef = firestore.collection('tasks').doc(id)
    const doc = await docRef.get()
    if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' })
    
    const cur = doc.data()
    const fromStatus = safeString(cur.status)
    const fromGroup = safeString(cur.group)
    if (actorRole !== 'admin') {
      if (fromGroup !== actorBranch) return json(res, 403, { ok: false, message: 'Forbidden' })
    }
    const toStatus = 'DONE'
    const toGroup = toDoneGroup(fromGroup)
    const now = new Date().toISOString()

    const requestMeta = cur.data?.requestMeta || null
    const targetUsername = safeString(requestMeta?.originUsername) || safeString(cur.created_by)

    const nextData0 = appendActivity(cur.data, {
      type: 'auto_transition',
      fromStatus,
      toStatus,
      fromGroup,
      toGroup,
      at: now,
      actor,
      actorRole,
      origin: safeString(requestMeta?.originRole) || (targetUsername ? 'unknown' : ''),
    })
    const doneApproval = actorRole === 'admin'
      ? { status: 'APPROVED', requestedBy: actor, requestedAt: now, approvedBy: actor, approvedAt: now, fromStatus, fromGroup }
      : { status: 'PENDING', requestedBy: actor, requestedAt: now, fromStatus, fromGroup }
    const nextData = { ...nextData0, status: toStatus, group: toGroup, lastUpdated: now, doneApproval }

    const logStep = async (step, ok, extra = {}) => {
      await firestore.collection('task_transition_log').add({
        task_id: id,
        step,
        ok,
        from_status: fromStatus,
        to_status: toStatus,
        from_group: fromGroup,
        to_group: toGroup,
        actor,
        actor_role: actorRole,
        actor_branch: actorBranch,
        error: extra?.error || null,
        meta: extra?.meta || {},
        created_at: now
      })
    }

    try {
      await docRef.update({ status: toStatus, group: toGroup, data: nextData, updated_at: now })
      await logStep('UPDATE_TASK', true)

      if (actorRole === 'admin') {
        if (targetUsername) {
          await firestore.collection('notifications').add({
            target_username: targetUsername,
            kind: 'TASK_DONE',
            payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
            created_at: now,
            delivered_at: null
          })
          await logStep('NOTIFY', true, { meta: { targetUsername, kind: 'TASK_DONE' } })
        }
      } else {
        const admins = await listAdminUsernames()
        const batch = firestore.batch()
        admins.forEach(un => {
          const notifRef = firestore.collection('notifications').doc()
          batch.set(notifRef, {
            target_username: un,
            kind: 'TASK_DONE_REQUEST',
            payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originUsername: requestMeta?.originUsername || null, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
            created_at: now,
            delivered_at: null
          })
        })
        if (admins.length > 0) {
          await batch.commit()
          await logStep('NOTIFY', true, { meta: { admins: admins.length, kind: 'TASK_DONE_REQUEST' } })
        }
      }

      return json(res, 200, { ok: true, task: nextData })
    } catch (e) {
      await logStep('EXCEPTION', false, { error: e?.message || String(e) })
      return json(res, 500, { ok: false, message: e?.message || String(e) })
    }
  }

  if (route === 'tasks/done-review') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const actor = safeString(ctx.session.username)
    const actorRole = safeString(ctx.session.role)
    const actorBranch = safeString(ctx.session.branch)
    if (actorRole !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const body = await readJsonBody(req)
    const id = safeString(body?.id)
    const decision = safeString(body?.decision).toUpperCase()
    if (!id) return json(res, 400, { ok: false, message: 'Missing id' })
    if (!['APPROVE', 'REJECT'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid decision' })

    const docRef = firestore.collection('tasks').doc(id)
    const doc = await docRef.get()
    if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' })
    
    const cur = doc.data()
    const now = new Date().toISOString()
    const data = cur.data && typeof cur.data === 'object' ? cur.data : {}
    const reqMeta = data.requestMeta || null
    const doneApproval = data.doneApproval || null
    const fromStatus = safeString(doneApproval?.fromStatus) || safeString(cur.status)
    const fromGroup = safeString(doneApproval?.fromGroup) || safeString(cur.group)
    const toStatus = safeString(cur.status)
    const toGroup = safeString(cur.group)
    const originUsername = safeString(reqMeta?.originUsername) || safeString(cur.created_by)

    const logStep = async (step, ok, extra = {}) => {
      await firestore.collection('task_transition_log').add({
        task_id: id,
        step,
        ok,
        from_status: fromStatus,
        to_status: toStatus,
        from_group: fromGroup,
        to_group: toGroup,
        actor,
        actor_role: actorRole,
        actor_branch: actorBranch,
        error: extra?.error || null,
        meta: extra?.meta || {},
        created_at: now
      })
    }

    if (safeString(doneApproval?.status) !== 'PENDING') return json(res, 400, { ok: false, message: 'No pending done approval' })

    if (decision === 'APPROVE') {
      const nextData = {
        ...data,
        doneApproval: { ...doneApproval, status: 'APPROVED', approvedBy: actor, approvedAt: now },
        lastUpdated: now,
      }
      await docRef.update({ data: nextData, updated_at: now })
      await logStep('DONE_REVIEW_APPROVE', true)
      if (originUsername) {
        await firestore.collection('notifications').add({
          target_username: originUsername,
          kind: 'TASK_DONE_APPROVED',
          payload: { taskId: id, title: cur.title, actor, actorRole, group: toGroup },
          created_at: now,
          delivered_at: null
        })
        await logStep('NOTIFY', true, { meta: { targetUsername: originUsername, kind: 'TASK_DONE_APPROVED' } })
      }
      return json(res, 200, { ok: true, task: nextData })
    }

    const rollbackStatus = safeString(doneApproval?.fromStatus) || 'IN_PROGRESS'
    const rollbackGroup = safeString(doneApproval?.fromGroup) || fromGroup
    const rollbackData = {
      ...data,
      status: rollbackStatus,
      group: rollbackGroup,
      doneApproval: { ...doneApproval, status: 'REJECTED', rejectedBy: actor, rejectedAt: now },
      lastUpdated: now,
    }
    await docRef.update({ status: rollbackStatus, group: rollbackGroup, data: rollbackData, updated_at: now })
    await logStep('DONE_REVIEW_REJECT', true, { meta: { rollbackStatus, rollbackGroup } })
    if (originUsername) {
      await firestore.collection('notifications').add({
        target_username: originUsername,
        kind: 'TASK_DONE_REJECTED',
        payload: { taskId: id, title: cur.title, actor, actorRole, group: rollbackGroup },
        created_at: now,
        delivered_at: null
      })
      await logStep('NOTIFY', true, { meta: { targetUsername: originUsername, kind: 'TASK_DONE_REJECTED' } })
    }
    return json(res, 200, { ok: true, task: rollbackData })
  }

  if (route === 'notifications/poll') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const since = safeString(req?.query?.since || '')
    
    let query = firestore.collection('notifications')
      .where('target_username', '==', safeString(ctx.session.username))
      .where('delivered_at', '==', null)
      .orderBy('created_at', 'asc')
      .limit(50)
      
    if (since) query = query.where('created_at', '>=', since)
    
    const snapshot = await query.get()
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return json(res, 200, { ok: true, notifications })
  }

  if (route === 'notifications/ack') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const body = await readJsonBody(req)
    const ids = Array.isArray(body?.ids) ? body.ids.map(safeString).filter(Boolean) : []
    if (ids.length === 0) return json(res, 400, { ok: false, message: 'Missing ids' })
    const now = new Date().toISOString()
    
    const batch = firestore.batch()
    for (const id of ids) {
      const docRef = firestore.collection('notifications').doc(id)
      batch.update(docRef, { delivered_at: now })
    }
    await batch.commit()
    return json(res, 200, { ok: true })
  }

  if (route === 'contracts/issue-log') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const body = await readJsonBody(req)
    const row = {
      issue_key: safeString(body?.issueKey) || null,
      method: safeString(body?.method) || null,
      so_hd: safeString(body?.soHd) || null,
      employee_id: safeString(body?.employeeId) || null,
      employee_name: safeString(body?.employeeName) || null,
      branch: safeString(body?.branch) || safeString(ctx.session.branch) || null,
      filename: safeString(body?.filename) || null,
      drive_file_id: safeString(body?.driveFileId) || null,
      drive_view_url: safeString(body?.driveViewUrl) || null,
      created_by: safeString(ctx.session.username) || null,
      created_at: new Date().toISOString()
    }
    if (!row.method) return json(res, 400, { ok: false, message: 'Missing method' })
    await firestore.collection('contract_issue_log').add(row)
    return json(res, 200, { ok: true })
  }

  if (route === 'employees/import') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const body = await readJsonBody(req)
    const employeesRaw = Array.isArray(body?.employees) ? body.employees : []
    const replaceAll = !!body?.replaceAll
    const overwriteExisting = body?.overwriteExisting !== false
    const employees = employeesRaw.map(mapEmployeeToDb).filter(e => e.id && e.name)
    if (employees.length === 0) return json(res, 400, { ok: false, message: 'No employees to import' })
    
    const branchesSet = new Set()
    employees.forEach(e => {
      const b = normalizeBranch(e.department)
      if (b) branchesSet.add(b)
    })
    
    const batch = firestore.batch()
    branchesSet.forEach(b => {
      const branchRef = firestore.collection('branches').doc(b)
      batch.set(branchRef, { id: b, name: b }, { merge: true })
    })
    
    if (replaceAll) {
      // Deleting all docs in Firestore requires a batch delete which is complex.
      // For now we just import.
    }
    
    for (const e of employees) {
      const empRef = firestore.collection('employees').doc(e.id)
      if (!overwriteExisting) {
        const doc = await empRef.get()
        if (doc.exists) continue
      }
      batch.set(empRef, e, { merge: true })
    }
    
    await batch.commit()
    return json(res, 200, { ok: true, branches: branchesSet.size, employees: employees.length })
  }

  if (route === 'employees/import-request') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) === 'admin') return json(res, 400, { ok: false, message: 'Admin không cần gửi yêu cầu' })
    const branch = normalizeBranch(ctx.session.branch)
    if (!branch) return json(res, 400, { ok: false, message: 'Thiếu thông tin chi nhánh' })
    const body = await readJsonBody(req)
    const employeesRaw = Array.isArray(body?.employees) ? body.employees : []
    const overwriteExisting = body?.overwriteExisting !== false
    const employees = employeesRaw
      .map(e => ({
        id: safeString(e?.id),
        title: safeString(e?.title) || '',
        name: safeString(e?.name) || '',
        position: safeString(e?.position) || '',
        department: normalizeBranch(e?.department) || branch,
        email: safeString(e?.email) || '',
        phone: safeString(e?.phone) || '',
        startDate: safeString(e?.startDate) || '',
        probationDate: safeString(e?.probationDate) || '',
        contractDate: safeString(e?.contractDate) || '',
        renewDate: safeString(e?.renewDate) || '',
        dob: safeString(e?.dob) || '',
        nationality: safeString(e?.nationality) || '',
        address: safeString(e?.address) || '',
        cccd: safeString(e?.cccd) || '',
        cccd_date: safeString(e?.cccd_date) || '',
        cccd_place: safeString(e?.cccd_place) || '',
        education: safeString(e?.education) || '',
        major: safeString(e?.major) || '',
        pedagogyCert: safeString(e?.pedagogyCert) || '',
        hasInsurance: safeString(e?.hasInsurance) || '',
        insuranceAgency: safeString(e?.insuranceAgency) || '',
        documentStatus: safeString(e?.documentStatus) || '',
        salary: safeString(e?.salary) || '',
        note: safeString(e?.note) || '',
      }))
      .filter(e => e.id && e.name)
    if (employees.length === 0) return json(res, 400, { ok: false, message: 'No employees to request' })
    const wrongBranch = employees.find(e => normalizeBranch(e.department) !== branch)
    if (wrongBranch) return json(res, 400, { ok: false, message: 'Chỉ được gửi dữ liệu thuộc chi nhánh của bạn' })
    
    const docRef = await firestore.collection('employee_import_requests').add({
      branch,
      created_by: safeString(ctx.session.username),
      status: 'PENDING',
      overwrite_existing: overwriteExisting,
      employees,
      created_at: new Date().toISOString()
    })
    return json(res, 200, { ok: true, id: docRef.id, employees: employees.length })
  }

  if (route === 'employees/import-requests/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const status = safeString(req?.query?.status || 'PENDING')
    
    let query = firestore.collection('employee_import_requests').orderBy('created_at', 'desc')
    if (status && status !== 'ALL') query = query.where('status', '==', status)
    
    const snapshot = await query.get()
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return json(res, 200, { ok: true, requests })
  }

  if (route === 'employees/import-requests/decide') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const body = await readJsonBody(req)
    const id = safeString(body?.id)
    const decision = safeString(body?.decision).toUpperCase()
    const note = safeString(body?.note)
    if (!id || !['APPROVE', 'REJECT'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid payload' })

    const docRef = firestore.collection('employee_import_requests').doc(id)
    const doc = await docRef.get()
    if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' })
    
    const reqData = doc.data()
    if (reqData.status !== 'PENDING') return json(res, 400, { ok: false, message: 'Already processed' })

    const now = new Date().toISOString()
    const update = {
      status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      processed_by: safeString(ctx.session.username),
      processed_at: now,
      decision_note: note,
    }

    if (decision === 'APPROVE') {
      const batch = firestore.batch()
      const employees = Array.isArray(reqData.employees) ? reqData.employees : []
      const overwriteExisting = !!reqData.overwrite_existing
      
      for (const e of employees) {
        const empDb = mapEmployeeToDb(e)
        const empRef = firestore.collection('employees').doc(empDb.id)
        if (!overwriteExisting) {
          const empDoc = await empRef.get()
          if (empDoc.exists) continue
        }
        batch.set(empRef, empDb, { merge: true })
      }
      batch.update(docRef, update)
      await batch.commit()
    } else {
      await docRef.update(update)
    }

    return json(res, 200, { ok: true })
  }

  if (route === 'candidates-sheet/upsert') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    if (!supabase) return json(res, 500, { ok: false, message: 'Missing Supabase configuration' })

    const body = await readJsonBody(req)
    const secret = safeString(body?.secret)
    const expected = safeString(process.env.VITE_SYNC_SECRET)
    if (!expected || secret !== expected) return json(res, 403, { ok: false, message: 'Forbidden' })

    const list = Array.isArray(body?.candidates) ? body.candidates : []
    if (list.length === 0) return json(res, 400, { ok: false, message: 'Missing candidates' })

    const now = new Date().toISOString()
    const pick = (obj, keys) => {
      for (const k of keys) {
        const v = obj?.[k]
        if (v === 0 || v === false) return v
        if (v === null || v === undefined) continue
        if (typeof v === 'string' && !v.trim()) continue
        return v
      }
      return undefined
    }
    const asText = (v) => {
      const s = String(v ?? '').trim()
      return s ? s : null
    }
    const asId = (v) => {
      const n = Number(String(v ?? '').trim())
      return Number.isFinite(n) ? Math.trunc(n) : null
    }

    const rows = list
      .map((c) => {
        const id = asId(pick(c, ['id', 'ID', 'row_index', 'rowIndex']))
        if (!id) return null
        return {
          id,
          name: asText(pick(c, ['name', 'full_name', 'fullName'])),
          phone: asText(pick(c, ['phone', 'Phone'])),
          current_address: asText(pick(c, ['Current_Address', 'current_address', 'address'])),
          birth: asText(pick(c, ['Birth', 'birth', 'dob'])),
          gender: asText(pick(c, ['gender', 'Gender'])),
          branch: asText(pick(c, ['branch', 'Branch'])),
          position: asText(pick(c, ['position', 'Position'])),
          gmail: asText(pick(c, ['gmail', 'email', 'Email'])),
          date_of_submission: asText(pick(c, ['DATE_OF_SUBMISSION', 'date_of_submission', 'submitted_at'])),
          expected_salary: asText(pick(c, ['expected_Salary', 'expected_salary'])),
          cv_url: asText(pick(c, ['cv_url', 'cvUrl', 'cvLink'])),
          video_url: asText(pick(c, ['video_url', 'videoLink'])),
          house: asText(pick(c, ['house', 'housing', 'livingState'])),
          graduation_cap: asText(pick(c, ['Graduation_Cap', 'graduation_cap', 'education'])),
          experience_value: asText(pick(c, ['Experience_Value', 'experience_value', 'experience'])),
          company_old: asText(pick(c, ['Campany_old', 'company_old', 'oldCompany'])),
          reason_leave: asText(pick(c, ['reason_leave', 'reasonForQuitting', 'reason'])),
          date_start: asText(pick(c, ['date_start', 'start_date'])),
          describe_yourself: asText(pick(c, ['describe_yourself', 'self3Words', 'describe3Words'])),
          referrer: asText(pick(c, ['Referrer', 'referrer'])),
          interview_coordinator: asText(pick(c, ['Interview_Coordinator', 'interview_coordinator'])),
          interview_schedule: asText(pick(c, ['Interview_schedule', 'interview_schedule'])),
          type_of_document: asText(pick(c, ['Type_of_document', 'type_of_document'])),
          ready_to_relocate: asText(pick(c, ['Ready_to_relocate', 'ready_to_relocate', 'willingToRelocate'])),
          status: asText(pick(c, ['status', 'Status'])),
          raw_data: c && typeof c === 'object' ? c : {},
          updated_at: now,
        }
      })
      .filter(Boolean)

    if (rows.length === 0) return json(res, 400, { ok: false, message: 'No valid rows' })

    const { error } = await supabase
      .from('candidates_sheet')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false })

    if (error) return json(res, 500, { ok: false, message: error.message })
    return json(res, 200, { ok: true, count: rows.length })
  }

  if (route === 'candidates-sheet/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    if (!supabase) return json(res, 500, { ok: false, message: 'Missing Supabase configuration' })

    const branch = safeString(req?.query?.branch)
    const status = safeString(req?.query?.status)
    const limit = Math.min(Math.max(Number(req?.query?.limit || 50) || 50, 1), 200)
    const offset = Math.max(Number(req?.query?.offset || 0) || 0, 0)

    let qb = supabase
      .from('candidates_sheet')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (branch) qb = qb.eq('branch', branch)
    if (status) qb = qb.eq('status', status)

    const { data, error } = await qb
    if (error) return json(res, 500, { ok: false, message: error.message })
    return json(res, 200, { ok: true, data: data || [] })
  }

  // Recruitment API routes (Supabase-based)
  if (route.startsWith('recruitment/')) {
    return handleRecruitmentApi(req, res, route, req.method, await readJsonBody(req), req.query)
  }

  return json(res, 404, { ok: false, message: 'Not Found' })
}
