#!/usr/bin/env node

/**
 * Test Supabase connection and workflow schema
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

console.log('Testing Supabase connection with workflow schema...');
console.log('URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Service Key:', supabaseServiceKey ? '✓ Set (first 20 chars): ' + supabaseServiceKey.substring(0, 20) + '...' : '✗ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('\n1. Testing Supabase connection...');
  
  try {
    // Test connection by fetching a simple query
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.error('Connection test failed:', error.message);
      return false;
    }
    
    console.log(`✓ Connection successful! Found ${data?.length || 0} branches`);
    
    if (data && data.length > 0) {
      console.log('Sample branches:');
      data.forEach(branch => {
        console.log(`  - ${branch.id}: ${branch.name}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Connection test failed with exception:', error.message);
    return false;
  }
}

async function testCandidatesTable() {
  console.log('\n2. Testing candidates table structure...');
  
  try {
    // Check if candidates table exists and has workflow fields
    const { data: _data, error } = await supabase
      .from('candidates')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Candidates table test failed:', error.message);
      
      // Check if table doesn't exist
      if (error.message.includes('does not exist')) {
        console.log('⚠ Candidates table does not exist. You need to run the migration.');
        return false;
      }
      
      return false;
    }
    
    console.log('✓ Candidates table exists');
    
    // Try to get table structure by selecting one row
    const { data: sample, error: sampleError } = await supabase
      .from('candidates')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError.message);
    } else if (sample && sample.length > 0) {
      const candidate = sample[0];
      console.log('Sample candidate fields:');
      
      // Check for workflow fields
      const workflowFields = [
        'workflow_status', 'branch_assigned', 'branch_decision',
        'candidate_confirmation', 'interview_scheduled_date',
        'next_action_due_date', 'multi_branch_decisions'
      ];
      
      workflowFields.forEach(field => {
        if (candidate[field] !== undefined) {
          console.log(`  ✓ ${field}: ${candidate[field]}`);
        } else {
          console.log(`  ✗ ${field}: Not found (may need migration update)`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Candidates table test failed with exception:', error.message);
    return false;
  }
}

async function testWorkflowHistoryTable() {
  console.log('\n3. Testing workflow history table...');
  
  try {
    // Check if workflow history table exists
    const { data: _data, error } = await supabase
      .from('candidate_workflow_history')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Workflow history table test failed:', error.message);
      
      // Check if table doesn't exist
      if (error.message.includes('does not exist')) {
        console.log('⚠ Workflow history table does not exist. You need to run the migration.');
        return false;
      }
      
      return false;
    }
    
    console.log('✓ Workflow history table exists');
    return true;
  } catch (error) {
    console.error('Workflow history table test failed with exception:', error.message);
    return false;
  }
}

async function testInsertSampleCandidate() {
  console.log('\n4. Testing insert sample candidate...');
  
  try {
    const sampleCandidate = {
      row_index: 999999, // High number to avoid conflict
      full_name: 'Test Candidate Workflow',
      email: 'test.workflow@example.com',
      phone: '0909123456',
      position: 'Test Position',
      workflow_status: 'NEW',
      status: 'NEW',
      branch_assigned: 'HEAD OFFICE',
      next_action_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      raw_data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };
    
    const { data: _data, error } = await supabase
      .from('candidates')
      .upsert([sampleCandidate], {
        onConflict: 'row_index',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('Insert test failed:', error.message);
      return false;
    }
    
    console.log('✓ Sample candidate inserted successfully');
    
    // Clean up - delete the test candidate
    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('row_index', 999999);
    
    if (deleteError) {
      console.error('Warning: Failed to delete test candidate:', deleteError.message);
    } else {
      console.log('✓ Test candidate cleaned up');
    }
    
    return true;
  } catch (error) {
    console.error('Insert test failed with exception:', error.message);
    return false;
  }
}

function _createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: '',
    headers,
    setHeader(key, value) {
      headers[key] = value;
    },
    end(payload) {
      this.body = payload || '';
    }
  };
}

async function _callRecruitmentApi({ action, method, body, query }) {
  const { handleRecruitmentApi } = await import('../api/recruitment.js');
  const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  const res = _createMockRes();
  await handleRecruitmentApi(req, res, `recruitment/${action}`, method, body, query || {});
  let parsed = null;
  try {
    parsed = res.body ? JSON.parse(res.body) : null;
  } catch {
    parsed = res.body;
  }
  return { statusCode: res.statusCode, body: parsed };
}

async function testSendToBranchWorkflow() {
  console.log('\n5. Testing send-to-branch workflow (API + DB)...');

  let candidateId = null;
  try {
    const branchesResp = await _callRecruitmentApi({ action: 'branches', method: 'GET', query: {} });
    if (branchesResp.statusCode !== 200 || !branchesResp.body?.success) {
      console.error('Branches API failed:', branchesResp.body?.error || branchesResp.body);
      return false;
    }

    const branches = branchesResp.body.data || [];
    const branch = branches.find((b) => b.id === 'HEAD OFFICE') || branches[0];
    if (!branch?.id) {
      console.error('No branches found');
      return false;
    }

    const email = `test.workflow.${Date.now()}@example.com`;
    const { data: inserted, error: insertError } = await supabase
      .from('candidates')
      .insert({
        full_name: 'Test Candidate Send Branch',
        email,
        phone: '0909000000',
        position: 'Test Position',
        workflow_status: 'NEW',
        status: 'PENDING',
        branch_assigned: null,
        raw_data: { test: true, workflow: 'send-to-branch', ts: new Date().toISOString() }
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert candidate failed:', insertError.message);
      return false;
    }

    candidateId = inserted.id;

    const tokenResp = await _callRecruitmentApi({
      action: 'access-token',
      method: 'POST',
      body: {
        candidate_id: candidateId,
        branch_id: branch.id,
        interviewer_email: 'hrm@ace.local',
        expires_hours: 72
      }
    });

    if (tokenResp.statusCode !== 200 || !tokenResp.body?.success || !tokenResp.body?.data?.token) {
      console.error('Access token API failed:', tokenResp.body?.error || tokenResp.body);
      return false;
    }

    const now = new Date().toISOString();
    const updateResp = await _callRecruitmentApi({
      action: 'candidate/status',
      method: 'POST',
      body: {
        candidate_id: candidateId,
        status: 'SENT_TO_BRANCH',
        branch_assigned: branch.id,
        assigned_at: now,
        assigned_by: 'test.workflow',
        branch_access_token: tokenResp.body.data.token,
        workflow_status: 'SENT_TO_BRANCH'
      }
    });

    if (updateResp.statusCode !== 200 || !updateResp.body?.success) {
      console.error('Candidate status API failed:', updateResp.body?.error || updateResp.body);
      return false;
    }

    const updated = updateResp.body.data;
    if (updated?.status !== 'SENT_TO_BRANCH' || updated?.branch_assigned !== branch.id) {
      console.error('Unexpected updated candidate:', updated);
      return false;
    }

    const listResp = await _callRecruitmentApi({
      action: 'candidates',
      method: 'GET',
      query: { status: 'SENT_TO_BRANCH', limit: 50, offset: 0 }
    });

    if (listResp.statusCode !== 200 || !listResp.body?.success) {
      console.error('Candidates list API failed:', listResp.body?.error || listResp.body);
      return false;
    }

    const found = (listResp.body.data || []).some((c) => c.id === candidateId);
    if (!found) {
      console.error('Updated candidate not found in SENT_TO_BRANCH list');
      return false;
    }

    console.log('✓ Send-to-branch workflow OK');
    return true;
  } catch (error) {
    console.error('Send-to-branch workflow failed with exception:', error.message);
    return false;
  } finally {
    if (candidateId) {
      const { error: deleteError } = await supabase.from('candidates').delete().eq('id', candidateId);
      if (deleteError) {
        console.error('Warning: Failed to delete test candidate:', deleteError.message);
      } else {
        console.log('✓ Test candidate cleaned up');
      }
    }
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('Supabase Workflow Schema Test');
  console.log('========================================');
  
  const tests = [
    { name: 'Connection', fn: testConnection },
    { name: 'Candidates Table', fn: testCandidatesTable },
    { name: 'Workflow History Table', fn: testWorkflowHistoryTable },
    { name: 'Insert Sample', fn: testInsertSampleCandidate },
    { name: 'Send To Branch', fn: testSendToBranchWorkflow }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const passed = await test.fn();
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\n========================================');
  console.log('Test Summary:');
  console.log('========================================');
  
  if (allPassed) {
    console.log('✅ All tests passed! Supabase is ready for workflow implementation.');
    console.log('\nNext steps:');
    console.log('1. Run the migration: psql -f supabase_migration.sql');
    console.log('2. Run sync script: node scripts/sync-candidates-workflow.js');
    console.log('3. Update frontend to use workflow API endpoints');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Supabase project is active');
    console.log('2. Run the migration script to create tables');
    console.log('3. Check .env file has correct credentials');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
