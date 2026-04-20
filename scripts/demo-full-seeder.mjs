import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}, 'seeder');

const firestore = firebaseApp.firestore();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BRANCHES = [
  'ACE AN SƯƠNG', 'ACE PHAN VĂN HỚN', 'ACE HÀ HUY GIÁP', 'ACE LÊ VĂN KHƯƠNG',
  'ACE TRỤ SỞ CHÍNH', 'ACE LÊ LỢI', 'ACE TRUNG MỸ TÂY', 'ACE THỚI AN',
  'ACE XUÂN THỚI THƯỢNG', 'ACE ĐẶNG THÚC VỊNH'
];

const POSITIONS = {
  MANAGER: 'Quản lý chi nhánh',
  DEPT_HEAD: 'Trưởng bộ phận',
  TA: 'Trợ giảng (TA)',
  TEACHER: 'Giáo viên thỉnh giảng',
  SECURITY: 'Bảo vệ',
  CLEANER: 'Tạp vụ'
};

// Simple CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur.trim()); cur = ''; }
      else if (ch === '\n') { row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows;
}

async function wipeFirestore() {
  console.log('Wiping Firestore collections...');
  const collections = ['employees', 'branches', 'tasks', 'notifications', 'employee_import_requests'];
  for (const coll of collections) {
    const snapshot = await firestore.collection(coll).get();
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`- Deleted ${snapshot.size} docs from ${coll}`);
  }
}

async function wipeSupabase() {
  console.log('Wiping Supabase tables...');
  const tables = ['interviews', 'candidates', 'employees', 'branches'];
  for (const table of tables) {
    const { error, count } = await supabase.from(table).delete().neq('created_at', '2000-01-01');
    if (error) console.error(`Error wiping ${table}:`, error.message);
    else console.log(`- Wiped ${table}`);
  }
}

async function seed() {
  try {
    await wipeFirestore();
    await wipeSupabase();

    // 1. Seed Branches
    console.log('Seeding branches...');
    const firestoreBatch = firestore.batch();
    const supabaseBranches = [];
    
    for (const b of BRANCHES) {
      firestoreBatch.set(firestore.collection('branches').doc(b), { id: b, name: b });
      supabaseBranches.push({ id: b, name: b });
    }
    await firestoreBatch.commit();
    await supabase.from('branches').insert(supabaseBranches);

    // 2. Generate 300 Employees
    console.log('Generating 300 employees...');
    const employees = [];
    const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];
    const middleNames = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Thanh', 'Quốc', 'Ngọc', 'Kim', 'Anh'];
    const lastNames = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Giang', 'Hương', 'Hải', 'Khánh', 'Linh', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quang', 'Sơn', 'Tuấn', 'Vinh', 'Xuân', 'Yến'];

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const createName = () => `${getRandom(firstNames)} ${getRandom(middleNames)} ${getRandom(lastNames)}`;

    // 1 Manager per branch
    for (const b of BRANCHES) {
      employees.push({
        id: `ACE-MGR-${employees.length + 100}`,
        name: createName(),
        department: b,
        position: POSITIONS.MANAGER,
        startDate: '2023-01-01',
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `mgr.${employees.length}@ace.edu.vn`,
        status: 'active'
      });
    }

    // 2 Dept Heads per branch
    for (const b of BRANCHES) {
      for (let i = 0; i < 2; i++) {
        employees.push({
          id: `ACE-HOD-${employees.length + 100}`,
          name: createName(),
          department: b,
          position: POSITIONS.DEPT_HEAD,
          startDate: '2023-06-01',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: `hod.${employees.length}@ace.edu.vn`,
          status: 'active'
        });
      }
    }

    // Others until 300
    const otherRoles = [POSITIONS.TA, POSITIONS.TEACHER, POSITIONS.SECURITY, POSITIONS.CLEANER];
    while (employees.length < 300) {
      const b = getRandom(BRANCHES);
      employees.push({
        id: `ACE-EMP-${employees.length + 100}`,
        name: createName(),
        department: b,
        position: getRandom(otherRoles),
        startDate: '2024-01-15',
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `staff.${employees.length}@ace.edu.vn`,
        status: 'active'
      });
    }

    // Save employees to Firestore (Chunks of 500 for batch)
    console.log('Uploading employees to Firestore...');
    const empChunks = [];
    for (let i = 0; i < employees.length; i += 500) {
      empChunks.push(employees.slice(i, i + 500));
    }
    for (const chunk of empChunks) {
      const batch = firestore.batch();
      chunk.forEach(e => batch.set(firestore.collection('employees').doc(e.id), e));
      await batch.commit();
    }

    // 3. Parse Candidates from CSV
    console.log('Parsing candidates from CSV...');
    const csvPath = join(process.cwd(), 'REF/Bản sao của TUYỂN DỤNG Á CHÂU (Câu trả lời) - TỔNG HỢP.csv');
    const csvData = readFileSync(csvPath, 'utf8');
    const rows = parseCSV(csvData);
    
    // Find header (Skip first row of garbage)
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].includes('Họ và tên ứng viên:\nFull name:')) { headerIdx = i; break; }
    }

    if (headerIdx === -1) {
      console.error('Could not find candidate CSV header');
    } else {
      const headers = rows[headerIdx];
      const nameIdx = headers.indexOf('Họ và tên ứng viên:\nFull name:');
      const emailIdx = headers.indexOf('Địa chỉ email');
      const phoneIdx = headers.indexOf('Số điện thoại liên hệ:\nPhone number:');
      const branchIdx = headers.indexOf('Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu?\nWhere would you like to work among A Chau English centers system?');
      const posIdx = headers.indexOf('Bạn muốn làm việc ở vị trí nào?\n(Which position would you like to apply for?)');
      const expIdx = headers.indexOf('Bạn có bao nhiêu kinh nghiệm ở vị trí ứng tuyển? (0: Chưa có kinh nghiệm; 0.5: nửa năm kinh nghiệm; 1: một năm kinh nghiệm,...):\nYour experiences in that position (the number of years):');

      const candidates = [];
      const dataRows = rows.slice(headerIdx + 1).filter(r => r[nameIdx] && r[nameIdx].trim());
      
      console.log(`Processing ${dataRows.length} real candidates...`);
      
      for (const r of dataRows) {
        // Map real branch name to our standardized IDs
        let rawBranch = r[branchIdx] || '';
        let assignedBranch = BRANCHES[0]; // Default
        for (const b of BRANCHES) {
          if (rawBranch.toUpperCase().includes(b.split(' ').slice(1).join(' '))) {
            assignedBranch = b;
            break;
          }
        }

        candidates.push({
          full_name: r[nameIdx],
          email: r[emailIdx] || null,
          phone: r[phoneIdx] || null,
          position: r[posIdx] || 'Staff',
          experience: r[expIdx] || '0',
          branch_assigned: assignedBranch,
          status: 'NEW',
          workflow_status: 'NEW',
          created_at: new Date().toISOString()
        });
      }

      // Upload candidates to Supabase in chunks
      console.log('Uploading candidates to Supabase...');
      for (let i = 0; i < candidates.length; i += 100) {
        const { error } = await supabase.from('candidates').insert(candidates.slice(i, i + 100));
        if (error) console.error('Error inserting candidates:', error.message);
      }
    }

    console.log('Seeding COMPLETED successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Seeding FAILED:', err);
    process.exit(1);
  }
}

seed();
