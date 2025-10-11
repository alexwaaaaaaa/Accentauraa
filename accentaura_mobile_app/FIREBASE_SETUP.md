# Firebase Setup Instructions - Complete Step-by-Step Guide

Is guide ko follow karke aap Firebase ko AccentAura mobile app ke saath integrate kar sakte hain.

---

## 📋 Step 1: Firebase Project Banaye

### 1.1 Firebase Console Open Kare
1. Browser mein jaye: **https://console.firebase.google.com/**
2. Google account se login kare
3. **"Add project"** ya **"Create a project"** button par click kare

### 1.2 Project Details Fill Kare
1. **Project name** enter kare: `AccentAura` (ya koi bhi naam)
2. **Continue** button click kare
3. **Google Analytics** enable rakhe (recommended)
4. **Continue** click kare
5. Analytics account select kare (ya "Default Account for Firebase" rakhe)
6. **Create project** button click kare
7. Wait kare jab tak project ban raha hai (30-60 seconds)
8. **Continue** click kare jab "Your new project is ready" dikhe

---

## 📱 Step 2: Android App Setup

### 2.1 Android App Add Kare
1. Firebase Console mein apne project dashboard par jaye
2. **Android icon** (robot icon) par click kare
3. Ya **"Add app"** → **"Android"** select kare

### 2.2 App Details Enter Kare
1. **Android package name** enter kare: `com.accentaura.accentaura_mobile_app`
   - ⚠️ Ye exactly same hona chahiye!
2. **App nickname** (optional): `AccentAura Android`
3. **Debug signing certificate SHA-1** (optional for now, baad mein add kar sakte hain)
4. **Register app** button click kare

### 2.3 Configuration File Download Kare
1. **Download google-services.json** button click kare
2. File download ho jayegi
3. **Next** button click kare

### 2.4 Configuration File Place Kare
1. Downloaded `google-services.json` file ko copy kare
2. Is location par paste kare:
   ```
   accentaura_mobile_app/android/app/google-services.json
   ```
3. Verify kare ki file sahi jagah hai

### 2.5 SDK Setup (Already Done ✅)
- Firebase SDK already `pubspec.yaml` mein configured hai
- Gradle files already configured hain
- Aapko kuch karne ki zarurat nahi
- Firebase Console mein **Next** → **Continue to console** click kare

---

## 🍎 Step 3: iOS App Setup

### 3.1 iOS App Add Kare
1. Firebase Console mein apne project dashboard par wapas jaye
2. **iOS icon** (Apple icon) par click kare
3. Ya **"Add app"** → **"iOS"** select kare

### 3.2 App Details Enter Kare
1. **iOS bundle ID** enter kare: `com.accentaura.accentauraMobileApp`
   - ⚠️ Ye exactly same hona chahiye!
2. **App nickname** (optional): `AccentAura iOS`
3. **App Store ID** (optional, skip for now)
4. **Register app** button click kare

### 3.3 Configuration File Download Kare
1. **Download GoogleService-Info.plist** button click kare
2. File download ho jayegi
3. **Next** button click kare

### 3.4 Configuration File Place Kare
1. Downloaded `GoogleService-Info.plist` file ko copy kare
2. Is location par paste kare:
   ```
   accentaura_mobile_app/ios/Runner/GoogleService-Info.plist
   ```
3. Verify kare ki file sahi jagah hai

### 3.5 Xcode Setup (Optional but Recommended)
1. Terminal mein jaye:
   ```bash
   cd accentaura_mobile_app/ios
   open Runner.xcworkspace
   ```
2. Xcode open hoga
3. Left sidebar mein **Runner** folder par right-click kare
4. **Add Files to "Runner"** select kare
5. `GoogleService-Info.plist` file select kare
6. ✅ **"Copy items if needed"** checkbox check kare
7. **Add** button click kare
8. Xcode close kare

### 3.6 SDK Setup (Already Done ✅)
- Firebase Console mein **Next** → **Continue to console** click kare

---

## 🔥 Step 4: Firebase Services Enable Kare

### 4.1 Analytics Enable Kare (Already Enabled ✅)
- Analytics automatically enabled hai jab project banaya tha
- Kuch karne ki zarurat nahi

### 4.2 Crashlytics Enable Kare
1. Firebase Console left sidebar mein **"Crashlytics"** par click kare
2. **"Enable Crashlytics"** button click kare
3. Setup complete!

### 4.3 Authentication Enable Kare (Optional - Future ke liye)
1. Firebase Console left sidebar mein **"Authentication"** par click kare
2. **"Get started"** button click kare
3. **"Sign-in method"** tab par jaye
4. Enable kare (future mein jab chahiye):
   - **Email/Password**: Enable toggle on kare
   - **Google**: Enable kare, project support email add kare
   - **Facebook**: Enable kare, App ID aur App Secret add kare (Facebook Developer Console se)
5. **Save** kare

---

## ✅ Step 5: Setup Verify Kare

### 5.1 Files Check Kare
Terminal mein ye commands run kare:

```bash
# Android file check
ls -la accentaura_mobile_app/android/app/google-services.json

# iOS file check
ls -la accentaura_mobile_app/ios/Runner/GoogleService-Info.plist
```

Dono files exist honi chahiye.

### 5.2 Dependencies Install Kare
```bash
cd accentaura_mobile_app

# Flutter packages install
flutter pub get

# iOS pods install (Mac users only)
cd ios && pod install && cd ..
```

### 5.3 App Run Kare
```bash
# Android device/emulator par
flutter run

# Ya iOS simulator par (Mac only)
flutter run -d "iPhone 15"
```

### 5.4 Firebase Console Mein Verify Kare
1. App run kare aur 30 seconds wait kare
2. Firebase Console → **Analytics** → **Dashboard** par jaye
3. Agar "Active users in the last 30 minutes" mein 1 user dikhe, to setup successful! 🎉

---

## 🔒 Step 6: Security Setup

### 6.1 .gitignore Check Kare
Verify kare ki ye files `.gitignore` mein hain:

```bash
# Check gitignore
cat accentaura_mobile_app/.gitignore | grep google-services
cat accentaura_mobile_app/.gitignore | grep GoogleService-Info
```

Agar nahi hain to add kare:
```
android/app/google-services.json
ios/Runner/GoogleService-Info.plist
```

### 6.2 Git Status Check Kare
```bash
cd accentaura_mobile_app
git status
```

⚠️ **Important**: `google-services.json` aur `GoogleService-Info.plist` files **red** (untracked) nahi honi chahiye. Agar hain to `.gitignore` mein add kare.

---

## 🎯 Step 7: Analytics Test Kare

### 7.1 Test Code (Optional)
Agar test karna hai to `main.dart` mein ye add kar sakte hain:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'lib/data/services/analytics_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Test Analytics
  final analytics = AnalyticsService.instance();
  await analytics.logAppOpen();
  
  runApp(MyApp());
}
```

### 7.2 Firebase Console Mein Events Check Kare
1. Firebase Console → **Analytics** → **Events** par jaye
2. **app_open** event dikna chahiye (5-10 minutes mein)

---

## 📝 Quick Reference

### Required Files Locations:
```
accentaura_mobile_app/
├── android/
│   └── app/
│       └── google-services.json          ← Android config
└── ios/
    └── Runner/
        └── GoogleService-Info.plist      ← iOS config
```

### Package Names (Important!):
- **Android**: `com.accentaura.accentaura_mobile_app`
- **iOS**: `com.accentaura.accentauraMobileApp`

### Useful Commands:
```bash
# Dependencies install
flutter pub get

# iOS pods install
cd ios && pod install && cd ..

# Run app
flutter run

# Check Firebase connection
flutter run --verbose | grep -i firebase
```

---

## ❓ Troubleshooting

### Problem: "google-services.json not found"
**Solution**: File ko exactly `android/app/` folder mein rakhe, `android/` mein nahi

### Problem: "GoogleService-Info.plist not found"
**Solution**: File ko exactly `ios/Runner/` folder mein rakhe

### Problem: Analytics events nahi dikh rahe
**Solution**: 
- 5-10 minutes wait kare (Firebase mein delay hota hai)
- Internet connection check kare
- App ko restart kare

### Problem: iOS build fail ho raha hai
**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
```

---

## 🎉 Setup Complete!

Agar sab steps follow kiye to aapka Firebase setup complete hai! 

**Next Steps**:
- AnalyticsService use kare apne app mein
- Events track kare (login, lesson completion, etc.)
- Firebase Console mein analytics data dekhe

**Questions?** Koi problem ho to bataye! 😊
