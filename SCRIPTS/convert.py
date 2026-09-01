import sys
import os
import pandas as pd
from pathlib import Path
from datetime import datetime

# Add the parent directory to the path so we can import the core processor
parent_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(parent_dir))

try:
    from attendance_processor import process_attendance as core_process
except ImportError:
    print("Error: Could not import attendance_processor.py from the main folder.")
    sys.exit(1)

def build_matrix_sheet(merged_df, date_cols, start_sum):
    total_cols = 3 + len(date_cols) + 11 
    rows = []
    
    rows.append([None] * total_cols)
    r2 = [None] * total_cols
    r2[0] = "Plot 21 & 22"
    rows.append(r2)
    
    r3 = [None] * total_cols
    r3[0] = "Monthly Basic Attendance Report"
    rows.append(r3)
    
    r4 = [None] * total_cols
    if date_cols:
        d_start = datetime.strptime(date_cols[0], '%Y-%m-%d').strftime('%d-%b-%Y')
        d_end = datetime.strptime(date_cols[-1], '%Y-%m-%d').strftime('%d-%b-%Y')
        r4[0] = f"{d_start} to {d_end}"
    rows.append(r4)
    
    r5 = [None] * total_cols
    for i, dc in enumerate(date_cols):
        r5[3 + i] = datetime.strptime(dc, '%Y-%m-%d').strftime('%d-%b')
    summary_headers = ['P', 'A', 'LOP', 'CL', 'PL', 'SL', 'COFF', 'H', 'HP', 'WO', 'WOP']
    for i, h in enumerate(summary_headers):
        r5[start_sum + i] = h
    rows.append(r5)
    
    r6 = [None] * total_cols
    r6[0] = 'No'
    r6[1] = 'Code'
    r6[2] = 'Emp Name'
    for i, dc in enumerate(date_cols):
        d_obj = datetime.strptime(dc, '%Y-%m-%d')
        day_str = f"{d_obj.day}-{d_obj.strftime('%a')}"
        r6[3 + i] = day_str
    rows.append(r6)
    
    for idx, (_, row) in enumerate(merged_df.iterrows()):
        data = [None] * total_cols
        data[0] = idx + 1
        data[1] = row.get('emp_id', '')
        data[2] = row.get('emp_name', '')
        
        for i, dc in enumerate(date_cols):
            data[3 + i] = row.get(dc, 'A')
            
        data[start_sum + 0] = row.get('Present (P)', 0) # P
        data[start_sum + 1] = row.get('Absent (A)', 0) # A
        data[start_sum + 2] = 0 # LOP
        data[start_sum + 3] = 0 # CL
        data[start_sum + 4] = 0 # PL
        data[start_sum + 5] = 0 # SL
        data[start_sum + 6] = 0 # COFF
        data[start_sum + 7] = row.get('Holidays (H)', 0) # H
        data[start_sum + 8] = row.get('Half Day (HD)', 0) # HP
        data[start_sum + 9] = row.get('Week Off (WO)', 0) # WO
        data[start_sum + 10] = 0 # WOP
        
        rows.append(data)
        
    return pd.DataFrame(rows)


def build_export_logs_sheet(daily_df):
    cols = ['Attendance Date', 'Employee Code', 'Employee Name', 'Department', 'Designation', 'DOJ', 'Shift Code', 'Begin Time', 'End Time', 'In Time', 'Out Time', 'Duration', 'LateBy', 'EarlyBy', 'LeaveType', 'Leave Status', 'Att Status', 'Status Code', 'TotalDuration', 'Punch Records', 'Location', 'Unnamed: 21']
    rows = []
    
    for _, row in daily_df.iterrows():
        rows.append({
            'Attendance Date': row.get('date', ''),
            'Employee Code': row.get('emp_id', ''),
            'Employee Name': row.get('emp_name', ''),
            'Department': row.get('department', 'Security'),
            'Designation': '',
            'DOJ': '',
            'Shift Code': 'NS',
            'Begin Time': '00:00:00',
            'End Time': '00:00:00',
            'In Time': row.get('first_punch', '00:00:00'),
            'Out Time': row.get('last_punch', '00:00:00'),
            'Duration': row.get('hours', 0),
            'LateBy': 0,
            'EarlyBy': 0,
            'LeaveType': '',
            'Leave Status': 'Absent' if row.get('status') == 'A' else ('WeekOff' if row.get('status') == 'WO' else 'Present'),
            'Att Status': row.get('status', ''),
            'Status Code': '',
            'TotalDuration': row.get('hours', 0),
            'Punch Records': '',
            'Location': 'Unit 1',
            'Unnamed: 21': ''
        })
    return pd.DataFrame(rows, columns=cols)


def build_leave_summary_sheet(summary_df):
    cols = ['Employee Name', 'Employee Code', 'Company', 'Department', 'RHO-Balance', 'COFF-Balance', 'CL-Balance', 'PL-Balance', 'SL-Balance', 'AE-COFF-Balance', 'LOP-Balance']
    rows = []
    for _, row in summary_df.iterrows():
        rows.append({
            'Employee Name': row.get('emp_name', ''),
            'Employee Code': row.get('emp_id', ''),
            'Company': 'Plot 21 & 22',
            'Department': row.get('department', ''),
            'RHO-Balance': 0,
            'COFF-Balance': 0,
            'CL-Balance': 0,
            'PL-Balance': 0,
            'SL-Balance': 0,
            'AE-COFF-Balance': 0,
            'LOP-Balance': 0 
        })
    return pd.DataFrame(rows, columns=cols)


def build_file_format_upload_sheet():
    cols = ['EmployeeCode', 'LeaveStatus', 'LeaveCode', 'FromDate', 'ToDate', 'IsApproved', 'ApprovedBy', 'Remarks', 'Reason', 'Session']
    rows = [
        { 'IsApproved': 1.0, 'ApprovedBy': 'Smart', 'Remarks': 'test', 'Reason': 'test' },
        {},
        {},
        { 'EmployeeCode': 'Leave status \nNo. of days leave applied\nLeave code\nSL, PL, CL' },
        {}
    ]
    return pd.DataFrame(rows, columns=cols)


def build_leave_rules_sheet():
    cols = ['Unnamed: 0', 'Unnamed: 1', 'Unnamed: 2']
    rows = [
        { 'Unnamed: 1': 'Leave allotment /month for an employee' },
        { 'Unnamed: 1': 'CL', 'Unnamed: 2': '3 days' },
        { 'Unnamed: 1': 'PL', 'Unnamed: 2': 'Less than or equal to 10 days, Max 5 days can be granted. More than 10 days then half of PL can be given.' },
        { 'Unnamed: 1': 'SL', 'Unnamed: 2': 'Strictly for sick leaves only (Max 3 days)' },
        { 'Unnamed: 1': 'Special leave', 'Unnamed: 2': 'Maximum can be considered based on the leave balance (case to case)' }
    ]
    return pd.DataFrame(rows, columns=cols)


def process(input_path, output_path):
    print(f"Reading and analyzing {input_path}...")
    try:
        result = core_process(input_path=input_path, output_path=None, weekoff=[6])
        
        matrix_df = result['matrix']
        summary_df = result['summary']
        daily_df = result['daily']
        
        summary_cols_to_merge = summary_df.drop(columns=['emp_name', 'department', 'Total Days'])
        merged_df = pd.merge(matrix_df, summary_cols_to_merge, on='emp_id', how='left')
        
        date_cols = [c for c in merged_df.columns if '-' in c and len(c.split('-')) == 3]
        start_sum = 3 + len(date_cols)

        # Build all 5 exactly matching sheets
        sheet1 = build_matrix_sheet(merged_df, date_cols, start_sum)
        sheet2 = build_export_logs_sheet(daily_df)
        sheet3 = build_leave_summary_sheet(summary_df)
        sheet4 = build_file_format_upload_sheet()
        sheet5 = build_leave_rules_sheet()
        
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            sheet1.to_excel(writer, sheet_name='Monthly_BasicReportForEmployee', index=False, header=False)
            sheet2.to_excel(writer, sheet_name='Attendance Export logs', index=False)
            sheet3.to_excel(writer, sheet_name='Leave Summary', index=False)
            sheet4.to_excel(writer, sheet_name='File format to upload', index=False)
            sheet5.to_excel(writer, sheet_name='Leave rules', index=False)
            
        print(f"Success! Exact 5-sheet legacy calculation format generated and saved to: {output_path}")
        return {"success": True, "output": output_path}
        
    except Exception as e:
        print(f"Failed to process attendance logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Autocrat Legacy Full-Format Converter")
        print("Usage: python convert.py <input_logs.xlsx> <output_file.xlsx>")
        sys.exit(1)
        
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    
    if not os.path.exists(in_file):
        print(f"Error: Input file '{in_file}' not found.")
        sys.exit(1)
        
    process(in_file, out_file)
