#!/bin/bash

# AccentAura Version Management Script
# Usage: ./scripts/version.sh [major|minor|patch]
# Example: ./scripts/version.sh patch

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
    echo "Error: pubspec.yaml not found. Run this script from the project root."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(grep "^version:" pubspec.yaml | sed 's/version: //' | sed 's/+.*//')
CURRENT_BUILD=$(grep "^version:" pubspec.yaml | sed 's/.*+//')

print_info "Current version: $CURRENT_VERSION+$CURRENT_BUILD"

# Parse version components
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Determine version bump type
BUMP_TYPE=${1:-patch}

case $BUMP_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Error: Invalid bump type. Use 'major', 'minor', or 'patch'"
        exit 1
        ;;
esac

# Increment build number
NEW_BUILD=$((CURRENT_BUILD + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

print_info "New version: $NEW_VERSION+$NEW_BUILD"

# Update pubspec.yaml
sed -i.bak "s/^version: .*/version: $NEW_VERSION+$NEW_BUILD/" pubspec.yaml
rm pubspec.yaml.bak

print_info "Version updated successfully!"
print_info "Don't forget to:"
echo "  1. Update CHANGELOG.md"
echo "  2. Commit the changes: git add pubspec.yaml CHANGELOG.md"
echo "  3. Create a tag: git tag v$NEW_VERSION"
echo "  4. Push changes: git push && git push --tags"
