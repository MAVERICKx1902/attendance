import pandas as pd
import json

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    print("RAW SHEET NAMES:", xl.sheet_names)
    
    normalized = [str(s).lower().replace(" ", "") for s in xl.sheet_names]
    print("NORMALIZED:", normalized)
    
    print("Includes employees?", "employees" in normalized)
    print("Includes attendancelogs?", "attendancelogs" in normalized)
except Exception as e:
    print("Error:", e)
