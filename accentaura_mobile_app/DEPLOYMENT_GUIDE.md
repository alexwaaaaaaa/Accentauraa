# AccentAura Deployment Guide

This guide covers building and deploying AccentAura for different environments.

## Table of Contents

- [Build Variants](#build-variants)
- [Environment Configuration](#environment-configuration)
- [Building for Android](#building-for-android)
- [Building for iOS](#building-for-ios)
- [CI/CD Pipeline](#cicd-pipeline)
- [Release Checklist](#release-checklist)

## Build Variants

AccentAura supports three build variants:

### 1. Development
- **Purpose**: Local development and testing
- **API**: `https://dev-api.accentaura.com`
- **Features**: Verbose logging, no analytics, no crash reporting
- **Bundle ID**: 
  - Android: `com.accentaura.accentaura_mobile_app.dev`
  - iOS: `com.accentaura.accentauraMobileApp.dev`

### 2. Staging
- **Purpose**: Pre-production testing and QA
- **API**: `https://staging-api.accentaura.com`
- **Features**: Logging enabled, analytics enabled, crash reporting enabled
- **Bundle ID**: 
  - Android: `com.accentaura.accentaura_mobile_app.staging`
  - iOS: `com.accentaura.accentauraMobileApp.staging`

### 3. Production
- **Purpose**: Live app for end users
- **API**: `https://api.accentaura.com`
- **Features**: Minimal logging, analytics enabled, crash reporting enabled
- **Bundle ID**: 
  - Android: `com.accentaura.accentaura_mobile_app`
  - iOS: `com.accentaura.accentauraMobileApp`

## Environment Configuration

Environment-specific settings are managed in `lib/core/config/environment.dart`.

### Updating API Endpoints

Edit the `EnvironmentConfig` class to update API endpoints:

```dart
static const development = EnvironmentConfig(
  environment: Environment.development,
  apiBaseUrl: 'https://your-dev-api.com',
  apiKey: 'your_dev_api_key',
  // ...
);
```

### API Keys

**Important**: Never commit real API keys to version control. Use environment variables or secure secret management:

1. For local development, create a `.env` file (gitignored)
2. For CI/CD, use GitHub Secrets or your CI provider's secret management
3. For production, use platform-specific secure storage

## Building for Android

### Prerequisites

- Flutter SDK 3.24.0 or higher
- Android Studio with SDK 34+
- Java 17

### Development Build

```bash
flutter build apk --flavor development --target lib/main_development.dart
```

### Staging Build

```bash
flutter build apk --flavor staging --target lib/main_staging.dart
```

### Production Build

For Play Store submission, build an App Bundle:

```bash
flutter build appbundle --flavor production --target lib/main_production.dart --release
```

### Signing Configuration

1. Create a keystore:
```bash
keytool -genkey -v -keystore ~/accentaura-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias accentaura
```

2. Create `android/key.properties`:
```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=accentaura
storeFile=<path-to-keystore>
```

3. Update `android/app/build.gradle.kts` to use the signing config (already configured for debug, update for release)

### Testing the Build

```bash
# Install development build
flutter install --flavor development --target lib/main_development.dart

# Install staging build
flutter install --flavor staging --target lib/main_staging.dart
```

## Building for iOS

### Prerequisites

- macOS with Xcode 15+
- CocoaPods
- Apple Developer Account

### Development Build

```bash
flutter build ios --flavor development --target lib/main_development.dart --no-codesign
```

### Staging Build

```bash
flutter build ios --flavor staging --target lib/main_staging.dart --no-codesign
```

### Production Build

For App Store submission:

```bash
flutter build ipa --flavor production --target lib/main_production.dart --release
```

### Xcode Configuration

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select the Runner target
3. Configure signing for each flavor:
   - Development: Use development provisioning profile
   - Staging: Use ad-hoc or enterprise provisioning profile
   - Production: Use App Store provisioning profile

### TestFlight Deployment

1. Build the IPA:
```bash
flutter build ipa --flavor staging --target lib/main_staging.dart
```

2. Upload to TestFlight using Xcode or Transporter app

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

### On Pull Request
- Runs code analysis
- Executes unit tests
- Generates coverage reports

### On Push to `develop`
- Builds all variants
- Deploys development build to Play Console Internal Testing
- Uploads to TestFlight (iOS)

### On Push to `staging`
- Builds staging variant
- Deploys to Play Console Beta Testing
- Uploads to TestFlight (iOS)

### On Push to `main`
- Builds production variant
- Deploys to Play Console Production track
- Requires manual App Store submission (iOS)

### Required Secrets

Configure these secrets in your GitHub repository:

- `PLAY_STORE_SERVICE_ACCOUNT`: Google Play service account JSON
- `APP_STORE_CONNECT_API_KEY`: App Store Connect API key
- `ANDROID_KEYSTORE`: Base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password
- `ANDROID_KEY_ALIAS`: Key alias
- `ANDROID_KEY_PASSWORD`: Key password

## Release Checklist

### Pre-Release

- [ ] Update version in `pubspec.yaml`
- [ ] Update CHANGELOG.md
- [ ] Run all tests: `flutter test`
- [ ] Run code analysis: `flutter analyze`
- [ ] Test on physical devices (Android & iOS)
- [ ] Verify API endpoints are correct for environment
- [ ] Check Firebase configuration files are present
- [ ] Review and update app permissions if needed
- [ ] Test offline functionality
- [ ] Verify analytics and crash reporting

### Android Release

- [ ] Update version code and version name
- [ ] Build signed App Bundle
- [ ] Test on multiple Android versions (API 21+)
- [ ] Upload to Play Console
- [ ] Fill out store listing (if first release)
- [ ] Submit for review

### iOS Release

- [ ] Update version and build number
- [ ] Build IPA with release configuration
- [ ] Test on multiple iOS versions (iOS 12+)
- [ ] Upload to App Store Connect
- [ ] Fill out store listing (if first release)
- [ ] Submit for review

### Post-Release

- [ ] Monitor crash reports in Firebase Crashlytics
- [ ] Check analytics for user behavior
- [ ] Monitor app store reviews
- [ ] Create Git tag for release: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`

## Troubleshooting

### Build Failures

**Issue**: Gradle build fails
- Solution: Clean build with `flutter clean && flutter pub get`
- Check Java version: `java -version` (should be 17)

**Issue**: iOS build fails
- Solution: Update CocoaPods: `cd ios && pod install --repo-update`
- Clean Xcode build folder: Product > Clean Build Folder

### Signing Issues

**Issue**: Android signing fails
- Verify keystore path in `key.properties`
- Check keystore password is correct

**Issue**: iOS provisioning profile errors
- Verify bundle ID matches provisioning profile
- Check certificate is valid and not expired
- Refresh provisioning profiles in Xcode

### Environment Issues

**Issue**: Wrong API endpoint being used
- Verify you're building with correct flavor and target
- Check `EnvironmentConfig.current` returns expected environment

## Running Specific Flavors

### Android

```bash
# Development
flutter run --flavor development --target lib/main_development.dart

# Staging
flutter run --flavor staging --target lib/main_staging.dart

# Production
flutter run --flavor production --target lib/main_production.dart
```

### iOS

```bash
# Development
flutter run --flavor development --target lib/main_development.dart

# Staging
flutter run --flavor staging --target lib/main_staging.dart

# Production
flutter run --flavor production --target lib/main_production.dart
```

## Additional Resources

- [Flutter Build Modes](https://docs.flutter.dev/testing/build-modes)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [iOS Code Signing](https://developer.apple.com/support/code-signing/)
- [Firebase Setup](./FIREBASE_SETUP.md)
- [Performance Optimization](./PERFORMANCE_QUICK_REFERENCE.md)

## Support

For deployment issues, contact the development team or refer to the project documentation.
