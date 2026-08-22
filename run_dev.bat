@echo off
echo Starting Dev Server...
start cmd /k "cd frontend && npm run dev"
timeout /t 3
python app.py
