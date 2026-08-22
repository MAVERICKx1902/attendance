"""
Example Custom Converter for Autocrat Attendance v0.0.1
This file is Input 2: Python file that prescribes conversion.

Expected entry points (any one):
- def process(input_path, output_path)
- def process_attendance(input_path, output_path)
- def convert(input_path, output_path)
- def main()

The app will call this file with:
  input_path: path to uploaded Excel (Input 1)
  output_path: path where to save result (chosen Output Folder + filename)

You can use pandas/openpyxl here.
"""

import pandas as pd

def process(input_path, output_path):
    print(f"[Custom] Converting {input_path} -> {output_path}")
    df = pd.read_excel(input_path)
    df.columns = [str(c).strip().upper() for c in df.columns]
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Original', index=False)
        summary = pd.DataFrame({
            'Metric': ['Total Rows', 'Columns', 'Processed By'],
            'Value': [len(df), len(df.columns), 'example_simple.py v0.0.1']
        })
        summary.to_excel(writer, sheet_name='Custom Summary', index=False)
    print(f"[Custom] Saved to {output_path}")
    return {"success": True, "output": output_path}

def process_attendance(input_path, output_path):
    return process(input_path, output_path)
