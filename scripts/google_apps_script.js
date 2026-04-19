// ============================================================ 
// ROUTING VÀ API ENDPOINTS
// ============================================================ 

function doGet(e) { 
  if (e && e.parameter && e.parameter.function) return handleRequest(e); 
  return HtmlService.createHtmlOutputFromFile('Index') 
    .setTitle('ACE HRM - Hệ thống Tuyển dụng') 
    .addMetaTag('viewport', 'width=device-width, initial-scale=1') 
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); 
} 

function doPost(e) { 
  return handleRequest(e); 
} 

function handleRequest(e) { 
  try { 
    let functionName, payload; 

    if (e.postData) { 
      const jsonData = JSON.parse(e.postData.contents); 
      functionName = jsonData.function; 
      payload = jsonData.payload; 
    } else if (e.parameter) { 
      functionName = e.parameter.function; 
      if (e.parameter.payload) { 
        try { payload = JSON.parse(e.parameter.payload); } 
        catch (_) { payload = e.parameter.payload; } 
      } 
    } else { 
      return createJsonResponse({ error: 'Invalid request format' }, 400); 
    } 

    if (!functionName) return createJsonResponse({ error: 'Missing function parameter' }, 400); 

    let result; 
    switch (functionName) { 
      case 'verifyLogin':           result = verifyLogin(payload.branch, payload.password); break; 
      case 'getBranches':           result = getBranches(); break; 
      case 'getCandidates':         result = getCandidates(); break;
      case 'getCandidatesByBranch': result = getCandidatesByBranch(payload); break; 
      case 'getCandidateDetails':   result = getCandidateDetails(payload); break; 
      case 'saveInterviewResult':   result = saveInterviewResult(payload); break; 
      case 'getLiveCandidates':     result = getLiveCandidates(); break; 
      case 'debugSheetInfo':        result = debugSheetInfo(); break; 
      case 'debugCandidateDetails': result = debugCandidateDetails(payload); break; 
      
      // BỔ SUNG 3 ENDPOINTS CHO HỆ THỐNG EMAIL
      case 'sendRecruitmentEmail':  result = sendRecruitmentEmail(payload); break;
      case 'getEmailTemplates':     result = getEmailTemplates(); break;
      case 'scanEmailReplies':      result = scanEmailReplies(); break;
      
      default: return createJsonResponse({ error: 'Function not found: ' + functionName }, 404); 
    } 

    return createJsonResponse({ success: true, data: result }); 

  } catch (error) { 
    console.error('Error handling request:', error); 
    return createJsonResponse({ error: 'Internal server error', message: error.toString() }, 500); 
  } 
} 

function createJsonResponse(data, statusCode) { 
  const body = statusCode && statusCode !== 200 
    ? Object.assign({ statusCode }, data) 
    : data; 
  const output = ContentService.createTextOutput(JSON.stringify(body)); 
  output.setMimeType(ContentService.MimeType.JSON); 
  return output; 
} 

// ============================================================ 
// AUTH & BẢO MẬT
// ============================================================ 

function verifyLogin(branch, password) { 
  const correctPw = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD') || 'ace2026'; 
  if (!password || password !== correctPw) { 
    return { success: false, message: 'Sai mật khẩu!' }; 
  } 
  const branches = getBranches(); 
  if (branch && branches.length > 0 && !branches.includes(branch)) { 
    return { success: false, message: 'Chi nhánh không hợp lệ!' }; 
  } 
  return { success: true, message: 'Đăng nhập thành công' }; 
} 

// ============================================================ 
// HELPERS (Dùng chung)
// ============================================================ 

function _getCVSheetInfo() { 
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const sheet = ss.getSheetByName('CV ĐẦU VÀO'); 
  if (!sheet) return null; 
  const data = sheet.getDataRange().getValues(); 
  if (data.length < 2) return null; 

  let headerIndex = 3; 
  for (let i = 0; i < Math.min(5, data.length); i++) { 
    const rowStr = data[i].join('').toLowerCase(); 
    if (rowStr.includes('cn nhận hồ sơ') || rowStr.includes('họ và tên ứng viên')) { 
      headerIndex = i; 
      break; 
    } 
  } 
  return { sheet, data, headerIndex, header: data[headerIndex] }; 
} 

function _colIndex(header, keyword) { 
  for (let c = 0; c < header.length; c++) { 
    const t = header[c].toString().toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(); 
    if (t.includes(keyword)) return c; 
  } 
  return -1; 
} 

function _formatDate(val) { 
  if (!val) return ''; 
  if (val instanceof Date) { 
    const d = val.getDate(), m = val.getMonth() + 1, y = val.getFullYear(); 
    return (d < 10 ? '0' + d : d) + '/' + (m < 10 ? '0' + m : m) + '/' + y; 
  } 
  return val.toString().trim(); 
} 

function _str(val) { 
  if (val === null || val === undefined || val === '') return ''; 
  if (val instanceof Date) return _formatDate(val); 
  return val.toString().trim(); 
} 

function getCandidates() {
  const info = _getCVSheetInfo();
  if (!info) return [];

  const { sheet, headerIndex, header } = info;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerIndex + 1) return [];

  const nameCol = _colIndex(header, 'họ và tên');
  const emailCol = _colIndex(header, 'địa chỉ email');
  const phoneCol = _colIndex(header, 'số điện thoại');
  const branchCol = Math.max(_colIndex(header, 'cn nhận hồ sơ'), _colIndex(header, 'chi nhánh nhận'));
  const statusCol = _colIndex(header, 'tình trạng');

  const values = sheet.getRange(headerIndex + 2, 1, lastRow - (headerIndex + 1), lastCol).getValues();

  const result = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const sheetRowIndex = headerIndex + 2 + i;
    const name = nameCol >= 0 ? _str(row[nameCol]) : '';
    if (!name) continue;

    result.push({
      rowIndex: sheetRowIndex,
      name,
      email: emailCol >= 0 ? _str(row[emailCol]) : '',
      phone: phoneCol >= 0 ? _str(row[phoneCol]) : '',
      branch: branchCol >= 0 ? _str(row[branchCol]) : '',
      status: statusCol >= 0 ? _str(row[statusCol]) : ''
    });
  }

  return result;
}

function getCandidateDetails(rowIndex) {
  const info = _getCVSheetInfo();
  if (!info) return null;

  const { sheet, headerIndex, header } = info;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const idx = parseInt(rowIndex, 10);
  if (!idx || idx < headerIndex + 2 || idx > lastRow) return null;

  const row = sheet.getRange(idx, 1, 1, lastCol).getValues()[0];
  const obj = {};
  for (let c = 0; c < header.length; c++) {
    const key = _str(header[c]);
    if (!key) continue;
    obj[key] = _str(row[c]);
  }
  obj.rowIndex = idx;
  return obj;
}

function getBranches() {
  const info = _getCVSheetInfo();
  if (!info) return [];

  const { sheet, headerIndex, header } = info;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerIndex + 1) return [];

  const branchCol = Math.max(_colIndex(header, 'cn nhận hồ sơ'), _colIndex(header, 'chi nhánh nhận'));
  if (branchCol < 0) return [];

  const values = sheet.getRange(headerIndex + 2, 1, lastRow - (headerIndex + 1), lastCol).getValues();
  const set = {};
  for (let i = 0; i < values.length; i++) {
    const b = _str(values[i][branchCol]);
    if (!b) continue;
    set[b] = true;
  }
  return Object.keys(set);
}

function getCandidatesByBranch(payload) {
  const branch = payload && payload.branch ? String(payload.branch).trim() : '';
  if (!branch) return [];
  return getCandidates().filter(c => String(c.branch || '').trim() === branch);
}

function saveInterviewResult(payload) {
  const info = _getCVSheetInfo();
  if (!info) return { success: false, message: 'Sheet not found' };

  const { sheet, headerIndex, header } = info;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  const rowIndex = payload && payload.rowIndex ? parseInt(payload.rowIndex, 10) : 0;
  if (!rowIndex || rowIndex < headerIndex + 2 || rowIndex > lastRow) {
    return { success: false, message: 'Invalid rowIndex' };
  }

  const resultCol = _colIndex(header, 'kết quả');
  const noteCol = Math.max(_colIndex(header, 'ghi chú'), _colIndex(header, 'note'));

  if (resultCol >= 0 && payload && payload.result !== undefined) {
    sheet.getRange(rowIndex, resultCol + 1).setValue(payload.result);
  }
  if (noteCol >= 0 && payload && payload.notes !== undefined) {
    sheet.getRange(rowIndex, noteCol + 1).setValue(payload.notes);
  }

  return { success: true };
}

function getLiveCandidates() {
  return getCandidates();
}

// (Giữ lại các hàm getBranches, getCandidatesByBranch, getCandidateDetails, 
// saveInterviewResult, getLiveCandidates, _getEmbeddableUrl, debugSheetInfo nguyên gốc của bạn...)
// Bạn có thể dán tiếp phần code ứng viên của bạn vào đây mà không ảnh hưởng hệ thống.
// ============================================================ 
// EMAIL SENDING & PROCESSING CORE
// ============================================================ 

/**
 * Trả về danh sách template hỗ trợ
 */
function getEmailTemplates() {
  const templates = {};
  Object.keys(EMAIL_TEMPLATES).forEach(templateKey => {
    templates[templateKey] = {
      name: templateKey,
      languages: Object.keys(EMAIL_TEMPLATES[templateKey]),
      sampleSubject: EMAIL_TEMPLATES[templateKey].vi?.subject || 'No subject'
    };
  });
  
  return { success: true, templates: templates };
}

/**
 * Gửi email recruitment (với kiểm tra Quota)
 */
function sendRecruitmentEmail(payload) {
  try {
    console.log('[EMAIL] Starting sendRecruitmentEmail with payload:', payload);
    
    // 1. Kiểm tra giới hạn Quota của Gmail API
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota < 1) {
      return { success: false, error: 'Hệ thống đã hết lượt gửi email hôm nay (Quota Limit). Vui lòng thử lại vào ngày mai.' };
    }

    if (!payload || !payload.template || !payload.candidateData) {
      return { success: false, error: 'Missing required parameters: template and candidateData' };
    }
    
    const templateGroup = EMAIL_TEMPLATES[payload.template];
    if (!templateGroup) return { success: false, error: `Template not found: ${payload.template}` };
    
    const language = payload.language || 'vi';
    const template = templateGroup[language];
    if (!template) return { success: false, error: `Language not supported: ${language}` };
    
    // 2. Chuẩn bị Variables
    const candidateId = payload.candidateData.id || 'unknown';
    const variables = {
      ...payload.candidateData,
      candidate_id: candidateId, // Rất quan trọng để chèn vào Ref ẩn
      script_id: ScriptApp.getScriptId(),
      current_date: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
      confirm_link: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/confirm?cid=${candidateId}&action=accept`,
      decline_link: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/confirm?cid=${candidateId}&action=decline`,
      reschedule_link: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/confirm?cid=${candidateId}&action=reschedule`,
      accept_link: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/confirm?cid=${candidateId}&action=accept_offer`
    };
    
    // 3. Thay thế biến vào Template
    let subject = payload.customSubject || template.subject;
    let body = payload.customBody || template.body;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key] || '';
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });
    
    // Xóa các placeholder bị dư thừa
    subject = subject.replace(/\{\{.*?\}\}/g, '');
    body = body.replace(/\{\{.*?\}\}/g, '');
    
    const to = payload.recipients || (payload.candidateData.email ? [payload.candidateData.email] : []);
    if (!to || to.length === 0) return { success: false, error: 'No recipients specified' };
    
    // 4. Gửi Email
    const emailOptions = {
      cc: payload.cc || '',
      bcc: payload.bcc || '',
      name: 'ACE HRM System',
      htmlBody: body,
      replyTo: 'ace.hrm@gmail.com' // Set thẳng reply-to để tránh reply nhầm
    };
    
    GmailApp.sendEmail(to.join(','), subject, '', emailOptions);
    
    // 5. Ghi Log
    // Trích xuất gần đúng MessageID
    const threads = GmailApp.search(`subject:"${subject.substring(0, 30)}" to:${to[0]}`, 0, 1);
    const messageId = threads.length > 0 ? threads[0].getId() : 'unknown';
    
    const logResult = _logEmailActivity({
      candidateId: candidateId,
      candidateName: payload.candidateData.candidate_name || payload.candidateData.name || 'Unknown',
      template: payload.template,
      language: language,
      recipients: to.join(', '),
      subject: subject,
      status: 'sent',
      messageId: messageId
    });
    
    return { success: true, messageId: messageId, logId: logResult.logId };
    
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    _logEmailActivity({
      candidateId: payload?.candidateData?.id || 'unknown',
      candidateName: payload?.candidateData?.candidate_name || payload?.candidateData?.name || 'Unknown',
      template: payload?.template || 'unknown',
      language: payload?.language || 'vi',
      recipients: payload?.recipients?.join(', ') || 'unknown',
      subject: payload?.customSubject || 'unknown',
      status: 'failed',
      error: error.toString()
    });
    
    return { success: false, error: error.toString() };
  }
}

/**
 * Ghi Log Activity (Có xử lý tránh đụng độ LockService)
 */
function _logEmailActivity(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Chờ tối đa 10s nếu Sheet đang bị ghi bởi process khác
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('EMAIL_LOGS');
    
    if (!sheet) {
      sheet = ss.insertSheet('EMAIL_LOGS');
      sheet.getRange(1, 1, 1, 12).setValues([[
        'Timestamp', 'Candidate ID', 'Candidate Name', 'Template', 'Language',
        'Recipients', 'Subject', 'Status', 'Error', 'Message ID', 'Log Source', 'Sync Status'
      ]]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#2563eb').setFontColor('white');
      sheet.setFrozenRows(1);
    }
    
    const timestamp = new Date();
    const logId = Utilities.formatDate(timestamp, 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss') + '_' + Math.random().toString(36).substring(2, 6);
    
    const row = [
      timestamp,
      data.candidateId || '',
      data.candidateName || '',
      data.template || '',
      data.language || 'vi',
      data.recipients || '',
      data.subject || '',
      data.status || 'sent',
      data.error || '',
      data.messageId || '',
      'GAS',
      'pending_sync'
    ];
    
    sheet.appendRow(row);
    
    return { success: true, logId: logId };
    
  } catch (error) {
    console.error('[EMAIL_LOG] Error logging email activity:', error);
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Scan Email Replies (Chạy qua Hourly Trigger)
 * Tối ưu hóa bằng Timestamp thay vì quét toàn bộ Inbox
 */
function scanEmailReplies() {
  console.log('[EMAIL_SCAN] Starting email reply scan at', new Date());
  
  try {
    const props = PropertiesService.getScriptProperties();
    const lastScanTime = props.getProperty('LAST_SCAN_TIME');
    
    // Tối ưu: Dùng epoch time cho truy vấn của Gmail để chỉ quét email MỚI
    let searchQuery = 'to:me subject:"Re: [ACE HRM]"';
    if (lastScanTime) {
      const epochSeconds = Math.floor(parseInt(lastScanTime) / 1000);
      searchQuery += ` after:${epochSeconds}`;
    } else {
      // Nếu chạy lần đầu, quét 1 ngày gần nhất
      const yesterday = new Date(Date.now() - 86400000);
      searchQuery += ` after:${Math.floor(yesterday.getTime() / 1000)}`;
    }

    const threads = GmailApp.search(searchQuery, 0, 50);
    console.log('[EMAIL_SCAN] Found', threads.length, 'potential reply threads');
    
    if (threads.length === 0) return { success: true, processed: 0, message: 'Không có phản hồi mới' };

    let processedCount = 0;
    
    for (const thread of threads) {
      const messages = thread.getMessages();
      if (messages.length < 2) continue; // Cần ít nhất bản gốc + 1 reply
      
      const lastMessage = messages[messages.length - 1];
      
      // Bỏ qua nếu email này đã được Star (tức là đã quét trước đó rồi)
      if (lastMessage.isStarred()) continue;

      const subject = lastMessage.getSubject();
      const body = lastMessage.getPlainBody();
      const from = lastMessage.getFrom();
      
      console.log('[EMAIL_SCAN] Processing reply from:', from, 'Subject:', subject);
      
      // 1. Trích xuất Candidate ID an toàn qua REF ẩn
      let candidateId = 'unknown';
      let candidateName = 'Unknown';
      
      const refMatch = body.match(/\[Ref:\s*CID-([a-zA-Z0-9_\-]+)\]/i);
      if (refMatch) {
        candidateId = refMatch[1];
      } else {
        // Fallback: Tìm trong Subject 
        const idMatch = subject.match(/ID:(\w+)/i);
        if (idMatch) candidateId = idMatch[1];
      }
      
      const nameMatch = subject.match(/\] (.+?) -/);
      if (nameMatch) candidateName = nameMatch[1].trim();
      
      // 2. Parse nội dung trả lời (Classification)
      let replyType = 'inquiry'; // Default
      const lowerBody = body.toLowerCase();
      
      if (lowerBody.includes('accept') || lowerBody.includes('confirm') || 
          lowerBody.includes('đồng ý') || lowerBody.includes('chấp nhận') || lowerBody.includes('xác nhận')) {
        replyType = 'accepted';
      } else if (lowerBody.includes('decline') || lowerBody.includes('reject') || 
                 lowerBody.includes('từ chối') || lowerBody.includes('không đồng ý') || lowerBody.includes('không tham gia')) {
        replyType = 'declined';
      } else if (lowerBody.includes('reschedule') || lowerBody.includes('đổi lịch') || lowerBody.includes('dời lịch')) {
        replyType = 'reschedule';
      }
      
      // 3. Ghi Log phản hồi
      _logEmailActivity({
        candidateId: candidateId,
        candidateName: candidateName,
        template: 'REPLY_RECEIVED',
        language: 'auto',
        recipients: from,
        subject: subject,
        status: replyType,
        messageId: lastMessage.getId()
      });
      
      // 4. Mark email as processed bằng cách gán Star
      lastMessage.star();
      processedCount++;
    }
    
    // Lưu lại thời gian quét cuối cùng
    props.setProperty('LAST_SCAN_TIME', Date.now().toString());
    
    return { success: true, processed: processedCount };
    
  } catch (error) {
    console.error('[EMAIL_SCAN] Error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================ 
// HỖ TRỢ XEM CV BẢO MẬT (PROXY)
// ============================================================ 
function getDriveFileBase64(payload) {
  try {
    const fileId = payload.fileId;
    if (!fileId) return { success: false, error: 'Thiếu fileId' };
    
    // Đảm bảo chỉ mở bằng ID (Cắt từ URL nếu truyền vào URL)
    let id = fileId;
    if (id.includes('id=')) {
      id = id.split('id=')[1].split('&')[0];
    } else if (id.includes('/file/d/')) {
      id = id.split('/file/d/')[1].split('/')[0];
    }

    const file = DriveApp.getFileById(id);
    const blob = file.getBlob();
    
    // Giới hạn kích thước file (VD: <= 10MB) để tránh vượt quá trí nhớ GAS
    if (blob.getBytes().length > 10 * 1024 * 1024) {
       return { success: false, error: 'File quá lớn để tải qua Proxy (>10MB)' };
    }
    
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();
    
    return {
      success: true,
      mimeType: mimeType,
      fileName: file.getName(),
      base64: base64
    };
  } catch (error) {
    console.error('[DRIVE_PROXY] Error:', error);
    return { success: false, error: 'Không thể truy cập CV (' + error.toString() + ')' };
  }
}
