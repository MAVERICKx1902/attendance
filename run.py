import subprocess, sys, pathlib
frontend = pathlib.Path(__file__).parent / "frontend"
# Try to run vite dev + python app
print("Starting frontend dev server...")
try:
    subprocess.Popen(["npm", "run", "dev"], cwd=frontend, shell=True)
except Exception as e:
    print(e)

print("Starting pywebview app (if built, will use dist)...")
import app
app.start_app()
