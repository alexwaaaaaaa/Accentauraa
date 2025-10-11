# AccentAura Mobile App

A Flutter-based mobile application for language learning with AI-powered features, gamification, and offline support.

## Project Structure

```
lib/
├── core/                    # Core utilities and constants
│   ├── constants/          # App-wide constants
│   ├── theme/              # Theme configuration
│   └── utils/              # Utility functions
├── data/                    # Data layer
│   ├── models/             # Data models
│   ├── repositories/       # Repository implementations
│   └── services/           # API and local services
├── domain/                  # Business logic layer
│   └── (domain entities and use cases)
├── presentation/            # Presentation layer
│   ├── providers/          # Riverpod providers
│   ├── screens/            # Full-page screens
│   └── widgets/            # Reusable widgets
└── main.dart               # App entry point
```

## Setup Instructions

### Prerequisites

- Flutter SDK 3.35.5 or higher
- Dart 3.9.2 or higher
- Android Studio / Xcode for platform-specific builds
- Firebase project (see FIREBASE_SETUP.md)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Set up Firebase (see FIREBASE_SETUP.md)

4. For iOS, install CocoaPods dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```

5. Run the app:
   ```bash
   flutter run
   ```

## Dependencies

### State Management
- **flutter_riverpod**: State management solution
- **riverpod_annotation**: Code generation for Riverpod

### Navigation
- **go_router**: Declarative routing

### Networking
- **dio**: HTTP client for API calls

### Local Storage
- **hive**: NoSQL database for local storage
- **flutter_secure_storage**: Secure storage for tokens
- **cached_network_image**: Image caching
- **flutter_cache_manager**: General cache management

### Connectivity
- **connectivity_plus**: Network connectivity monitoring

### Permissions
- **permission_handler**: Runtime permission handling

### Audio & Speech
- **flutter_sound**: Audio recording
- **audioplayers**: Audio playback
- **flutter_tts**: Text-to-speech
- **speech_to_text**: Speech recognition

### Authentication
- **google_sign_in**: Google OAuth
- **flutter_facebook_auth**: Facebook OAuth

### Firebase
- **firebase_core**: Firebase initialization
- **firebase_analytics**: Analytics tracking
- **firebase_crashlytics**: Crash reporting

### UI Components
- **fl_chart**: Charts and graphs

## Configuration

### Android
- Minimum SDK: 21
- Target SDK: Latest
- Permissions configured in `android/app/src/main/AndroidManifest.xml`

### iOS
- Minimum iOS version: 12.0
- Permissions configured in `ios/Runner/Info.plist`

## Features

- 100-level lesson tree with progressive unlocking
- Multiple activity types (flashcards, MCQ, fill-in-the-blank, listening, speaking)
- AI-powered chat practice
- AI video interview simulation
- Gamification (XP, badges, streaks)
- Leaderboard
- Offline support with automatic sync
- Social authentication (Google, Facebook)

## Development

### Code Generation

Run code generation for Riverpod and Hive:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### Testing

Run tests:
```bash
flutter test
```

### Build

Build for Android:
```bash
flutter build apk --release
```

Build for iOS:
```bash
flutter build ios --release
```

## Architecture

The app follows clean architecture principles with clear separation of concerns:

- **Presentation Layer**: UI components and state management
- **Business Logic Layer**: Providers and services
- **Data Layer**: Repositories, models, and data sources

## License

[Add your license here]
