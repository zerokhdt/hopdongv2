#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rowIndex = 987654;

const { error: upsertError } = await supabase
  .from('candidates')
  .upsert(
    [
      {
        row_index: rowIndex,
        full_name: 'Test Candidate',
        email: 'test@example.com',
        phone: '000',
        workflow_status: 'NEW',
        status: 'NEW'
      }
    ],
    { onConflict: 'row_index', ignoreDuplicates: false }
  );

if (upsertError) {
  console.error(upsertError);
  process.exit(1);
}

const { count, error: countError } = await supabase
  .from('candidates')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error(countError);
  process.exit(1);
}

console.log(`Inserted row_index=${rowIndex}. candidatesCount=${count}`);

