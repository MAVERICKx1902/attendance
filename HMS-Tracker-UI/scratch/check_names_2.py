import pandas as pd

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    emp_df = xl.parse('Employees')
    print("Number of employees in Employees sheet:", len(emp_df))
    print("Employee Names:")
    for col in emp_df.columns:
        if 'name' in str(col).lower():
            print(emp_df[col].head(10).tolist())
            break
except Exception as e:
    print("Error:", e)
