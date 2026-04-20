#!/usr/bin/env node

/**
 * Sync candidates from Google Apps Script API to Supabase with workflow fields
 * This script handles the new workflow fields and maps Google Sheet columns to database fields
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Apps Script URL
const SCRIPT_URL = process.env.VITE_SCRIPT_URL;
const MAX_CANDIDATES = parseInt(process.env.SYNC_MAX_CANDIDATES || '0', 10);

if (!SCRIPT_URL) {
  console.error('Missing Google Apps Script URL. Please set VITE_SCRIPT_URL in .env');
  process.exit(1);
}

async function fetchJsonWithRetry(url, options, config = {}) {
  const timeoutMs = typeof config.timeoutMs === 'number' ? config.timeoutMs : 30000;
  const retries = typeof config.retries === 'number' ? config.retries : 4;
  const retryDelayMs = typeof config.retryDelayMs === 'number' ? config.retryDelayMs : 800;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const text = await res.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        const preview = text.slice(0, 200);
        throw new Error(`Non-JSON response (status ${res.status}): ${preview}`);
      }

      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        error.payload = json;
        throw error;
      }

      return json;
    } catch (e) {
      lastError = e;
      const message = e?.message || String(e);
      const isLast = attempt >= retries;

      if (isLast) break;

      const shouldRetry =
        message.includes('fetch failed') ||
        message.includes('UND_ERR_CONNECT_TIMEOUT') ||
        message.includes('aborted') ||
        message.includes('HTTP 429') ||
        message.includes('HTTP 500') ||
        message.includes('HTTP 502') ||
        message.includes('HTTP 503') ||
        message.includes('HTTP 504');

      if (!shouldRetry) break;

      await new Promise(r => setTimeout(r, retryDelayMs * Math.pow(2, attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

// Field mapping from Google Sheet to database
const FIELD_MAPPING = {
  // Basic information
  'Họ và tên ứng viên': 'full_name',
  'Địa chỉ email': 'email',
  'Số điện thoại liên hệ': 'phone',
  'Phone number': 'phone',
  'Địa chỉ hiện tại': 'address',
  'Your Current Address': 'address',
  'Ngày tháng năm sinh': 'date_of_birth',
  '(D.O.B)': 'date_of_birth',
  'Giới tính': 'gender',
  'Gender': 'gender',
  
  // Education & experience
  'Bạn tốt Nghiệp trường đại học/ cao đẳng nào?': 'education',
  'From which university or college did you graduate?': 'education',
  'Chuyên ngành của bạn là gì?': 'major',
  'What\'s your major?': 'major',
  'Bạn có bao nhiêu kinh nghiệm ở vị trí ứng tuyển?': 'experience_years',
  'Your experiences in that position (the number of years)': 'experience_years',
  'Bạn đã làm việc ở công ty hay trung tâm nào?': 'previous_company',
  'Which company or center did you use to work?': 'previous_company',
  'Lí do nghỉ việc ở công ty/ trung tâm cũ?': 'reason_for_leaving',
  'Why did you quit your job?': 'reason_for_leaving',
  
  // Application details
  'Bạn muốn làm việc ở vị trí nào?': 'position',
  'Bạn muốn làm việc ở địa chỉ nào của Trung tâm Á châu?': 'preferred_branch',
  'Where would you like to work among A Chau English centers system?': 'preferred_branch',
  'Where would you like to work among System of A Chau English centers?': 'preferred_branch',
  
  // Salary expectations
  'Xin vui lòng cho chúng tôi biết mức lương bạn mong muốn đối với công việc này (ĐTV: triệu đồng/tháng)': 'expected_salary_monthly',
  'Your expected salary (milion/month)': 'expected_salary_monthly',
  'Xin vui lòng cho chúng tôi biết mức lương bạn mong muốn đối với công việc này (VNĐ/ 1 giờ)': 'expected_salary_hourly',
  'Your expected salary (VNĐ or USD/ 1 hour)': 'expected_salary_hourly',
  
  // Availability
  '1. Thời gian làm việc mong muốn đối với nhân viên fulltime': 'availability_fulltime',
  'The time you are available to work:': 'availability_fulltime',
  '2. Thời gian làm việc mong muốn đối với NV-GV part time (chọn một)': 'availability_parttime',
  'The time you are available to work (choose one)': 'availability_parttime',
  '3. Thời gian làm việc mong mốn đối với GV thỉnh giảng:': 'availability_guest_lecturer',
  '3. Thời Gian làm việc mong muốn đối với Trợ giảng/Thực tập sinh:': 'availability_intern',
  
  // Additional information
  'Hãy miêu tả bản thân bạn bằng 3 từ:': 'self_description',
  'How would you describe yourself in 3 words?': 'self_description',
  'Người giới thiệu': 'referrer',
  '(Referrer)': 'referrer',
  'Bạn đang ở nhà của mình hay nhà thuê?': 'housing_status',
  'Do you live in your house or a renting house?': 'housing_status',
  'Bạn có sẵn sàng di chuyển theo sự sắp xếp của công ty không?': 'willing_to_relocate',
  'Will you be willing to move to work according to our center\'s arrangement?': 'willing_to_relocate',
  
  // Management fields (from Google Sheet)
  'TÌNH TRẠNG ĐẦU VÀO': 'initial_status',
  'CN NHẬN HỒ SƠ': 'receiving_branch',
  'KẾT QUẢ SAU PV': 'interview_result_notes',
  'GHI CHÚ': 'notes',
  'chi nhánh nhận': 'assigned_branch',
  'NOTE': 'internal_notes',
  'Dấu thời gian': 'timestamp',
  
  // Additional fields for workflow (new fields to add to Google Sheet)
  'WORKFLOW_STATUS': 'workflow_status',
  'CHI_NHANH_DUOC_PHAN_CONG': 'branch_assigned',
  'NGUOI_PHAN_CONG': 'assigned_by',
  'NGAY_PHAN_CONG': 'assigned_at',
  'TOKEN_TRUY_CAP_CHI_NHANH': 'branch_access_token',
  'QUYET_DINH_CHI_NHANH': 'branch_decision',
  'NGAY_QUYET_DINH_CHI_NHANH': 'branch_decision_at',
  'NGUOI_QUYET_DINH_CHI_NHANH': 'branch_decision_by',
  'LY_DO_CHI_NHANH': 'branch_decision_notes',
  'XAC_NHAN_UNG_VIEN': 'candidate_confirmation',
  'NGAY_XAC_NHAN_UNG_VIEN': 'candidate_confirmed_at',
  'PHUONG_THUC_XAC_NHAN': 'candidate_confirmation_method',
  'NGAY_GIO_PHONG_VAN': 'interview_scheduled_date',
  'HINH_THUC_PHONG_VAN': 'interview_location',
  'DIA_DIEM_PHONG_VAN': 'interview_location',
  'NGUOI_PHONG_VAN': 'interviewer',
  'LINK_PHONG_VAN': 'interview_link',
  'KET_QUA_PHONG_VAN': 'interview_result',
  'DIEM_SO_PHONG_VAN': 'interview_score',
  'DANH_GIA_CHI_TIET': 'interview_notes',
  'NGAY_CONG_BO_KET_QUA': 'interview_completed_at',
  'NGAY_GIO_DEMO': 'demo_scheduled_date',
  'DIA_DIEM_DEMO': 'demo_location',
  'NOI_DUNG_DEMO': 'demo_notes',
  'KET_QUA_DEMO': 'demo_result',
  'NGAY_GUI_OFFER': 'offer_sent_date',
  'NOI_DUNG_OFFER': 'offer_details',
  'HAN_CHAP_NHAN_OFFER': 'offer_response_due_date',
  'NGAY_PHAN_HOI_OFFER': 'offer_response_at',
  'NGAY_BAT_DAU_LAM_VIEC': 'start_date',
  'THOI_GIAN_THU_VIEC': 'probation_period',
  'NGAY_KET_THUC_THU_VIEC': 'probation_end_date',
  'KET_QUA_THU_VIEC': 'probation_result',
  'HAN_CHO_PHAN_HOI': 'next_action_due_date',
  'NGAY_GUI_NHAC_NHO': 'last_reminder_sent_at',
  'SO_LAN_NHAC_NHO': 'reminder_sent_count',
  'EMAIL_DA_GUI_CHI_NHANH': 'email_sent_to_branch',
  'EMAIL_DA_GUI_UNG_VIEN': 'email_sent_to_candidate',
  'EMAIL_XAC_NHAN_DA_MO': 'email_opened'
};

// Fetch all candidates from Google Apps Script
async function fetchAllCandidatesFromGoogleScript() {
  console.log('Fetching all candidates from Google Apps Script...');
  
  try {
    // Use getCandidates function to get all candidates
    const data = await fetchJsonWithRetry(
      SCRIPT_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function: 'getCandidates' })
      },
      { timeoutMs: 45000, retries: 5 }
    );
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length} candidates`);
      return data.data;
    } else {
      console.error('Failed to fetch candidates:', data.error);
      return [];
    }
    
  } catch (error) {
    console.error('Error fetching candidates from Google Apps Script:', error);
    return [];
  }
}

// Fetch candidate details with row index
async function fetchCandidateDetails(rowIndex) {
  try {
    const data = await fetchJsonWithRetry(
      SCRIPT_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function: 'getCandidateDetails', payload: rowIndex })
      },
      { timeoutMs: 45000, retries: 5 }
    );
    
    if (data.success && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching details for row ${rowIndex}:`, error);
    return null;
  }
}

// Transform Google Sheet data to Supabase format
function transformToSupabaseFormat(rowIndex, sheetData) {
  if (!sheetData || typeof sheetData !== 'object') {
    return null;
  }
  
  // Extract basic information
  const result = {
    row_index: rowIndex,
    full_name: sheetData['Họ và tên ứng viên'] || '',
    email: sheetData['Địa chỉ email'] || '',
    phone: sheetData['Số điện thoại liên hệ'] || sheetData['Phone number'] || '',
    position: sheetData['Bạn muốn làm việc ở vị trí nào?'] || '',
    experience: sheetData['Bạn có bao nhiêu kinh nghiệm ở vị trí ứng tuyển?'] || sheetData['Your experiences in that position (the number of years)'] || '',
    education: sheetData['Bạn tốt Nghiệp trường đại học/ cao đẳng nào?'] || sheetData['From which university or college did you graduate?'] || '',
    major: sheetData['Chuyên ngành của bạn là gì?'] || sheetData['What\'s your major?'] || '',
    
    // Workflow fields - initialize with defaults
    workflow_status: 'NEW',
    status: 'NEW',
    
    // Extract CV URL if available
    cv_url: extractCvUrl(sheetData),
    
    // Extract video URL if available
    video_url: extractVideoUrl(sheetData),
    
    // Branch assignment from Google Sheet management fields
    branch_assigned: sheetData['chi nhánh nhận'] || sheetData['CN NHẬN HỒ SƠ'] || '',
    
    // Raw data for reference
    raw_data: sheetData
  };
  
  // Extract additional fields using mapping
  Object.keys(FIELD_MAPPING).forEach(sheetField => {
    const dbField = FIELD_MAPPING[sheetField];
    if (sheetData[sheetField] !== undefined && sheetData[sheetField] !== '') {
      // For fields not already set, add them to result
      if (!result[dbField]) {
        result[dbField] = sheetData[sheetField];
      }
    }
  });
  
  // Handle workflow status from Google Sheet
  const sheetStatus = sheetData['TÌNH TRẠNG ĐẦU VÀO'] || sheetData['KẾT QUẢ SAU PV'] || sheetData['WORKFLOW_STATUS'] || '';
  if (sheetStatus) {
    result.workflow_status = mapSheetStatusToWorkflow(sheetStatus);
    result.status = mapSheetStatusToLegacy(sheetStatus);
  }
  
  // Parse date fields
  result.assigned_at = parseDateField(sheetData['NGAY_PHAN_CONG']);
  result.branch_decision_at = parseDateField(sheetData['NGAY_QUYET_DINH_CHI_NHANH']);
  result.candidate_confirmed_at = parseDateField(sheetData['NGAY_XAC_NHAN_UNG_VIEN']);
  result.interview_scheduled_date = parseDateField(sheetData['NGAY_GIO_PHONG_VAN']);
  result.interview_completed_at = parseDateField(sheetData['NGAY_CONG_BO_KET_QUA']);
  result.demo_scheduled_date = parseDateField(sheetData['NGAY_GIO_DEMO']);
  result.demo_completed_at = parseDateField(sheetData['NGAY_GIO_DEMO']); // Assuming same field for scheduled and completed
  result.offer_sent_date = parseDateField(sheetData['NGAY_GUI_OFFER']);
  result.offer_response_at = parseDateField(sheetData['NGAY_PHAN_HOI_OFFER']);
  result.next_action_due_date = parseDateField(sheetData['HAN_CHO_PHAN_HOI']);
  result.last_reminder_sent_at = parseDateField(sheetData['NGAY_GUI_NHAC_NHO']);
  result.last_email_sent_at = parseDateField(sheetData['NGAY_GUI_NHAC_NHO']); // Assuming same as reminder
  
  // Parse numeric fields
  result.reminder_sent_count = parseInt(sheetData['SO_LAN_NHAC_NHO']) || 0;
  result.interview_score = parseInt(sheetData['DIEM_SO_PHONG_VAN']) || null;
  
  // Parse boolean fields
  result.email_sent_to_branch = parseBooleanField(sheetData['EMAIL_DA_GUI_CHI_NHANH']);
  result.email_sent_to_candidate = parseBooleanField(sheetData['EMAIL_DA_GUI_UNG_VIEN']);
  result.email_opened = parseBooleanField(sheetData['EMAIL_XAC_NHAN_DA_MO']);
  
  // Parse JSON fields
  if (sheetData['NOI_DUNG_OFFER']) {
    try {
      result.offer_details = JSON.parse(sheetData['NOI_DUNG_OFFER']);
    } catch (_e) {
      result.offer_details = { text: sheetData['NOI_DUNG_OFFER'] };
    }
  }
  
  return result;
}

// Extract CV URL from sheet data
function extractCvUrl(sheetData) {
  // Check various possible fields for CV URL
  const possibleFields = [
    'Vui lòng tải lên CV (giấy xác nhận thực tập nếu là thực tập sinh)',
    '(Please attach your CV or Internship confirmation letter)',
    'CV',
    'cv',
    'link cv'
  ];
  
  for (const field of possibleFields) {
    if (sheetData[field] && typeof sheetData[field] === 'string') {
      // Check if it looks like a URL
      if (sheetData[field].includes('http') || sheetData[field].includes('drive.google.com')) {
        return sheetData[field];
      }
    }
  }
  
  return '';
}

// Extract video URL from sheet data
function extractVideoUrl(sheetData) {
  // Check various possible fields for video URL
  const possibleFields = [
    'Vui lòng tải video giới thiệu về bản thân của bạn',
    '(Please attach your introduction video)',
    'video',
    'link video'
  ];
  
  for (const field of possibleFields) {
    if (sheetData[field] && typeof sheetData[field] === 'string') {
      // Check if it looks like a URL
      if (sheetData[field].includes('http') || sheetData[field].includes('youtube.com') || sheetData[field].includes('drive.google.com')) {
        return sheetData[field];
      }
    }
  }
  
  return '';
}

// Parse date field from various formats
function parseDateField(dateString) {
  if (!dateString) return null;
  
  try {
    // Try to parse as ISO string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    // Try to parse common date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // dd/mm/yyyy
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // yyyy-mm-dd
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // dd-mm-yyyy
    ];
    
    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) { // dd/mm/yyyy
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = parseInt(match[3]);
        } else if (format === formats[1]) { // yyyy-mm-dd
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else if (format === formats[2]) { // dd-mm-yyyy
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = parseInt(match[3]);
        }
        
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateString}`, error);
    return null;
  }
}

// Parse boolean field from various formats
function parseBooleanField(value) {
  if (!value) return false;
  
  const strValue = String(value).toLowerCase().trim();
  
  if (strValue === 'true' || strValue === 'yes' || strValue === 'có' || strValue === '1' || strValue === 'đã gửi') {
    return true;
  }
  
  if (strValue === 'false' || strValue === 'no' || strValue === 'không' || strValue === '0' || strValue === 'chưa gửi') {
    return false;
  }
  
  return false;
}

// Map Google Sheet status to workflow status
function mapSheetStatusToWorkflow(sheetStatus) {
  const status = (sheetStatus || '').toLowerCase().trim();
  
  if (status.includes('đã gửi') || status.includes('sent')) {
    return 'SENT_TO_BRANCH';
  } else if (status.includes('chấp nhận') || status.includes('accept')) {
    return 'BRANCH_ACCEPTED';
  } else if (status.includes('từ chối') || status.includes('reject')) {
    return 'BRANCH_REJECTED';
  } else if (status.includes('xác nhận') || status.includes('confirm')) {
    return 'CANDIDATE_CONFIRMED';
  } else if (status.includes('từ chối') || status.includes('decline')) {
    return 'CANDIDATE_DECLINED';
  } else if (status.includes('phỏng vấn') || status.includes('interview')) {
    if (status.includes('đã') || status.includes('completed')) {
      return 'INTERVIEW_COMPLETED';
    } else {
      return 'INTERVIEW_SCHEDULED';
    }
  } else if (status.includes('demo')) {
    if (status.includes('đã') || status.includes('completed')) {
      return 'DEMO_COMPLETED';
    } else {
      return 'DEMO_SCHEDULED';
    }
  } else if (status.includes('offer') || status.includes('đề nghị')) {
    return 'OFFER_SENT';
  } else if (status.includes('tuyển') || status.includes('hire')) {
    return 'HIRED';
  } else if (status.includes('loại') || status.includes('reject')) {
    return 'REJECTED';
  }
  
  return 'NEW';
}

// Map Google Sheet status to legacy status
function mapSheetStatusToLegacy(sheetStatus) {
  const status = (sheetStatus || '').toLowerCase().trim();
  
  if (status.includes('đã gửi') || status.includes('sent')) {
    return 'SENT_TO_BRANCH';
  } else if (status.includes('phỏng vấn') || status.includes('interview')) {
    return 'INTERVIEWED';
  } else if (status.includes('tuyển') || status.includes('hire')) {
    return 'HIRED';
  } else if (status.includes('loại') || status.includes('reject')) {
    return 'REJECTED';
  }
  
  return 'NEW';
}

// Main sync function
async function syncCandidatesWithWorkflow() {
  console.log('Starting candidate sync with workflow fields...');
  
  try {
    const normalizeBranchId = (value) => {
      if (!value) return '';
      const raw = String(value).trim();
      if (!raw) return '';
      const beforeColon = raw.split(':')[0].trim();
      const beforeDash = beforeColon.split(' - ')[0].trim();
      return beforeDash;
    };

    // 1. Fetch all candidates from Google Apps Script
    const candidates = await fetchAllCandidatesFromGoogleScript();
    
    if (candidates.length === 0) {
      console.log('No candidates found to sync');
      return;
    }
    
    console.log(`Processing ${candidates.length} candidates...`);

    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id');

    if (branchesError) {
      throw branchesError;
    }

    const validBranchIds = new Set((branches || []).map(b => b.id));
    
    // 2. Process each candidate
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < candidates.length; i++) {
      if (MAX_CANDIDATES > 0 && i >= MAX_CANDIDATES) break;
      const candidate = candidates[i];
      const rowIndex = candidate.rowIndex || i + 1;
      
      console.log(`  Processing candidate ${i + 1}/${candidates.length}: ${candidate.name || 'Unknown'} (row ${rowIndex})`);
      
      // Fetch detailed data for this candidate
      const details = await fetchCandidateDetails(rowIndex);

      let transformed = null;
      if (details) {
        transformed = transformToSupabaseFormat(rowIndex, details);
      } else {
        errorCount++;
        errors.push({ rowIndex, message: 'Failed to fetch candidate details; using list fallback' });
        transformed = {
          row_index: rowIndex,
          full_name: candidate.name || 'Unknown',
          email: candidate.email || '',
          phone: candidate.phone || '',
          workflow_status: 'NEW',
          status: 'NEW',
          raw_data: { source: 'gas_list', candidate }
        };
      }

      if (transformed) {
          const normalizedBranch = normalizeBranchId(transformed.branch_assigned);
          if (normalizedBranch && validBranchIds.has(normalizedBranch)) {
            transformed.branch_assigned = normalizedBranch;
          } else {
            transformed.branch_assigned = null;
          }

          if (!transformed.full_name || !String(transformed.full_name).trim()) {
            continue;
          }

        const { error } = await supabase
          .from('candidates')
          .upsert([transformed], {
            onConflict: 'row_index',
            ignoreDuplicates: false
          });

        if (error) {
          errorCount++;
          errors.push({ rowIndex: transformed.row_index, message: error.message });
        } else {
          successCount++;
        }
      }
      
      // Delay to avoid rate limiting
      if (i < candidates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    
    const reportPath = join(__dirname, '..', 'logs', 'sync_workflow_report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          ok: errorCount === 0,
          successCount,
          errorCount,
          errors,
          generatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    );

    console.log(`\nSync completed!`);
    console.log(`Successfully synced: ${successCount} candidates`);
    console.log(`Failed: ${errorCount} candidates`);
    
    const { data: statusRows, error: statusError } = await supabase
      .from('candidates')
      .select('workflow_status')
      .limit(10000);

    if (statusError) {
      console.log(`\nCurrent candidate workflow status: ❌ ${statusError.message}`);
    } else {
      const counts = {};
      (statusRows || []).forEach(r => {
        const k = r.workflow_status || 'UNKNOWN';
        counts[k] = (counts[k] || 0) + 1;
      });
      console.log('\nCurrent candidate workflow status:');
      Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .forEach(k => console.log(`  ${k}: ${counts[k]}`));
    }
    
    // 5. Show sample of synced data
    const { data: sample } = await supabase
      .from('candidates')
      .select('full_name, email, workflow_status, branch_assigned')
      .limit(5);
    
    console.log('\nSample of synced candidates:');
    sample?.forEach(candidate => {
      console.log(`  ${candidate.full_name} (${candidate.email}) - ${candidate.workflow_status} - Branch: ${candidate.branch_assigned || 'Not assigned'}`);
    });
    
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncCandidatesWithWorkflow().catch(error => {
  console.error(error);
  process.exit(1);
});
