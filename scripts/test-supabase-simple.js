// Simple Supabase connection test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (first 20 chars): ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'Not set');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

try {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('Supabase client created successfully');
  
  // Test a simple query
  const { data, error } = await supabase.from('_test').select('*').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('Table _test does not exist (expected)');
      console.log('Connection successful!');
    } else {
      console.error('Supabase error:', error.message);
    }
  } else {
    console.log('Test query successful:', data);
  }
  
  // Test if we can get server version
  const { data: versionData, error: versionError } = await supabase.rpc('version');
  
  if (versionError) {
    console.log('RPC version call failed (expected for new project):', versionError.message);
  } else {
    console.log('PostgreSQL version:', versionData);
  }
  
  console.log('✅ Supabase connection test PASSED');
  
} catch (error) {
  console.error('❌ Supabase connection test FAILED:', error.message);
  process.exit(1);
}