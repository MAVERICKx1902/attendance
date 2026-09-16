import pandas as pd
import json

try:
    df = pd.ExcelFile(r'd:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx').parse('AttendanceLogs')
    with open('scratch/pandas_dump.json', 'w') as f:
        json.dump(df.head(10).astype(str).to_dict(orient='records'), f, indent=2)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
