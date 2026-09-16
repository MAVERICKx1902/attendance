import pandas as pd
import json

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print(json.dumps(xl.sheet_names, indent=2))
except Exception as e:
    print(f"Error: {e}")
