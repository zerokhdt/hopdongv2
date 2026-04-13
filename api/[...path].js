import crypto from 'node:crypto'
import { db, auth } from './firebase-admin.js'

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

function getAdminFirebaseOrNull() {
  if (!db) return null
  return { db, auth }
}

async function requireSession(req, res) {
  const cfg = getAdminFirebaseOrNull()
  if (!cfg) {
    json(res, 500, { ok: false, message: 'Missing env: FIREBASE_SERVICE_ACCOUNT' })
    return null
  }
  const token = getBearerToken(req)
  if (!token) {
    json(res, 401, { ok: false, message: 'Missing Authorization Bearer token' })
    return null
  }

  try {
    const sessionDoc = await cfg.db.collection('app_sessions').doc(token).get()
    if (!sessionDoc.exists) {
      json(res, 401, { ok: false, message: 'Session expired. Please login again.' })
      return null
    }
    const session = sessionDoc.data()
    if (session.expires_at && Date.parse(session.expires_at) < Date.now()) {
      json(res, 401, { ok: false, message: 'Session expired. Please login again.' })
      return null
    }
    return { ...cfg, session }
  } catch (error) {
    json(res, 500, { ok: false, message: `Session lookup failed: ${error.message}` })
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
  // Plaintext fallback removed for security — all accounts must use scrypt hash
  console.warn('[auth] Account has unencrypted password, rejecting for security. Run hash:password script to migrate.')
  return false
}

function readLocalAccounts() {
  const raw = safeString(process.env.APP_ACCOUNTS_JSON)
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function upsertSession({ db, token, username, role, branch }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.collection('app_sessions').doc(token).set({
    token,
    username,
    role,
    branch,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  })
}

async function fetchFirstAccount({ db, username }) {
  const doc = await db.collection('accounts').doc(username).get()
  return doc.exists ? doc.data() : null
}

function chunk(arr, size) {
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

async function listAdminUsernames(db) {
  const snapshot = await db.collection('accounts')
    .where('role', '==', 'admin')
    .limit(200)
    .get()
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

function mapMovementEmployeePatch(payload = {}) {
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

async function maybeNotifyWebhook(kind, payload) {
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

    const cfg = getAdminFirebaseOrNull()
    try {
      if (cfg) {
        const row = await fetchFirstAccount({ db: cfg.db, username: un })
        if (!row) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' })
        if (row.active === false) return json(res, 403, { success: false, message: 'Tài khoản đã bị khóa' })
        const ok = verifyPassword(pw, row.password_hash)
        if (!ok) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' })
        const token = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now())
        await upsertSession({ db: cfg.db, token, username: un, role: row.role, branch: row.branch })
        return json(res, 200, { success: true, token, branch: row.branch, role: row.role })
      }
      const users = readLocalAccounts()
      if (users.length === 0) {
        return json(res, 500, { success: false, message: 'Chưa cấu hình FIREBASE_SERVICE_ACCOUNT hoặc APP_ACCOUNTS_JSON' })
      }
      const user = users.find(u => normalizeUsername(u?.username) === un && safeString(u?.password) === pw)
      if (!user) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' })
      const token = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now())
      return json(res, 200, { success: true, token, branch: user.branch, role: user.role || 'user' })
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'unknown'
      const short = msg.length > 220 ? msg.slice(0, 220) + '…' : msg
      return json(res, 500, { success: false, message: `Lỗi máy chủ đăng nhập (Firebase). ${short}` })
    }
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
      const { templateDocId, outputFolderId, outputName, placeholders, documents, emailTo, emailSubject, emailBody } = body || {}
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ secret: SECRET, templateDocId, outputFolderId, outputName, placeholders, documents, emailTo, emailSubject, emailBody }),
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
    let q = ctx.db.collection('tasks').orderBy('updated_at', 'desc')
    if (role !== 'admin') {
      const allDone = 'ALL__DONE'
      const hqDone = 'HQ__DONE'
      const allowedGroups = [branch, branchDone, 'ALL', allDone, 'HQ', hqDone].filter(Boolean)
      q = q.where('group', 'in', allowedGroups)
    }
    const snapshot = await q.get()
    const tasks = snapshot.docs.map(doc => doc.data()?.data).filter(Boolean)
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
      const ids = tasks.map(t => safeString(t?.id)).filter(Boolean)
      const createdByMap = new Map()
      for (const part of chunk(ids, 10)) { // Firestore in query limit is 10 or 30 depending on version, but here we can just use doc().get()
        const promises = part.map(id => ctx.db.collection('tasks').doc(id).get())
        const snapshots = await Promise.all(promises)
        snapshots.forEach(doc => {
          if (doc.exists) {
            const data = doc.data()
            createdByMap.set(doc.id, safeString(data.created_by))
          }
        })
      }
      const rows = tasks
        .map(t => {
          const id = safeString(t?.id)
          const row = toTaskRow(t, actor, createdByMap.get(id) || null)
          return row
        })
        .filter(r => r.id)
      if (rows.length === 0) return json(res, 400, { ok: false, message: 'Invalid task(s)' })
      
      const batch = ctx.db.batch()
      rows.forEach(row => {
        const ref = ctx.db.collection('tasks').doc(row.id)
        batch.set(ref, row)
      })
      await batch.commit()
      return json(res, 200, { ok: true, count: rows.length })
    }

    let updated = 0
    for (const incoming of tasks) {
      const id = safeString(incoming?.id)
      if (!id) continue
      const doc = await ctx.db.collection('tasks').doc(id).get()
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

        try {
          await ctx.db.collection('task_transition_log').add({
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
        } catch (_e) {}
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
      await ctx.db.collection('tasks').doc(id).set(row)
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
    await ctx.db.collection('tasks').doc(id).delete()
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

    const doc = await ctx.db.collection('tasks').doc(id).get()
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
      await ctx.db.collection('task_transition_log').add({
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
      await ctx.db.collection('tasks').doc(id).update({
        status: toStatus,
        group: toGroup,
        data: nextData,
        updated_at: now
      })
      await logStep('UPDATE_TASK', true)

      if (actorRole === 'admin') {
        if (targetUsername) {
          try {
            await ctx.db.collection('app_notifications').add({
              target_username: targetUsername,
              kind: 'TASK_DONE',
              payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
              created_at: now
            })
          } catch (error) {
            await logStep('NOTIFY', false, { error: error.message })
            await ctx.db.collection('tasks').doc(id).update({ status: fromStatus || null, group: fromGroup, data: cur.data, updated_at: now })
            await logStep('ROLLBACK', true)
            return json(res, 500, { ok: false, message: error.message })
          }
          await logStep('NOTIFY', true, { meta: { targetUsername, kind: 'TASK_DONE' } })
        }
      } else {
        const admins = await listAdminUsernames(ctx.db)
        const rows = admins.map(un => ({
          target_username: un,
          kind: 'TASK_DONE_REQUEST',
          payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originUsername: requestMeta?.originUsername || null, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
          created_at: now
        }))
        if (rows.length > 0) {
          try {
            const batch = ctx.db.batch()
            rows.forEach(row => {
              const ref = ctx.db.collection('app_notifications').doc()
              batch.set(ref, row)
            })
            await batch.commit()
          } catch (error) {
            await logStep('NOTIFY', false, { error: error.message })
            await ctx.db.collection('tasks').doc(id).update({ status: fromStatus || null, group: fromGroup, data: cur.data, updated_at: now })
            await logStep('ROLLBACK', true)
            return json(res, 500, { ok: false, message: error.message })
          }
          await logStep('NOTIFY', true, { meta: { admins: rows.length, kind: 'TASK_DONE_REQUEST' } })
        }
      }

      return json(res, 200, { ok: true, task: nextData || null })
    } catch (e) {
      try { await logStep('EXCEPTION', false, { error: e?.message || String(e) }) } catch (_e) {}
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

    const doc = await ctx.db.collection('tasks').doc(id).get()
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
      await ctx.db.collection('task_transition_log').add({
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
      await ctx.db.collection('tasks').doc(id).update({ data: nextData, updated_at: now })
      await logStep('DONE_REVIEW_APPROVE', true)
      if (originUsername) {
        try {
          await ctx.db.collection('app_notifications').add({
            target_username: originUsername,
            kind: 'TASK_DONE_APPROVED',
            payload: { taskId: id, title: cur.title, actor, actorRole, group: toGroup },
            created_at: now
          })
        } catch (error) {
          await logStep('NOTIFY', false, { error: error.message })
        }
      }
      return json(res, 200, { ok: true, task: nextData || null })
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
    await ctx.db.collection('tasks').doc(id).update({ status: rollbackStatus, group: rollbackGroup, data: rollbackData, updated_at: now })
    await logStep('DONE_REVIEW_REJECT', true, { meta: { rollbackStatus, rollbackGroup } })
    if (originUsername) {
      try {
        await ctx.db.collection('app_notifications').add({
          target_username: originUsername,
          kind: 'TASK_DONE_REJECTED',
          payload: { taskId: id, title: cur.title, actor, actorRole, group: rollbackGroup },
          created_at: now
        })
      } catch (error) {
        await logStep('NOTIFY', false, { error: error.message })
      }
    }
    return json(res, 200, { ok: true, task: rollbackData || null })
  }

  if (route === 'notifications/poll') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const since = safeString(req?.query?.since || '')
    let q = ctx.db.collection('app_notifications')
      .where('target_username', '==', safeString(ctx.session.username))
      .where('delivered_at', '==', null)
      .orderBy('created_at', 'asc')
      .limit(50)
    if (since) q = q.where('created_at', '>=', since)
    const snapshot = await q.get()
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
    const batch = ctx.db.batch()
    ids.forEach(id => {
      const ref = ctx.db.collection('app_notifications').doc(id)
      batch.update(ref, { delivered_at: now })
    })
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
    await ctx.db.collection('contract_issue_log').add(row)
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
    const branches = Array.from(branchesSet).map(b => ({ id: b, name: b }))
    if (branches.length > 0) {
      const batch = ctx.db.batch()
      branches.forEach(b => {
        const ref = ctx.db.collection('branches').doc(b.id)
        batch.set(ref, b)
      })
      await batch.commit()
    }
    if (replaceAll) {
      const snapshot = await ctx.db.collection('employees').get()
      const batch = ctx.db.batch()
      snapshot.docs.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
    }
    let toUpsert = employees
    if (!replaceAll && !overwriteExisting) {
      const existingIds = new Set()
      const ids = employees.map(e => e.id)
      for (const idsChunk of chunk(ids, 10)) {
        const promises = idsChunk.map(id => ctx.db.collection('employees').doc(id).get())
        const snapshots = await Promise.all(promises)
        snapshots.forEach(doc => { if (doc.exists) existingIds.add(doc.id) })
      }
      toUpsert = employees.filter(e => !existingIds.has(e.id))
      if (toUpsert.length === 0) return json(res, 200, { ok: true, branches: branches.length, employees: 0 })
    }
    let upserted = 0
    for (const part of chunk(toUpsert, 500)) {
      const batch = ctx.db.batch()
      part.forEach(e => {
        const ref = ctx.db.collection('employees').doc(e.id)
        batch.set(ref, e)
      })
      await batch.commit()
      upserted += part.length
    }
    return json(res, 200, { ok: true, branches: branches.length, employees: upserted })
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
    
    const docRef = await ctx.db.collection('employee_import_requests').add({
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
    let q = ctx.db.collection('employee_import_requests').orderBy('created_at', 'desc')
    if (status && status !== 'ALL') q = q.where('status', '==', status)
    const snapshot = await q.get()
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
    if (!id) return json(res, 400, { ok: false, message: 'Missing id' })
    if (!['APPROVE', 'REJECT'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid decision' })
    const decisionNote = safeString(body?.decisionNote) || null

    const doc = await ctx.db.collection('employee_import_requests').doc(id).get()
    if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' })
    const reqRow = doc.data()

    const now = new Date().toISOString()
    const actor = safeString(ctx.session.username)
    if (decision === 'REJECT') {
      await ctx.db.collection('employee_import_requests').doc(id).update({ status: 'REJECTED', processed_by: actor, processed_at: now, decision_note: decisionNote })
      return json(res, 200, { ok: true })
    }

    const employees = Array.isArray(reqRow.employees) ? reqRow.employees : []
    const overwriteExisting = reqRow.overwrite_existing !== false
    const mapped = employees.map(mapEmployeeToDb).filter(e => e.id && e.name)
    if (mapped.length > 0) {
      const branchesSet = new Set()
      mapped.forEach(e => { const b = normalizeBranch(e.department); if (b) branchesSet.add(b) })
      const branches = Array.from(branchesSet).map(b => ({ id: b, name: b }))
      if (branches.length > 0) {
        const batch = ctx.db.batch()
        branches.forEach(b => {
          const ref = ctx.db.collection('branches').doc(b.id)
          batch.set(ref, b)
        })
        await batch.commit()
      }

      let toUpsert = mapped
      if (!overwriteExisting) {
        const existingIds = new Set()
        const ids = mapped.map(e => e.id)
        for (const idsChunk of chunk(ids, 10)) {
          const promises = idsChunk.map(id => ctx.db.collection('employees').doc(id).get())
          const snapshots = await Promise.all(promises)
          snapshots.forEach(doc => { if (doc.exists) existingIds.add(doc.id) })
        }
        toUpsert = mapped.filter(e => !existingIds.has(e.id))
      }

      for (const part of chunk(toUpsert, 500)) {
        const batch = ctx.db.batch()
        part.forEach(e => {
          const ref = ctx.db.collection('employees').doc(e.id)
          batch.set(ref, e)
        })
        await batch.commit()
      }
    }

    await ctx.db.collection('employee_import_requests').doc(id).update({ status: 'APPROVED', processed_by: actor, processed_at: now, decision_note: decisionNote })
    return json(res, 200, { ok: true })
  }

  if (route === 'movements/create') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const body = await readJsonBody(req)
    const type = safeString(body?.type).toUpperCase()
    const employeeId = safeString(body?.employeeId) || null
    const employeeName = safeString(body?.employeeName)
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {}
    const attachments = Array.isArray(body?.attachments) ? body.attachments : []
    const note = safeString(body?.note) || null
    if (!type) return json(res, 400, { ok: false, message: 'Missing type' })
    if (!employeeName) return json(res, 400, { ok: false, message: 'Missing employeeName' })
    const branch = normalizeBranch(ctx.session.branch)
    if (!branch) return json(res, 400, { ok: false, message: 'Missing branch' })
    
    const docRef = await ctx.db.collection('personnel_movements').add({
      branch,
      created_by: safeString(ctx.session.username),
      type,
      status: 'PENDING',
      employee_id: employeeId,
      employee_name: employeeName,
      payload,
      attachments,
      note,
      created_at: new Date().toISOString()
    })
    const id = docRef.id
    await ctx.db.collection('personnel_movement_audit').add({
      movement_id: id,
      action: 'CREATE',
      actor: safeString(ctx.session.username),
      meta: { type, employeeId, employeeName },
      created_at: new Date().toISOString()
    })
    await maybeNotifyWebhook('MOVEMENT_CREATE', { id, branch, type, employeeId, employeeName, createdBy: safeString(ctx.session.username) })
    return json(res, 200, { ok: true, id })
  }

  if (route === 'movements/my') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const status = safeString(req?.query?.status || '')
    const branch = normalizeBranch(ctx.session.branch)
    let q = ctx.db.collection('personnel_movements').orderBy('created_at', 'desc')
    if (safeString(ctx.session.role) !== 'admin') q = q.where('branch', '==', branch)
    if (status && status !== 'ALL') q = q.where('status', '==', status)
    const snapshot = await q.get()
    const movements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return json(res, 200, { ok: true, movements })
  }

  if (route === 'movements/pending' || route === 'movements/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const status = safeString(req?.query?.status || (route === 'movements/pending' ? 'PENDING' : 'ALL'))
    const branch = normalizeBranch(req?.query?.branch || '')
    const type = safeString(req?.query?.type || '').toUpperCase()
    let q = ctx.db.collection('personnel_movements').orderBy('created_at', 'desc')
    if (status && status !== 'ALL') q = q.where('status', '==', status)
    if (branch) q = q.where('branch', '==', branch)
    if (type) q = q.where('type', '==', type)
    const snapshot = await q.get()
    const movements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return json(res, 200, { ok: true, movements })
  }

  if (route === 'movements/decide') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' })
    const body = await readJsonBody(req)
    const id = safeString(body?.id)
    const decision = safeString(body?.decision).toUpperCase()
    const decisionNote = safeString(body?.decisionNote) || null
    if (!id) return json(res, 400, { ok: false, message: 'Missing id' })
    if (!['APPROVE', 'REJECT', 'REVISION'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid decision' })

    const doc = await ctx.db.collection('personnel_movements').doc(id).get()
    if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' })
    const movement = doc.data()
    if (safeString(movement.status) !== 'PENDING' && safeString(movement.status) !== 'REVISION') return json(res, 400, { ok: false, message: 'Request already decided' })

    const now = new Date().toISOString()
    const actor = safeString(ctx.session.username)

    if (decision !== 'APPROVE') {
      const nextStatus = decision === 'REJECT' ? 'REJECTED' : 'REVISION'
      await ctx.db.collection('personnel_movements').doc(id).update({ status: nextStatus, processed_by: actor, processed_at: now, decision_note: decisionNote })
      await ctx.db.collection('personnel_movement_audit').add({
        movement_id: id,
        action: nextStatus,
        actor,
        meta: { decisionNote },
        created_at: now
      })
      await maybeNotifyWebhook('MOVEMENT_DECIDE', { id, decision: nextStatus, branch: movement.branch, type: movement.type, employeeId: movement.employee_id, employeeName: movement.employee_name, processedBy: actor })
      return json(res, 200, { ok: true })
    }

    const type = safeString(movement.type).toUpperCase()
    const branch = normalizeBranch(movement.branch)
    const employeeId = safeString(movement.employee_id || body?.employeeId || '')
    const payload = movement.payload && typeof movement.payload === 'object' ? movement.payload : {}

    let updatedEmployee = null
    if (type === 'LEAVE') {
      const leaveType = safeString(payload.leaveType || payload.type || payload.leave_type) || 'ANNUAL'
      const from = safeString(payload.from)
      const to = safeString(payload.to)
      const days = Number(payload.days || 0) || null
      const reason = safeString(payload.reason) || null
      if (!employeeId) return json(res, 400, { ok: false, message: 'Missing employeeId' })
      if (!from || !to) return json(res, 400, { ok: false, message: 'Missing from/to' })
      await ctx.db.collection('employee_leaves').add({
        employee_id: employeeId,
        employee_name: safeString(movement.employee_name),
        branch,
        leave_type: leaveType,
        from,
        to,
        days,
        reason,
        created_by: safeString(movement.created_by),
        approved_by: actor,
        approved_at: now,
        created_at: now
      })
    } else {
      if (!employeeId && type !== 'ONBOARDING') return json(res, 400, { ok: false, message: 'Missing employeeId' })
      if (type === 'ONBOARDING') {
        const idToUse = employeeId || safeString(payload.employeeId || payload.id || '')
        if (!idToUse) return json(res, 400, { ok: false, message: 'Missing employeeId (Mã NV)' })
        const patch = mapMovementEmployeePatch(payload)
        if (!patch.name) patch.name = safeString(movement.employee_name)
        patch.department = patch.department || branch
        await ctx.db.collection('employees').doc(idToUse).set({ id: idToUse, ...patch }, { merge: true })
        const snap = await ctx.db.collection('employees').doc(idToUse).get()
        updatedEmployee = snap.data() || null
      } else {
        const patch = mapMovementEmployeePatch(payload)
        if (Object.keys(patch).length > 0) {
          await ctx.db.collection('employees').doc(employeeId).update(patch)
          const snap = await ctx.db.collection('employees').doc(employeeId).get()
          updatedEmployee = snap.data() || null
        }
      }
    }

    await ctx.db.collection('personnel_movements').doc(id).update({ status: 'APPROVED', processed_by: actor, processed_at: now, decision_note: decisionNote, employee_id: employeeId || movement.employee_id })
    await ctx.db.collection('personnel_movement_audit').add({
      movement_id: id,
      action: 'APPROVED',
      actor,
      meta: { decisionNote, type },
      created_at: now
    })
    await maybeNotifyWebhook('MOVEMENT_DECIDE', { id, decision: 'APPROVED', branch: movement.branch, type: movement.type, employeeId: employeeId || movement.employee_id, employeeName: movement.employee_name, processedBy: actor })
    return json(res, 200, { ok: true, updatedEmployee })
  }

  if (route === 'employees/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const role = safeString(ctx.session.role)
    const branch = normalizeBranch(ctx.session.branch)
    let q = ctx.db.collection('employees')
    if (role !== 'admin') {
      q = q.where('department', '==', branch)
    }
    const snapshot = await q.get()
    const list = snapshot.docs.map(doc => doc.data())
    return json(res, 200, { ok: true, employees: list })
  }

  if (route === 'branches/list') {
    if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' })
    const ctx = await requireSession(req, res)
    if (!ctx) return
    const snapshot = await ctx.db.collection('branches').get()
    const list = snapshot.docs.map(doc => doc.data())
    return json(res, 200, { ok: true, branches: list })
  }

  return json(res, 404, { ok: false, message: 'Not Found' })
}
