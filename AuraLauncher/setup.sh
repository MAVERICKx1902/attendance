#!/bin/bash
# Setup script for Aura Launcher
# This script downloads the Gradle wrapper JAR and prepares the project

set -e

echo "========================================"
echo "  Aura Launcher - Project Setup"
echo "========================================"
echo ""

# Check for Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
    echo "✓ Java detected: $(java -version 2>&1 | head -1)"
    if [ "$JAVA_VERSION" -lt 17 ]; then
        echo "  ⚠ Java 17+ recommended"
    fi
else
    echo "✗ Java not found. Please install JDK 17+"
    echo "  Ubuntu/Debian: sudo apt install openjdk-17-jdk"
    echo "  macOS: brew install openjdk@17"
    exit 1
fi

# Check for Android SDK
if [ -n "$ANDROID_HOME" ]; then
    echo "✓ ANDROID_HOME=$ANDROID_HOME"
elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
    echo "✓ Android SDK found at $ANDROID_HOME"
elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    echo "✓ Android SDK found at $ANDROID_HOME"
else
    echo "✗ Android SDK not found. Set ANDROID_HOME or install Android Studio"
    exit 1
fi

# Download Gradle wrapper
echo ""
echo "Downloading Gradle Wrapper..."
GRADLE_VERSION=$(grep distributionUrl gradle/wrapper/gradle-wrapper.properties | cut -d= -f2 | rev | cut -d/ -f1 | rev)

if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "  Downloading gradle-wrapper.jar for Gradle $GRADLE_VERSION..."
    WRAPPER_URL="https://raw.githubusercontent.com/gradle/gradle/v${GRADLE_VERSION}/gradle/wrapper/gradle-wrapper.jar"
    # Try to get it from services.gradle.org
    WRAPPER_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
    # Actually, the JAR is from the gradle-wrapper repo
    WRAPPER_JAR_URL="https://github.com/gradle/gradle/raw/v${GRADLE_VERSION}/gradle/wrapper/gradle-wrapper.jar"
    
    echo "  Downloading from $WRAPPER_JAR_URL"
    if command -v curl &> /dev/null; then
        curl -L -o gradle/wrapper/gradle-wrapper.jar "$WRAPPER_JAR_URL" 2>/dev/null || \
        curl -L -o gradle/wrapper/gradle-wrapper.jar "https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar"
    elif command -v wget &> /dev/null; then
        wget -O gradle/wrapper/gradle-wrapper.jar "$WRAPPER_JAR_URL" 2>/dev/null || \
        wget -O gradle/wrapper/gradle-wrapper.jar "https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar"
    fi
    
    if [ -f "gradle/wrapper/gradle-wrapper.jar" ] && [ -s "gradle/wrapper/gradle-wrapper.jar" ]; then
        echo "✓ gradle-wrapper.jar downloaded"
    else
        echo ""
        echo "⚠ Could not download gradle-wrapper.jar automatically."
        echo "  Run the following command in the project directory:"
        echo "    gradle wrapper --gradle-version=${GRADLE_VERSION}"
        echo ""
        echo "  Or download manually from:"
        echo "    https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
        echo ""
        read -p "Continue anyway? (y/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo "✓ gradle-wrapper.jar exists"
fi

# Make gradlew executable
chmod +x gradlew

# Create local.properties
echo ""
echo "Creating local.properties..."
if [ ! -f "local.properties" ]; then
    echo "sdk.dir=$ANDROID_HOME" > local.properties
    echo "✓ local.properties created"
else
    echo "✓ local.properties exists"
fi

echo ""
echo "========================================"
echo "  Setup complete!"
echo ""
echo "  To build the project:"
echo "    ./gradlew assembleDebug"
echo ""
echo "  To install on device:"
echo "    adb install app/build/outputs/apk/debug/app-debug.apk"
echo "========================================"