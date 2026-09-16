import pandas as pd
import os

EXCEL_PATH = os.path.join('public', 'HR Database.xlsx')
df_att = pd.read_excel(EXCEL_PATH, 'AttendanceLogs')
date_col = 'AttendanceDate' if 'AttendanceDate' in df_att.columns else df_att.columns[1]

print("Raw date values from pandas:")
print(df_att[date_col].head(5).tolist())

date_strs = []
for val in df_att[date_col].head(5):
    date_strs.append(str(val)[:10])
print("My script parsed them as:")
print(date_strs)
