# Antigravity APK Guide — Autocrat Attendance Liquid Glass

## Goal: Convert this Windows-ready app to APK

### Option 1: Antigravity (Google) - Recommended for you
1. Open Antigravity IDE
2. File -> Open Project -> Select `Attendance-software-autocrat-solutions`
3. It will detect `frontend/` as Vite React app
4. Run `npm run build` inside Antigravity terminal (or it auto-does)
5. In Antigravity: `Tools > Export > Android APK`
6. Set:
   - App ID: com.autocrat.attendance
   - App Name: Autocrat Attendance
   - Web Dir: frontend/dist
   - Icon: generate from liquid glass logo
7. Antigravity will create `android/` folder and build APK using Gradle
8. Output APK at `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Capacitor (Manual)
```bash
npm run build --prefix frontend
npm install -g @capacitor/cli
npm install @capacitor/core @capacitor/android --prefix frontend
npx cap init "Autocrat Attendance" com.autocrat.attendance --web-dir=frontend/dist
npx cap add android
npx cap copy android
npx cap open android
# In Android Studio: Build > Build Bundle/APK
```

### Option 3: PWA -> TWA (Play Store)
- `frontend/dist` is already PWA-ready
- Use PWABuilder.com to wrap as TWA APK
- Upload to Play Store

### Notes
- JS processor in `App.jsx` already works offline in browser/APK (no Python needed on mobile)
- For Python backend on mobile, deploy FastAPI on server and call from APK, or use Chaquopy
- Current APK will be fully offline, client-side Excel processing via SheetJS (same logic as Python)

### Liquid Glass on Mobile
- Glass UI is already mobile responsive (grid col-span-12 lg:col-span-4)
- Blur performance: on Android WebView, `backdrop-filter` works from Android 9+
- For best performance, enable hardware acceleration in AndroidManifest.xml

### Icon & Splash
- SplashScreen background: #050508 (same as mesh-bg)
- Icon: Use gradient Layers icon (violet to indigo) on dark background
