#!/bin/bash

# AccentAura Build Script
# Usage: ./scripts/build.sh [platform] [flavor] [build-type]
# Example: ./scripts/build.sh android development apk

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    print_error "Flutter is not installed or not in PATH"
    exit 1
fi

# Parse arguments
PLATFORM=${1:-android}
FLAVOR=${2:-development}
BUILD_TYPE=${3:-apk}

# Validate platform
if [[ ! "$PLATFORM" =~ ^(android|ios|all)$ ]]; then
    print_error "Invalid platform: $PLATFORM. Must be 'android', 'ios', or 'all'"
    exit 1
fi

# Validate flavor
if [[ ! "$FLAVOR" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid flavor: $FLAVOR. Must be 'development', 'staging', or 'production'"
    exit 1
fi

# Validate build type for Android
if [[ "$PLATFORM" == "android" ]] && [[ ! "$BUILD_TYPE" =~ ^(apk|appbundle)$ ]]; then
    print_error "Invalid build type for Android: $BUILD_TYPE. Must be 'apk' or 'appbundle'"
    exit 1
fi

print_info "Building AccentAura"
print_info "Platform: $PLATFORM"
print_info "Flavor: $FLAVOR"
print_info "Build Type: $BUILD_TYPE"

# Clean previous builds
print_info "Cleaning previous builds..."
flutter clean

# Get dependencies
print_info "Getting dependencies..."
flutter pub get

# Run code analysis
print_info "Running code analysis..."
flutter analyze

# Build for Android
build_android() {
    print_info "Building Android $BUILD_TYPE for $FLAVOR..."
    
    if [ "$BUILD_TYPE" == "apk" ]; then
        flutter build apk \
            --flavor "$FLAVOR" \
            --target "lib/main_$FLAVOR.dart" \
            --release
        
        print_info "APK built successfully!"
        print_info "Location: build/app/outputs/flutter-apk/app-$FLAVOR-release.apk"
    else
        flutter build appbundle \
            --flavor "$FLAVOR" \
            --target "lib/main_$FLAVOR.dart" \
            --release
        
        print_info "App Bundle built successfully!"
        print_info "Location: build/app/outputs/bundle/${FLAVOR}Release/app-$FLAVOR-release.aab"
    fi
}

# Build for iOS
build_ios() {
    print_info "Building iOS for $FLAVOR..."
    
    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS builds require macOS"
        exit 1
    fi
    
    # Install CocoaPods dependencies
    print_info "Installing CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
    
    # Build IPA
    flutter build ipa \
        --flavor "$FLAVOR" \
        --target "lib/main_$FLAVOR.dart" \
        --release
    
    print_info "iOS build completed successfully!"
    print_info "Location: build/ios/ipa/"
}

# Execute builds based on platform
case $PLATFORM in
    android)
        build_android
        ;;
    ios)
        build_ios
        ;;
    all)
        build_android
        build_ios
        ;;
esac

print_info "Build process completed successfully! 🎉"
