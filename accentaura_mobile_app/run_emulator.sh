#!/bin/bash

echo "🚀 AccentAura - Emulator Run Script"
echo "===================================="
echo ""

# Check if emulator is running
echo "📱 Checking for running devices..."
DEVICES=$(flutter devices | grep -c "emulator")

if [ $DEVICES -eq 0 ]; then
    echo "❌ No emulator found running"
    echo ""
    echo "Available emulators:"
    flutter emulators
    echo ""
    echo "To start an emulator, run:"
    echo "  flutter emulators --launch <emulator_name>"
    echo ""
    echo "Or open Android Studio and start an emulator from AVD Manager"
    exit 1
fi

echo "✅ Emulator found!"
echo ""

# Ask which flavor to run
echo "Which flavor do you want to run?"
echo "1) Development (fastest, debug mode)"
echo "2) Staging"
echo "3) Production"
echo "4) Install production APK"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏃 Running development flavor..."
        flutter run --flavor development
        ;;
    2)
        echo ""
        echo "🏃 Running staging flavor..."
        flutter run --flavor staging
        ;;
    3)
        echo ""
        echo "🏃 Running production flavor..."
        flutter run --flavor production --release
        ;;
    4)
        echo ""
        echo "📦 Installing production APK..."
        if [ -f "build/app/outputs/flutter-apk/app-production-release.apk" ]; then
            adb install -r build/app/outputs/flutter-apk/app-production-release.apk
            echo "✅ APK installed successfully!"
        else
            echo "❌ APK not found. Build it first with:"
            echo "   flutter build apk --release --flavor production"
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
