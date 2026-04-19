// Tên file: Code.gs (Trên Google Apps Script)
// Nhiệm vụ: Xây dựng API hai chiều phục vụ Hệ thống Tuyển dụng ACE HRM

// Cấu hình ánh xạ cột
const COLUMN_MAP = {
  TIMESTAMP: 0, // A
  EMAIL: 2, // C
  STATUS: 3, // D
  NAME: 4, // E
  PHONE: 5, // F
  BRANCH: 9, // J
  CV_URL: 15, // P
  POSITION: 16, // Q
  INTERVIEW_NOTE: 17, // R
  // Thêm các cột khác từ form phỏng vấn ở đây
  // Ví dụ: INTERVIEW_SCORE: 18, // S
};

function setupRecruitmentSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'CV ĐẦU VÀO';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName, 0);

  const headerByIndex = {
    [COLUMN_MAP.TIMESTAMP]: 'Dấu thời gian',
    [COLUMN_MAP.EMAIL]: 'Địa chỉ email',
    [COLUMN_MAP.STATUS]: 'TÌNH TRẠNG ĐẦU VÀO',
    [COLUMN_MAP.NAME]: 'Họ và tên ứng viên',
    [COLUMN_MAP.PHONE]: 'Số điện thoại liên hệ',
    [COLUMN_MAP.BRANCH]: 'CN nhận hồ sơ',
    [COLUMN_MAP.CV_URL]: 'CV URL',
    [COLUMN_MAP.POSITION]: 'Vị trí ứng tuyển',
    [COLUMN_MAP.INTERVIEW_NOTE]: 'Ghi chú',
  };

  const maxIndex = Math.max(...Object.values(COLUMN_MAP));
  const colCount = Math.max(maxIndex + 1, 18);
  const row = new Array(colCount).fill('');
  Object.entries(headerByIndex).forEach(([idx, label]) => {
    row[Number(idx)] = label;
  });

  sheet.getRange(1, 1, 1, colCount).setValues([row]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, colCount).setFontWeight('bold').setBackground('#f8fafc');

  return { success: true, spreadsheetId: ss.getId(), sheetName, colCount };
}

function getSheetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  return sheet.getDataRange().getValues();
}

function rowToCandidate(row) {
  if (!row[COLUMN_MAP.TIMESTAMP]) return null;
  // Trả về một object chứa toàn bộ dữ liệu của một hàng để hiển thị chi tiết
  const candidateData = {};
  const headers = getSheetData()[0]; // Lấy dòng tiêu đề để làm key
  headers.forEach((header, index) => {
    if (header) {
      candidateData[header] = row[index] ? row[index].toString().trim() : '';
    }
  });
  // Thêm ID để định danh
  candidateData.id = row[COLUMN_MAP.TIMESTAMP].toString().trim();
  return candidateData;
}

// 1. CHỨC NĂNG GET: Lấy dữ liệu ứng viên
function doGet(e) {
  try {
    const data = getSheetData();
    const headers = data.shift(); // Tách dòng tiêu đề
    
    // Nếu có ID, tìm và trả về một ứng viên
    if (e.parameter.id) {
      const candidateId = e.parameter.id;
      const row = data.find(r => r[COLUMN_MAP.TIMESTAMP].toString().trim() === candidateId);
      if (row) {
        const candidate = rowToCandidate(row);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: candidate })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Không tìm thấy ứng viên" })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Nếu không có ID, trả về danh sách tóm tắt
    const candidates = data.map(row => {
      if (!row[COLUMN_MAP.TIMESTAMP]) return null;
      return {
        id: row[COLUMN_MAP.TIMESTAMP].toString().trim(),
        email: row[COLUMN_MAP.EMAIL] ? row[COLUMN_MAP.EMAIL].toString().trim() : '',
        name: row[COLUMN_MAP.NAME] ? row[COLUMN_MAP.NAME].toString().trim() : 'Ứng viên',
        phone: row[COLUMN_MAP.PHONE] ? row[COLUMN_MAP.PHONE].toString().trim() : '',
        branch: row[COLUMN_MAP.BRANCH] ? row[COLUMN_MAP.BRANCH].toString().split(':')[0].trim() : '',
        cvUrl: row[COLUMN_MAP.CV_URL] ? row[COLUMN_MAP.CV_URL].toString().trim() : '',
        position: row[COLUMN_MAP.POSITION] ? row[COLUMN_MAP.POSITION].toString().trim() : 'Giáo viên',
        status: row[COLUMN_MAP.STATUS] ? row[COLUMN_MAP.STATUS].toString().trim() : 'PENDING'
      };
    }).filter(Boolean); // Lọc bỏ các giá trị null

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: candidates })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. CHỨC NĂNG POST: Nhận kết quả phỏng vấn từ ACE HRM đẩy ngược vào lại Google Sheet
function doPost(e) {
  try {
    if (!e.postData) {
      return ContentService.createTextOutput(JSON.stringify({status: "ok"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    const request = JSON.parse(e.postData.contents);
    // Thêm một lớp bảo mật đơn giản, nếu có
    // const SYNC_SECRET = "your_secret_here"; 
    // if (request.secret !== SYNC_SECRET) {
    //   throw new Error("Invalid secret");
    // }

    const payload = request.payload || request; // Hỗ trợ cả payload cũ và mới
    const action = request.action || 'update_interview'; // Mặc định là update_interview

    switch (action) {
      case 'update_interview':
        return handleUpdateInterview(payload);
      // Thêm các action khác ở đây
      // case 'another_action':
      //   return handleAnotherAction(payload);
      default:
        throw new Error("Unknown action: " + action);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpdateInterview(payload) {
  const candidateId = payload.id;
  if (!candidateId) {
    throw new Error("Thiếu ID ứng viên trong payload");
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const rowIndex = data.findIndex(row => row[COLUMN_MAP.TIMESTAMP].toString().trim() === candidateId);
  
  if (rowIndex > 0) {
    // Cập nhật các trường dữ liệu từ payload
    if (payload.status) {
      sheet.getRange(rowIndex + 1, COLUMN_MAP.STATUS + 1).setValue(payload.status);
    }
    if (payload.interview_note) {
      sheet.getRange(rowIndex + 1, COLUMN_MAP.INTERVIEW_NOTE + 1).setValue(payload.interview_note);
    }
    // Thêm các trường cập nhật khác ở đây
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Cập nhật thành công" })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Không tìm thấy hồ sơ" })).setMimeType(ContentService.MimeType.JSON);
  }
}
