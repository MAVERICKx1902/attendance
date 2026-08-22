"""
Build script for Windows exe
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

BASE = Path(__file__).parent
FRONTEND = BASE / "frontend"

def run(cmd, cwd=None):
    print(f"> {cmd}")
    subprocess.check_call(cmd, shell=True, cwd=cwd)

def main():
    print("=== Autocrat Attendance - Liquid Glass Build ===")
    # 1. Install frontend deps & build
    if not (FRONTEND / "node_modules").exists():
        run("npm install", cwd=FRONTEND)
    run("npm run build", cwd=FRONTEND)

    # 2. PyInstaller build
    # Check pyinstaller
    try:
        import PyInstaller
    except:
        run(f"{sys.executable} -m pip install pyinstaller")

    # Build exe
    dist_path = BASE / "dist"
    build_path = BASE / "build"
    # Clean
    if dist_path.exists():
        shutil.rmtree(dist_path)
    if build_path.exists():
        shutil.rmtree(build_path)

    # PyInstaller command
    # --add-data handling for Windows vs Unix
    sep = ";" if os.name == "nt" else ":"
    add_data = f"frontend{sep}frontend"

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--windowed",
        "--name", "AutocratAttendance",
        f"--add-data", f"frontend/dist{sep}frontend/dist",
        "--hidden-import", "pandas",
        "--hidden-import", "openpyxl",
        "app.py"
    ]
    run(" ".join(cmd), cwd=BASE)
    print("\n✅ Build complete! Check /dist/AutocratAttendance/")

if __name__ == "__main__":
    main()
