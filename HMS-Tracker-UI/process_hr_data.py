import pandas as pd
import json
import os
import sys

EXCEL_PATH = os.path.join('public', 'HR Database.xlsx')
OUTPUT_PATH = os.path.join('public', 'processed_hr_data.json')

def process_data():
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: {EXCEL_PATH} not found.")
        sys.exit(1)
        
    print(f"Loading {EXCEL_PATH} using pandas...")
    xls = pd.ExcelFile(EXCEL_PATH)
    
    final_data = {
        "employees": [],
        "departments": [],
        "designations": [],
        "leaveBalances": [],
        "attendanceLogs": []
    }
    
    # 0. Departments Mapping
    dept_map = {}
    if 'Departments' in xls.sheet_names:
        print("Extracting Departments mapping...")
        df_dept = pd.read_excel(xls, 'Departments')
        for _, row in df_dept.iterrows():
            did = str(row.get('DepartmentId', '')).split('.')[0]
            dname = str(row.get('DepartmentFName', ''))
            if did and did != 'nan':
                dept_map[did] = dname

    # 1. Employees
    if 'Employees' in xls.sheet_names:
        print("Extracting Employees...")
        df_emp = pd.read_excel(xls, 'Employees')
        # Drop rows without EmployeeId
        df_emp = df_emp.dropna(subset=['EmployeeId'])
        for _, row in df_emp.iterrows():
            emp_id = str(row.get('EmployeeId', '')).split('.')[0] # handle float parsing
            if not emp_id or emp_id == 'nan': continue
            
            dept_id = str(row.get('DepartmentId', ''))
            dept_name = dept_map.get(dept_id, dept_id) if dept_id and dept_id != 'nan' else 'General'

            final_data['employees'].append({
                "emp_id": emp_id,
                "emp_code": str(row.get('EmployeeCode', emp_id)),
                "emp_name": str(row.get('EmployeeName', 'Unknown')),
                "department": dept_name,
                "designation": str(row.get('Designation', 'Staff')),
                "doj": str(row.get('DOJ', ''))[:10] if pd.notna(row.get('DOJ')) else None
            })

    # 2. Leave Types Mapping
    leave_type_map = {}
    if 'LeaveTypes' in xls.sheet_names:
        df_lt = pd.read_excel(xls, 'LeaveTypes')
        for _, row in df_lt.iterrows():
            lt_id = str(row.get('LeaveTypeId', '')).split('.')[0]
            lt_code = str(row.get('LeaveTypeCode', ''))
            if lt_id and lt_id != 'nan':
                leave_type_map[lt_id] = lt_code.upper()

    # 3. Employee Leave Balances
    leave_sheet_name = 'EmployeeLeave Balance' if 'EmployeeLeave Balance' in xls.sheet_names else None
    if leave_sheet_name:
        print(f"Extracting {leave_sheet_name}...")
        df_leave = pd.read_excel(xls, leave_sheet_name)
        
        # Group by employee to build the balance object
        emp_leave_dict = {}
        for _, row in df_leave.iterrows():
            emp_id = str(row.get('EmployeeId', '')).split('.')[0]
            if not emp_id or emp_id == 'nan': continue
            
            lt_id = str(row.get('LeaveTypeId', '')).split('.')[0]
            lt_code = leave_type_map.get(lt_id, f"L_{lt_id}").lower()
            balance = float(row.get('LeaveBalance', 0)) if pd.notna(row.get('LeaveBalance')) else 0
            
            if emp_id not in emp_leave_dict:
                emp_leave_dict[emp_id] = {"emp_id": emp_id, "pl": 0, "cl": 0, "sl": 0}
            
            # Map known leave codes to standard ui keys
            key = 'pl' if lt_code == 'pl' else 'cl' if lt_code == 'cl' else 'sl' if lt_code == 'sl' else lt_code
            emp_leave_dict[emp_id][key] = balance
            
        final_data['leaveBalances'] = list(emp_leave_dict.values())

    # 3. Attendance Logs
    if 'AttendanceLogs' in xls.sheet_names:
        print("Extracting AttendanceLogs...")
        # pandas automatically handles corrupted !ref dimensions and extracts everything
        df_att = pd.read_excel(xls, 'AttendanceLogs')
        print(f"Detected {len(df_att)} raw rows...")
        
        # We need EmployeeId and AttendanceDate
        # In case the columns are slightly different, fallback to index
        emp_col = 'EmployeeId' if 'EmployeeId' in df_att.columns else df_att.columns[2]
        date_col = 'AttendanceDate' if 'AttendanceDate' in df_att.columns else df_att.columns[1]
        
        # Drop rows where EmployeeId or Date is NA
        df_att = df_att.dropna(subset=[emp_col, date_col])
        
        for _, row in df_att.iterrows():
            emp_id = str(row[emp_col]).split('.')[0]
            date_val = row[date_col]
            
            # Format date strictly to YYYY-MM-DD
            if pd.notna(date_val):
                date_str = str(date_val)[:10]
            else:
                continue
                
            status_val = row.get('DetailedStatusCode', row.get('Status', ''))
            
            final_data['attendanceLogs'].append({
                "emp_id": emp_id,
                "date": date_str,
                "in_time": str(row.get('InTime', ''))[:8],
                "out_time": str(row.get('OutTime', ''))[:8],
                "duration": str(row.get('TotalDurationInHHMM', row.get('DurationHHMM', row.get('Duration', '')))),
                "detailed_status_code": str(status_val),
                "status": str(row.get('StatusCode', status_val)),
                "p1_status": str(row.get('P1Status', '')),
                "p2_status": str(row.get('P2Status', '')),
                "p3_status": str(row.get('P3Status', ''))
            })

        print(f"Successfully extracted {len(final_data['attendanceLogs'])} attendance logs!")
    else:
        print("AttendanceLogs sheet not found!")

    print(f"Saving compiled data to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(final_data, f, indent=2)
    print("DONE! The React Dashboard will now instantly load this data.")

if __name__ == "__main__":
    process_data()
