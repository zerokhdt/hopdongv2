#!/usr/bin/env node

/**
 * Run Supabase migration
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

function splitSqlStatements(sqlText) {
  const out = [];
  let cur = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let dollarTag = null;

  while (i < sqlText.length) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (!inSingle && !inDouble && !dollarTag) {
      if (ch === '-' && next === '-') {
        const j = sqlText.indexOf('\n', i + 2);
        if (j === -1) break;
        cur += sqlText.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (ch === '/' && next === '*') {
        const j = sqlText.indexOf('*/', i + 2);
        if (j === -1) break;
        cur += sqlText.slice(i, j + 2);
        i = j + 2;
        continue;
      }
    }

    if (!inDouble && !dollarTag && ch === "'") {
      cur += ch;
      if (inSingle) {
        if (next === "'") {
          cur += next;
          i += 2;
          continue;
        }
        inSingle = false;
      } else {
        inSingle = true;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !dollarTag && ch === '"') {
      cur += ch;
      if (inDouble) {
        if (next === '"') {
          cur += next;
          i += 2;
          continue;
        }
        inDouble = false;
      } else {
        inDouble = true;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && ch === '$') {
      const m = sqlText.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
      if (m) {
        const tag = m[0];
        cur += tag;
        if (dollarTag && dollarTag === tag) dollarTag = null;
        else if (!dollarTag) dollarTag = tag;
        i += tag.length;
        continue;
      }
    }

    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = '';
      i += 1;
      continue;
    }

    cur += ch;
    i += 1;
  }

  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

async function execSql(stmt) {
  const { data, error } = await supabase.rpc('exec_sql', { sql: stmt.endsWith(';') ? stmt : `${stmt};` });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.error || 'exec_sql_failed');
}

async function resetAllFromMigration(migrationSql) {
  const tableMatches = Array.from(migrationSql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\(/g));
  const tables = Array.from(new Set(tableMatches.map(m => m[1]))).reverse();
  for (const t of tables) {
    await execSql(`DROP TABLE IF EXISTS public.${t} CASCADE`);
  }
}

async function runMigration() {
  console.log('Running Supabase migration...');
  console.log('URL:', supabaseUrl);
  console.log('Service Key:', supabaseServiceKey.substring(0, 20) + '...');
  console.log('========================================\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase_migration.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration file loaded:', migrationPath);
    console.log('SQL size:', migrationSql.length, 'characters');
    
    const doReset = process.argv.includes('--reset');
    if (doReset) {
      console.log('RESET enabled: dropping all tables defined in supabase_migration.sql ...');
      await resetAllFromMigration(migrationSql);
      console.log('RESET done.\n');
    }

    const statements = splitSqlStatements(migrationSql);
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const stmtPreview = stmt.substring(0, 100).replace(/\n/g, ' ') + (stmt.length > 100 ? '...' : '');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${stmtPreview}`);
      
      try {
        await execSql(stmt);
        console.log('  ✓ Statement executed via RPC');
        successCount++;
      } catch (error) {
        console.error(`  Error executing statement: ${error.message}`);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n========================================');
    console.log('Migration Summary:');
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log(`  Total: ${statements.length}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some statements failed. This may be normal if tables already exist.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
    // Test the tables
    console.log('\nTesting tables...');
    
    const tablesToTest = ['branches', 'candidates', 'candidates_sheet'];
    
    for (const table of tablesToTest) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`  ${table}: ❌ ${error.message}`);
        } else {
          console.log(`  ${table}: ✅ Table exists (${data?.length || 0} rows)`);
        }
      } catch (error) {
        console.log(`  ${table}: ❌ ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
