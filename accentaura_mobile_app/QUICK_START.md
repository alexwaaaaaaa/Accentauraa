# 🚀 AccentAura Mobile App - Quick Start Guide

## Demo Login Credentials

```
Email:    demo@accentaura.com
Password: demo123
```

## Quick Commands

### Run App
```bash
cd accentaura_mobile_app
flutter run -d emulator-5554
```

### Build APK
```bash
cd android
./gradlew assembleDevelopmentDebug
```

### Install APK
```bash
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 install -r build/app/outputs/flutter-apk/app-development-debug.apk
```

## Current Status

✅ **App launches successfully**
✅ **Splash screen works**
✅ **Auth screen displays**
✅ **Demo login functional**
✅ **Navigation to home works**

⚠️ **Backend not integrated** - Using demo mode
⚠️ **Google/Facebook login disabled** - Needs OAuth setup
⚠️ **Sign up not implemented** - Coming soon

## Important Files

- `lib/main.dart` - App entry point
- `lib/presentation/screens/auth_screen.dart` - Login screen with demo credentials
- `lib/presentation/screens/home_screen.dart` - Main home screen
- `lib/presentation/navigation/app_router.dart` - Navigation/routing
- `android/app/google-services.json` - Firebase config

## Firebase Setup

Firebase is configured for all three flavors:
- Development: `com.accentaura.accentaura_mobile_app.dev`
- Staging: `com.accentaura.accentaura_mobile_app.staging`
- Production: `com.accentaura.accentaura_mobile_app`

## Build Flavors

```bash
# Development
flutter run --flavor development

# Staging  
flutter run --flavor staging

# Production
flutter run --flavor production
```

## Troubleshooting

### App crashes on launch
```bash
flutter clean
flutter pub get
flutter run
```

### Login not working
Make sure you're using demo credentials:
- Email: `demo@accentaura.com`
- Password: `demo123`

### Can't navigate after login
Router is in demo mode - allows home access without auth.
This is temporary until backend is integrated.

## Next Steps

1. **Start Backend API** - Enable real authentication
2. **Configure OAuth** - Enable Google/Facebook login
3. **Implement Sign Up** - User registration flow
4. **Connect to real data** - Replace mock data with API calls

---
**Last Updated:** January 10, 2025
**Status:** Demo Mode - Working
