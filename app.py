"""
Autocrat Solutions - Attendance App
Liquid Glass Desktop Wrapper using pywebview
Runs the React frontend (built) and exposes Python processor to JS
"""

import os
import sys
import json
import threading
import webview
from pathlib import Path
import pandas as pd
from attendance_processor import process_attendance

# Determine frontend path
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS) if hasattr(sys, '_MEIPASS') else Path(sys.executable).parent
    FRONTEND_DIR = BASE_DIR / "frontend" / "dist"
else:
    BASE_DIR = Path(__file__).parent
    FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

# Fallback to src if dist not built
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = BASE_DIR / "frontend"

class Api:
    def __init__(self):
        self.last_result = None

    def process_excel(self, params):
        """
        params: dict with
         - input_path
         - output_path
         - company_name
         - month
         - late_threshold
         - working_hours
         - full_day_hours
         - holidays (list)
         - weekoff (list)
        """
        try:
            if isinstance(params, str):
                params = json.loads(params)
            input_path = params.get('input_path')
            output_path = params.get('output_path')
            if not input_path or not os.path.exists(input_path):
                return {"success": False, "error": f"Input file not found: {input_path}"}

            result = process_attendance(
                input_path=input_path,
                output_path=output_path,
                company_name=params.get('company_name','Autocrat Solutions'),
                month=params.get('month'),
                working_hours_threshold=float(params.get('working_hours', 4.0)),
                full_day_hours=float(params.get('full_day_hours', 8.0)),
                late_threshold=params.get('late_threshold','10:00'),
                holidays=params.get('holidays', []),
                weekoff=params.get('weekoff', [6])
            )
            self.last_result = result
            # Build summary for UI
            summary = result['summary'].to_dict(orient='records') if not result['summary'].empty else []
            matrix_preview = result['matrix'].head(20).to_dict(orient='records') if not result['matrix'].empty else []
            daily_preview = result['daily'].head(50).to_dict(orient='records') if not result['daily'].empty else []

            return {
                "success": True,
                "output_path": output_path,
                "meta": result['meta'],
                "summary": summary,
                "matrix_preview": matrix_preview,
                "daily_preview": daily_preview,
                "total_employees": len(summary)
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    def select_file(self):
        # open file dialog
        try:
            file_types = ('Excel Files (*.xlsx;*.xls)', 'All files (*.*)')
            result = webview.windows[0].create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
            if result and len(result) > 0:
                return result[0]
        except Exception as e:
            print(e)
        return None

    def select_save(self, default_name="attendance_output.xlsx"):
        try:
            file_types = ('Excel File (*.xlsx)',)
            result = webview.windows[0].create_file_dialog(webview.SAVE_DIALOG, file_types=file_types, save_filename=default_name)
            if result:
                # result can be tuple
                if isinstance(result, (list, tuple)):
                    return result[0]
                return result
        except Exception as e:
            print(e)
        return None

    def get_app_info(self):
        return {
            "name": "Autocrat Attendance - Liquid Glass",
            "version": "1.0.0",
            "company": "Autocrat Solutions",
            "frontend_path": str(FRONTEND_DIR)
        }

def start_app():
    api = Api()
    # Check if dist exists, else serve dev note
    if (FRONTEND_DIR / "index.html").exists():
        url = str(FRONTEND_DIR / "index.html")
        # webview needs file:// or http
        # Use file://
        window = webview.create_window(
            "Autocrat Attendance - Liquid Glass",
            url=url,
            js_api=api,
            width=1280,
            height=860,
            min_size=(1100, 700),
            background_color='#0a0a0f',
            frameless=False,
            easy_drag=False,
        )
    else:
        # Fallback: inline minimal HTML if frontend not built
        html = """
        <html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center"><h1>Frontend not built</h1><p>Run npm run build in /frontend</p></div>
        </body></html>
        """
        window = webview.create_window("Autocrat Attendance", html=html, js_api=api, width=1280, height=860)

    # Start with debug True for dev
    webview.start(debug=True)

if __name__ == "__main__":
    start_app()
