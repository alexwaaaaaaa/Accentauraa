# 🚀 Mobile App Production Deployment - Free Guide

Complete guide for deploying AccentAura mobile app to Play Store and App Store.

## 📋 Overview

| Platform | Cost | Timeline |
|----------|------|----------|
| **Google Play Store** | $25 one-time | 2-3 days review |
| **Apple App Store** | $99/year | 1-2 days review |
| **Firebase** | ✅ Free (Spark plan) | Instant |
| **CI/CD** | ✅ Free (GitHub Actions) | Instant |

---

## 🎯 Part 1: Pre-Deployment Setup

### Update API Endpoints

```dart
// lib/core/config/environment.dart

class EnvironmentConfig {
  // Update production config
  static const production = EnvironmentConfig(
    environment: Environment.production,
    apiBaseUrl: 'https://accentaura-api.onrender.com', // Your backend URL
    apiKey: '', // Optional
    enableLogging: false,
    enableAnalytics: true,
    enableCrashReporting: true,
  );
}
```

### Update Version

```yaml
# pubspec.yaml
name: accentaura_mobile_app
description: AI-powered accent learning app
version: 1.0.0+1  # version+build_number

# Increment for each release:
# - Major: 1.0.0 -> 2.0.0 (breaking changes)
# - Minor: 1.0.0 -> 1.1.0 (new features)
# - Patch: 1.0.0 -> 1.0.1 (bug fixes)
# - Build: 1.0.0+1 -> 1.0.0+2 (same version, new build)
```

### Run Pre-Deployment Checks

```bash
# 1. Clean and get dependencies
flutter clean
flutter pub get

# 2. Run tests
flutter test

# 3. Analyze code
flutter analyze

# 4. Check for outdated packages
flutter pub outdated

# 5. Test production build locally
flutter run --flavor production --target lib/main_production.dart --release
```

---

## 🎯 Part 2: Android Deployment (Google Play Store)

### Step 1: Create Signing Key

```bash
cd accentaura_mobile_app/android

# Generate keystore (first time only)
keytool -genkey -v -keystore accentaura-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias accentaura

# You'll be asked:
# - Password: <create-strong-password>
# - Name: AccentAura
# - Organization: Your Company
# - City, State, Country: Your details

# IMPORTANT: Backup this file securely!
# If you lose it, you can't update your app!
```

### Step 2: Configure Signing

```bash
# Create key.properties file
cat > key.properties << EOF
storePassword=<your-keystore-password>
keyPassword=<your-key-password>
keyAlias=accentaura
storeFile=accentaura-release-key.jks
EOF

# Add to .gitignore (NEVER commit this!)
echo "key.properties" >> .gitignore
echo "*.jks" >> .gitignore
```

### Step 3: Update Build Configuration

```kotlin
// android/app/build.gradle.kts

// Add before android block
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config
    
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
    
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ... other settings
        }
    }
}
```

### Step 4: Build App Bundle

```bash
cd accentaura_mobile_app

# Build production App Bundle (AAB)
flutter build appbundle \
  --flavor production \
  --target lib/main_production.dart \
  --release

# Output location:
# build/app/outputs/bundle/productionRelease/app-production-release.aab

# Verify build
ls -lh build/app/outputs/bundle/productionRelease/
```

### Step 5: Create Play Store Account

1. **Go to Play Console**
   - Visit: https://play.google.com/console
   - Sign in with Google account
   - Pay $25 one-time registration fee

2. **Create App**
   ```
   - Click "Create app"
   - App name: AccentAura
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
   - Accept declarations
   ```

### Step 6: Setup Store Listing

```bash
# Required assets:

# 1. App Icon (512x512 PNG)
# - High-res icon for Play Store
# - No transparency, no rounded corners

# 2. Feature Graphic (1024x500 PNG)
# - Banner image for store listing

# 3. Screenshots (at least 2)
# - Phone: 16:9 or 9:16 ratio
# - Minimum: 320px
# - Maximum: 3840px

# 4. Privacy Policy URL
# - Required for all apps
# - Host on your website or GitHub Pages
```

### Step 7: Fill Store Listing

```
App Details:
- Short description (80 chars): "Learn accents with AI-powered lessons"
- Full description (4000 chars): [Write compelling description]
- App category: Education
- Tags: education, language learning, AI

Contact Details:
- Email: support@accentaura.com
- Phone: Optional
- Website: https://accentaura.com

Privacy Policy:
- URL: https://accentaura.com/privacy
```

### Step 8: Content Rating

```bash
# In Play Console:
# - Content rating section
# - Start questionnaire
# - Answer questions honestly
# - Submit for rating

# Common questions:
# - Violence: None
# - Sexual content: None
# - Language: None
# - User interaction: Yes (chat, user-generated content)
# - Data sharing: Yes (explain what data)
```

### Step 9: Upload App Bundle

```bash
# In Play Console:
# - Production > Create new release
# - Upload app-production-release.aab
# - Release name: 1.0.0
# - Release notes:
```

```
What's new in version 1.0.0:
- Initial release
- AI-powered accent lessons
- Interactive pronunciation practice
- Progress tracking
- Leaderboards and achievements
```

### Step 10: Submit for Review

```bash
# Before submitting:
# ✅ Store listing complete
# ✅ Content rating received
# ✅ Pricing set (Free)
# ✅ Countries selected (All or specific)
# ✅ App bundle uploaded
# ✅ Release notes added

# Click "Review release" > "Start rollout to Production"
# Review time: 2-3 days typically
```

---

## 🎯 Part 3: iOS Deployment (Apple App Store)

### Step 1: Apple Developer Account

1. **Enroll in Apple Developer Program**
   - Visit: https://developer.apple.com/programs/
   - Cost: $99/year
   - Verification: 1-2 days

2. **Create App ID**
   ```bash
   # In Apple Developer Portal:
   # - Certificates, IDs & Profiles
   # - Identifiers > App IDs
   # - Register new App ID
   # - Bundle ID: com.accentaura.accentauraMobileApp
   # - Capabilities: Push Notifications, Sign in with Apple (if needed)
   ```

### Step 2: Configure Xcode

```bash
cd accentaura_mobile_app/ios

# Open workspace in Xcode
open Runner.xcworkspace

# In Xcode:
# 1. Select Runner target
# 2. Signing & Capabilities tab
# 3. Team: Select your team
# 4. Bundle Identifier: com.accentaura.accentauraMobileApp
# 5. Signing Certificate: Automatically manage signing
```

### Step 3: Update Info.plist

```xml
<!-- ios/Runner/Info.plist -->
<dict>
    <!-- App Display Name -->
    <key>CFBundleDisplayName</key>
    <string>AccentAura</string>
    
    <!-- Version -->
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    
    <key>CFBundleVersion</key>
    <string>1</string>
    
    <!-- Privacy Descriptions (required!) -->
    <key>NSMicrophoneUsageDescription</key>
    <string>AccentAura needs microphone access for pronunciation practice</string>
    
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>AccentAura uses speech recognition to analyze your pronunciation</string>
    
    <key>NSCameraUsageDescription</key>
    <string>AccentAura needs camera access for profile pictures</string>
</dict>
```

### Step 4: Build IPA

```bash
cd accentaura_mobile_app

# Build production IPA
flutter build ipa \
  --flavor production \
  --target lib/main_production.dart \
  --release

# Output location:
# build/ios/ipa/accentaura_mobile_app.ipa
```

### Step 5: Create App in App Store Connect

1. **Go to App Store Connect**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with Apple ID

2. **Create New App**
   ```
   - My Apps > + > New App
   - Platform: iOS
   - Name: AccentAura
   - Primary Language: English (US)
   - Bundle ID: com.accentaura.accentauraMobileApp
   - SKU: accentaura-ios-001
   - User Access: Full Access
   ```

### Step 6: Prepare App Store Assets

```bash
# Required assets:

# 1. App Icon (1024x1024 PNG)
# - No transparency
# - No rounded corners
# - RGB color space

# 2. Screenshots (required for each device size)
# iPhone 6.7" (1290x2796): 3-10 screenshots
# iPhone 6.5" (1242x2688): 3-10 screenshots
# iPhone 5.5" (1242x2208): 3-10 screenshots
# iPad Pro 12.9" (2048x2732): Optional

# 3. Preview Videos (optional)
# - 15-30 seconds
# - MP4 or MOV format
```

### Step 7: Generate Screenshots

```bash
# Option 1: Manual screenshots
# - Run app on simulator
# - Cmd+S to take screenshot
# - Resize to required dimensions

# Option 2: Automated with Fastlane
gem install fastlane
cd ios
fastlane snapshot

# Option 3: Use screenshot tools
# - App Store Screenshot Generator
# - Figma/Sketch templates
```

### Step 8: Fill App Information

```
App Information:
- Name: AccentAura
- Subtitle (30 chars): "AI-Powered Accent Learning"
- Category: Education
- Secondary Category: Productivity

Description (4000 chars):
"Learn any accent with AI-powered lessons and real-time feedback.

Features:
• 100+ interactive lessons
• AI pronunciation analysis
• Real-time feedback
• Progress tracking
• Leaderboards
• Achievements

Perfect for:
- Language learners
- Accent improvement
- Pronunciation practice
- Speech training"

Keywords (100 chars):
"accent,learning,AI,pronunciation,language,education,speech,english"

Support URL: https://accentaura.com/support
Marketing URL: https://accentaura.com
Privacy Policy URL: https://accentaura.com/privacy
```

### Step 9: Upload Build

```bash
# Option 1: Using Xcode
# - Open Xcode
# - Window > Organizer
# - Select archive
# - Distribute App > App Store Connect
# - Upload

# Option 2: Using Transporter
# - Download Transporter from Mac App Store
# - Drag and drop IPA file
# - Deliver

# Option 3: Using Command Line
xcrun altool --upload-app \
  --type ios \
  --file build/ios/ipa/accentaura_mobile_app.ipa \
  --username "your@email.com" \
  --password "app-specific-password"
```

### Step 10: Submit for Review

```bash
# In App Store Connect:
# 1. Select your app
# 2. Version 1.0.0
# 3. Add build (select uploaded build)
# 4. Fill all required fields
# 5. Age Rating: Complete questionnaire
# 6. Review Information:
#    - Sign-in required: No (or provide test account)
#    - Contact info: Your email/phone
#    - Notes: Any special instructions
# 7. Version Release: Automatic or Manual
# 8. Submit for Review

# Review time: 1-2 days typically
```

---

## 🎯 Part 4: CI/CD with GitHub Actions

### Create Workflow for Android

```yaml
# .github/workflows/android-deploy.yml
name: Deploy Android to Play Store

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  deploy-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run tests
        run: flutter test
      
      - name: Decode keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/accentaura-release-key.jks
      
      - name: Create key.properties
        run: |
          cat > android/key.properties << EOF
          storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
          keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
          storeFile=accentaura-release-key.jks
          EOF
      
      - name: Build App Bundle
        run: |
          flutter build appbundle \
            --flavor production \
            --target lib/main_production.dart \
            --release
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.accentaura.accentaura_mobile_app
          releaseFiles: build/app/outputs/bundle/productionRelease/app-production-release.aab
          track: production
          status: completed
```

### Create Workflow for iOS

```yaml
# .github/workflows/ios-deploy.yml
name: Deploy iOS to App Store

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  deploy-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run tests
        run: flutter test
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
      
      - name: Build IPA
        run: |
          flutter build ipa \
            --flavor production \
            --target lib/main_production.dart \
            --release \
            --export-options-plist=ios/ExportOptions.plist
      
      - name: Upload to TestFlight
        uses: apple-actions/upload-testflight-build@v1
        with:
          app-path: build/ios/ipa/accentaura_mobile_app.ipa
          issuer-id: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          api-key-id: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          api-private-key: ${{ secrets.APP_STORE_CONNECT_API_PRIVATE_KEY }}
```

### Setup GitHub Secrets

```bash
# In GitHub repo:
# Settings > Secrets and variables > Actions

# Android secrets:
ANDROID_KEYSTORE_BASE64=<base64-encoded-keystore>
ANDROID_KEYSTORE_PASSWORD=<your-password>
ANDROID_KEY_PASSWORD=<your-password>
ANDROID_KEY_ALIAS=accentaura
PLAY_STORE_SERVICE_ACCOUNT=<json-content>

# iOS secrets:
APP_STORE_CONNECT_ISSUER_ID=<from-app-store-connect>
APP_STORE_CONNECT_API_KEY_ID=<from-app-store-connect>
APP_STORE_CONNECT_API_PRIVATE_KEY=<from-app-store-connect>

# To encode keystore:
base64 -i android/accentaura-release-key.jks | pbcopy
```

---

## 🎯 Part 5: Firebase Setup (Free Tier)

### Create Firebase Project

```bash
# 1. Go to Firebase Console
# https://console.firebase.google.com

# 2. Create project
# - Name: AccentAura
# - Enable Google Analytics: Yes
# - Analytics location: Your country

# 3. Add Android app
# - Package name: com.accentaura.accentaura_mobile_app
# - Download google-services.json
# - Place in: android/app/

# 4. Add iOS app
# - Bundle ID: com.accentaura.accentauraMobileApp
# - Download GoogleService-Info.plist
# - Place in: ios/Runner/
```

### Install FlutterFire CLI

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase
flutterfire configure \
  --project=accentaura \
  --platforms=android,ios \
  --android-package-name=com.accentaura.accentaura_mobile_app \
  --ios-bundle-id=com.accentaura.accentauraMobileApp
```

### Enable Firebase Services

```bash
# In Firebase Console:

# 1. Authentication
# - Enable Email/Password
# - Enable Google Sign-In

# 2. Firestore (optional)
# - Create database
# - Start in production mode
# - Location: Choose closest

# 3. Cloud Storage (optional)
# - Create bucket
# - Security rules: Authenticated users only

# 4. Analytics
# - Already enabled
# - No additional setup needed

# 5. Crashlytics
# - Enable Crashlytics
# - Follow setup instructions
```

---

## 🎯 Part 6: Post-Deployment

### Monitor App Performance

```bash
# 1. Play Console Analytics
# - User acquisition
# - User retention
# - Crash reports
# - ANR (App Not Responding) reports

# 2. App Store Connect Analytics
# - App Units
# - Sales and Trends
# - Crash reports
# - TestFlight feedback

# 3. Firebase Analytics
# - User engagement
# - User demographics
# - Custom events
# - Conversion tracking
```

### Respond to Reviews

```bash
# Play Store:
# - Respond within 7 days
# - Be professional and helpful
# - Address issues mentioned

# App Store:
# - Respond to reviews
# - Thank positive reviews
# - Help with negative reviews
```

### Release Updates

```bash
# 1. Update version in pubspec.yaml
version: 1.0.1+2  # Increment build number

# 2. Build new release
flutter build appbundle --flavor production --target lib/main_production.dart --release
flutter build ipa --flavor production --target lib/main_production.dart --release

# 3. Upload to stores
# - Play Console: Create new release
# - App Store Connect: Create new version

# 4. Write release notes
# - What's new
# - Bug fixes
# - Improvements
```

---

## 📚 Quick Reference

### Build Commands

```bash
# Android
flutter build apk --flavor production --target lib/main_production.dart --release
flutter build appbundle --flavor production --target lib/main_production.dart --release

# iOS
flutter build ios --flavor production --target lib/main_production.dart --release
flutter build ipa --flavor production --target lib/main_production.dart --release

# Test production build
flutter run --flavor production --target lib/main_production.dart --release
```

### Version Management

```yaml
# pubspec.yaml
version: MAJOR.MINOR.PATCH+BUILD

# Examples:
version: 1.0.0+1   # Initial release
version: 1.0.1+2   # Bug fix
version: 1.1.0+3   # New feature
version: 2.0.0+4   # Breaking change
```

### Store URLs

```bash
# Play Store
https://play.google.com/store/apps/details?id=com.accentaura.accentaura_mobile_app

# App Store
https://apps.apple.com/app/accentaura/id<your-app-id>
```

---

## 🎉 Deployment Complete!

Your AccentAura mobile app is now live on:
- ✅ Google Play Store (Android)
- ✅ Apple App Store (iOS)
- ✅ Firebase Analytics
- ✅ Crash Reporting
- ✅ CI/CD Pipeline

### Next Steps

1. Monitor crash reports daily
2. Respond to user reviews
3. Track analytics and user behavior
4. Plan feature updates
5. A/B test new features
6. Optimize app performance

---

**Last Updated**: 2025-01-10  
**Maintained By**: AccentAura Team
