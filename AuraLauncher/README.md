# Aura Launcher

A beautiful glassmorphism-style Android launcher inspired by Liquid Glass Launcher, built for Android 14–16 (API 34+).

![Aura Launcher](app/src/main/res/drawable/ic_launcher_foreground.xml)

## Features

### ✨ Glass UI Effects
- Real-time glass blur and refraction over wallpaper
- Squircle-shaped icons, folders, and panels throughout the UI
- Frosted glass dock with customizable background
- Subtle highlights and depth effects on all surfaces
- Light, Dark, and Auto themes with Material You dynamic color

### 🏠 Home Screen
- Multi-page home screen with horizontal pager
- Quick search bar at the top (apps & web search)
- Glass dock with up to 5 favorite apps
- Page indicator dots
- Apps button to open drawer
- Quick settings access

### 📱 App Drawer
- Full-screen app drawer with search filtering
- Category tabs: All, Games, Social, Tools, Media, Productivity, Communication, Shopping
- A–Z alphabetical indexing view
- Grid layout with customizable columns
- Fast app search with real-time filtering
- T9-style search support

### 🎨 Customization
- Adjustable blur intensity (0–30)
- Glass refraction control
- Icon size adjustment (40–80dp)
- Home screen grid size (3–6 columns)
- Show/hide icon labels
- Dock configuration (labels, background, app count)
- Home screen style: Normal or All Apps
- Drawer style: Horizontal, Vertical, or Categorized
- Folder style: Stock Android or One UI
- Gesture controls: Swipe up, Swipe down, Double tap
- Dark mode: Light, Dark, or Auto (follows system)

### 🔒 Privacy
- Hide apps from the launcher
- Lock apps behind authentication
- No ads, no tracking, no account required
- Optional notification badges (disabled by default)
- Notification listener service only runs when explicitly enabled

### ⚡ Performance
- Lightweight effects mode for smooth performance on any device
- Optimized battery consumption
- Fast startup and responsive navigation
- Built with Jetpack Compose for modern Android development

## Requirements

- **Android 14+** (API 34) through Android 16 (API 36)
- **Minimum**: 4GB RAM (recommended)
- **Storage**: ~25MB

## Building from Source

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 36
- Gradle 8.9

### Steps

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/AuraLauncher.git
cd AuraLauncher
```

2. Generate the Gradle wrapper:
```bash
gradle wrapper --gradle-version=8.9
```

3. Open in Android Studio:
   - File → Open → Select the `AuraLauncher` directory
   - Wait for Gradle sync to complete

4. Build the APK:
```bash
./gradlew assembleDebug
```

5. Install on device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Setting as Default Launcher

1. Install the app on your device
2. Go to **Settings → Apps → Default apps → Home app**
3. Select **Aura Launcher**
4. Grant required permissions when prompted

## Project Structure

```
AuraLauncher/
├── app/
│   ├── src/main/
│   │   ├── java/com/aura/launcher/
│   │   │   ├── MainActivity.kt          # Main launcher activity
│   │   │   ├── LauncherApp.kt           # Application class
│   │   │   ├── model/                   # Data models
│   │   │   │   ├── AppInfo.kt           # App information model
│   │   │   │   └── Models.kt            # Home items, config models
│   │   │   ├── ui/
│   │   │   │   ├── theme/               # Material3 theme
│   │   │   │   ├── screens/             # Home, Drawer, Settings
│   │   │   │   └── components/          # GlassCard, Dock, SearchBar
│   │   │   ├── service/                 # Background services
│   │   │   ├── utils/                   # Utilities & preferences
│   │   │   └── viewmodel/               # LauncherViewModel
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

## Customization Guide

### Glass Effect Parameters
Adjust in Settings → Glass Effect:
- **Blur Intensity**: Controls the frosted glass blur level (0 = no blur, 30 = maximum blur)
- **Glass Refraction**: Controls how much the background warps through the glass

### Gesture Controls
Configure in Settings → Gestures:
- **Swipe Up**: App Drawer, Search, Notifications, Lock Screen, Recent Apps
- **Swipe Down**: Search, Notifications, App Drawer
- **Double Tap**: Lock Screen, Search, Recent Apps, None

### Icon Packs
Aura Launcher supports custom icon packs. Install any icon pack from Play Store, and it will be automatically detected and available for use.

## Privacy Policy

Aura Launcher respects your privacy:
- **No data collection**: We do not collect, store, or transmit any personal data
- **No internet permission**: The launcher works fully offline
- **No analytics**: No tracking SDKs or analytics services
- **Optional permissions**: Notification access is only used for badge counts when explicitly enabled
- **Accessibility Service**: Used only for gesture shortcuts (lock screen, notification shade) when you explicitly enable it

## License

```
MIT License

Copyright (c) 2026 Aura Launcher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

## Credits

- Inspired by [Liquid Glass Launcher](https://play.google.com/store/apps/details?id=liquid.glass.launcher.homescreen)
- Built with Jetpack Compose & Material 3
- Icons by Material Design Icons