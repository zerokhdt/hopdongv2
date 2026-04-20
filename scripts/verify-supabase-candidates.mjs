#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

async function main() {
  const report = {
    ok: false,
    supabaseUrl,
    candidatesCount: null,
    sample: [],
    error: null,
    generatedAt: new Date().toISOString()
  };

  try {
    const { count, error: countError } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    report.candidatesCount = count;

    const { data: sample, error: sampleError } = await supabase
      .from('candidates')
      .select('id,row_index,full_name,email,workflow_status,branch_assigned,created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleError) throw sampleError;
    report.sample = sample || [];
    report.ok = true;
  } catch (e) {
    report.error = e?.message || String(e);
  }

  const outPath = join(__dirname, '..', 'logs', 'verify_supabase_candidates.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (!report.ok) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

