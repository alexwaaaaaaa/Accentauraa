# Build Scripts

This directory contains utility scripts for building and managing AccentAura releases.

## Available Scripts

### build.sh

Automated build script for creating Android and iOS builds with different flavors.

**Usage:**
```bash
./scripts/build.sh [platform] [flavor] [build-type]
```

**Parameters:**
- `platform`: `android`, `ios`, or `all` (default: `android`)
- `flavor`: `development`, `staging`, or `production` (default: `development`)
- `build-type`: `apk` or `appbundle` for Android (default: `apk`)

**Examples:**
```bash
# Build development APK
./scripts/build.sh android development apk

# Build staging App Bundle
./scripts/build.sh android staging appbundle

# Build production iOS
./scripts/build.sh ios production

# Build all platforms for staging
./scripts/build.sh all staging
```

**Features:**
- Automatic dependency installation
- Code analysis before build
- Clean build process
- Colored output for better readability
- Error handling and validation

### version.sh

Version management script for bumping version numbers.

**Usage:**
```bash
./scripts/version.sh [major|minor|patch]
```

**Parameters:**
- `major`: Increment major version (X.0.0)
- `minor`: Increment minor version (0.X.0)
- `patch`: Increment patch version (0.0.X) - default

**Examples:**
```bash
# Bump patch version (1.0.0 -> 1.0.1)
./scripts/version.sh patch

# Bump minor version (1.0.1 -> 1.1.0)
./scripts/version.sh minor

# Bump major version (1.1.0 -> 2.0.0)
./scripts/version.sh major
```

**Features:**
- Automatic version parsing from pubspec.yaml
- Build number auto-increment
- Backup creation before modification
- Post-update instructions

## Prerequisites

### For All Scripts
- Flutter SDK installed and in PATH
- Git (for version tagging)

### For Android Builds
- Android SDK
- Java 17

### For iOS Builds
- macOS
- Xcode 15+
- CocoaPods

## Permissions

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

## CI/CD Integration

These scripts are used by the GitHub Actions workflow (`.github/workflows/ci.yml`) for automated builds and deployments.

## Troubleshooting

### Script Not Found
Ensure you're running scripts from the project root:
```bash
cd accentaura_mobile_app
./scripts/build.sh
```

### Permission Denied
Make the script executable:
```bash
chmod +x scripts/build.sh
```

### Flutter Not Found
Ensure Flutter is in your PATH:
```bash
export PATH="$PATH:`pwd`/flutter/bin"
```

## Additional Resources

- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Flutter Build Modes](https://docs.flutter.dev/testing/build-modes)
- [Semantic Versioning](https://semver.org/)
