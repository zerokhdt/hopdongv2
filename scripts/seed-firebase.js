import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const firestore = app.firestore();

function scryptHashHex(password, salt) {
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64');
  const key = crypto.scryptSync(String(password || ''), saltBuf, 64, { N: 16384, r: 8, p: 1 });
  return key.toString('hex');
}

function generatePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = scryptHashHex(password, salt);
  return `scrypt:${salt}:${hash}`;
}

async function seed() {
  console.log('Seeding Firestore accounts collection...');
  
  const accounts = [
    {
      username: 'admin',
      password_hash: generatePasswordHash('admin123'),
      branch: 'HQ',
      role: 'admin',
      active: true
    },
    {
      username: 'user',
      password_hash: generatePasswordHash('user123'),
      branch: 'HN',
      role: 'user',
      active: true
    }
  ];

  for (const account of accounts) {
    const docRef = firestore.collection('accounts').doc(account.username.toLowerCase());
    await docRef.set(account);
    console.log(`Created account: ${account.username}`);
  }

  console.log('Seeding completed');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});