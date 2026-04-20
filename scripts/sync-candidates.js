#!/usr/bin/env node

/**
 * Sync candidates from Google Sheet to Supabase
 * Run: node scripts/sync-candidates.js
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'CV ĐẦU VÀO';

// Google Sheets API setup
async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

// Find header row in sheet data
function findHeaderRow(data) {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowStr = data[i].join('').toLowerCase();
    if (rowStr.includes('cn nhận hồ sơ') || rowStr.includes('họ và tên ứng viên')) {
      return i;
    }
  }
  return 3; // fallback
}

// Find column index by keyword
function findColumnIndex(header, keyword) {
  for (let c = 0; c < header.length; c++) {
    const cell = header[c]?.toString().toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cell && cell.includes(keyword)) {
      return c;
    }
  }
  return -1;
}

// Format value safely
function formatValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    const d = val.getDate().toString().padStart(2, '0');
    const m = (val.getMonth() + 1).toString().padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return val.toString().trim();
}

// Main sync function
async function syncCandidates() {
  console.log('Starting candidate sync from Google Sheet to Supabase...');
  
  try {
    // 1. Get data from Google Sheet
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
    });
    
    const data = response.data.values || [];
    console.log(`Retrieved ${data.length} rows from Google Sheet`);
    
    if (data.length < 5) {
      console.log('Not enough data in sheet');
      return;
    }
    
    // 2. Find header row and columns
    const headerRowIndex = findHeaderRow(data);
    const header = data[headerRowIndex];
    
    console.log(`Header row index: ${headerRowIndex}`);
    console.log(`Header columns: ${header.length}`);
    
    // Map column indexes
    const colIndexes = {
      rowIndex: headerRowIndex,
      branch: findColumnIndex(header, 'cn nhận hồ sơ') !== -1 
        ? findColumnIndex(header, 'cn nhận hồ sơ') 
        : findColumnIndex(header, 'chi nhánh nhận'),
      fullName: findColumnIndex(header, 'họ và tên ứng viên'),
      position: findColumnIndex(header, 'vị trí nào'),
      phone: findColumnIndex(header, 'điện thoại liên hệ'),
      email: findColumnIndex(header, 'email'),
      address: findColumnIndex(header, 'địa chỉ hiện tại'),
      dob: findColumnIndex(header, 'ngày tháng năm sinh'),
      gender: findColumnIndex(header, 'giới tính'),
      education: findColumnIndex(header, 'tốt nghiệp trường'),
      major: findColumnIndex(header, 'chuyên ngành'),
      experience: findColumnIndex(header, 'bao nhiêu kinh nghiệm'),
      cvUrl: findColumnIndex(header, 'link cv') !== -1 
        ? findColumnIndex(header, 'link cv') 
        : findColumnIndex(header, 'cv'),
      salary: findColumnIndex(header, 'lương mong muốn') !== -1 
        ? findColumnIndex(header, 'lương mong muốn') 
        : findColumnIndex(header, 'mức lương'),
    };
    
    console.log('Column indexes found:', colIndexes);
    
    // 3. Process rows and prepare candidates
    const candidates = [];
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i;
      
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      // Get candidate name - skip if empty
      const fullName = colIndexes.fullName !== -1 && row[colIndexes.fullName] 
        ? formatValue(row[colIndexes.fullName])
        : '';
      
      if (!fullName) continue;
      
      // Get branch
      const branch = colIndexes.branch !== -1 && row[colIndexes.branch]
        ? formatValue(row[colIndexes.branch])
        : '';
      
      // Build raw data object
      const rawData = {};
      header.forEach((colName, idx) => {
        if (row[idx] !== undefined) {
          rawData[colName] = formatValue(row[idx]);
        }
      });
      
      // Build candidate object
      const candidate = {
        row_index: rowIndex,
        full_name: fullName,
        email: colIndexes.email !== -1 ? formatValue(row[colIndexes.email]) : '',
        phone: colIndexes.phone !== -1 ? formatValue(row[colIndexes.phone]) : '',
        position: colIndexes.position !== -1 ? formatValue(row[colIndexes.position]) : '',
        experience: colIndexes.experience !== -1 ? formatValue(row[colIndexes.experience]) : '',
        education: colIndexes.education !== -1 ? formatValue(row[colIndexes.education]) : '',
        cv_url: colIndexes.cvUrl !== -1 ? formatValue(row[colIndexes.cvUrl]) : '',
        branch_assigned: branch,
        raw_data: rawData,
        status: 'NEW'
      };
      
      candidates.push(candidate);
    }
    
    console.log(`Processed ${candidates.length} candidates`);
    
    // 4. Upsert to Supabase in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('candidates')
        .upsert(batch, {
          onConflict: 'row_index',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Upserted batch ${i / batchSize + 1}: ${batch.length} candidates`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\nSync completed!`);
    console.log(`Successfully synced: ${successCount} candidates`);
    console.log(`Failed: ${errorCount} candidates`);
    
    // 5. Update statistics
    const { data: stats } = await supabase
      .from('candidates')
      .select('status, count')
      .group('status');
    
    console.log('\nCurrent candidate status:');
    stats?.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });
    
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncCandidates().catch(console.error);