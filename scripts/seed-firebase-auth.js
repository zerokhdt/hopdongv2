import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const auth = app.auth();

async function seed() {
  console.log('Seeding Firebase Auth users...');
  
  try {
    // Create admin user
    const adminUser = await auth.createUser({
      email: 'admin@acehrm2026.local',
      password: 'admin123',
      emailVerified: false,
      disabled: false,
    });
    
    await auth.setCustomUserClaims(adminUser.uid, {
      branch: 'HQ',
      role: 'admin',
      username: 'admin'
    });
    
    console.log('Created admin user:', adminUser.uid);
    
    // Create regular user
    const regularUser = await auth.createUser({
      email: 'user@acehrm2026.local',
      password: 'user123',
      emailVerified: false,
      disabled: false,
    });
    
    await auth.setCustomUserClaims(regularUser.uid, {
      branch: 'HN',
      role: 'user',
      username: 'user'
    });
    
    console.log('Created regular user:', regularUser.uid);
    
    console.log('Seeding completed');
  } catch (error) {
    console.error('Error seeding Firebase Auth:', error);
    throw error;
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});