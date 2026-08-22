import pandas as pd
import random
from datetime import datetime, timedelta

employees = [
    ("EMP001", "Aarav Sharma", "Engineering"),
    ("EMP002", "Priya Patel", "HR"),
    ("EMP003", "Rohan Verma", "Engineering"),
    ("EMP004", "Sneha Gupta", "Sales"),
    ("EMP005", "Vikram Singh", "Engineering"),
    ("EMP006", "Ananya Rao", "Marketing"),
    ("EMP007", "Karan Mehta", "Sales"),
    ("EMP008", "Isha Kapoor", "HR"),
]

rows = []
start_date = datetime(2025, 8, 1)
for day_offset in range(22):  # 22 working days
    current = start_date + timedelta(days=day_offset)
    if current.weekday() == 6:  # Skip Sunday
        continue
    for emp_id, emp_name, dept in employees:
        # 90% chance present
        if random.random() < 0.9:
            # Random in time 9-10:30
            in_hour = random.randint(9, 10)
            in_min = random.randint(0, 59)
            if random.random() < 0.2:  # 20% late
                in_hour = 10
                in_min = random.randint(15, 45)
            in_time = current.replace(hour=in_hour, minute=in_min, second=random.randint(0,59))
            
            # Out time 17-19
            out_hour = random.randint(17, 19)
            out_min = random.randint(0, 59)
            out_time = current.replace(hour=out_hour, minute=out_min, second=random.randint(0,59))
            
            rows.append({
                "Employee ID": emp_id,
                "Employee Name": emp_name,
                "Department": dept,
                "Date": current.strftime("%Y-%m-%d"),
                "Time": in_time.strftime("%H:%M:%S"),
                "Status": "IN"
            })
            rows.append({
                "Employee ID": emp_id,
                "Employee Name": emp_name,
                "Department": dept,
                "Date": current.strftime("%Y-%m-%d"),
                "Time": out_time.strftime("%H:%M:%S"),
                "Status": "OUT"
            })
        # else absent - no rows

df = pd.DataFrame(rows)
df.to_excel("sample_attendance.xlsx", index=False)
print(f"Generated sample_attendance.xlsx with {len(df)} rows")
