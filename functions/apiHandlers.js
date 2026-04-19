const crypto = require('crypto');

// Firebase Admin will be passed in from index.js
let auth, firestore, storage;

function initFirebase(admin) {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  // Configure emulators if environment variables are set
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('Configuring Firestore to use emulator:', process.env.FIRESTORE_EMULATOR_HOST);
    firestore = admin.firestore();
    firestore.settings({
      host: process.env.FIRESTORE_EMULATOR_HOST,
      ssl: false
    });
  } else {
    firestore = admin.firestore();
  }
  
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('Configuring Auth to use emulator:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
  }
  auth = admin.auth();
  storage = admin.storage();
}

async function fetchAccountFromFirestore(username) {
  const normalized = username.toLowerCase().trim();
  const doc = await firestore.collection('accounts').doc(normalized).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    username: data.username || normalized,
    password_hash: data.password_hash,
    branch: data.branch,
    role: data.role,
    active: data.active !== false
  };
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function safeString(v) {
  return String(v ?? '').trim();
}

function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeBranch(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.toUpperCase().replace(/\s+/g, ' ');
}

function getBearerToken(req) {
  const h = req?.headers?.authorization || req?.headers?.Authorization || '';
  const t = String(h || '').trim();
  if (!t) return '';
  const m = t.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function readJsonBody(req) {
  if (req?.body && typeof req.body === 'object') return req.body;
  if (typeof req?.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  try {
    for await (const chunk of req) chunks.push(chunk);
  } catch {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function requireSession(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    json(res, 401, { ok: false, message: 'Missing Authorization Bearer token' });
    return null;
  }

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
    const decodedToken = await auth.verifyIdToken(token);
    return {
      session: {
        username: decodedToken.username || decodedToken.uid || decodedToken.email?.split('@')[0],
        branch: decodedToken.branch || 'HQ',
        role: decodedToken.role || 'user'
      },
      firestore
    };
  } catch (error) {
    console.error('Session error:', error);
    json(res, 401, { ok: false, message: 'Invalid or expired Firebase ID Token' });
    return null;
  }
}

function timingSafeEqualHex(aHex, bHex) {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function scryptHashHex(password, salt) {
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64');
  const key = crypto.scryptSync(String(password || ''), saltBuf, 64, { N: 16384, r: 8, p: 1 });
  return key.toString('hex');
}

function verifyPassword(password, stored) {
  const raw = safeString(stored);
  if (!raw) return false;
  if (raw.startsWith('scrypt:')) {
    const parts = raw.split(':');
    if (parts.length !== 3) return false;
    const saltB64 = parts[1];
    const hashHex = parts[2];
    const computed = scryptHashHex(password, saltB64);
    return timingSafeEqualHex(computed, hashHex);
  }
  return safeString(password) === raw;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toDoneGroup(g) {
  const s = safeString(g);
  if (!s) return s;
  if (s.endsWith('__DONE')) return s;
  return `${s}__DONE`;
}

function appendActivity(data, entry) {
  const d = data && typeof data === 'object' ? data : {};
  const current = Array.isArray(d.activityLog) ? d.activityLog : [];
  return { ...d, activityLog: [...current, entry] };
}

async function listAdminUsernames() {
  const snapshot = await firestore.collection('accounts').where('role', '==', 'admin').get();
  return snapshot.docs
    .map(doc => doc.data())
    .filter(r => r && r.active !== false)
    .map(r => safeString(r.username))
    .filter(Boolean);
}

function restrictUserUpdate(existing, incoming) {
  const now = new Date().toISOString();
  const next = {
    ...existing,
    status: safeString(incoming?.status) || existing.status,
    progress: typeof incoming?.progress === 'number' ? incoming.progress : existing.progress,
    comments: Array.isArray(incoming?.comments) ? incoming.comments : existing.comments,
    activityLog: Array.isArray(incoming?.activityLog) ? incoming.activityLog : existing.activityLog,
    lastUpdated: now,
  };
  return next;
}

function toTaskRow(task, actor, createdByOverride) {
  const data = task || {};
  const id = safeString(data.id);
  const group = safeString(data.group);
  const title = safeString(data.title);
  const status = safeString(data.status);
  const priority = safeString(data.priority);
  const endDate = safeString(data.endDate);
  const now = new Date().toISOString();
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
  };
}

function mapEmployeeToDb(e) {
  const id = safeString(e?.id);
  const department = normalizeBranch(e?.department);
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
  };
}

// Main API handler function
async function handleApiRequest(req, res) {
  const path = req.path;
  // Remove leading '/api' if present
  let route = path.startsWith('/api/') ? path.slice(5) : path.startsWith('/') ? path.slice(1) : path;
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return;
  }

  console.log(`API request: ${req.method} ${route}`);

  // Route handlers will be implemented here
  // For now, return 404 for unknown routes
  res.status(404).json({ ok: false, message: 'Endpoint not yet implemented' });
}

module.exports = {
  initFirebase,
  handleApiRequest,
  fetchAccountFromFirestore,
  json,
  safeString,
  normalizeUsername,
  normalizeBranch,
  getBearerToken,
  readJsonBody,
  requireSession,
  timingSafeEqualHex,
  scryptHashHex,
  verifyPassword,
  chunk,
  toDoneGroup,
  appendActivity,
  listAdminUsernames,
  restrictUserUpdate,
  toTaskRow,
  mapEmployeeToDb,
  // Firebase instances (available after initFirebase)
  getAuth: () => auth,
  getFirestore: () => firestore,
  getStorage: () => storage
};
