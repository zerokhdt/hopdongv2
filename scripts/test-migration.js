#!/usr/bin/env node

/**
 * Test migration script - Simple test to verify Supabase connection
 * Run: node scripts/test-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test connection by querying a table
    const { data: _data, error } = await supabase
      .from('candidates')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error.message);
      
      // Check if table exists
      const { error: tableError } = await supabase
        .from('candidates')
        .select('*')
        .limit(0);
      
      if (tableError && tableError.code === '42P01') {
        console.log('Table "candidates" does not exist yet.');
        console.log('Please run the migration SQL first:');
        console.log('1. Go to Supabase dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Run the SQL from supabase_migration.sql');
      }
      
      return false;
    }
    
    console.log('✓ Supabase connection successful');
    return true;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

async function testApiEndpoints() {
  console.log('\nTesting API endpoints...');
  
  try {
    // Test if server is running
    const response = await fetch('http://localhost:3000/api/recruitment/candidates');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ API endpoint /api/recruitment/candidates is working');
      console.log('  Response:', data);
    } else {
      console.log('✗ API endpoint not responding or server not running');
      console.log('  Status:', response.status);
    }
    
  } catch (error) {
    console.log('✗ Cannot connect to API server');
    console.log('  Error:', error.message);
    console.log('  Make sure the development server is running: npm run dev');
  }
}

async function createTestData() {
  console.log('\nCreating test data...');
  
  try {
    // Create a test candidate
    const testCandidate = {
      row_index: 9999, // Test row index
      full_name: 'Test Candidate',
      email: 'test@example.com',
      phone: '0123456789',
      position: 'Test Position',
      status: 'NEW',
      raw_data: {
        'Họ và tên ứng viên': 'Test Candidate',
        'Email': 'test@example.com',
        'Điện thoại liên hệ': '0123456789',
        'Vị trí nào': 'Test Position'
      }
    };
    
    const { data, error } = await supabase
      .from('candidates')
      .upsert(testCandidate, { onConflict: 'row_index' })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test candidate:', error);
      return null;
    }
    
    console.log('✓ Test candidate created:', data.id);
    return data;
    
  } catch (error) {
    console.error('Unexpected error creating test data:', error);
    return null;
  }
}

async function cleanupTestData(testCandidate) {
  if (!testCandidate) return;
  
  console.log('\nCleaning up test data...');
  
  try {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', testCandidate.id);
    
    if (error) {
      console.error('Error cleaning up test data:', error);
    } else {
      console.log('✓ Test data cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error cleaning up:', error);
  }
}

async function main() {
  console.log('=== Supabase Migration Test ===\n');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.log('\nPlease fix Supabase connection issues first.');
    return;
  }
  
  // Test API endpoints
  await testApiEndpoints();
  
  // Create and test with sample data
  const testCandidate = await createTestData();
  
  if (testCandidate) {
    // Test fetching the candidate
    const { data: fetchedData, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', testCandidate.id)
      .single();
    
    if (!fetchError && fetchedData) {
      console.log('✓ Test candidate fetched successfully');
    }
    
    // Clean up
    await cleanupTestData(testCandidate);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nNext steps:');
  console.log('1. Run the full sync script: node scripts/sync-candidates-simple.js');
  console.log('2. Start the development server: npm run dev');
  console.log('3. Test the recruitment interface in browser');
}

main().catch(console.error);
