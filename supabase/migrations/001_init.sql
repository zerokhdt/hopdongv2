-- Supabase schema (no employee seed data)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (id, name) VALUES ('BAN GIÁM ĐỐC', 'BAN GIÁM ĐỐC') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('HEAD OFFICE', 'HEAD OFFICE') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHÒNG CHUYÊN MÔN', 'PHÒNG CHUYÊN MÔN') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHÒNG NHÂN SỰ', 'PHÒNG NHÂN SỰ') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHÒNG TÀI CHÍNH', 'PHÒNG TÀI CHÍNH') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHÒNG TRUYỀN THÔNG MARKETING', 'PHÒNG TRUYỀN THÔNG MARKETING') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHÒNG THANH TRA', 'PHÒNG THANH TRA') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('KHO HỆ THỐNG', 'KHO HỆ THỐNG') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('THỐNG NHẤT', 'THỐNG NHẤT') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('XÓM MỚI', 'XÓM MỚI') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('GÒ XOÀI', 'GÒ XOÀI') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('LIÊN KHU 4-5', 'LIÊN KHU 4-5') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('XUÂN THỚI THƯỢNG', 'XUÂN THỚI THƯỢNG') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHAN VĂN HỚN', 'PHAN VĂN HỚN') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('TÂN SƠN NHÌ', 'TÂN SƠN NHÌ') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('LÊ VĂN KHƯƠNG', 'LÊ VĂN KHƯƠNG') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('ĐẶNG THÚC VỊNH', 'ĐẶNG THÚC VỊNH') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('LÊ LỢI', 'LÊ LỢI') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('HÀ HUY GIÁP', 'HÀ HUY GIÁP') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('TRUNG MỸ TÂY', 'TRUNG MỸ TÂY') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('THỚI AN', 'THỚI AN') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('DREAM HOME', 'DREAM HOME') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('PHAN THIẾT', 'PHAN THIẾT') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('AN SƯƠNG', 'AN SƯƠNG') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES ('NGUYỄN ẢNH THỦ', 'NGUYỄN ẢNH THỦ') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  title TEXT,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT REFERENCES branches(id),
  email TEXT,
  phone TEXT,
  start_date TEXT,
  probation_date TEXT,
  seniority TEXT,
  contract_date TEXT,
  renew_date TEXT,
  education TEXT,
  major TEXT,
  pedagogy_cert TEXT,
  has_insurance TEXT,
  insurance_agency TEXT,
  document_status TEXT,
  salary TEXT,
  salary_base TEXT,
  allowance_housing TEXT,
  allowance_travel TEXT,
  allowance_phone TEXT,
  cccd TEXT,
  cccd_date TEXT,
  cccd_place TEXT,
  dob TEXT,
  address TEXT,
  current_address TEXT,
  nationality TEXT DEFAULT 'Việt Nam',
  avatar_url TEXT,
  bank_account TEXT,
  bank_name TEXT,
  tax_code TEXT,
  note TEXT,
  raw_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  branch TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
  role TEXT NOT NULL,
  branch TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_import_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  overwrite_existing BOOLEAN NOT NULL DEFAULT TRUE,
  employees JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by TEXT,
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  "group" TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  priority TEXT,
  end_date TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'vi',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER,
  template_id TEXT,
  language TEXT,
  recipients TEXT,
  subject TEXT,
  status TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  row_index INTEGER UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  experience TEXT,
  education TEXT,
  cv_url TEXT,
  video_url TEXT,
  workflow_status TEXT DEFAULT 'NEW',
  status TEXT DEFAULT 'NEW',
  branch_assigned TEXT REFERENCES branches(id),
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ,
  branch_access_token UUID,
  branch_decision TEXT CHECK (branch_decision IN ('ACCEPT', 'REJECT', 'PENDING')),
  branch_decision_by TEXT,
  branch_decision_at TIMESTAMPTZ,
  branch_decision_notes TEXT,
  candidate_confirmation TEXT CHECK (candidate_confirmation IN ('CONFIRMED', 'DECLINED', 'PENDING')),
  candidate_confirmed_at TIMESTAMPTZ,
  candidate_confirmation_method TEXT,
  interview_scheduled_date TIMESTAMPTZ,
  interview_location TEXT,
  interviewer TEXT,
  interview_result TEXT CHECK (interview_result IN ('PASS', 'FAIL', 'PENDING')),
  interview_notes TEXT,
  interview_completed_at TIMESTAMPTZ,
  demo_scheduled_date TIMESTAMPTZ,
  demo_location TEXT,
  demo_evaluator TEXT,
  demo_result TEXT CHECK (demo_result IN ('PASS', 'FAIL', 'PENDING')),
  demo_notes TEXT,
  demo_completed_at TIMESTAMPTZ,
  offer_sent_date TIMESTAMPTZ,
  offer_sent_by TEXT,
  offer_details JSONB DEFAULT '{}'::jsonb,
  offer_response TEXT CHECK (offer_response IN ('ACCEPTED', 'DECLINED', 'PENDING')),
  offer_response_at TIMESTAMPTZ,
  next_action_due_date TIMESTAMPTZ,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  workflow_timeout_date TIMESTAMPTZ,
  email_sent_to_branch BOOLEAN DEFAULT FALSE,
  email_sent_to_candidate BOOLEAN DEFAULT FALSE,
  last_email_sent_at TIMESTAMPTZ,
  email_tracking_id TEXT,
  multi_branch_decisions JSONB DEFAULT '[]'::jsonb,
  final_decision TEXT,
  final_decision_by TEXT,
  final_decision_at TIMESTAMPTZ,
  interview_result_json JSONB DEFAULT '{}'::jsonb,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_workflow_status ON candidates(workflow_status);
CREATE INDEX IF NOT EXISTS idx_candidates_branch_assigned ON candidates(branch_assigned);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);

CREATE TABLE IF NOT EXISTS candidate_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_candidate_workflow_history_candidate ON candidate_workflow_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_workflow_history_changed_at ON candidate_workflow_history(changed_at DESC);

CREATE TABLE IF NOT EXISTS candidate_access_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  interviewer_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_candidate_access_tokens_candidate ON candidate_access_tokens(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_access_tokens_branch ON candidate_access_tokens(branch_id);
CREATE INDEX IF NOT EXISTS idx_candidate_access_tokens_expires ON candidate_access_tokens(expires_at);

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_email TEXT NOT NULL,
  interview_date TIMESTAMPTZ NOT NULL,
  technical_score INTEGER,
  communication_score INTEGER,
  attitude_score INTEGER,
  overall_score INTEGER,
  decision TEXT NOT NULL CHECK (decision IN ('PASS', 'FAIL')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date DESC);

CREATE TABLE IF NOT EXISTS candidates_sheet (
  id INTEGER PRIMARY KEY,
  name TEXT,
  phone TEXT,
  current_address TEXT,
  birth TEXT,
  gender TEXT,
  branch TEXT,
  position TEXT,
  gmail TEXT,
  date_of_submission TEXT,
  expected_salary TEXT,
  cv_url TEXT,
  video_url TEXT,
  house TEXT,
  graduation_cap TEXT,
  experience_value TEXT,
  company_old TEXT,
  reason_leave TEXT,
  date_start TEXT,
  describe_yourself TEXT,
  referrer TEXT,
  interview_coordinator TEXT,
  interview_schedule TEXT,
  type_of_document TEXT,
  ready_to_relocate TEXT,
  status TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_sheet_branch ON candidates_sheet(branch);
CREATE INDEX IF NOT EXISTS idx_candidates_sheet_status ON candidates_sheet(status);
CREATE INDEX IF NOT EXISTS idx_candidates_sheet_submission ON candidates_sheet(date_of_submission);
CREATE INDEX IF NOT EXISTS idx_candidates_sheet_updated_at ON candidates_sheet(updated_at DESC);
