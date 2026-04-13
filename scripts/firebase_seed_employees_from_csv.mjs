import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from './firebase-admin-script.js';

const inputPath = process.argv[2];

if (!inputPath) {
  process.stderr.write('Usage: node scripts/firebase_seed_employees_from_csv.mjs <input.csv>\n');
  process.exit(1);
}

const inputAbs = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);

function safeString(v) {
  return String(v ?? '').trim();
}

function normalizeBranch(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.toUpperCase().replace(/\s+/g, ' ');
}

async function parseCsv(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function mapEmployeeToDb(e) {
  const id = safeString(e?.id || e?.ID || e?.['Mã NV'] || e?.['Ma NV']);
  const department = normalizeBranch(e?.department || e?.['Phòng ban'] || e?.['Phong ban'] || e?.['Chi nhánh'] || e?.['Chi nhanh']);
  return {
    id,
    title: safeString(e?.title || e?.['Danh xưng'] || e?.['Danh xung']) || null,
    name: safeString(e?.name || e?.['Họ tên'] || e?.['Ho ten'] || e?.['Tên'] || e?.['Ten']) || null,
    position: safeString(e?.position || e?.['Chức vụ'] || e?.['Chuc vu']) || null,
    department: department || null,
    email: safeString(e?.email) || null,
    phone: safeString(e?.phone || e?.['Số điện thoại'] || e?.['So dien thoai']) || null,
    start_date: safeString(e?.startDate || e?.['Ngày vào làm'] || e?.['Ngay vao lam']) || null,
    probation_date: safeString(e?.probationDate || e?.['Ngày thử việc'] || e?.['Ngay thu viec']) || null,
    seniority: safeString(e?.seniority || e?.['Thâm niên'] || e?.['Tham nien']) || null,
    contract_date: safeString(e?.contractDate || e?.['Ngày ký HĐ'] || e?.['Ngay ky HD']) || null,
    renew_date: safeString(e?.renewDate || e?.['Ngày tái ký HĐ'] || e?.['Ngay tai ky HD']) || null,
    education: safeString(e?.education || e?.['Học vấn'] || e?.['Hoc van']) || null,
    major: safeString(e?.major || e?.['Chuyên ngành'] || e?.['Chuyen nganh']) || null,
    pedagogy_cert: safeString(e?.pedagogyCert || e?.['Chứng chỉ sư phạm'] || e?.['Chung chi su pham']) || null,
    has_insurance: safeString(e?.hasInsurance || e?.['Đã tham gia BHXH'] || e?.['Da tham gia BHXH']) || null,
    insurance_agency: safeString(e?.insuranceAgency || e?.['Cơ quan BHXH'] || e?.['Co quan BHXH']) || null,
    document_status: safeString(e?.documentStatus || e?.['Trạng thái hồ sơ'] || e?.['Trang thai ho so']) || null,
    salary: safeString(e?.salary || e?.['Lương'] || e?.['Luong']) || null,
    salary_base: safeString(e?.salaryBase || e?.['Lương cơ bản'] || e?.['Luong co ban']) || null,
    allowance_housing: safeString(e?.allowanceHousing || e?.['Phụ cấp nhà ở'] || e?.['Phu cap nha o']) || null,
    allowance_travel: safeString(e?.allowanceTravel || e?.['Phụ cấp đi lại'] || e?.['Phu cap di lai']) || null,
    allowance_phone: safeString(e?.allowancePhone || e?.['Phụ cấp điện thoại'] || e?.['Phu cap dien thoai']) || null,
    cccd: safeString(e?.cccd || e?.['CCCD']) || null,
    cccd_date: safeString(e?.cccdDate || e?.['Ngày cấp CCCD'] || e?.['Ngay cap CCCD']) || null,
    cccd_place: safeString(e?.cccdPlace || e?.['Nơi cấp CCCD'] || e?.['Noi cap CCCD']) || null,
    dob: safeString(e?.dob || e?.['Ngày sinh'] || e?.['Ngay sinh']) || null,
    address: safeString(e?.address || e?.['Địa chỉ thường trú'] || e?.['Dia chi thuong tru']) || null,
    current_address: safeString(e?.currentAddress || e?.['Địa chỉ tạm trú'] || e?.['Dia chi tam tru']) || null,
    nationality: safeString(e?.nationality || e?.['Quốc tịch'] || e?.['Quoc tich']) || 'Việt Nam',
    avatar_url: safeString(e?.avatarUrl || e?.['Avatar']) || null,
    bank_account: safeString(e?.bankAccount || e?.['Số tài khoản'] || e?.['So tai khoan']) || null,
    bank_name: safeString(e?.bankName || e?.['Ngân hàng'] || e?.['Ngan hang']) || null,
    tax_code: safeString(e?.taxCode || e?.['Mã số thuế'] || e?.['Ma so thue']) || null,
    note: safeString(e?.note || e?.['Ghi chú'] || e?.['Ghi chu']) || null,
    raw_status: safeString(e?.rawStatus || e?.['Trạng thái'] || e?.['Trang thai']) || null,
    created_at: new Date().toISOString()
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seed() {
  const rawEmployees = await parseCsv(inputAbs);
  const mapped = rawEmployees.map(mapEmployeeToDb).filter(e => e.id && e.name);
  if (mapped.length === 0) {
    console.log('No valid employees found in CSV.');
    process.exit(0);
  }

  const branchesSet = new Set();
  mapped.forEach(e => {
    if (e.department) branchesSet.add(e.department);
  });

  const branches = Array.from(branchesSet).map(b => ({ id: b, name: b }));

  if (branches.length > 0) {
    const batch = db.batch();
    branches.forEach(b => {
      const ref = db.collection('branches').doc(b.id);
      batch.set(ref, b);
    });
    await batch.commit();
    console.log(`Seeded ${branches.length} branches.`);
  }

  let upserted = 0;
  for (const part of chunk(mapped, 500)) {
    const batch = db.batch();
    part.forEach(e => {
      const ref = db.collection('employees').doc(e.id);
      batch.set(ref, e);
    });
    await batch.commit();
    upserted += part.length;
  }

  console.log(`Seeded ${upserted} employees to Firebase Firestore.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
