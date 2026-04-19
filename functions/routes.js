const functions = require('firebase-functions');
const apiHandlers = require('./apiHandlers');
const { 
  json, 
  safeString, 
  normalizeUsername, 
  readJsonBody, 
  requireSession, 
  verifyPassword,
  listAdminUsernames,
  restrictUserUpdate,
  toTaskRow,
  toDoneGroup,
  appendActivity,
  fetchAccountFromFirestore
} = apiHandlers;

const auth = apiHandlers.getAuth();
const firestore = apiHandlers.getFirestore();

let _supabase = null;
async function getSupabase() {
  if (_supabase) return _supabase;
  const supabaseUrl = process.env.SUPABASE_URL || functions.config().supabase?.url;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || functions.config().supabase?.service_role_key;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase configuration');
  const mod = await import('@supabase/supabase-js');
  _supabase = mod.createClient(supabaseUrl, supabaseServiceKey);
  return _supabase;
}

// Login handler
async function handleLogin(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, message: 'Method Not Allowed' });
  const body = await readJsonBody(req);
  const { username, password } = body || {};
  const un = normalizeUsername(username);
  const pw = safeString(password);
  if (!un || !pw) return json(res, 400, { success: false, message: 'Thiếu tài khoản hoặc mật khẩu' });

  try {
    const account = await fetchAccountFromFirestore(un);
    if (!account) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
    if (account.active === false) return json(res, 403, { success: false, message: 'Tài khoản đã bị khóa' });
    
    const ok = verifyPassword(pw, account.password_hash);
    if (!ok) return json(res, 401, { success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
    
    const token = await auth.createCustomToken(`accounts:${un}`, {
      branch: account.branch,
      role: account.role,
      username: un
    });
    
    return json(res, 200, { success: true, token, branch: account.branch, role: account.role });
  } catch (e) {
    console.error('Login error:', e);
    return json(res, 500, { success: false, message: `Lỗi máy chủ đăng nhập (Firebase). ${e.message}` });
  }
}

// Interviews handler
async function handleInterviews(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;

  const body = await readJsonBody(req);
  const candidateId = safeString(body.id);
  if (!candidateId) return json(res, 400, { ok: false, message: 'Missing candidate ID' });

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

    // 3. Sync to Google Sheet in the background (fire-and-forget)
    (async () => {
      try {
        const SCRIPT_URL = process.env.VITE_SCRIPT_URL || functions.config().script?.url;
        const SYNC_SECRET = process.env.VITE_SYNC_SECRET || functions.config().script?.secret || 'moon_map_2026';
        if (!SCRIPT_URL) {
          console.warn('VITE_SCRIPT_URL is not set. Skipping Google Sheet sync.');
          return;
        }
        
        const syncPayload = {
          id: candidateId,
          status: body.status,
          interview_note: body.interview_note,
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
    if (!res.writableEnded) {
      json(res, 500, { ok: false, message: 'Failed to save interview result to Firestore.' });
    }
  }
}

// Sync handler (Google Sheets sync)
async function handleSync(req, res) {
  const SCRIPT_URL = process.env.VITE_SCRIPT_URL || functions.config().script?.url;
  const SYNC_SECRET = process.env.VITE_SYNC_SECRET || functions.config().script?.secret || 'moon_map_2026';
  if (!SCRIPT_URL) return json(res, 500, { status: 'error', message: 'Thiếu Script URL' });

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
  };
  const EN_TO_VI = Object.fromEntries(Object.entries(VI_TO_EN).map(([k, v]) => [v, k]));
  const translateTask = (task, mapping) => {
    if (!task) return {};
    const newTask = {};
    for (const key in task) {
      const translatedKey = mapping[key] || key;
      let val = task[key];
      if (val === null || val === undefined) val = '';
      newTask[translatedKey] = val;
    }
    return newTask;
  };

  try {
    let response;
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const translatedTasks = (body.tasks || []).map(t => translateTask(t, EN_TO_VI));
      response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ secret: SYNC_SECRET, tasks: translatedTasks }),
      });
    } else if (req.method === 'GET') {
      const separator = SCRIPT_URL.includes('?') ? '&' : '?';
      response = await fetch(`${SCRIPT_URL}${separator}secret=${encodeURIComponent(SYNC_SECRET)}`);
    } else {
      return json(res, 405, { status: 'error', message: 'Method Not Allowed' });
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.tasks && Array.isArray(data.tasks)) data.tasks = data.tasks.map(t => translateTask(t, VI_TO_EN));
      return json(res, 200, data);
    } catch (_e) {
      return json(res, 500, { status: 'error', message: 'Google API trả về nội dung không đúng định dạng JSON', debug: text.slice(0, 200) });
    }
  } catch (error) {
    return json(res, 500, { status: 'error', message: error.message });
  }
}

// Contract handler
async function handleContract(req, res) {
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbOz62rPEq-o2NLGkLArF1z5JsZ2H54YU7vqe3fll-eIy3llxaVe-IR-y8AvWvrnpYzw/exec';
  const SCRIPT_URL = process.env.VITE_CONTRACT_SCRIPT_URL || process.env.VITE_SCRIPT_URL || functions.config().contract?.url || DEFAULT_SCRIPT_URL;
  const SECRET = process.env.VITE_CONTRACT_SECRET || process.env.VITE_SYNC_SECRET || functions.config().contract?.secret || 'moon_map_2026';
  if (!SCRIPT_URL) return json(res, 500, { ok: false, error: 'MISSING_SCRIPT_URL' });
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const body = await readJsonBody(req);
    const payloadToForward = { ...body, secret: SECRET };
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payloadToForward),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      return json(res, 500, { ok: false, error: 'INVALID_JSON_FROM_SCRIPT', debug: text.slice(0, 200) });
    }
    return json(res, response.ok ? 200 : 500, data);
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
}

// Tasks list handler
async function handleTasksList(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const role = safeString(ctx.session.role);
  const branch = safeString(ctx.session.branch);
  const branchDone = branch ? `${branch}__DONE` : '';
  
  let query = firestore.collection('tasks').orderBy('updated_at', 'desc');
  
  if (role !== 'admin') {
    const allowedGroups = [branch, branchDone, 'ALL', 'ALL__DONE', 'HQ', 'HQ__DONE'];
    query = query.where('group', 'in', allowedGroups);
  }
  
  const snapshot = await query.get();
  const tasks = snapshot.docs.map(doc => doc.data().data).filter(Boolean);
  return json(res, 200, { ok: true, tasks });
}

// Tasks upsert handler
async function handleTasksUpsert(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const role = safeString(ctx.session.role);
  const branch = safeString(ctx.session.branch);
  const branchDone = branch ? `${branch}__DONE` : '';
  const actor = safeString(ctx.session.username);
  const body = await readJsonBody(req);
  const tasks = Array.isArray(body?.tasks) ? body.tasks : (body?.task ? [body.task] : []);
  if (tasks.length === 0) return json(res, 400, { ok: false, message: 'Missing task(s)' });

  if (role === 'admin') {
    const batch = firestore.batch();
    for (const t of tasks) {
      const id = safeString(t?.id);
      if (!id) continue;
      const docRef = firestore.collection('tasks').doc(id);
      const doc = await docRef.get();
      const createdByOverride = doc.exists ? doc.data().created_by : null;
      const row = toTaskRow(t, actor, createdByOverride);
      batch.set(docRef, row, { merge: true });
    }
    await batch.commit();
    return json(res, 200, { ok: true, count: tasks.length });
  }

  let updated = 0;
  for (const incoming of tasks) {
    const id = safeString(incoming?.id);
    if (!id) continue;
    const docRef = firestore.collection('tasks').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) continue;
    
    const cur = doc.data();
    const currentGroup = safeString(cur.group);
    if (currentGroup !== branch && currentGroup !== branchDone) continue;

    const now = new Date().toISOString();
    const incomingStatus = safeString(incoming?.status).toUpperCase();
    const curData = cur.data || {};
    const curDoneApproval = curData?.doneApproval || null;
    const donePending = safeString(curDoneApproval?.status) === 'PENDING';
    const isInDoneGroup = currentGroup === branchDone;
    const isCorrectionOutOfDoneGroup = isInDoneGroup && incomingStatus && incomingStatus !== 'DONE';

    if (isCorrectionOutOfDoneGroup && !donePending) continue;
    const nextData = restrictUserUpdate(cur.data || {}, incoming || {});
    let nextGroup = currentGroup;

    if (isCorrectionOutOfDoneGroup) {
      nextGroup = branch;
      nextData.group = branch;
      nextData.status = incomingStatus || 'TODO';
      nextData.doneApproval = {
        ...curDoneApproval,
        status: 'CANCELLED_BY_BRANCH',
        cancelledBy: actor,
        cancelledAt: now,
      };
      nextData.activityLog = [
        ...(Array.isArray(nextData.activityLog) ? nextData.activityLog : []),
        { type: 'branch_correction', from: 'DONE', to: nextData.status, at: now, by: actor },
      ];

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
      });
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
    };
    await docRef.set(row, { merge: true });
    updated++;
  }
  return json(res, 200, { ok: true, count: updated });
}

// Tasks delete handler (admin only)
async function handleTasksDelete(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const body = await readJsonBody(req);
  const id = safeString(body?.id);
  if (!id) return json(res, 400, { ok: false, message: 'Missing id' });
  await firestore.collection('tasks').doc(id).delete();
  return json(res, 200, { ok: true });
}

// Tasks complete handler
async function handleTasksComplete(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const actor = safeString(ctx.session.username);
  const actorRole = safeString(ctx.session.role);
  const actorBranch = safeString(ctx.session.branch);
  const body = await readJsonBody(req);
  const id = safeString(body?.id);
  if (!id) return json(res, 400, { ok: false, message: 'Missing id' });

  const docRef = firestore.collection('tasks').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' });
  
  const cur = doc.data();
  const fromStatus = safeString(cur.status);
  const fromGroup = safeString(cur.group);
  if (actorRole !== 'admin') {
    if (fromGroup !== actorBranch) return json(res, 403, { ok: false, message: 'Forbidden' });
  }
  const toStatus = 'DONE';
  const toGroup = toDoneGroup(fromGroup);
  const now = new Date().toISOString();

  const requestMeta = cur.data?.requestMeta || null;
  const targetUsername = safeString(requestMeta?.originUsername) || safeString(cur.created_by);

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
  });
  const doneApproval = actorRole === 'admin'
    ? { status: 'APPROVED', requestedBy: actor, requestedAt: now, approvedBy: actor, approvedAt: now, fromStatus, fromGroup }
    : { status: 'PENDING', requestedBy: actor, requestedAt: now, fromStatus, fromGroup };
  const nextData = { ...nextData0, status: toStatus, group: toGroup, lastUpdated: now, doneApproval };

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
    });
  };

  try {
    await docRef.update({ status: toStatus, group: toGroup, data: nextData, updated_at: now });
    await logStep('UPDATE_TASK', true);

    if (actorRole === 'admin') {
      if (targetUsername) {
        await firestore.collection('notifications').add({
          target_username: targetUsername,
          kind: 'TASK_DONE',
          payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
          created_at: now,
          delivered_at: null
        });
        await logStep('NOTIFY', true, { meta: { targetUsername, kind: 'TASK_DONE' } });
      }
    } else {
      const admins = await listAdminUsernames();
      const batch = firestore.batch();
      admins.forEach(un => {
        const notifRef = firestore.collection('notifications').doc();
        batch.set(notifRef, {
          target_username: un,
          kind: 'TASK_DONE_REQUEST',
          payload: { taskId: id, title: cur.title, fromStatus, toStatus, fromGroup, toGroup, actor, actorRole, originUsername: requestMeta?.originUsername || null, originRole: requestMeta?.originRole || null, originBranch: requestMeta?.originBranch || null },
          created_at: now,
          delivered_at: null
        });
      });
      if (admins.length > 0) {
        await batch.commit();
        await logStep('NOTIFY', true, { meta: { admins: admins.length, kind: 'TASK_DONE_REQUEST' } });
      }
    }

    return json(res, 200, { ok: true, task: nextData });
  } catch (e) {
    await logStep('EXCEPTION', false, { error: e?.message || String(e) });
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

// Tasks done-review handler (admin only)
async function handleTasksDoneReview(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const actor = safeString(ctx.session.username);
  const actorRole = safeString(ctx.session.role);
  const actorBranch = safeString(ctx.session.branch);
  if (actorRole !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const body = await readJsonBody(req);
  const id = safeString(body?.id);
  const decision = safeString(body?.decision).toUpperCase();
  if (!id) return json(res, 400, { ok: false, message: 'Missing id' });
  if (!['APPROVE', 'REJECT'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid decision' });

  const docRef = firestore.collection('tasks').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' });
  
  const cur = doc.data();
  const now = new Date().toISOString();
  const data = cur.data && typeof cur.data === 'object' ? cur.data : {};

  const reqMeta = data.requestMeta || null;
  const doneApproval = data.doneApproval || null;
  const fromStatus = safeString(doneApproval?.fromStatus) || safeString(cur.status);
  const fromGroup = safeString(doneApproval?.fromGroup) || safeString(cur.group);
  const toStatus = safeString(cur.status);
  const toGroup = safeString(cur.group);
  const originUsername = safeString(reqMeta?.originUsername) || safeString(cur.created_by);

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
    });
  };

  if (safeString(doneApproval?.status) !== 'PENDING') return json(res, 400, { ok: false, message: 'No pending done approval' });

  if (decision === 'APPROVE') {
    const nextData = {
      ...data,
      doneApproval: { ...doneApproval, status: 'APPROVED', approvedBy: actor, approvedAt: now },
      lastUpdated: now,
    };
    await docRef.update({ data: nextData, updated_at: now });
    await logStep('DONE_REVIEW_APPROVE', true);
    if (originUsername) {
      await firestore.collection('notifications').add({
        target_username: originUsername,
        kind: 'TASK_DONE_APPROVED',
        payload: { taskId: id, title: cur.title, actor, actorRole, group: toGroup },
        created_at: now,
        delivered_at: null
      });
      await logStep('NOTIFY', true, { meta: { targetUsername: originUsername, kind: 'TASK_DONE_APPROVED' } });
    }
    return json(res, 200, { ok: true, task: nextData });
  }

  const rollbackStatus = safeString(doneApproval?.fromStatus) || 'IN_PROGRESS';
  const rollbackGroup = safeString(doneApproval?.fromGroup) || fromGroup;
  const rollbackData = {
    ...data,
    status: rollbackStatus,
    group: rollbackGroup,
    doneApproval: { ...doneApproval, status: 'REJECTED', rejectedBy: actor, rejectedAt: now },
    lastUpdated: now,
  };
  await docRef.update({ status: rollbackStatus, group: rollbackGroup, data: rollbackData, updated_at: now });
  await logStep('DONE_REVIEW_REJECT', true, { meta: { rollbackStatus, rollbackGroup } });
  if (originUsername) {
    await firestore.collection('notifications').add({
      target_username: originUsername,
      kind: 'TASK_DONE_REJECTED',
      payload: { taskId: id, title: cur.title, actor, actorRole, group: rollbackGroup },
      created_at: now,
      delivered_at: null
    });
    await logStep('NOTIFY', true, { meta: { targetUsername: originUsername, kind: 'TASK_DONE_REJECTED' } });
  }
  return json(res, 200, { ok: true, task: rollbackData });
}

// Contracts issue-log handler
async function handleContractsIssueLog(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const body = await readJsonBody(req);
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
  };
  if (!row.method) return json(res, 400, { ok: false, message: 'Missing method' });
  await firestore.collection('contract_issue_log').add(row);
  return json(res, 200, { ok: true });
}

// Employees import handler
async function handleEmployeesImport(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const body = await readJsonBody(req);
  const employeesRaw = Array.isArray(body?.employees) ? body.employees : [];
  const replaceAll = !!body?.replaceAll;
  const overwriteExisting = body?.overwriteExisting !== false;
  const employees = employeesRaw.map(apiHandlers.mapEmployeeToDb).filter(e => e.id && e.name);
  if (employees.length === 0) return json(res, 400, { ok: false, message: 'No employees to import' });
  
  const branchesSet = new Set();
  employees.forEach(e => {
    const b = apiHandlers.normalizeBranch(e.department);
    if (b) branchesSet.add(b);
  });
  
  const batch = firestore.batch();
  branchesSet.forEach(b => {
    const branchRef = firestore.collection('branches').doc(b);
    batch.set(branchRef, { id: b, name: b }, { merge: true });
  });
  
  if (replaceAll) {
    // Deleting all docs in Firestore requires a batch delete which is complex.
    // For now we just import.
  }
  
  for (const e of employees) {
    const empRef = firestore.collection('employees').doc(e.id);
    if (!overwriteExisting) {
      const doc = await empRef.get();
      if (doc.exists) continue;
    }
    batch.set(empRef, e, { merge: true });
  }
  
  await batch.commit();
  return json(res, 200, { ok: true, branches: branchesSet.size, employees: employees.length });
}

// Notifications poll handler
async function handleNotificationsPoll(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const since = safeString(req?.query?.since || '');
  
  let query = firestore.collection('notifications')
    .where('target_username', '==', safeString(ctx.session.username))
    .where('delivered_at', '==', null)
    .orderBy('created_at', 'asc')
    .limit(50);
    
  if (since) query = query.where('created_at', '>=', since);
  
  const snapshot = await query.get();
  const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return json(res, 200, { ok: true, notifications });
}

// Notifications ack handler
async function handleNotificationsAck(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const body = await readJsonBody(req);
  const ids = Array.isArray(body?.ids) ? body.ids.map(safeString).filter(Boolean) : [];
  if (ids.length === 0) return json(res, 400, { ok: false, message: 'Missing ids' });
  const now = new Date().toISOString();
  
  const batch = firestore.batch();
  for (const id of ids) {
    const docRef = firestore.collection('notifications').doc(id);
    batch.update(docRef, { delivered_at: now });
  }
  await batch.commit();
  return json(res, 200, { ok: true });
}

// Employees import-request handler
async function handleEmployeesImportRequest(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) === 'admin') return json(res, 400, { ok: false, message: 'Admin không cần gửi yêu cầu' });
  const branch = apiHandlers.normalizeBranch(ctx.session.branch);
  if (!branch) return json(res, 400, { ok: false, message: 'Thiếu thông tin chi nhánh' });
  const body = await readJsonBody(req);
  const employeesRaw = Array.isArray(body?.employees) ? body.employees : [];
  const overwriteExisting = body?.overwriteExisting !== false;
  const employees = employeesRaw
    .map(e => ({
      id: safeString(e?.id),
      title: safeString(e?.title) || '',
      name: safeString(e?.name) || '',
      position: safeString(e?.position) || '',
      department: apiHandlers.normalizeBranch(e?.department) || branch,
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
    .filter(e => e.id && e.name);
  if (employees.length === 0) return json(res, 400, { ok: false, message: 'No employees to request' });
  const wrongBranch = employees.find(e => apiHandlers.normalizeBranch(e.department) !== branch);
  if (wrongBranch) return json(res, 400, { ok: false, message: 'Chỉ được gửi dữ liệu thuộc chi nhánh của bạn' });
  
  const docRef = await firestore.collection('employee_import_requests').add({
    branch,
    created_by: safeString(ctx.session.username),
    status: 'PENDING',
    overwrite_existing: overwriteExisting,
    employees,
    created_at: new Date().toISOString()
  });
  return json(res, 200, { ok: true, id: docRef.id, employees: employees.length });
}

// Employees import-requests list handler
async function handleEmployeesImportRequestsList(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const status = safeString(req?.query?.status || 'PENDING');
  
  let query = firestore.collection('employee_import_requests').orderBy('created_at', 'desc');
  if (status && status !== 'ALL') query = query.where('status', '==', status);
  
  const snapshot = await query.get();
  const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return json(res, 200, { ok: true, requests });
}

// Employees import-requests decide handler
async function handleEmployeesImportRequestsDecide(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const body = await readJsonBody(req);
  const id = safeString(body?.id);
  const decision = safeString(body?.decision).toUpperCase();
  const note = safeString(body?.note);
  if (!id || !['APPROVE', 'REJECT'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid payload' });

  const docRef = firestore.collection('employee_import_requests').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return json(res, 404, { ok: false, message: 'Not found' });
  
  const reqData = doc.data();
  if (reqData.status !== 'PENDING') return json(res, 400, { ok: false, message: 'Already processed' });

  const now = new Date().toISOString();
  const update = {
    status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    processed_by: safeString(ctx.session.username),
    processed_at: now,
    decision_note: note,
  };

  if (decision === 'APPROVE') {
    const batch = firestore.batch();
    const employees = Array.isArray(reqData.employees) ? reqData.employees : [];
    const overwriteExisting = !!reqData.overwrite_existing;
    
    for (const e of employees) {
      const empDb = apiHandlers.mapEmployeeToDb(e);
      const empRef = firestore.collection('employees').doc(empDb.id);
      if (!overwriteExisting) {
        const empDoc = await empRef.get();
        if (empDoc.exists) continue;
      }
      batch.set(empRef, empDb, { merge: true });
    }
    batch.update(docRef, update);
    await batch.commit();
  } else {
    await docRef.update(update);
  }

  return json(res, 200, { ok: true });
}

async function handleCandidatesSheetUpsert(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });

  const body = await readJsonBody(req);
  const secret = safeString(body?.secret);
  const expected = safeString(process.env.SYNC_SECRET || process.env.VITE_SYNC_SECRET || functions.config().script?.secret);
  if (!expected || secret !== expected) return json(res, 403, { ok: false, message: 'Forbidden' });

  const list = Array.isArray(body?.candidates) ? body.candidates : [];
  if (list.length === 0) return json(res, 400, { ok: false, message: 'Missing candidates' });

  const now = new Date().toISOString();
  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v === 0 || v === false) return v;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && !v.trim()) continue;
      return v;
    }
    return undefined;
  };
  const asText = (v) => {
    const s = String(v ?? '').trim();
    return s ? s : null;
  };
  const asId = (v) => {
    const n = Number(String(v ?? '').trim());
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  const rows = list
    .map((c) => {
      const id = asId(pick(c, ['id', 'ID', 'row_index', 'rowIndex']));
      if (!id) return null;
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
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return json(res, 400, { ok: false, message: 'No valid rows' });

  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from('candidates_sheet').upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
    if (error) return json(res, 500, { ok: false, message: error.message });
    return json(res, 200, { ok: true, count: rows.length });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

async function handleCandidatesSheetList(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });

  const branch = safeString(req?.query?.branch);
  const status = safeString(req?.query?.status);
  const limit = Math.min(Math.max(Number(req?.query?.limit || 50) || 50, 1), 200);
  const offset = Math.max(Number(req?.query?.offset || 0) || 0, 0);

  try {
    const supabase = await getSupabase();
    let qb = supabase
      .from('candidates_sheet')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (branch) qb = qb.eq('branch', branch);
    if (status) qb = qb.eq('status', status);

    const { data, error } = await qb;
    if (error) return json(res, 500, { ok: false, message: error.message });
    return json(res, 200, { ok: true, data: data || [] });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

function movementDocToRow(doc) {
  const data = doc?.data() || {};
  return { id: doc.id, ...data };
}

async function handleMovementsMy(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  const status = safeString(req?.query?.status || 'ALL').toUpperCase();
  const username = safeString(ctx.session.username);

  try {
    let q = firestore.collection('personnel_movements').where('created_by', '==', username);
    if (status && status !== 'ALL') q = q.where('status', '==', status);
    q = q.orderBy('created_at', 'desc').limit(200);
    const snapshot = await q.get();
    const movements = snapshot.docs.map(movementDocToRow);
    return json(res, 200, { ok: true, movements });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

async function handleMovementsPending(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const status = safeString(req?.query?.status || 'ALL').toUpperCase();

  try {
    let q = firestore.collection('personnel_movements');
    if (!status || status === 'ALL') q = q.where('status', 'in', ['PENDING', 'REVISION']);
    else q = q.where('status', '==', status);
    q = q.orderBy('created_at', 'desc').limit(200);
    const snapshot = await q.get();
    const movements = snapshot.docs.map(movementDocToRow);
    return json(res, 200, { ok: true, movements });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

async function handleMovementsList(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });
  const status = safeString(req?.query?.status || 'ALL').toUpperCase();

  try {
    let q = firestore.collection('personnel_movements');
    if (status && status !== 'ALL') q = q.where('status', '==', status);
    q = q.orderBy('created_at', 'desc').limit(500);
    const snapshot = await q.get();
    const movements = snapshot.docs.map(movementDocToRow);
    return json(res, 200, { ok: true, movements });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

async function handleMovementsCreate(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;

  const body = await readJsonBody(req);
  const type = safeString(body?.type).toUpperCase();
  const employeeId = safeString(body?.employeeId || body?.employee_id) || null;
  const employeeName = safeString(body?.employeeName || body?.employee_name);
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  const note = safeString(body?.note);

  if (!type || !employeeName) return json(res, 400, { ok: false, message: 'Invalid payload' });

  const now = new Date().toISOString();
  const row = {
    branch: apiHandlers.normalizeBranch(ctx.session.branch),
    created_by: safeString(ctx.session.username),
    type,
    status: 'PENDING',
    employee_id: employeeId,
    employee_name: employeeName,
    payload,
    attachments,
    note,
    created_at: now,
    processed_by: null,
    processed_at: null,
    decision_note: null
  };

  try {
    const ref = firestore.collection('personnel_movements').doc();
    await ref.set(row);
    await ref.collection('audit').add({ action: 'CREATE', actor: safeString(ctx.session.username), at: now, meta: { type } });
    return json(res, 200, { ok: true, movement: { id: ref.id, ...row } });
  } catch (e) {
    return json(res, 500, { ok: false, message: e?.message || String(e) });
  }
}

async function handleMovementsDecide(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method Not Allowed' });
  const ctx = await requireSession(req, res);
  if (!ctx) return;
  if (safeString(ctx.session.role) !== 'admin') return json(res, 403, { ok: false, message: 'Forbidden' });

  const body = await readJsonBody(req);
  const id = safeString(body?.id);
  const decision = safeString(body?.decision).toUpperCase();
  const decisionNote = safeString(body?.decisionNote || body?.decision_note);
  if (!id || !['APPROVE', 'REJECT', 'REVISION'].includes(decision)) return json(res, 400, { ok: false, message: 'Invalid payload' });

  const actor = safeString(ctx.session.username);
  const now = new Date().toISOString();
  const nextStatus = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'REVISION';
  const moveRef = firestore.collection('personnel_movements').doc(id);

  let updatedEmployee = null;
  try {
    await firestore.runTransaction(async (tx) => {
      const doc = await tx.get(moveRef);
      if (!doc.exists) throw new Error('Not found');
      const cur = doc.data() || {};
      const currentStatus = safeString(cur.status).toUpperCase();
      if (currentStatus && !['PENDING', 'REVISION'].includes(currentStatus)) throw new Error('Already processed');

      tx.update(moveRef, {
        status: nextStatus,
        processed_by: actor,
        processed_at: now,
        decision_note: decisionNote || null
      });

      const auditRef = moveRef.collection('audit').doc();
      tx.set(auditRef, { action: decision, actor, at: now, meta: { decisionNote: decisionNote || '' } });

      if (decision !== 'APPROVE') return;

      const payload = cur?.payload && typeof cur.payload === 'object' ? cur.payload : {};
      const empId = safeString(cur.employee_id) || safeString(payload.employeeId || payload.id);
      if (!empId) return;

      const pick = (...keys) => {
        for (const k of keys) {
          const v = payload?.[k];
          const s = safeString(v);
          if (s) return s;
        }
        return '';
      };

      const empUi = {
        id: empId,
        title: pick('title'),
        name: safeString(cur.employee_name) || pick('name', 'employeeName', 'employee_name'),
        position: pick('position', 'newPosition', 'newRole', 'role'),
        department: safeString(cur.branch) || pick('department', 'branch'),
        email: pick('email', 'gmail'),
        phone: pick('phone', 'sdt'),
        startDate: pick('startDate', 'start_date'),
        probationDate: pick('probationDate', 'probation_date'),
        contractDate: pick('contractDate', 'contract_date'),
        renewDate: pick('renewDate', 'renew_date'),
        dob: pick('dob', 'Birth', 'birth'),
        nationality: pick('nationality'),
        address: pick('address'),
        currentAddress: pick('currentAddress', 'current_address', 'Current_Address'),
        cccd: pick('cccd'),
        cccd_date: pick('cccd_date'),
        cccd_place: pick('cccd_place'),
        education: pick('education', 'Graduation_Cap'),
        major: pick('major'),
        pedagogyCert: pick('pedagogyCert', 'pedagogy_cert'),
        hasInsurance: pick('hasInsurance', 'has_insurance'),
        insuranceAgency: pick('insuranceAgency', 'insurance_agency'),
        documentStatus: pick('documentStatus', 'document_status'),
        salary: pick('salary'),
        note: pick('note')
      };

      const empDb = apiHandlers.mapEmployeeToDb(empUi);
      const empRef = firestore.collection('employees').doc(empId);
      tx.set(empRef, empDb, { merge: true });
      updatedEmployee = empDb;
    });

    return json(res, 200, { ok: true, status: nextStatus, updatedEmployee });
  } catch (e) {
    return json(res, 400, { ok: false, message: e?.message || String(e) });
  }
}

// Export all handlers
module.exports = {
  handleLogin,
  handleInterviews,
  handleSync,
  handleContract,
  handleTasksList,
  handleTasksUpsert,
  handleTasksDelete,
  handleTasksComplete,
  handleTasksDoneReview,
  handleContractsIssueLog,
  handleEmployeesImport,
  handleEmployeesImportRequest,
  handleEmployeesImportRequestsList,
  handleEmployeesImportRequestsDecide,
  handleCandidatesSheetUpsert,
  handleCandidatesSheetList,
  handleMovementsMy,
  handleMovementsPending,
  handleMovementsList,
  handleMovementsCreate,
  handleMovementsDecide,
  handleNotificationsPoll,
  handleNotificationsAck
};
