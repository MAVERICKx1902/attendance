import pandas as pd

file_path = r"d:\attendance\attendance\HMS-Tracker-UI\public\HR Database.xlsx"
xl = pd.ExcelFile(file_path)
df = xl.parse("Designations", nrows=1)
print(list(df.columns))
