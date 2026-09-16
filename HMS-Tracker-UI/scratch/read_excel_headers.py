import pandas as pd
import json

file_path = r"d:\attendance\attendance\docs\resources\HR Database.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    output = {}
    
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name, nrows=3)
        output[sheet_name] = {
            "columns": list(df.columns),
            "sample_data": df.fillna("").to_dict(orient="records")
        }
        
    print(json.dumps(output, indent=2))
except Exception as e:
    print(f"Error: {e}")
