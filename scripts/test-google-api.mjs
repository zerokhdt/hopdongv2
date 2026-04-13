import fs from 'node:fs';
import path from 'node:path';

// --- HƯỚNG DẪN ---
// 1. Dán URL Web App bạn vừa Deploy vào đây:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7N-myUyrTPsPaskViGuWdGGDIis58LvFfMVMXgEADkNRPrvwccNoOqhWcZzZ1cE9W/exec"; 
const SECRET = "moon_map_2026";

async function testUpload() {
  if (!GOOGLE_SCRIPT_URL) {
    console.error("❌ LỖI: Bạn chưa điền GOOGLE_SCRIPT_URL vào file này.");
    return;
  }

  const filePath = path.resolve('mock_scan_nv.pdf');
  if (!fs.existsSync(filePath)) {
    console.error("❌ LỖI: Không tìm thấy file mock_scan_nv.pdf.");
    return;
  }

  console.log("⏳ Đang đọc file và chuyển sang Base64...");
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  const payload = {
    action: "uploadFile",
    secret: SECRET,
    fileName: "test_scan_antigravity.pdf",
    mimeType: "application/pdf",
    base64: base64,
    ma_nv: "TEST-001",
    ho_ten: "Người Kiểm Thử Hệ Thống"
  };

  console.log("🚀 Đang gửi yêu cầu tới Google Apps Script...");
  try {
    const resp = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS yêu cầu text/plain hoặc application/json
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (result.ok) {
      console.log("✅ THÀNH CÔNG!");
      console.log("🔗 Link file Drive:", result.url);
      console.log("📊 Hãy kiểm tra Google Sheet để thấy dòng log mới.");
    } else {
      console.error("❌ THẤT BẠI:", result.error);
    }
  } catch (err) {
    console.error("❌ LỖI KẾT NỐI:", err.message);
  }
}

testUpload();
