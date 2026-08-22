"""
Autocrat Solutions - Attendance App v0.0.1
Liquid Glass Desktop Wrapper using pywebview
Runs the React frontend (built) and exposes Python processor to JS

v0.0.1 Spec:
- Input 1: Excel file
- Input 2: Python file (custom conversion logic)
- Output: Folder chosen by user -> saves converted xlsx there
"""

import os
import sys
import json
import webview
from pathlib import Path
import importlib.util
import traceback
import pandas as pd
from attendance_processor import process_attendance

# Determine frontend path
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS) if hasattr(sys, '_MEIPASS') else Path(sys.executable).parent
    FRONTEND_DIR = BASE_DIR / "frontend" / "dist"
else:
    BASE_DIR = Path(__file__).parent
    FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

if not FRONTEND_DIR.exists():
    FRONTEND_DIR = BASE_DIR / "frontend"

class Api:
    def __init__(self):
        self.last_result = None

    # --- v0.0.1 Core: Custom Python file processing ---
    def process_with_custom_python(self, params):
        """
        params: dict with
         - excel_path: path to input xlsx
         - python_path: path to custom .py file
         - output_path: full output file path (or folder + filename)
         - output_folder: optional folder (if output_path is folder)
         - company_name, month, etc for fallback
        """
        try:
            if isinstance(params, str):
                params = json.loads(params)

            excel_path = params.get('excel_path') or params.get('input_path')
            python_path = params.get('python_path')
            output_path = params.get('output_path')
            output_folder = params.get('output_folder')
            file_name = params.get('file_name') or f"{params.get('company_name','Autocrat').replace(' ','_')}_Attendance_{params.get('month','output')}.xlsx"

            # Resolve output path
            if not output_path:
                if output_folder and os.path.isdir(output_folder):
                    output_path = os.path.join(output_folder, file_name)
                else:
                    # fallback to same dir as input
                    if excel_path:
                        output_path = os.path.join(os.path.dirname(excel_path), file_name)
                    else:
                        output_path = os.path.join(str(BASE_DIR), file_name)

            # If output_path is a folder, append filename
            if os.path.isdir(output_path):
                output_path = os.path.join(output_path, file_name)

            if not excel_path or not os.path.exists(excel_path):
                return {"success": False, "error": f"Excel file not found: {excel_path}"}

            # If no custom python, use built-in
            if not python_path or not os.path.exists(python_path):
                print("[v0.0.1] No custom python provided, using built-in processor")
                result = process_attendance(
                    input_path=excel_path,
                    output_path=output_path,
                    company_name=params.get('company_name','Autocrat Solutions'),
                    month=params.get('month'),
                    working_hours_threshold=float(params.get('working_hours', 4.0)),
                    full_day_hours=float(params.get('full_day_hours', 8.0)),
                    late_threshold=params.get('late_threshold','10:00'),
                    holidays=params.get('holidays', []),
                    weekoff=params.get('weekoff', [6])
                )
                summary = result['summary'].to_dict(orient='records') if not result['summary'].empty else []
                return {
                    "success": True,
                    "output_path": output_path,
                    "meta": result['meta'],
                    "summary": summary,
                    "total_employees": len(summary),
                    "used_custom": False,
                    "message": f"Processed with built-in logic -> {output_path}"
                }

            # --- Custom Python Execution ---
            print(f"[v0.0.1] Loading custom python: {python_path}")
            print(f"[v0.0.1] Excel: {excel_path} -> Output: {output_path}")

            # Read file content for validation
            with open(python_path, 'r', encoding='utf-8', errors='ignore') as f:
                code_content = f.read()

            # Try dynamic import
            spec = importlib.util.spec_from_file_location("custom_processor", python_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                # Inject helpful globals
                module.__dict__['__builtins__'] = __builtins__
                try:
                    spec.loader.exec_module(module)
                except Exception as e:
                    # If import fails, try exec fallback
                    print(f"Import exec failed, trying exec: {e}")
                    raise e

                # Look for known entry points in order
                entry_functions = ['process_attendance', 'process', 'convert', 'main', 'run', 'transform', 'handle_excel']
                called = False
                result_info = None

                for func_name in entry_functions:
                    if hasattr(module, func_name) and callable(getattr(module, func_name)):
                        func = getattr(module, func_name)
                        print(f"[v0.0.1] Found entry function: {func_name}")
                        try:
                            # Try different signatures
                            import inspect
                            sig = inspect.signature(func)
                            params_count = len(sig.parameters)
                            
                            # Attempt calls with different arg patterns
                            try:
                                # Try (input_path, output_path)
                                res = func(excel_path, output_path)
                                called = True
                                result_info = res
                                break
                            except TypeError:
                                pass
                            try:
                                # Try (input_path, output_path, config)
                                res = func(excel_path, output_path, params)
                                called = True
                                result_info = res
                                break
                            except TypeError:
                                pass
                            try:
                                # Try kwargs
                                res = func(input_path=excel_path, output_path=output_path)
                                called = True
                                result_info = res
                                break
                            except TypeError:
                                pass
                            try:
                                # Try no args but module uses globals? exec with context
                                res = func()
                                called = True
                                result_info = res
                                break
                            except Exception as inner_e:
                                print(f"Failed to call {func_name}: {inner_e}")
                                continue
                        except Exception as call_e:
                            print(f"Error calling {func_name}: {call_e}")
                            traceback.print_exc()
                            continue

                if not called:
                    # Fallback: exec file content with predefined variables
                    print("[v0.0.1] No callable entry found, exec-ing file with input_path/output_path in scope")
                    exec_globals = {
                        'input_path': excel_path,
                        'excel_path': excel_path,
                        'output_path': output_path,
                        'output_folder': output_folder or os.path.dirname(output_path),
                        'pd': pd,
                        'os': os,
                        'sys': sys,
                        '__name__': '__main__',
                    }
                    # Provide process_attendance as helper
                    exec_globals['process_attendance'] = process_attendance
                    exec(code_content, exec_globals)
                    # Check if file was created
                    if os.path.exists(output_path):
                        called = True
                    else:
                        # Check if exec created file with different name in output folder
                        possible_files = [f for f in os.listdir(os.path.dirname(output_path)) if f.endswith('.xlsx')]
                        if possible_files:
                            # take latest
                            latest = max([os.path.join(os.path.dirname(output_path), f) for f in possible_files], key=os.path.getmtime)
                            output_path = latest
                            called = True

                if called:
                    # Try to read output for preview if possible
                    summary = []
                    meta = {"custom_python": python_path, "output": output_path}
                    try:
                        # If custom python returned a dict with summary
                        if isinstance(result_info, dict) and 'summary' in result_info:
                            summary = result_info['summary']
                        elif os.path.exists(output_path):
                            # Try to read first sheet for preview
                            try:
                                df_preview = pd.read_excel(output_path, sheet_name=0, nrows=20)
                                meta['preview_rows'] = len(df_preview)
                            except:
                                pass
                    except:
                        pass

                    return {
                        "success": True,
                        "output_path": output_path,
                        "meta": meta,
                        "summary": summary,
                        "total_employees": len(summary) if isinstance(summary, list) else 0,
                        "used_custom": True,
                        "message": f"Successfully processed with custom python: {os.path.basename(python_path)} -> {output_path}"
                    }
                else:
                    return {"success": False, "error": "Custom python file did not produce output. Ensure it defines process(input, output) or saves to output_path variable."}

            else:
                return {"success": False, "error": "Could not load custom python file as module"}

        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": f"{str(e)}\n{traceback.format_exc()}"}

    def process_excel(self, params):
        """Legacy wrapper -> calls new method"""
        if isinstance(params, str):
            params = json.loads(params)
        # Map old keys to new
        new_params = {
            "excel_path": params.get('input_path'),
            "output_path": params.get('output_path'),
            "company_name": params.get('company_name'),
            "month": params.get('month'),
            "working_hours": params.get('working_hours'),
            "full_day_hours": params.get('full_day_hours'),
            "late_threshold": params.get('late_threshold'),
            "holidays": params.get('holidays'),
            "weekoff": params.get('weekoff'),
        }
        return self.process_with_custom_python(new_params)

    def select_file(self, file_type="excel"):
        try:
            if file_type == "python":
                types = ('Python Files (*.py)', 'All files (*.*)')
            else:
                types = ('Excel Files (*.xlsx;*.xls)', 'All files (*.*)')
            result = webview.windows[0].create_file_dialog(webview.OPEN_DIALOG, file_types=types)
            if result and len(result) > 0:
                return result[0]
        except Exception as e:
            print(e)
        return None

    def select_python_file(self):
        return self.select_file("python")

    def select_excel_file(self):
        return self.select_file("excel")

    def select_folder(self):
        try:
            result = webview.windows[0].create_file_dialog(webview.FOLDER_DIALOG)
            if result and len(result) > 0:
                return result[0]
            # Some versions return string directly
            if isinstance(result, str):
                return result
        except Exception as e:
            print(e)
        return None

    def select_save(self, default_name="attendance_output.xlsx"):
        try:
            file_types = ('Excel File (*.xlsx)',)
            result = webview.windows[0].create_file_dialog(webview.SAVE_DIALOG, file_types=file_types, save_filename=default_name)
            if result:
                if isinstance(result, (list, tuple)):
                    return result[0]
                return result
        except Exception as e:
            print(e)
        return None

    def read_python_file(self, path):
        try:
            if not os.path.exists(path):
                return {"success": False, "error": "File not found"}
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return {"success": True, "content": content[:10000], "size": len(content), "lines": len(content.splitlines())}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_app_info(self):
        return {
            "name": "Autocrat Attendance - Liquid Glass",
            "version": "0.0.1",
            "company": "Autocrat Solutions",
            "frontend_path": str(FRONTEND_DIR),
            "spec": "v0.0.1 - Excel + Python file -> Output folder"
        }

def start_app():
    api = Api()
    if (FRONTEND_DIR / "index.html").exists():
        url = str(FRONTEND_DIR / "index.html")
        window = webview.create_window(
            "Autocrat Attendance - Liquid Glass v0.0.1",
            url=url,
            js_api=api,
            width=1360,
            height=900,
            min_size=(1150, 750),
            background_color='#0a0a0f',
        )
    else:
        html = """
        <html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center"><h1>Frontend not built</h1><p>Run npm run build in /frontend</p></div>
        </body></html>
        """
        window = webview.create_window("Autocrat Attendance v0.0.1", html=html, js_api=api, width=1360, height=900)

    webview.start(debug=True)

if __name__ == "__main__":
    start_app()
