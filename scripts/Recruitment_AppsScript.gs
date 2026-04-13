// Tên file: Code.gs (Trên Google Apps Script)
// Nhiệm vụ: Xây dựng API hai chiều phục vụ Hệ thống Tuyển dụng ACE HRM

// 1. CHỨC NĂNG GET: Lấy toàn bộ dữ liệu ứng viên đưa về Hệ thống ACE HRM
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // Lấy Sheet đầu tiên
    const data = sheet.getDataRange().getValues();
    
    // Bỏ qua dòng tiêu đề (Dòng 1 đến dòng 4 thường là tiêu đề)
    const candidates = [];
    for (var i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Cột A là Timestamp, nếu không có thì bỏ qua dòng trống
      
      candidates.push({
        id: row[0].toString().trim(),         // Cột A: Timestamp
        email: row[2] ? row[2].toString().trim() : '',       // Cột C: Email
        name: row[4] ? row[4].toString().trim() : 'Ứng viên',        // Cột E: Họ và Tên
        phone: row[5] ? row[5].toString().trim() : '',       // Cột F: SĐT
        branch: row[9] ? row[9].toString().split(':')[0].trim() : '',      // Cột J: Chi nhánh ưu tiên
        cvUrl: row[15] ? row[15].toString().trim() : '',      // Cột P: Link CV
        position: row[16] ? row[16].toString().trim() : 'Giáo viên',   // Cột Q: Vị trí
        status: row[3] ? row[3].toString().trim() : 'PENDING'       // Cột D: Tình trạng
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      data: candidates 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. CHỨC NĂNG POST: Nhận kết quả phỏng vấn từ ACE HRM đẩy ngược vào lại Google Sheet
function doPost(e) {
  try {
    if (e.postData === undefined) {
      return ContentService.createTextOutput(JSON.stringify({status: "ok"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    const payload = JSON.parse(e.postData.contents);
    const candidateId = payload.id;        
    const interviewScore = payload.score;  
    const interviewNote = payload.note;    
    const updatedStatus = payload.status;  
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    let updated = false;
    for (var i = 1; i < data.length; i++) {
      const rowstamp = data[i][0].toString().trim();
      if (rowstamp === candidateId) {
        // Cập nhật giá trị vào Cột D (4)
        sheet.getRange(i + 1, 4).setValue(updatedStatus); 
        // Viết ghi chú phỏng vấn vào Cột R (Cột 18) mới
        sheet.getRange(i + 1, 18).setValue("Điểm: " + interviewScore + " - Nhận xét: " + interviewNote);
        updated = true;
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, message: updated ? "Thành công" : "Không tìm thấy hồ sơ"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
