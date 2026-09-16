import pandas as pd
import json

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    output = {}
    for sheet_name in ["Departments", "Designations", "Employees", "AttendanceLogs", "EmployeeLeave Balance"]:
        if sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name, nrows=1)
            output[sheet_name] = list(df.columns)
    
    print(json.dumps(output, indent=2))
except Exception as e:
    print(f"Error: {e}")
