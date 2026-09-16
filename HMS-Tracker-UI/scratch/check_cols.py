import pandas as pd
import json

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"
xl = pd.ExcelFile(file_path)
df = xl.parse("Employees", nrows=1)
cols = list(df.columns)
print("Designation columns:", [c for c in cols if 'desig' in c.lower()])
print("Department columns:", [c for c in cols if 'dept' in c.lower() or 'depart' in c.lower()])
