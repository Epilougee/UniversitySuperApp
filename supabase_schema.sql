-- ============================================================================
-- UNI SUPER APP - Complete Supabase Schema + Seed Data
-- ============================================================================
-- Paste this ENTIRE file into Supabase SQL Editor and click "Run"
-- It creates all 16 tables, 2 RPC functions, disables RLS, and inserts demo data
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: CREATE TABLES (PostgreSQL syntax)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 1,
  section TEXT NOT NULL DEFAULT 'A',
  cgpa REAL NOT NULL DEFAULT 0.0,
  attendance REAL NOT NULL DEFAULT 0.0,
  phone TEXT,
  email TEXT,
  batch TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT 'Assistant Professor',
  phone TEXT,
  email TEXT,
  office TEXT,
  expertise TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  department TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  schedule TEXT,
  room TEXT,
  credits INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS enrollments (
  student_id TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  group_name TEXT DEFAULT 'A',
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS marks (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  assessment_type TEXT NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 20,
  obtained REAL NOT NULL DEFAULT 0,
  semester TEXT,
  entered_by TEXT,
  entered_at BIGINT
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  method TEXT DEFAULT 'manual',
  marked_at BIGINT
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT DEFAULT 'All',
  urgency TEXT DEFAULT 'Medium',
  author TEXT NOT NULL,
  author_role TEXT DEFAULT 'Admin',
  created_at BIGINT NOT NULL,
  reads INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  subject_code TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT,
  exam_type TEXT DEFAULT 'ESE'
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  venue TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  reg_limit INTEGER DEFAULT 500,
  registered INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Open',
  description TEXT
);

CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  semester TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  paid REAL DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  event TEXT NOT NULL,
  type TEXT DEFAULT 'Event'
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT DEFAULT 'general',
  read_status INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_sessions (
  id SERIAL PRIMARY KEY,
  otp TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  teacher_id TEXT NOT NULL,
  date TEXT NOT NULL,
  lat REAL,
  lng REAL,
  radius INTEGER DEFAULT 200,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: DISABLE ROW LEVEL SECURITY (app uses publishable key)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE marks DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: CREATE RPC FUNCTIONS (used by db.ts)
-- ═══════════════════════════════════════════════════════════════════════════════

-- run_query: executes a SELECT and returns rows as JSONB array
CREATE OR REPLACE FUNCTION run_query(query_text TEXT, query_params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  param_count INTEGER;
  i INTEGER;
  modified_query TEXT;
BEGIN
  modified_query := query_text;
  param_count := jsonb_array_length(query_params);

  -- Replace $1, $2, etc. with actual values from params array
  FOR i IN REVERSE param_count..1 LOOP
    IF jsonb_typeof(query_params->(i-1)) = 'string' THEN
      modified_query := replace(modified_query, '$' || i, quote_literal(query_params->>(i-1)));
    ELSIF jsonb_typeof(query_params->(i-1)) = 'null' THEN
      modified_query := replace(modified_query, '$' || i, 'NULL');
    ELSE
      modified_query := replace(modified_query, '$' || i, query_params->>(i-1));
    END IF;
  END LOOP;

  EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', modified_query)
  INTO result;

  RETURN result;
END;
$$;

-- run_statement: executes INSERT/UPDATE/DELETE (no return)
CREATE OR REPLACE FUNCTION run_statement(stmt_text TEXT, stmt_params JSONB DEFAULT '[]'::JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  param_count INTEGER;
  i INTEGER;
  modified_stmt TEXT;
BEGIN
  modified_stmt := stmt_text;
  param_count := jsonb_array_length(stmt_params);

  FOR i IN REVERSE param_count..1 LOOP
    IF jsonb_typeof(stmt_params->(i-1)) = 'string' THEN
      modified_stmt := replace(modified_stmt, '$' || i, quote_literal(stmt_params->>(i-1)));
    ELSIF jsonb_typeof(stmt_params->(i-1)) = 'null' THEN
      modified_stmt := replace(modified_stmt, '$' || i, 'NULL');
    ELSE
      modified_stmt := replace(modified_stmt, '$' || i, stmt_params->>(i-1));
    END IF;
  END LOOP;

  EXECUTE modified_stmt;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Departments ──
INSERT INTO departments (id, name) VALUES
  ('CSE', 'Computer Science & Engineering'),
  ('ECE', 'Electronics & Communication'),
  ('MECH', 'Mechanical Engineering'),
  ('BBA', 'Business Administration'),
  ('LAW', 'School of Law')
ON CONFLICT DO NOTHING;

-- ── Students (password = bcrypt hash of their ID) ──
INSERT INTO students (id, password, name, department, year, section, cgpa, attendance, phone, email, batch, address) VALUES
  ('E25B022087', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'John Doe', 'CSE', 2, 'B', 8.4, 82, '9876543210', 'john@uni.edu', '2024-28', 'Pune, MH'),
  ('E25B022088', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeQZLBYQGmsWmHHTfAWfcFCHP4aMJbHjK', 'Priya Sharma', 'CSE', 2, 'B', 9.1, 91, '9876543211', 'priya@uni.edu', '2024-28', 'Mumbai, MH'),
  ('E25B022089', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfe0S.2C4Z6j.qdA7AykhENBMRf5CpxJdi', 'Arjun Mehta', 'ECE', 1, 'A', 7.8, 76, '9876543212', 'arjun@uni.edu', '2025-29', 'Nashik, MH'),
  ('E25A022001', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeSkC0rgOfTU/CU0OGtTrdvL03Y5GOmy2', 'Riya Desai', 'BBA', 3, 'A', 8.0, 88, '9876543213', 'riya@uni.edu', '2023-26', 'Pune, MH'),
  ('E25B022090', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfe1d4/MCxy/P8yAWS2TMa36IB/85UUXWm', 'Rohit Kumar', 'CSE', 2, 'A', 7.5, 70, '9876543214', 'rohit@uni.edu', '2024-28', 'Delhi'),
  ('E25B022091', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeVCau7GH7cLV0tsAAYAEnR192Y3SONGu', 'Anjali Patil', 'CSE', 2, 'A', 9.3, 95, '9876543215', 'anjali@uni.edu', '2024-28', 'Solapur, MH'),
  ('E25B022092', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeA.pc98YSminGiBzZuhzF6lW8p/pZBBm', 'Vivek Singh', 'ECE', 1, 'A', 6.9, 60, '9876543216', 'vivek@uni.edu', '2025-29', 'Nagpur, MH'),
  ('E25B022093', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfe5uhUQS57h4SQ4iVY5VdofnftrM8wnvy', 'Sneha Kulkarni', 'MECH', 3, 'A', 8.2, 85, '9876543217', 'sneha@uni.edu', '2023-26', 'Kolhapur, MH'),
  ('E25B022094', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Rahul Gupta', 'CSE', 2, 'B', 7.6, 78, '9876543218', 'rahul@uni.edu', '2024-28', 'Indore, MP'),
  ('E25B022095', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Kavya Nair', 'ECE', 1, 'A', 8.8, 89, '9876543219', 'kavya@uni.edu', '2025-29', 'Kochi, KL'),
  ('E25B022096', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Aditya Sharma', 'CSE', 2, 'A', 7.2, 72, '9876543220', 'aditya@uni.edu', '2024-28', 'Jaipur, RJ'),
  ('E25B022097', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Pooja Iyer', 'BBA', 3, 'A', 8.5, 87, '9876543221', 'pooja@uni.edu', '2023-26', 'Chennai, TN'),
  ('E25B022098', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Karan Malhotra', 'MECH', 2, 'A', 7.0, 68, '9876543222', 'karan@uni.edu', '2024-28', 'Chandigarh'),
  ('E25B022099', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Deepika Reddy', 'CSE', 2, 'B', 8.9, 90, '9876543223', 'deepika@uni.edu', '2024-28', 'Hyderabad, TS'),
  ('E25B022100', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Amit Pandey', 'ECE', 1, 'A', 7.4, 74, '9876543224', 'amit@uni.edu', '2025-29', 'Lucknow, UP'),
  ('E25B022101', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfebCyArnOH0SQXsXcgjHSu9GPjbKi.14K', 'Shreya Joshi', 'BBA', 3, 'A', 8.7, 92, '9876543225', 'shreya@uni.edu', '2023-26', 'Pune, MH')
ON CONFLICT DO NOTHING;

-- ── Teachers (password = bcrypt hash of their ID) ──
INSERT INTO teachers (id, password, name, department, designation, phone, email, office, expertise) VALUES
  ('T25S022090', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeAExFgEi0TMXnvYnYeVT83skag3r1w8u', 'Dr. Indu Kumari', 'CSE', 'Associate Professor', '9876500001', 'indu.kumari@uni.edu', 'B-204', 'Machine Learning, AI'),
  ('T25S022091', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfejHBNmjudOzdTCUXKS4i9y5CF1AKI2u.', 'Prof. Rajesh Verma', 'ECE', 'Assistant Professor', '9876500002', 'rajesh.verma@uni.edu', 'E-102', 'Signal Processing, VLSI'),
  ('T25S022092', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeulHgWIUIU4wG3OIwech9vaHifcoUczO', 'Dr. Sunita Patel', 'BBA', 'Professor', '9876500003', 'sunita.patel@uni.edu', 'M-201', 'Marketing, Strategy'),
  ('T25S022093', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfeMB2n6e9UpaPBiXNWZZ7FhztEaqKbe/2', 'Prof. Anil Joshi', 'MECH', 'Assistant Professor', '9876500004', 'anil.joshi@uni.edu', 'D-301', 'Thermodynamics')
ON CONFLICT DO NOTHING;

-- ── Admin (password = Admin@123) ──
INSERT INTO admins (id, password, name) VALUES
  ('Admin@404', '$2a$10$u8qAbcPBZ3uH2xF.ugOjfesndaf7jlE9JOUkVUTuWsr7y/8qU0S3O', 'Admin')
ON CONFLICT DO NOTHING;

-- ── Classes ──
INSERT INTO classes (id, name, subject_code, department, teacher_id, schedule, room, credits) VALUES
  (1, 'Data Structures & Algorithms', 'CSE301', 'CSE', 'T25S022090', 'Mon/Wed/Fri 9:00-10:00', 'Lab A-201', 4),
  (2, 'Database Management Systems', 'CSE302', 'CSE', 'T25S022090', 'Tue/Thu 10:00-11:30', 'Room B-105', 3),
  (3, 'Operating Systems', 'CSE303', 'CSE', 'T25S022090', 'Mon/Wed 11:00-12:00', 'Room B-106', 3),
  (4, 'Computer Networks', 'CSE304', 'CSE', 'T25S022090', 'Tue/Thu 2:00-3:30', 'Room A-102', 3),
  (5, 'Digital Electronics', 'ECE201', 'ECE', 'T25S022091', 'Mon/Wed/Fri 10:00-11:00', 'Lab E-101', 4),
  (6, 'Signals & Systems', 'ECE202', 'ECE', 'T25S022091', 'Tue/Thu 11:00-12:30', 'Room E-102', 3),
  (7, 'Marketing Management', 'BBA301', 'BBA', 'T25S022092', 'Mon/Wed 2:00-3:30', 'Room M-201', 3),
  (8, 'Business Law', 'BBA302', 'BBA', 'T25S022092', 'Tue/Thu 9:00-10:30', 'Room M-202', 3)
ON CONFLICT DO NOTHING;

-- Reset the classes id sequence to avoid conflicts with future inserts
SELECT setval('classes_id_seq', (SELECT COALESCE(MAX(id), 0) FROM classes));

-- ── Enrollments ──
INSERT INTO enrollments (student_id, class_id, group_name) VALUES
  -- John Doe - CSE subjects
  ('E25B022087', 1, 'Group B2'), ('E25B022087', 2, 'Group B2'),
  ('E25B022087', 3, 'Group B2'), ('E25B022087', 4, 'Group B2'),
  -- Priya Sharma - CSE subjects
  ('E25B022088', 1, 'Group B2'), ('E25B022088', 2, 'Group B2'),
  ('E25B022088', 3, 'Group B2'), ('E25B022088', 4, 'Group B2'),
  -- Rohit Kumar - CSE subjects
  ('E25B022090', 1, 'Group A1'), ('E25B022090', 2, 'Group A1'),
  ('E25B022090', 3, 'Group A1'), ('E25B022090', 4, 'Group A1'),
  -- Anjali Patil - CSE subjects
  ('E25B022091', 1, 'Group A1'), ('E25B022091', 2, 'Group A1'),
  ('E25B022091', 3, 'Group A1'), ('E25B022091', 4, 'Group A1'),
  -- Arjun Mehta - ECE subjects
  ('E25B022089', 5, 'Group A1'), ('E25B022089', 6, 'Group A1'),
  -- Vivek Singh - ECE subjects
  ('E25B022092', 5, 'Group A1'), ('E25B022092', 6, 'Group A1'),
  -- Riya Desai - BBA subjects
  ('E25A022001', 7, 'Group A1'), ('E25A022001', 8, 'Group A1'),
  -- Sneha Kulkarni - CSE subjects (cross-dept)
  ('E25B022093', 1, 'Group B2'), ('E25B022093', 2, 'Group B2'),
  -- New students enrollments
  ('E25B022094', 1, 'Group B2'), ('E25B022094', 2, 'Group B2'),
  ('E25B022096', 1, 'Group A1'), ('E25B022096', 2, 'Group A1'),
  ('E25B022099', 1, 'Group B2'), ('E25B022099', 2, 'Group B2'),
  ('E25B022095', 5, 'Group A1'), ('E25B022095', 6, 'Group A1'),
  ('E25B022100', 5, 'Group A1'), ('E25B022100', 6, 'Group A1'),
  ('E25B022097', 7, 'Group A1'), ('E25B022097', 8, 'Group A1'),
  ('E25B022101', 7, 'Group A1'), ('E25B022101', 8, 'Group A1')
ON CONFLICT DO NOTHING;

-- ── Marks ──
INSERT INTO marks (student_id, class_id, assessment_type, max_marks, obtained, semester, entered_by, entered_at) VALUES
  -- John Doe CSE
  ('E25B022087', 1, 'IA1', 20, 16, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 1, 'IA2', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 2, 'IA1', 20, 15, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 2, 'IA2', 20, 16, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 3, 'IA1', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 3, 'IA2', 20, 15, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 4, 'IA1', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022087', 4, 'IA2', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  -- Priya Sharma CSE
  ('E25B022088', 1, 'IA1', 20, 19, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 1, 'IA2', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 2, 'IA1', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 2, 'IA2', 20, 19, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 3, 'IA1', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 3, 'IA2', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 4, 'IA1', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022088', 4, 'IA2', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  -- Arjun Mehta ECE
  ('E25B022089', 5, 'IA1', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022089', 5, 'IA2', 20, 15, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022089', 6, 'IA1', 20, 13, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022089', 6, 'IA2', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  -- Riya Desai BBA
  ('E25A022001', 7, 'IA1', 20, 16, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25A022001', 7, 'IA2', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25A022001', 8, 'IA1', 20, 15, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25A022001', 8, 'IA2', 20, 16, 'Sem 4', 'T25S022090', 1795064827194),
  -- Rohit Kumar CSE
  ('E25B022090', 1, 'IA1', 20, 13, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 1, 'IA2', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 2, 'IA1', 20, 12, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 2, 'IA2', 20, 13, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 3, 'IA1', 20, 11, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 3, 'IA2', 20, 12, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 4, 'IA1', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022090', 4, 'IA2', 20, 13, 'Sem 4', 'T25S022090', 1795064827194),
  -- Anjali Patil CSE
  ('E25B022091', 1, 'IA1', 20, 19, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 1, 'IA2', 20, 20, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 2, 'IA1', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 2, 'IA2', 20, 19, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 3, 'IA1', 20, 17, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 3, 'IA2', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 4, 'IA1', 20, 19, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022091', 4, 'IA2', 20, 18, 'Sem 4', 'T25S022090', 1795064827194),
  -- Vivek Singh ECE
  ('E25B022092', 5, 'IA1', 20, 10, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022092', 5, 'IA2', 20, 11, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022092', 6, 'IA1', 20, 9, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022092', 6, 'IA2', 20, 10, 'Sem 4', 'T25S022090', 1795064827194),
  -- Sneha Kulkarni
  ('E25B022093', 1, 'IA1', 20, 15, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022093', 1, 'IA2', 20, 16, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022093', 2, 'IA1', 20, 14, 'Sem 4', 'T25S022090', 1795064827194),
  ('E25B022093', 2, 'IA2', 20, 15, 'Sem 4', 'T25S022090', 1795064827194);

-- ── Announcements ──
INSERT INTO announcements (title, body, target, urgency, author, author_role, created_at, reads) VALUES
  ('End Semester Exams - May 5-20, 2026', 'The End Semester Examination schedule for all departments has been released. Hall tickets will be issued one week prior to the exams. All students must ensure their attendance is above 75% to appear for the exams.', 'All', 'High', 'Exam Cell', 'Admin', 1794546427194, 342),
  ('Ideathon 2026 - Register by March 20', 'Participate in Uni Ideathon 2026. Cash prizes worth Rs 1,50,000. Open to all UG students. Register at the portal before March 20, 2026.', 'UG', 'Medium', 'Innovation Cell', 'Admin', 1794719227194, 215),
  ('Network Maintenance - Mar 16 (12AM-4AM)', 'Campus network and all online portals will be unavailable from 12 AM to 4 AM on March 16. Please save your work before midnight.', 'All', 'Low', 'IT Department', 'Admin', 1794805627194, 180),
  ('Campus Placement Drive - TCS on Apr 3', 'TCS will be visiting the campus on April 3, 2026 for placement drives for CSE and IT final year students. Eligible students must register on the placement portal before March 28.', 'CSE', 'High', 'Placement Cell', 'Admin', 1794978427194, 410),
  ('Library Extended Hours During Exams', 'The central library will remain open 24x7 from April 20 to May 20. Students can use reading rooms with their ID cards. Silent zone rules strictly enforced.', 'All', 'Low', 'Library', 'Admin', 1795064827194, 125);

-- ── Exams ──
INSERT INTO exams (subject, subject_code, date, time, venue, department, semester, exam_type) VALUES
  ('Data Structures & Algorithms', 'CSE301', '2026-05-05', '10:00 AM', 'Hall A', 'CSE', 'Sem 4', 'ESE'),
  ('Database Management Systems', 'CSE302', '2026-05-08', '10:00 AM', 'Hall A', 'CSE', 'Sem 4', 'ESE'),
  ('Operating Systems', 'CSE303', '2026-05-11', '2:00 PM', 'Hall B', 'CSE', 'Sem 4', 'ESE'),
  ('Computer Networks', 'CSE304', '2026-05-14', '10:00 AM', 'Hall A', 'CSE', 'Sem 4', 'ESE'),
  ('Digital Electronics', 'ECE201', '2026-05-06', '10:00 AM', 'Hall C', 'ECE', 'Sem 2', 'ESE'),
  ('Signals & Systems', 'ECE202', '2026-05-09', '2:00 PM', 'Hall C', 'ECE', 'Sem 2', 'ESE'),
  ('Marketing Management', 'BBA301', '2026-05-07', '10:00 AM', 'Hall D', 'BBA', 'Sem 6', 'ESE'),
  ('Business Law', 'BBA302', '2026-05-10', '2:00 PM', 'Hall D', 'BBA', 'Sem 6', 'ESE');

-- ── Events ──
INSERT INTO events (name, date, venue, category, reg_limit, registered, status, description) VALUES
  ('TechXcelerate 2026', 'Apr 22-24', 'Block F, Open Ground', 'Technical', 400, 312, 'Open', 'Annual tech fest with hackathons, robotics, gaming tournaments.'),
  ('Rang Cultural Fest', 'Mar 29', 'Main Amphitheatre', 'Cultural', 700, 680, 'Closing', 'Celebrating diversity through dance, music, and drama.'),
  ('Campus Placement Drive - TCS', 'Apr 3', 'Seminar Hall A', 'Career', 200, 145, 'Open', 'TCS MNC recruitment for CSE/IT branches.'),
  ('Research Symposium RISE', 'Apr 8', 'Convention Centre', 'Academic', 150, 78, 'Open', 'Research paper presentations and faculty talks.');

-- ── Fees ──
INSERT INTO fees (student_id, semester, description, amount, paid, due_date, status) VALUES
  ('E25B022087', 'Sem 4 2025-26', 'Tuition Fee', 85000, 85000, '2026-01-15', 'Paid'),
  ('E25B022087', 'Sem 4 2025-26', 'Library & Lab Fee', 5000, 0, '2026-03-31', 'Pending'),
  ('E25B022087', 'Sem 4 2025-26', 'Hostel Fee', 60000, 60000, '2026-01-15', 'Paid'),
  ('E25B022088', 'Sem 4 2025-26', 'Tuition Fee', 85000, 85000, '2026-01-15', 'Paid'),
  ('E25B022088', 'Sem 4 2025-26', 'Library & Lab Fee', 5000, 5000, '2026-03-31', 'Paid'),
  ('E25B022089', 'Sem 2 2025-26', 'Tuition Fee', 80000, 40000, '2026-02-28', 'Partial'),
  ('E25B022089', 'Sem 2 2025-26', 'Sports & Activity Fee', 3000, 0, '2026-03-15', 'Overdue'),
  ('E25A022001', 'Sem 6 2025-26', 'Tuition Fee', 75000, 75000, '2026-01-15', 'Paid'),
  ('E25A022001', 'Sem 6 2025-26', 'Examination Fee', 5000, 0, '2026-04-01', 'Pending'),
  ('E25B022090', 'Sem 4 2025-26', 'Tuition Fee', 85000, 0, '2026-01-15', 'Overdue'),
  ('E25B022090', 'Sem 4 2025-26', 'Hostel Fee', 60000, 30000, '2026-01-15', 'Partial'),
  ('E25B022091', 'Sem 4 2025-26', 'Tuition Fee', 85000, 85000, '2026-01-15', 'Paid'),
  ('E25B022092', 'Sem 2 2025-26', 'Tuition Fee', 80000, 0, '2026-02-28', 'Overdue'),
  ('E25B022093', 'Sem 6 2025-26', 'Tuition Fee', 75000, 75000, '2026-01-15', 'Paid');

-- ── Calendar Events ──
INSERT INTO calendar_events (date, event, type) VALUES
  ('2026-03-25', 'Mid-Semester Exams Begin', 'Exam'),
  ('2026-04-01', 'Mid-Semester Results Declared', 'Result'),
  ('2026-04-03', 'TCS Campus Placement Drive', 'Event'),
  ('2026-04-08', 'Research Symposium RISE', 'Event'),
  ('2026-04-14', 'Dr. Ambedkar Jayanti - Holiday', 'Holiday'),
  ('2026-04-22', 'Earth Day Campus Drive', 'Event'),
  ('2026-04-22', 'TechXcelerate 2026 Begins', 'Event'),
  ('2026-05-05', 'End Semester Exams Begin', 'Exam'),
  ('2026-05-20', 'End Semester Exams End', 'Exam'),
  ('2026-05-25', 'Results Declaration', 'Result'),
  ('2026-06-01', 'Summer Vacation Begins', 'Holiday'),
  ('2026-07-15', 'New Semester Registration Opens', 'Event');

-- ══════════════════════════════════════════════════════════════════
-- Attendance Records (792 rows - 45 days x 8 students x their enrolled classes)
-- ══════════════════════════════════════════════════════════════════

INSERT INTO attendance_records (student_id, class_id, date, status, method, marked_at) VALUES
  ('E25B022087', 1, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022087', 2, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022087', 3, '2026-11-19', 'Absent', 'manual', 1795064827194),
  ('E25B022087', 4, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022087', 1, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022087', 2, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022087', 3, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022087', 4, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022087', 1, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022087', 2, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022087', 3, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022087', 4, '2026-11-17', 'Absent', 'manual', 1794892027194),
  ('E25B022087', 1, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022087', 2, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022087', 3, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022087', 4, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022087', 1, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022087', 2, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022087', 3, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022087', 4, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022087', 1, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022087', 2, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022087', 3, '2026-11-12', 'Absent', 'manual', 1794460027194),
  ('E25B022087', 4, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022087', 1, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022087', 2, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022087', 3, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022087', 4, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022087', 1, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022087', 2, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022087', 3, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022087', 4, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022087', 1, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022087', 2, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022087', 3, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022087', 4, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022087', 1, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022087', 2, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022087', 3, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022087', 4, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022087', 1, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022087', 2, '2026-11-05', 'Absent', 'manual', 1793855227194),
  ('E25B022087', 3, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022087', 4, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022087', 1, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022087', 2, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022087', 3, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022087', 4, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022087', 1, '2026-11-03', 'Absent', 'manual', 1793682427194),
  ('E25B022087', 2, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022087', 3, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022087', 4, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022087', 1, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022087', 2, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022087', 3, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022087', 4, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022087', 1, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022087', 2, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022087', 3, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022087', 4, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022087', 1, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022087', 2, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022087', 3, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022087', 4, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022087', 1, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022087', 2, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022087', 3, '2026-10-28', 'Absent', 'manual', 1793164027194),
  ('E25B022087', 4, '2026-10-28', 'Absent', 'manual', 1793164027194),
  ('E25B022087', 1, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022087', 2, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022087', 3, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022087', 4, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022087', 1, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022087', 2, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022087', 3, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022087', 4, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022087', 1, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022087', 2, '2026-10-23', 'Absent', 'manual', 1792732027194),
  ('E25B022087', 3, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022087', 4, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022087', 1, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022087', 2, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022087', 3, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022087', 4, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022087', 1, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022087', 2, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022087', 3, '2026-10-21', 'Absent', 'manual', 1792559227194),
  ('E25B022087', 4, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022087', 1, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022087', 2, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022087', 3, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022087', 4, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022087', 1, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022087', 2, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022087', 3, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022087', 4, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022087', 1, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022087', 2, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022087', 3, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022087', 4, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022087', 1, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022087', 2, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022087', 3, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022087', 4, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022087', 1, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022087', 2, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022087', 3, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022087', 4, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022087', 1, '2026-10-13', 'Absent', 'manual', 1791868027194),
  ('E25B022087', 2, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022087', 3, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022087', 4, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022087', 1, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022087', 2, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022087', 3, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022087', 4, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022087', 1, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022087', 2, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022087', 3, '2026-10-09', 'Absent', 'manual', 1791522427194),
  ('E25B022087', 4, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022087', 1, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022087', 2, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022087', 3, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022087', 4, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022087', 1, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022087', 2, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022087', 3, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022087', 4, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022087', 1, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022087', 2, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022087', 3, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022087', 4, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022088', 1, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022088', 2, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022088', 3, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022088', 4, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022088', 1, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022088', 2, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022088', 3, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022088', 4, '2026-11-18', 'Absent', 'manual', 1794978427194),
  ('E25B022088', 1, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022088', 2, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022088', 3, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022088', 4, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022088', 1, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022088', 2, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022088', 3, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022088', 4, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022088', 1, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022088', 2, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022088', 3, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022088', 4, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022088', 1, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022088', 2, '2026-11-12', 'Absent', 'manual', 1794460027194),
  ('E25B022088', 3, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022088', 4, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022088', 1, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022088', 2, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022088', 3, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022088', 4, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022088', 1, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022088', 2, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022088', 3, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022088', 4, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022088', 1, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022088', 2, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022088', 3, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022088', 4, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022088', 1, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022088', 2, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022088', 3, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022088', 4, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022088', 1, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022088', 2, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022088', 3, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022088', 4, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022088', 1, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022088', 2, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022088', 3, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022088', 4, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022088', 1, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022088', 2, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022088', 3, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022088', 4, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022088', 1, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022088', 2, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022088', 3, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022088', 4, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022088', 1, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022088', 2, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022088', 3, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022088', 4, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022088', 1, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022088', 2, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022088', 3, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022088', 4, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022088', 1, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022088', 2, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022088', 3, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022088', 4, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022088', 1, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022088', 2, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022088', 3, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022088', 4, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022088', 1, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022088', 2, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022088', 3, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022088', 4, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022088', 1, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022088', 2, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022088', 3, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022088', 4, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022088', 1, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022088', 2, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022088', 3, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022088', 4, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022088', 1, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022088', 2, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022088', 3, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022088', 4, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022088', 1, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022088', 2, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022088', 3, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022088', 4, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022088', 1, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022088', 2, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022088', 3, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022088', 4, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022088', 1, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022088', 2, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022088', 3, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022088', 4, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022088', 1, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022088', 2, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022088', 3, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022088', 4, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022088', 1, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022088', 2, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022088', 3, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022088', 4, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022088', 1, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022088', 2, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022088', 3, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022088', 4, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022088', 1, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022088', 2, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022088', 3, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022088', 4, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022088', 1, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022088', 2, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022088', 3, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022088', 4, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022088', 1, '2026-10-08', 'Absent', 'manual', 1791436027194),
  ('E25B022088', 2, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022088', 3, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022088', 4, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022088', 1, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022088', 2, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022088', 3, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022088', 4, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022088', 1, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022088', 2, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022088', 3, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022088', 4, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022089', 5, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022089', 6, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022089', 5, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022089', 6, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022089', 5, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022089', 6, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022089', 5, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022089', 6, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022089', 5, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022089', 6, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022089', 5, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022089', 6, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022089', 5, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022089', 6, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022089', 5, '2026-11-10', 'Absent', 'manual', 1794287227194),
  ('E25B022089', 6, '2026-11-10', 'Absent', 'manual', 1794287227194),
  ('E25B022089', 5, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022089', 6, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022089', 5, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022089', 6, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022089', 5, '2026-11-05', 'Absent', 'manual', 1793855227194),
  ('E25B022089', 6, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022089', 5, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022089', 6, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022089', 5, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022089', 6, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022089', 5, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022089', 6, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022089', 5, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022089', 6, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022089', 5, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022089', 6, '2026-10-29', 'Absent', 'manual', 1793250427194),
  ('E25B022089', 5, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022089', 6, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022089', 5, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022089', 6, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022089', 5, '2026-10-26', 'Absent', 'manual', 1792991227194),
  ('E25B022089', 6, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022089', 5, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022089', 6, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022089', 5, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022089', 6, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022089', 5, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022089', 6, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022089', 5, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022089', 6, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022089', 5, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022089', 6, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022089', 5, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022089', 6, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022089', 5, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022089', 6, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022089', 5, '2026-10-14', 'Absent', 'manual', 1791954427194),
  ('E25B022089', 6, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022089', 5, '2026-10-13', 'Absent', 'manual', 1791868027194),
  ('E25B022089', 6, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022089', 5, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022089', 6, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022089', 5, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022089', 6, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022089', 5, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022089', 6, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022089', 5, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022089', 6, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022089', 5, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022089', 6, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25A022001', 7, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25A022001', 8, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25A022001', 7, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25A022001', 8, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25A022001', 7, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25A022001', 8, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25A022001', 7, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25A022001', 8, '2026-11-16', 'Absent', 'manual', 1794805627194),
  ('E25A022001', 7, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25A022001', 8, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25A022001', 7, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25A022001', 8, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25A022001', 7, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25A022001', 8, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25A022001', 7, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25A022001', 8, '2026-11-10', 'Absent', 'manual', 1794287227194),
  ('E25A022001', 7, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25A022001', 8, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25A022001', 7, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25A022001', 8, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25A022001', 7, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25A022001', 8, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25A022001', 7, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25A022001', 8, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25A022001', 7, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25A022001', 8, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25A022001', 7, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25A022001', 8, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25A022001', 7, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25A022001', 8, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25A022001', 7, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25A022001', 8, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25A022001', 7, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25A022001', 8, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25A022001', 7, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25A022001', 8, '2026-10-27', 'Absent', 'manual', 1793077627194),
  ('E25A022001', 7, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25A022001', 8, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25A022001', 7, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25A022001', 8, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25A022001', 7, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25A022001', 8, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25A022001', 7, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25A022001', 8, '2026-10-21', 'Absent', 'manual', 1792559227194),
  ('E25A022001', 7, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25A022001', 8, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25A022001', 7, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25A022001', 8, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25A022001', 7, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25A022001', 8, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25A022001', 7, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25A022001', 8, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25A022001', 7, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25A022001', 8, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25A022001', 7, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25A022001', 8, '2026-10-13', 'Absent', 'manual', 1791868027194),
  ('E25A022001', 7, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25A022001', 8, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25A022001', 7, '2026-10-09', 'Absent', 'manual', 1791522427194),
  ('E25A022001', 8, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25A022001', 7, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25A022001', 8, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25A022001', 7, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25A022001', 8, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25A022001', 7, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25A022001', 8, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022090', 1, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022090', 2, '2026-11-19', 'Absent', 'manual', 1795064827194),
  ('E25B022090', 3, '2026-11-19', 'Absent', 'manual', 1795064827194),
  ('E25B022090', 4, '2026-11-19', 'Absent', 'manual', 1795064827194),
  ('E25B022090', 1, '2026-11-18', 'Absent', 'manual', 1794978427194),
  ('E25B022090', 2, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022090', 3, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022090', 4, '2026-11-18', 'Absent', 'manual', 1794978427194),
  ('E25B022090', 1, '2026-11-17', 'Absent', 'manual', 1794892027194),
  ('E25B022090', 2, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022090', 3, '2026-11-17', 'Absent', 'manual', 1794892027194),
  ('E25B022090', 4, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022090', 1, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022090', 2, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022090', 3, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022090', 4, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022090', 1, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022090', 2, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022090', 3, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022090', 4, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022090', 1, '2026-11-12', 'Absent', 'manual', 1794460027194),
  ('E25B022090', 2, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022090', 3, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022090', 4, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022090', 1, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022090', 2, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022090', 3, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022090', 4, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022090', 1, '2026-11-10', 'Absent', 'manual', 1794287227194),
  ('E25B022090', 2, '2026-11-10', 'Absent', 'manual', 1794287227194),
  ('E25B022090', 3, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022090', 4, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022090', 1, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022090', 2, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022090', 3, '2026-11-09', 'Absent', 'manual', 1794200827194),
  ('E25B022090', 4, '2026-11-09', 'Absent', 'manual', 1794200827194),
  ('E25B022090', 1, '2026-11-06', 'Absent', 'manual', 1793941627194),
  ('E25B022090', 2, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022090', 3, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022090', 4, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022090', 1, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022090', 2, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022090', 3, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022090', 4, '2026-11-05', 'Absent', 'manual', 1793855227194),
  ('E25B022090', 1, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022090', 2, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022090', 3, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022090', 4, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022090', 1, '2026-11-03', 'Absent', 'manual', 1793682427194),
  ('E25B022090', 2, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022090', 3, '2026-11-03', 'Absent', 'manual', 1793682427194),
  ('E25B022090', 4, '2026-11-03', 'Absent', 'manual', 1793682427194),
  ('E25B022090', 1, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022090', 2, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022090', 3, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022090', 4, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022090', 1, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022090', 2, '2026-10-30', 'Absent', 'manual', 1793336827194),
  ('E25B022090', 3, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022090', 4, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022090', 1, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022090', 2, '2026-10-29', 'Absent', 'manual', 1793250427194),
  ('E25B022090', 3, '2026-10-29', 'Absent', 'manual', 1793250427194),
  ('E25B022090', 4, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022090', 1, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022090', 2, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022090', 3, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022090', 4, '2026-10-28', 'Absent', 'manual', 1793164027194),
  ('E25B022090', 1, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022090', 2, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022090', 3, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022090', 4, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022090', 1, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022090', 2, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022090', 3, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022090', 4, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022090', 1, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022090', 2, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022090', 3, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022090', 4, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022090', 1, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022090', 2, '2026-10-22', 'Absent', 'manual', 1792645627194),
  ('E25B022090', 3, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022090', 4, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022090', 1, '2026-10-21', 'Absent', 'manual', 1792559227194),
  ('E25B022090', 2, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022090', 3, '2026-10-21', 'Absent', 'manual', 1792559227194),
  ('E25B022090', 4, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022090', 1, '2026-10-20', 'Absent', 'manual', 1792472827194),
  ('E25B022090', 2, '2026-10-20', 'Absent', 'manual', 1792472827194),
  ('E25B022090', 3, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022090', 4, '2026-10-20', 'Absent', 'manual', 1792472827194),
  ('E25B022090', 1, '2026-10-19', 'Absent', 'manual', 1792386427194),
  ('E25B022090', 2, '2026-10-19', 'Absent', 'manual', 1792386427194),
  ('E25B022090', 3, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022090', 4, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022090', 1, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022090', 2, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022090', 3, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022090', 4, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022090', 1, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022090', 2, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022090', 3, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022090', 4, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022090', 1, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022090', 2, '2026-10-14', 'Absent', 'manual', 1791954427194),
  ('E25B022090', 3, '2026-10-14', 'Absent', 'manual', 1791954427194),
  ('E25B022090', 4, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022090', 1, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022090', 2, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022090', 3, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022090', 4, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022090', 1, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022090', 2, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022090', 3, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022090', 4, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022090', 1, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022090', 2, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022090', 3, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022090', 4, '2026-10-09', 'Absent', 'manual', 1791522427194),
  ('E25B022090', 1, '2026-10-08', 'Absent', 'manual', 1791436027194),
  ('E25B022090', 2, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022090', 3, '2026-10-08', 'Absent', 'manual', 1791436027194),
  ('E25B022090', 4, '2026-10-08', 'Absent', 'manual', 1791436027194),
  ('E25B022090', 1, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022090', 2, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022090', 3, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022090', 4, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022090', 1, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022090', 2, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022090', 3, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022090', 4, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022091', 1, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022091', 2, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022091', 3, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022091', 4, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022091', 1, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022091', 2, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022091', 3, '2026-11-18', 'Absent', 'manual', 1794978427194),
  ('E25B022091', 4, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022091', 1, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022091', 2, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022091', 3, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022091', 4, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022091', 1, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022091', 2, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022091', 3, '2026-11-16', 'Absent', 'manual', 1794805627194),
  ('E25B022091', 4, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022091', 1, '2026-11-13', 'Absent', 'manual', 1794546427194),
  ('E25B022091', 2, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022091', 3, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022091', 4, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022091', 1, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022091', 2, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022091', 3, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022091', 4, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022091', 1, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022091', 2, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022091', 3, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022091', 4, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022091', 1, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022091', 2, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022091', 3, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022091', 4, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022091', 1, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022091', 2, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022091', 3, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022091', 4, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022091', 1, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022091', 2, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022091', 3, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022091', 4, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022091', 1, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022091', 2, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022091', 3, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022091', 4, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022091', 1, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022091', 2, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022091', 3, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022091', 4, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022091', 1, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022091', 2, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022091', 3, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022091', 4, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022091', 1, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022091', 2, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022091', 3, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022091', 4, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022091', 1, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022091', 2, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022091', 3, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022091', 4, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022091', 1, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022091', 2, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022091', 3, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022091', 4, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022091', 1, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022091', 2, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022091', 3, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022091', 4, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022091', 1, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022091', 2, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022091', 3, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022091', 4, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022091', 1, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022091', 2, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022091', 3, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022091', 4, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022091', 1, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022091', 2, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022091', 3, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022091', 4, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022091', 1, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022091', 2, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022091', 3, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022091', 4, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022091', 1, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022091', 2, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022091', 3, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022091', 4, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022091', 1, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022091', 2, '2026-10-20', 'Absent', 'manual', 1792472827194),
  ('E25B022091', 3, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022091', 4, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022091', 1, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022091', 2, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022091', 3, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022091', 4, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022091', 1, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022091', 2, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022091', 3, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022091', 4, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022091', 1, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022091', 2, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022091', 3, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022091', 4, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022091', 1, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022091', 2, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022091', 3, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022091', 4, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022091', 1, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022091', 2, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022091', 3, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022091', 4, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022091', 1, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022091', 2, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022091', 3, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022091', 4, '2026-10-12', 'Absent', 'manual', 1791781627194),
  ('E25B022091', 1, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022091', 2, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022091', 3, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022091', 4, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022091', 1, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022091', 2, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022091', 3, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022091', 4, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022091', 1, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022091', 2, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022091', 3, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022091', 4, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022091', 1, '2026-10-06', 'Absent', 'manual', 1791263227194),
  ('E25B022091', 2, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022091', 3, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022091', 4, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022092', 5, '2026-11-19', 'Absent', 'manual', 1795064827194),
  ('E25B022092', 6, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022092', 5, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022092', 6, '2026-11-18', 'Absent', 'manual', 1794978427194),
  ('E25B022092', 5, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022092', 6, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022092', 5, '2026-11-16', 'Absent', 'manual', 1794805627194),
  ('E25B022092', 6, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022092', 5, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022092', 6, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022092', 5, '2026-11-12', 'Absent', 'manual', 1794460027194),
  ('E25B022092', 6, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022092', 5, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022092', 6, '2026-11-11', 'Absent', 'manual', 1794373627194),
  ('E25B022092', 5, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022092', 6, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022092', 5, '2026-11-09', 'Absent', 'manual', 1794200827194),
  ('E25B022092', 6, '2026-11-09', 'Absent', 'manual', 1794200827194),
  ('E25B022092', 5, '2026-11-06', 'Absent', 'manual', 1793941627194),
  ('E25B022092', 6, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022092', 5, '2026-11-05', 'Absent', 'manual', 1793855227194),
  ('E25B022092', 6, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022092', 5, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022092', 6, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022092', 5, '2026-11-03', 'Absent', 'manual', 1793682427194),
  ('E25B022092', 6, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022092', 5, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022092', 6, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022092', 5, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022092', 6, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022092', 5, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022092', 6, '2026-10-29', 'Absent', 'manual', 1793250427194),
  ('E25B022092', 5, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022092', 6, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022092', 5, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022092', 6, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022092', 5, '2026-10-26', 'Absent', 'manual', 1792991227194),
  ('E25B022092', 6, '2026-10-26', 'Absent', 'manual', 1792991227194),
  ('E25B022092', 5, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022092', 6, '2026-10-23', 'Absent', 'manual', 1792732027194),
  ('E25B022092', 5, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022092', 6, '2026-10-22', 'Absent', 'manual', 1792645627194),
  ('E25B022092', 5, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022092', 6, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022092', 5, '2026-10-20', 'Absent', 'manual', 1792472827194),
  ('E25B022092', 6, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022092', 5, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022092', 6, '2026-10-19', 'Present', 'manual', 1792386427194),
  ('E25B022092', 5, '2026-10-16', 'Absent', 'manual', 1792127227194),
  ('E25B022092', 6, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022092', 5, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022092', 6, '2026-10-15', 'Absent', 'manual', 1792040827194),
  ('E25B022092', 5, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022092', 6, '2026-10-14', 'Absent', 'manual', 1791954427194),
  ('E25B022092', 5, '2026-10-13', 'Absent', 'manual', 1791868027194),
  ('E25B022092', 6, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022092', 5, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022092', 6, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022092', 5, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022092', 6, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022092', 5, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022092', 6, '2026-10-08', 'Absent', 'manual', 1791436027194),
  ('E25B022092', 5, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022092', 6, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022092', 5, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022092', 6, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022093', 1, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022093', 2, '2026-11-19', 'Present', 'manual', 1795064827194),
  ('E25B022093', 1, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022093', 2, '2026-11-18', 'Present', 'manual', 1794978427194),
  ('E25B022093', 1, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022093', 2, '2026-11-17', 'Present', 'manual', 1794892027194),
  ('E25B022093', 1, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022093', 2, '2026-11-16', 'Present', 'manual', 1794805627194),
  ('E25B022093', 1, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022093', 2, '2026-11-13', 'Present', 'manual', 1794546427194),
  ('E25B022093', 1, '2026-11-12', 'Present', 'manual', 1794460027194),
  ('E25B022093', 2, '2026-11-12', 'Absent', 'manual', 1794460027194),
  ('E25B022093', 1, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022093', 2, '2026-11-11', 'Present', 'manual', 1794373627194),
  ('E25B022093', 1, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022093', 2, '2026-11-10', 'Present', 'manual', 1794287227194),
  ('E25B022093', 1, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022093', 2, '2026-11-09', 'Present', 'manual', 1794200827194),
  ('E25B022093', 1, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022093', 2, '2026-11-06', 'Present', 'manual', 1793941627194),
  ('E25B022093', 1, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022093', 2, '2026-11-05', 'Present', 'manual', 1793855227194),
  ('E25B022093', 1, '2026-11-04', 'Present', 'manual', 1793768827194),
  ('E25B022093', 2, '2026-11-04', 'Absent', 'manual', 1793768827194),
  ('E25B022093', 1, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022093', 2, '2026-11-03', 'Present', 'manual', 1793682427194),
  ('E25B022093', 1, '2026-11-02', 'Present', 'manual', 1793596027194),
  ('E25B022093', 2, '2026-11-02', 'Absent', 'manual', 1793596027194),
  ('E25B022093', 1, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022093', 2, '2026-10-30', 'Present', 'manual', 1793336827194),
  ('E25B022093', 1, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022093', 2, '2026-10-29', 'Present', 'manual', 1793250427194),
  ('E25B022093', 1, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022093', 2, '2026-10-28', 'Present', 'manual', 1793164027194),
  ('E25B022093', 1, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022093', 2, '2026-10-27', 'Present', 'manual', 1793077627194),
  ('E25B022093', 1, '2026-10-26', 'Present', 'manual', 1792991227194),
  ('E25B022093', 2, '2026-10-26', 'Absent', 'manual', 1792991227194),
  ('E25B022093', 1, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022093', 2, '2026-10-23', 'Present', 'manual', 1792732027194),
  ('E25B022093', 1, '2026-10-22', 'Present', 'manual', 1792645627194),
  ('E25B022093', 2, '2026-10-22', 'Absent', 'manual', 1792645627194),
  ('E25B022093', 1, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022093', 2, '2026-10-21', 'Present', 'manual', 1792559227194),
  ('E25B022093', 1, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022093', 2, '2026-10-20', 'Present', 'manual', 1792472827194),
  ('E25B022093', 1, '2026-10-19', 'Absent', 'manual', 1792386427194),
  ('E25B022093', 2, '2026-10-19', 'Absent', 'manual', 1792386427194),
  ('E25B022093', 1, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022093', 2, '2026-10-16', 'Present', 'manual', 1792127227194),
  ('E25B022093', 1, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022093', 2, '2026-10-15', 'Present', 'manual', 1792040827194),
  ('E25B022093', 1, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022093', 2, '2026-10-14', 'Present', 'manual', 1791954427194),
  ('E25B022093', 1, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022093', 2, '2026-10-13', 'Present', 'manual', 1791868027194),
  ('E25B022093', 1, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022093', 2, '2026-10-12', 'Present', 'manual', 1791781627194),
  ('E25B022093', 1, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022093', 2, '2026-10-09', 'Present', 'manual', 1791522427194),
  ('E25B022093', 1, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022093', 2, '2026-10-08', 'Present', 'manual', 1791436027194),
  ('E25B022093', 1, '2026-10-07', 'Absent', 'manual', 1791349627194),
  ('E25B022093', 2, '2026-10-07', 'Present', 'manual', 1791349627194),
  ('E25B022093', 1, '2026-10-06', 'Present', 'manual', 1791263227194),
  ('E25B022093', 2, '2026-10-06', 'Present', 'manual', 1791263227194);
-- Total attendance records: 792

-- ══════════════════════════════════════════════════════════════════
-- Notifications (47 rows)
-- ══════════════════════════════════════════════════════════════════

INSERT INTO notifications (user_id, user_role, title, body, category, read_status, created_at) VALUES
  ('E25B022087','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022087','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022087','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022087','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022088','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022088','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022088','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022088','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022089','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022089','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022089','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022089','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25A022001','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25A022001','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25A022001','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25A022001','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022090','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022090','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022090','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022090','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022091','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022091','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022091','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022091','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022092','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022092','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022092','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022092','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('E25B022093','Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,1794546427194),
  ('E25B022093','Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,1794892027194),
  ('E25B022093','Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,1795064827194),
  ('E25B022093','Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,1794978427194),
  ('T25S022090','Teacher','Marks Submission Deadline: April 5','Please submit all IA-3 marks before April 5, 2026.','marks',0,1794892027194),
  ('T25S022090','Teacher','Faculty Meeting: Friday 4PM','Mandatory faculty meeting in Conference Room B-303, Friday at 4 PM.','general',0,1795064827194),
  ('T25S022090','Teacher','New Student Enrolled in Your Class','A new student has been enrolled in CSE301. Check My Students.','students',0,1794978427194),
  ('T25S022091','Teacher','Marks Submission Deadline: April 5','Please submit all IA-3 marks before April 5, 2026.','marks',0,1794892027194),
  ('T25S022091','Teacher','Faculty Meeting: Friday 4PM','Mandatory faculty meeting in Conference Room B-303, Friday at 4 PM.','general',0,1795064827194),
  ('T25S022091','Teacher','New Student Enrolled in Your Class','A new student has been enrolled in CSE301. Check My Students.','students',0,1794978427194),
  ('T25S022092','Teacher','Marks Submission Deadline: April 5','Please submit all IA-3 marks before April 5, 2026.','marks',0,1794892027194),
  ('T25S022092','Teacher','Faculty Meeting: Friday 4PM','Mandatory faculty meeting in Conference Room B-303, Friday at 4 PM.','general',0,1795064827194),
  ('T25S022092','Teacher','New Student Enrolled in Your Class','A new student has been enrolled in CSE301. Check My Students.','students',0,1794978427194),
  ('T25S022093','Teacher','Marks Submission Deadline: April 5','Please submit all IA-3 marks before April 5, 2026.','marks',0,1794892027194),
  ('T25S022093','Teacher','Faculty Meeting: Friday 4PM','Mandatory faculty meeting in Conference Room B-303, Friday at 4 PM.','general',0,1795064827194),
  ('T25S022093','Teacher','New Student Enrolled in Your Class','A new student has been enrolled in CSE301. Check My Students.','students',0,1794978427194),
  ('Admin@404','Admin','2 Pending Leave Requests','Prof. Joshi and Prof. Sharma have pending leave requests for review.','leaves',0,1794978427194),
  ('Admin@404','Admin','Attendance Defaulters Alert','8 students are below 75% attendance threshold. Review in Reports.','attendance',0,1795064827194),
  ('Admin@404','Admin','New Student Enrollment','3 new students were enrolled today. Verify in Students section.','students',0,1795151227194);

-- ══════════════════════════════════════════════════════════════════
-- DONE! All tables created and seeded.
-- ══════════════════════════════════════════════════════════════════
-- Login credentials:
--   Students: ID = password (e.g., E25B022087 / E25B022087)
--   Teachers: ID = password (e.g., T25S022090 / T25S022090)
--   Admin:    Admin@404 / Admin@123
-- ══════════════════════════════════════════════════════════════════
