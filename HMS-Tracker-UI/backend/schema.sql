-- Employees Table
CREATE TABLE public.employees (
    emp_id TEXT PRIMARY KEY,
    emp_code TEXT,
    emp_name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    doj DATE,
    report_to_id TEXT,
    manager_name TEXT
);

-- Leave Balances Table
CREATE TABLE public.leave_balances (
    emp_id TEXT PRIMARY KEY REFERENCES public.employees(emp_id) ON DELETE CASCADE,
    pl_total NUMERIC DEFAULT 0,
    pl_remaining NUMERIC DEFAULT 0,
    cl_total NUMERIC DEFAULT 0,
    cl_remaining NUMERIC DEFAULT 0,
    sl_total NUMERIC DEFAULT 0,
    sl_remaining NUMERIC DEFAULT 0
);

-- Attendance Logs Table
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id TEXT REFERENCES public.employees(emp_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    in_time TEXT,
    out_time TEXT,
    duration TEXT,
    detailed_status_code TEXT,
    status_code TEXT,
    status TEXT,
    UNIQUE(emp_id, attendance_date)
);

-- Indexes for fast querying
CREATE INDEX idx_attendance_logs_emp_date ON public.attendance_logs(emp_id, attendance_date);
CREATE INDEX idx_attendance_logs_date ON public.attendance_logs(attendance_date);

-- Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anon read & write for now (can tighten later)
CREATE POLICY "Enable all access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);
