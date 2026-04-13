import { db } from './firebase-admin-script.js';
import crypto from 'node:crypto';

function scryptHashHex(password, salt) {
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64');
  const key = crypto.scryptSync(String(password || ''), saltBuf, 64, { N: 16384, r: 8, p: 1 });
  return key.toString('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = scryptHashHex(password, salt);
  return `scrypt:${salt}:${hash}`;
}

const accounts = [
  { username: 'admin', password: '123456', branch: 'HQ', role: 'admin' },
  { username: 'hq', password: '123456', branch: 'HQ', role: 'user' },
  { username: 'xommoi', password: '123456', branch: 'XÓM MỚI', role: 'user' },
  { username: 'thongnhat', password: '123456', branch: 'THỐNG NHẤT', role: 'user' },
  { username: 'lienkhu45', password: '123456', branch: 'LIÊN KHU 4-5', role: 'user' },
  { username: 'goxoai', password: '123456', branch: 'GÒ XOÀI', role: 'user' },
  { username: 'xuanthoithuong', password: '123456', branch: 'XUÂN THỚI THƯỢNG', role: 'user' },
  { username: 'phanvanhon', password: '123456', branch: 'PHAN VĂN HỚN', role: 'user' },
  { username: 'leloi', password: '123456', branch: 'LÊ LỢI', role: 'user' },
  { username: 'levankhuong', password: '123456', branch: 'LÊ VĂN KHƯƠNG', role: 'user' },
  { username: 'ansuong', password: '123456', branch: 'AN SƯƠNG', role: 'user' },
  { username: 'dangthucvinh', password: '123456', branch: 'ĐẶNG THÚC VỊNH', role: 'user' },
  { username: 'hahuygiap', password: '123456', branch: 'HÀ HUY GIÁP', role: 'user' },
  { username: 'tansonnhi', password: '123456', branch: 'TÂN SƠN NHÌ', role: 'user' },
  { username: 'trungmytay', password: '123456', branch: 'TRUNG MỸ TÂY', role: 'user' },
  { username: 'thoian', password: '123456', branch: 'THỚI AN', role: 'user' },
  { username: 'dreamhome', password: '123456', branch: 'DREAM HOME', role: 'user' },
];

async function seed() {
  const batch = db.batch();
  for (const acc of accounts) {
    const ref = db.collection('accounts').doc(acc.username);
    batch.set(ref, {
      username: acc.username,
      password_hash: hashPassword(acc.password),
      branch: acc.branch,
      role: acc.role,
      active: true,
      created_at: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`Seeded ${accounts.length} accounts to Firebase Firestore.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
