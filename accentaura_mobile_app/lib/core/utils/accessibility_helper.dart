import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Accessibility helper utilities for AccentAura
/// 
/// Provides:
/// - Semantic label builders
/// - Minimum tap target size constants
/// - Contrast ratio validation
/// - State change announcement helpers
class AccessibilityHelper {
  AccessibilityHelper._();

  // Minimum tap target size (44x44 points as per WCAG guidelines)
  static const double minTapTargetSize = 44.0;

  // Minimum contrast ratio for text (4.5:1 for normal text, 3:1 for large text)
  static const double minContrastRatioNormal = 4.5;
  static const double minContrastRatioLarge = 3.0;

  /// Build semantic label for XP progress
  static String xpProgressLabel(int current, int total, int level) {
    return 'Experience points: $current out of $total for level $level';
  }

  /// Build semantic label for streak
  static String streakLabel(int streak) {
    if (streak == 0) {
      return 'No active streak. Complete a lesson today to start your streak.';
    } else if (streak == 1) {
      return 'Current streak: 1 day. Keep it going!';
    } else {
      return 'Current streak: $streak days. Great job!';
    }
  }

  /// Build semantic label for coins
  static String coinsLabel(int coins) {
    return 'You have $coins coins';
  }

  /// Build semantic label for lesson card
  static String lessonCardLabel({
    required int level,
    required String title,
    required int xpReward,
    required bool isLocked,
    required bool isCompleted,
    required int activityCount,
  }) {
    final status = isCompleted
        ? 'Completed'
        : isLocked
            ? 'Locked'
            : 'Available';

    return 'Level $level: $title. $status. Rewards $xpReward experience points. Contains $activityCount activities.';
  }

  /// Build semantic label for badge
  static String badgeLabel({
    required String name,
    required String description,
    required bool isEarned,
    DateTime? earnedAt,
  }) {
    if (isEarned && earnedAt != null) {
      return 'Badge: $name. $description. Earned on ${_formatDate(earnedAt)}.';
    } else if (isEarned) {
      return 'Badge: $name. $description. Earned.';
    } else {
      return 'Badge: $name. $description. Not yet earned.';
    }
  }

  /// Build semantic label for leaderboard entry
  static String leaderboardEntryLabel({
    required int rank,
    required String username,
    required int totalXp,
    required int streak,
    required bool isCurrentUser,
  }) {
    final userPrefix = isCurrentUser ? 'You are' : '$username is';
    return '$userPrefix ranked number $rank with $totalXp experience points and a $streak day streak.';
  }

  /// Build semantic label for activity type
  static String activityTypeLabel(String activityType) {
    switch (activityType.toLowerCase()) {
      case 'flashcard':
        return 'Flashcard activity: Learn new vocabulary with images and audio';
      case 'mcq':
        return 'Multiple choice question: Select the correct answer';
      case 'fill_blank':
        return 'Fill in the blank: Complete the sentence';
      case 'listening':
        return 'Listening activity: Listen to audio and answer questions';
      case 'speaking':
        return 'Speaking activity: Record your pronunciation';
      default:
        return 'Activity: $activityType';
    }
  }

  /// Build semantic label for navigation destination
  static String navigationLabel(String destination, bool isSelected) {
    final status = isSelected ? 'Selected' : 'Not selected';
    return '$destination tab. $status.';
  }

  /// Announce state change for screen readers
  static void announceStateChange(
    BuildContext context,
    String message, {
    TextDirection textDirection = TextDirection.ltr,
  }) {
    SemanticsService.announce(
      message,
      textDirection,
    );
  }

  /// Announce XP earned
  static void announceXpEarned(BuildContext context, int xp) {
    announceStateChange(
      context,
      'You earned $xp experience points!',
    );
  }

  /// Announce level up
  static void announceLevelUp(BuildContext context, int newLevel) {
    announceStateChange(
      context,
      'Congratulations! You reached level $newLevel!',
    );
  }

  /// Announce streak increment
  static void announceStreakIncrement(BuildContext context, int newStreak) {
    announceStateChange(
      context,
      'Your streak is now $newStreak days!',
    );
  }

  /// Announce badge earned
  static void announceBadgeEarned(BuildContext context, String badgeName) {
    announceStateChange(
      context,
      'You earned a new badge: $badgeName!',
    );
  }

  /// Announce lesson unlocked
  static void announceLessonUnlocked(BuildContext context, int level) {
    announceStateChange(
      context,
      'Level $level is now unlocked!',
    );
  }

  /// Announce offline mode
  static void announceOfflineMode(BuildContext context) {
    announceStateChange(
      context,
      'You are now offline. Using cached content.',
    );
  }

  /// Announce online mode
  static void announceOnlineMode(BuildContext context) {
    announceStateChange(
      context,
      'You are back online. Syncing your progress.',
    );
  }

  /// Calculate relative luminance for contrast ratio
  static double _calculateLuminance(Color color) {
    final r = _linearize(((color.r * 255.0).round() & 0xff) / 255.0);
    final g = _linearize(((color.g * 255.0).round() & 0xff) / 255.0);
    final b = _linearize(((color.b * 255.0).round() & 0xff) / 255.0);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static double _linearize(double value) {
    if (value <= 0.03928) {
      return value / 12.92;
    } else {
      return ((value + 0.055) / 1.055).pow(2.4);
    }
  }

  /// Calculate contrast ratio between two colors
  static double calculateContrastRatio(Color foreground, Color background) {
    final l1 = _calculateLuminance(foreground);
    final l2 = _calculateLuminance(background);
    final lighter = l1 > l2 ? l1 : l2;
    final darker = l1 > l2 ? l2 : l1;
    return (lighter + 0.05) / (darker + 0.05);
  }

  /// Check if contrast ratio meets WCAG AA standards
  static bool meetsContrastRequirement(
    Color foreground,
    Color background, {
    bool isLargeText = false,
  }) {
    final ratio = calculateContrastRatio(foreground, background);
    final minRatio =
        isLargeText ? minContrastRatioLarge : minContrastRatioNormal;
    return ratio >= minRatio;
  }

  /// Format date for accessibility
  static String _formatDate(DateTime date) {
    final months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  /// Create a widget with minimum tap target size
  static Widget ensureMinTapTarget({
    required Widget child,
    double minSize = minTapTargetSize,
  }) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minSize,
        minHeight: minSize,
      ),
      child: child,
    );
  }

  /// Wrap widget with semantic label
  static Widget withSemantics({
    required Widget child,
    required String label,
    String? hint,
    String? value,
    bool? button,
    bool? header,
    bool? link,
    bool? enabled,
    bool? checked,
    bool? selected,
    bool? focusable,
    bool? focused,
    VoidCallback? onTap,
    VoidCallback? onLongPress,
  }) {
    return Semantics(
      label: label,
      hint: hint,
      value: value,
      button: button,
      header: header,
      link: link,
      enabled: enabled,
      checked: checked,
      selected: selected,
      focusable: focusable,
      focused: focused,
      onTap: onTap,
      onLongPress: onLongPress,
      child: child,
    );
  }

  /// Create an excluded semantics widget (for decorative elements)
  static Widget excludeSemantics(Widget child) {
    return ExcludeSemantics(child: child);
  }

  /// Merge semantics for complex widgets
  static Widget mergeSemantics({
    required Widget child,
    bool mergingSemantics = true,
  }) {
    return MergeSemantics(child: child);
  }
}

extension NumExtension on num {
  double pow(num exponent) {
    return toDouble().pow(exponent.toDouble());
  }
}

extension DoubleExtension on double {
  double pow(double exponent) {
    double result = 1.0;
    double base = this;
    int exp = exponent.toInt();
    
    if (exp == 0) return 1.0;
    if (exp < 0) {
      base = 1.0 / base;
      exp = -exp;
    }
    
    for (int i = 0; i < exp; i++) {
      result *= base;
    }
    
    return result;
  }
}
