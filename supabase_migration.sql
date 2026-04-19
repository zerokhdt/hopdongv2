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
  task_id TEXT NOT NULL,
  step TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_group TEXT,
  to_group TEXT,
  actor TEXT,
  actor_role TEXT,
  actor_branch TEXT,
  error TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_transition_log_task_idx ON task_transition_log(task_id);
CREATE INDEX IF NOT EXISTS task_transition_log_created_at_idx ON task_transition_log(created_at DESC);

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_username TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_notifications_target_idx ON app_notifications(target_username);
CREATE INDEX IF NOT EXISTS app_notifications_created_at_idx ON app_notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS contract_issue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key TEXT,
  method TEXT NOT NULL,
  so_hd TEXT,
  employee_id TEXT,
  employee_name TEXT,
  branch TEXT,
  filename TEXT,
  drive_file_id TEXT,
  drive_view_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personnel_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch TEXT NOT NULL,
  created_by TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  decision_note TEXT
);

CREATE INDEX IF NOT EXISTS personnel_movements_status_idx ON personnel_movements(status);
CREATE INDEX IF NOT EXISTS personnel_movements_branch_idx ON personnel_movements(branch);
CREATE INDEX IF NOT EXISTS personnel_movements_created_at_idx ON personnel_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS personnel_movements_employee_id_idx ON personnel_movements(employee_id);

CREATE TABLE IF NOT EXISTS personnel_movement_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES personnel_movements(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS personnel_movement_audit_movement_idx ON personnel_movement_audit(movement_id);
CREATE INDEX IF NOT EXISTS personnel_movement_audit_at_idx ON personnel_movement_audit(at DESC);

CREATE TABLE IF NOT EXISTS employee_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  branch TEXT,
  leave_type TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  days INTEGER,
  reason TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_leaves_employee_idx ON employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS employee_leaves_branch_idx ON employee_leaves(branch);
CREATE INDEX IF NOT EXISTS employee_leaves_created_at_idx ON employee_leaves(created_at DESC);

CREATE TABLE IF NOT EXISTS app_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_users_select_none" ON app_users;
CREATE POLICY "app_users_select_none"
  ON app_users
  FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE OR REPLACE FUNCTION authenticate_app_user(p_username TEXT, p_password TEXT)
RETURNS TABLE (username TEXT, branch_id TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.username, u.branch_id, u.role
  FROM public.app_users u
  WHERE lower(u.username) = lower(trim(p_username))
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);
END;
$$;

REVOKE ALL ON FUNCTION authenticate_app_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_app_user(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- CANDIDATES TABLE for Recruitment System
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  row_index INTEGER UNIQUE, -- Giữ lại để sync với Google Sheet
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  experience TEXT,
  education TEXT,
  cv_url TEXT,
  video_url TEXT,
  -- Workflow status fields
  workflow_status TEXT DEFAULT 'NEW', -- NEW, SENT_TO_BRANCH, BRANCH_ACCEPTED, BRANCH_REJECTED, CANDIDATE_CONFIRMED, CANDIDATE_DECLINED, INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED, DEMO_SCHEDULED, DEMO_COMPLETED, OFFER_SENT, HIRED, OFFER_DECLINED, REJECTED
  status TEXT DEFAULT 'NEW', -- Legacy field: NEW, INTERVIEWED, HIRED, REJECTED, SENT_TO_BRANCH
  -- Branch assignment fields
  branch_assigned TEXT REFERENCES branches(id),
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ,
  branch_access_token UUID,
  -- Branch decision fields
  branch_decision TEXT CHECK (branch_decision IN ('ACCEPT', 'REJECT', 'PENDING')),
  branch_decision_by TEXT,
  branch_decision_at TIMESTAMPTZ,
  branch_decision_notes TEXT,
  -- Candidate confirmation fields
  candidate_confirmation TEXT CHECK (candidate_confirmation IN ('CONFIRMED', 'DECLINED', 'PENDING')),
  candidate_confirmed_at TIMESTAMPTZ,
  candidate_confirmation_method TEXT,
  -- Interview fields
  interview_scheduled_date TIMESTAMPTZ,
  interview_location TEXT,
  interviewer TEXT,
  interview_result TEXT CHECK (interview_result IN ('PASS', 'FAIL', 'PENDING')),
  interview_notes TEXT,
  interview_completed_at TIMESTAMPTZ,
  -- Demo fields (optional)
  demo_scheduled_date TIMESTAMPTZ,
  demo_location TEXT,
  demo_evaluator TEXT,
  demo_result TEXT CHECK (demo_result IN ('PASS', 'FAIL', 'PENDING')),
  demo_notes TEXT,
  demo_completed_at TIMESTAMPTZ,
  -- Offer fields
  offer_sent_date TIMESTAMPTZ,
  offer_sent_by TEXT,
  offer_details JSONB DEFAULT '{}'::jsonb,
  offer_response TEXT CHECK (offer_response IN ('ACCEPTED', 'DECLINED', 'PENDING')),
  offer_response_at TIMESTAMPTZ,
  -- Tracking & timeout fields
  next_action_due_date TIMESTAMPTZ,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  workflow_timeout_date TIMESTAMPTZ,
  -- Email tracking fields
  email_sent_to_branch BOOLEAN DEFAULT FALSE,
  email_sent_to_candidate BOOLEAN DEFAULT FALSE,
  last_email_sent_at TIMESTAMPTZ,
  email_tracking_id TEXT,
  -- Multi-branch decision tracking
  multi_branch_decisions JSONB DEFAULT '[]'::jsonb,
  final_decision TEXT,
  final_decision_by TEXT,
  final_decision_at TIMESTAMPTZ,
  -- Raw data and timestamps
  interview_result_json JSONB DEFAULT '{}'::jsonb, -- Legacy field
  raw_data JSONB DEFAULT '{}'::jsonb, -- Lưu toàn bộ dữ liệu gốc từ Google Sheet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho performance
CREATE INDEX IF NOT EXISTS idx_candidates_workflow_status ON candidates(workflow_status);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_branch ON candidates(branch_assigned);
CREATE INDEX IF NOT EXISTS idx_candidates_created ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_row_index ON candidates(row_index);
CREATE INDEX IF NOT EXISTS idx_candidates_next_action_due ON candidates(next_action_due_date) WHERE next_action_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_branch_decision ON candidates(branch_decision) WHERE branch_decision IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_confirmation ON candidates(candidate_confirmation) WHERE candidate_confirmation IS NOT NULL;

-- Function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho candidates
DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INTERVIEWS TABLE for tracking interview process
-- ============================================================

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_email TEXT NOT NULL,
  interview_date TIMESTAMPTZ NOT NULL,
  technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 10),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 10),
  attitude_score INTEGER CHECK (attitude_score >= 0 AND attitude_score <= 10),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 10),
  decision TEXT CHECK (decision IN ('PASS', 'FAIL', 'PENDING')),
  notes TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  sheet_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date DESC);

-- ============================================================
-- CANDIDATE ACCESS TOKENS for branch access
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_access_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id),
  interviewer_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON candidate_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_candidate ON candidate_access_tokens(candidate_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires ON candidate_access_tokens(expires_at);

-- ============================================================
-- CANDIDATE WORKFLOW HISTORY for tracking state transitions
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  action_type TEXT NOT NULL, -- ASSIGN_TO_BRANCH, BRANCH_DECISION, CANDIDATE_CONFIRMATION, INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED, DEMO_SCHEDULED, DEMO_COMPLETED, OFFER_SENT, OFFER_RESPONSE, MANUAL_REVIEW, TIMEOUT
  actor TEXT, -- Người thực hiện hành động
  actor_role TEXT, -- HRM, BRANCH_MANAGER, INTERVIEWER, CANDIDATE, SYSTEM
  actor_branch TEXT, -- Chi nhánh của actor (nếu có)
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Dữ liệu bổ sung (email tracking, token, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_candidate ON candidate_workflow_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_created_at ON candidate_workflow_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_history_action_type ON candidate_workflow_history(action_type);
CREATE INDEX IF NOT EXISTS idx_workflow_history_actor ON candidate_workflow_history(actor);

-- Function để tự động ghi log khi workflow_status thay đổi
CREATE OR REPLACE FUNCTION log_candidate_workflow_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.workflow_status IS DISTINCT FROM NEW.workflow_status THEN
    INSERT INTO candidate_workflow_history (
      candidate_id,
      from_status,
      to_status,
      action_type,
      actor,
      actor_role,
      actor_branch,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      OLD.workflow_status,
      NEW.workflow_status,
      'STATUS_CHANGE',
      current_setting('app.current_user', true),
      current_setting('app.current_user_role', true),
      current_setting('app.current_user_branch', true),
      NULL,
      jsonb_build_object(
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động ghi log workflow history
DROP TRIGGER IF EXISTS trigger_candidate_workflow_history ON candidates;
CREATE TRIGGER trigger_candidate_workflow_history
  AFTER UPDATE OF workflow_status ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION log_candidate_workflow_change();

-- ============================================================
-- CANDIDATES_SHEET TABLE (Flat model synced from Google Sheet)
-- ============================================================

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

DROP TRIGGER IF EXISTS update_candidates_sheet_updated_at ON candidates_sheet;
CREATE TRIGGER update_candidates_sheet_updated_at
  BEFORE UPDATE ON candidates_sheet
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
