# 🧊 Autocrat Attendance — Liquid Glass v0.0.1

**A Software that acts as a HUB** — v0.0.1 takes **2 inputs + 1 output folder**: Excel + Python converter file → saves to chosen folder. Liquid Glass UI, Windows .exe ready, APK-ready via Antigravity.

### 🆕 v0.0.1 Spec (Your Request)
> **For now I want it to take two inputs 1: the excel file, 2: the python file and give an output to the folder that the user chooses, so like they'll download the file**

**Flow:**
1. **Input 1 — Excel File**: Drag-drop raw biometric / manual attendance `.xlsx`
2. **Input 2 — Python File**: Drag-drop `.py` file that *prescribes* conversion logic (defines `process(input_path, output_path)`)
3. **Output — Folder**: User browses/chooses folder (Windows file dialog) or Downloads (Web). App saves converted `.xlsx` there.

This makes the software **generic**: you can swap the Python file to change conversion rules without rebuilding the app. Later versions will have built-in processors.

### ✨ What it does
- Takes **raw biometric Excel dumps** (Employee ID, Name, Date, Time, Dept)
- Loads **custom Python file** (your conversion prescription)
- Executes Python file dynamically via `importlib` — looks for `process`, `process_attendance`, `convert`, `main`, etc.
- If no custom Python, falls back to built-in Liquid Glass processor (P/A/HD/H/WO, late detection, matrix)
- Saves to **user-chosen folder** → HR-ready Excel with 5 sheets + colors

### 🎨 UI — Liquid Glass
- Mesh blobs (purple/blue/pink/teal) + `backdrop-blur-xl`
- Three glass cards with left border colors: Emerald (Excel), Violet (Python), Blue (Output Folder)
- Code preview for Python file (lines, size, syntax)
- Output folder browser (pywebview dialog on Windows, prompt + Downloads on Web)
- Final download button shows full path: `C:\Users\...\Documents\Attendance_2025-08.xlsx`

### 🐍 Python Core

**Built-in (`attendance_processor.py`):**
```bash
python attendance_processor.py sample.xlsx -o output.xlsx --company "Autocrat" --month 2025-08
```

**Custom Python (Input 2) — Example `custom_converters/example_simple.py`:**
```python
import pandas as pd
def process(input_path, output_path):
    df = pd.read_excel(input_path)
    # Your custom logic
    df.to_excel(output_path, index=False)
```

**Supported signatures (auto-detected):**
- `process(input_path, output_path)`
- `process_attendance(input_path, output_path)`
- `convert(input_path, output_path, config)`
- `main()` with globals `input_path`, `output_path`

**App backend (`app.py` v0.0.1):**
- `process_with_custom_python({excel_path, python_path, output_folder, file_name, ...})`
- `select_excel_file()`, `select_python_file()`, `select_folder()`
- Reads Python file for preview, executes via importlib, handles fallback

### 💻 Windows App
Stack: **Python + pywebview + React Vite**

Run dev:
```bash
pip install -r requirements.txt --break-system-packages
npm run build --prefix frontend
python app.py
# or
npm run dev --prefix frontend  # UI at http://localhost:5173
```

Build .exe:
```bash
python build.py
# OR
pyinstaller --noconfirm --windowed --add-data "frontend/dist:frontend/dist" app.py --name "AutocratAttendance-v0.0.1"
```

**User flow in .exe:**
1. Click Input 1 card → file dialog → pick `.xlsx`
2. Click Input 2 card → file dialog → pick `.py` (e.g., `custom_converters/example_simple.py`)
3. Click Browse in Output Folder → folder dialog → pick `C:\Users\You\Documents`
4. Click Convert → Python file executed → `.xlsx` saved to chosen folder → Toast shows path

### 📱 APK via Antigravity
Same `frontend/dist` is PWA-ready. JS processor mirrors Python for offline mobile.

```bash
npm run build --prefix frontend
npx cap init "Autocrat Attendance" com.autocrat.attendance --web-dir=frontend/dist
npx cap add android && npx cap copy android && npx cap open android
```

Antigravity: Open project → Tools → Export → Android APK

### 📁 Structure v0.0.1
```
.
├── attendance_processor.py       # Built-in processor (fallback)
├── app.py                        # v0.0.1 pywebview wrapper + custom Python exec
├── custom_converters/
│   ├── example_simple.py         # Simple custom converter (Input 2 example)
│   ├── example_advanced.py       # Advanced with styling
│   └── README.md                 # How to write your own .py
├── frontend/
│   ├── src/App.jsx               # v0.0.1 UI: 2 inputs + output folder
│   └── dist/                     # Built UI (for exe & apk)
├── build.py
├── sample.xlsx                   # Demo Excel (Input 1 example)
├── requirements.txt
└── README.md
```

### 🧪 Test v0.0.1 Flow
```bash
# Generate sample
python generate_sample.py

# Test custom converter directly
python -c "import custom_converters.example_simple as m; m.process('sample.xlsx', 'test_custom_out.xlsx')"

# Test built-in
python attendance_processor.py sample.xlsx -o test_builtin.xlsx

# Test app.py API (simulates UI)
python -c "
from app import Api
api = Api()
res = api.process_with_custom_python({
    'excel_path': 'sample.xlsx',
    'python_path': 'custom_converters/example_simple.py',
    'output_folder': '.',
    'file_name': 'final_output.xlsx'
})
print(res)
"
```

### 🔧 Configurable (still)
- Company name, Month, Late threshold, Half/Full day hours, Weekoff, Holidays

### 🚀 Next Versions
- v0.0.2: Save custom Python presets, history of conversions
- v0.0.3: Built-in template gallery, no need to upload .py for common cases
- v1.0: Database, employee management, cloud sync

---
**v0.0.1 — Excel + Python → Folder** • Liquid Glass • Windows .exe + APK via Antigravity
