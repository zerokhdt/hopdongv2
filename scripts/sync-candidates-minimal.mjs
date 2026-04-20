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
const scriptUrl = process.env.VITE_SCRIPT_URL;
const maxCandidates = parseInt(process.env.SYNC_MAX_CANDIDATES || '20', 10);

if (!supabaseUrl || !supabaseServiceKey || !scriptUrl) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or VITE_SCRIPT_URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function callGas(body) {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GAS returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findKey(obj, needles) {
  const entries = Object.keys(obj || {}).map(k => [k, normalizeText(k)]);
  const normNeedles = needles.map(n => normalizeText(n));
  for (const n of normNeedles) {
    const hit = entries.find(([, nk]) => nk.includes(n));
    if (hit) return hit[0];
  }
  return null;
}

function pickByNeedles(obj, needles) {
  const key = findKey(obj, needles);
  if (!key) return '';
  const v = obj?.[key];
  return v === undefined || v === null ? '' : String(v).trim();
}

async function main() {
  const report = {
    ok: false,
    fetched: 0,
    transformed: 0,
    upserted: 0,
    errors: [],
    generatedAt: new Date().toISOString()
  };

  try {
    const list = await callGas({ function: 'getCandidates' });
    if (!list?.success) throw new Error(list?.error || 'getCandidates failed');

    const candidates = Array.isArray(list.data) ? list.data : [];
    report.fetched = candidates.length;

    const selected = candidates.slice(0, Math.max(0, maxCandidates));

    const rows = [];
    for (const c of selected) {
      const rowIndex = c?.rowIndex;
      if (!rowIndex) continue;

      const detailsResp = await callGas({ function: 'getCandidateDetails', payload: rowIndex });
      if (!detailsResp?.success) continue;

      const d = detailsResp.data;
      const fullName = pickByNeedles(d, ['ho va ten', 'full name', 'candidate name', 'ten ung vien', 'name']);
      if (!fullName) continue;

      rows.push({
        row_index: rowIndex,
        full_name: fullName,
        email: pickByNeedles(d, ['dia chi email', 'email', 'e-mail']),
        phone: pickByNeedles(d, ['so dien thoai', 'phone number', 'phone']),
        position: pickByNeedles(d, ['vi tri', 'position', 'ung tuyen']),
        workflow_status: 'NEW',
        status: 'NEW',
        branch_assigned: null,
        raw_data: d
      });
    }

    report.transformed = rows.length;
    if (rows.length === 0) throw new Error('No candidates transformed for upsert');

    const { error: upsertError } = await supabase
      .from('candidates')
      .upsert(rows, { onConflict: 'row_index', ignoreDuplicates: false });

    if (upsertError) throw upsertError;
    report.upserted = rows.length;
    report.ok = true;
  } catch (e) {
    report.errors.push(e?.message || String(e));
  }

  const outPath = join(__dirname, '..', 'logs', 'sync_minimal_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (!report.ok) process.exit(1);
}

await main();
