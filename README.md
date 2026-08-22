# 🧊 Autocrat Attendance — Liquid Glass Edition

**A Software that acts as a HUB** — Attendance converter with iOS 26 Liquid Glass UI, Windows .exe ready, and APK-ready via Antigravity/Capacitor.

### ✨ What it does
- Takes **raw biometric / manual Excel dumps** (Employee ID, Name, Date, Time, Department)
- Auto-detects columns via heuristics
- Converts to **HR-ready formatted Excel** with 4 sheets:
  1. **Config** — Company, month, thresholds, holidays, generation meta
  2. **Monthly Summary** — Present/Absent/Half/Holiday/WO, Late, Hours, Attendance %
  3. **Daily Logs** — First/Last punch, hours, status, late flag per employee per day
  4. **Attendance Matrix** — Employees × Dates matrix with P/A/HD/H/WO + color coding
  5. **Cleaned Raw** — Normalized logs

### 🎨 UI — Liquid Glass
- Mesh gradient background with blurred blobs (purple/blue/pink/teal)
- Glass morphism: `backdrop-blur-xl`, translucent white 6-10%, inner shadows
- Framer Motion animations
- Drag & Drop, live preview, configurable thresholds
- Fully responsive, dark mode native

### 🐍 Python Core
`attendance_processor.py` mirrors JS logic:
- Robust datetime parsing (separate Date/Time or combined DateTime)
- Handles multiple sheets concat
- Status logic: P (≥8h), HD (≥4h), A, H (holiday), WO (weekoff)
- Late detection
- Styled Excel export with openpyxl (colored cells)

CLI:
```bash
pip install -r requirements.txt
python attendance_processor.py input.xlsx -o output.xlsx --company "Autocrat Solutions" --month 2025-08 --late 10:00
```

### 💻 Windows App
Stack: **Python + pywebview + React Vite**
- React UI built to `frontend/dist`
- pywebview loads `dist/index.html` and exposes Python API
- PyInstaller packs to single .exe

Build:
```bash
pip install -r requirements.txt
npm run build --prefix frontend
pip install pyinstaller
python build.py
# OR manually:
pyinstaller --noconfirm --windowed --add-data "frontend/dist:frontend/dist" app.py --name "AutocratAttendance"
```
Output: `dist/AutocratAttendance/`

Run without building:
```bash
python app.py
# or dev mode:
npm run dev --prefix frontend
# then open browser at http://localhost:5173
```

### 📱 APK via Antigravity / Capacitor
The same `frontend/dist` is a PWA-ready static site.

**Capacitor method:**
```bash
npm run build --prefix frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Autocrat Attendance" com.autocrat.attendance --web-dir=frontend/dist
npx cap add android
npx cap copy android
npx cap open android  # Build in Android Studio
```

**Antigravity method:**
- Open project in Antigravity (Google's agentic IDE)
- Import `frontend/dist` as web app
- Use Antigravity's Android export to generate APK
- Python core can be moved to FastAPI backend or kept client-side (JS version already in `App.jsx` processes offline)

### 🧪 Sample
```bash
python generate_sample.py  # creates sample_attendance.xlsx
python attendance_processor.py sample_attendance.xlsx -o demo_output.xlsx
```

### 📁 Structure
```
.
├── attendance_processor.py   # Core Python logic (pandas + openpyxl)
├── app.py                    # pywebview wrapper for Windows
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Liquid Glass UI + JS processor (mirrors Python)
│   │   └── index.css        # Glass utilities + mesh blobs
│   └── dist/                # Built UI (for exe & apk)
├── build.py                  # One-click exe builder
├── capacitor.config.json     # APK config
├── requirements.txt
├── sample_attendance.xlsx
└── README.md
```

### 🔧 Configurable
- Company name
- Month (auto-generates full month matrix if set)
- Working hours threshold (half-day)
- Full-day hours
- Late threshold (HH:MM)
- Weekoff days (Sun-Sat toggle)
- Holidays list (date picker)

### 🚀 Tech
- **Frontend:** React 18, Vite, Tailwind, Framer Motion, SheetJS (xlsx)
- **Backend:** Python 3.11+, pandas, openpyxl, pywebview
- **Packaging:** PyInstaller (Windows), Capacitor (Android)

### 📄 License
MIT — Autocrat Solutions

---
Made with 🧊 Liquid Glass • For Windows now, APK later via Antigravity
