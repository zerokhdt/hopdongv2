#!/usr/bin/env node

/**
 * Simple sync candidates from Google Apps Script API to Supabase
 * This uses the existing Google Apps Script API instead of Google Sheets API
 */

import { createClient } from '@supabase/supabase-js';
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

// Google Apps Script URL
const SCRIPT_URL = process.env.VITE_SCRIPT_URL;

if (!SCRIPT_URL) {
  console.error('Missing Google Apps Script URL. Please set VITE_SCRIPT_URL in .env');
  process.exit(1);
}

// Fetch candidates from Google Apps Script
async function fetchCandidatesFromGoogleScript() {
  console.log('Fetching candidates from Google Apps Script...');
  
  try {
    // Get all branches first
    const branchesResponse = await fetch(`${SCRIPT_URL}?function=getBranches`);
    const branchesData = await branchesResponse.json();
    
    if (!branchesData.success) {
      throw new Error('Failed to fetch branches');
    }
    
    const branches = branchesData.data || [];
    console.log(`Found ${branches.length} branches`);
    
    // Fetch candidates for each branch
    const allCandidates = [];
    
    for (const branch of branches) {
      console.log(`Fetching candidates for branch: ${branch}`);
      
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: 'getCandidatesByBranch',
          payload: branch
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Add branch information to each candidate
        const candidatesWithBranch = data.data.map(candidate => ({
          ...candidate,
          branch_assigned: branch
        }));
        
        allCandidates.push(...candidatesWithBranch);
        console.log(`  Found ${candidatesWithBranch.length} candidates`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Total candidates fetched: ${allCandidates.length}`);
    return allCandidates;
    
  } catch (error) {
    console.error('Error fetching candidates from Google Apps Script:', error);
    return [];
  }
}

// Fetch candidate details for each candidate
async function fetchCandidateDetails(candidate) {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: 'getCandidateDetails',
        payload: candidate.rowIndex
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      return {
        ...candidate,
        details: data.data
      };
    }
    
    return candidate;
  } catch (error) {
    console.error(`Error fetching details for candidate ${candidate.name}:`, error);
    return candidate;
  }
}

// Transform candidate data for Supabase
function transformCandidateForSupabase(candidate) {
  const details = candidate.details || {};
  
  return {
    row_index: candidate.rowIndex,
    full_name: candidate.name || details['Họ và tên ứng viên'] || '',
    position: candidate.position || details['Vị trí ứng tuyển'] || '',
    phone: details['Số điện thoại'] || '',
    email: details['Email'] || '',
    address: details['Địa chỉ'] || '',
    experience: details['Kinh nghiệm'] || '',
    education: details['Trường'] || '',
    cv_url: '', // Will need to extract from details if available
    branch_assigned: candidate.branch_assigned || '',
    raw_data: details,
    status: 'NEW'
  };
}

// Main sync function
async function syncCandidates() {
  console.log('Starting candidate sync from Google Apps Script to Supabase...');
  
  try {
    // 1. Fetch candidates from Google Apps Script
    const candidates = await fetchCandidatesFromGoogleScript();
    
    if (candidates.length === 0) {
      console.log('No candidates found to sync');
      return;
    }
    
    // 2. Fetch details for each candidate (optional, can be done later)
    console.log('Fetching candidate details...');
    const candidatesWithDetails = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      console.log(`  Fetching details for ${candidate.name} (${i + 1}/${candidates.length})`);
      
      const candidateWithDetails = await fetchCandidateDetails(candidate);
      candidatesWithDetails.push(candidateWithDetails);
      
      // Delay to avoid rate limiting
      if (i < candidates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 3. Transform and prepare for Supabase
    const supabaseCandidates = candidatesWithDetails.map(transformCandidateForSupabase);
    
    console.log(`Prepared ${supabaseCandidates.length} candidates for Supabase`);
    
    // 4. Upsert to Supabase in batches
    const batchSize = 20;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < supabaseCandidates.length; i += batchSize) {
      const batch = supabaseCandidates.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('candidates')
        .upsert(batch, {
          onConflict: 'row_index',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} candidates`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
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