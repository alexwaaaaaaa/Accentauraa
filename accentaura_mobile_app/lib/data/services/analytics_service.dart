import 'package:firebase_analytics/firebase_analytics.dart';
import '../../../core/utils/logger.dart';

/// Service for handling Firebase Analytics events and user properties
/// Implements Requirement 9.6 (Analytics and Crash Reporting)
class AnalyticsService {
  final FirebaseAnalytics _analytics;

  AnalyticsService(this._analytics);

  /// Factory constructor to create AnalyticsService with default Firebase Analytics instance
  factory AnalyticsService.instance() {
    return AnalyticsService(FirebaseAnalytics.instance);
  }

  /// Log a custom event with optional parameters
  Future<void> logEvent(String name, Map<String, Object>? parameters) async {
    try {
      await _analytics.logEvent(
        name: name,
        parameters: parameters,
      );
      Logger.info('Analytics event logged: $name');
    } catch (e) {
      Logger.error('Failed to log analytics event: $name', error: e);
    }
  }

  /// Log user login event
  /// Tracks authentication method used (email, google, facebook)
  Future<void> logLogin(String method) async {
    try {
      await _analytics.logLogin(loginMethod: method);
      Logger.info('Login event logged: $method');
    } catch (e) {
      Logger.error('Failed to log login event', error: e);
    }
  }

  /// Log when a user starts a lesson
  /// Tracks lesson level to understand user progression
  Future<void> logLessonStarted(int level) async {
    try {
      await _analytics.logEvent(
        name: 'lesson_started',
        parameters: {
          'level': level,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Lesson started event logged: level $level');
    } catch (e) {
      Logger.error('Failed to log lesson started event', error: e);
    }
  }

  /// Log when a user completes a lesson
  /// Tracks level, XP earned, and time taken for performance analysis
  Future<void> logLessonCompleted(int level, int xpEarned, Duration timeTaken) async {
    try {
      await _analytics.logEvent(
        name: 'lesson_completed',
        parameters: {
          'level': level,
          'xp_earned': xpEarned,
          'time_taken_seconds': timeTaken.inSeconds,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Lesson completed event logged: level $level, XP: $xpEarned');
    } catch (e) {
      Logger.error('Failed to log lesson completed event', error: e);
    }
  }

  /// Log when a user completes an activity within a lesson
  /// Tracks activity type and performance score
  Future<void> logActivityCompleted(String activityType, double score) async {
    try {
      await _analytics.logEvent(
        name: 'activity_completed',
        parameters: {
          'activity_type': activityType,
          'score': score,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Activity completed event logged: $activityType, score: $score');
    } catch (e) {
      Logger.error('Failed to log activity completed event', error: e);
    }
  }

  /// Log when a user earns XP
  /// Tracks amount and source (lesson, activity, bonus, etc.)
  Future<void> logXpEarned(int amount, String source) async {
    try {
      await _analytics.logEvent(
        name: 'xp_earned',
        parameters: {
          'amount': amount,
          'source': source,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('XP earned event logged: $amount from $source');
    } catch (e) {
      Logger.error('Failed to log XP earned event', error: e);
    }
  }

  /// Log when a user's streak is incremented
  /// Tracks the new streak value to understand engagement patterns
  Future<void> logStreakIncremented(int newStreak) async {
    try {
      await _analytics.logEvent(
        name: 'streak_incremented',
        parameters: {
          'new_streak': newStreak,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Streak incremented event logged: $newStreak days');
    } catch (e) {
      Logger.error('Failed to log streak incremented event', error: e);
    }
  }

  /// Log when a user earns a badge
  /// Tracks badge ID to understand which achievements are most common
  Future<void> logBadgeAwarded(String badgeId) async {
    try {
      await _analytics.logEvent(
        name: 'badge_awarded',
        parameters: {
          'badge_id': badgeId,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Badge awarded event logged: $badgeId');
    } catch (e) {
      Logger.error('Failed to log badge awarded event', error: e);
    }
  }

  /// Log when a user completes an AI interview
  /// Tracks confidence and grammar scores for performance analysis
  Future<void> logInterviewCompleted(double confidenceScore, double grammarScore) async {
    try {
      await _analytics.logEvent(
        name: 'interview_completed',
        parameters: {
          'confidence_score': confidenceScore,
          'grammar_score': grammarScore,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      Logger.info('Interview completed event logged: confidence: $confidenceScore, grammar: $grammarScore');
    } catch (e) {
      Logger.error('Failed to log interview completed event', error: e);
    }
  }

  /// Set the user ID for analytics tracking
  /// Should be called after successful authentication
  Future<void> setUserId(String userId) async {
    try {
      await _analytics.setUserId(id: userId);
      Logger.info('Analytics user ID set: $userId');
    } catch (e) {
      Logger.error('Failed to set analytics user ID', error: e);
    }
  }

  /// Set a user property for analytics segmentation
  /// Examples: current_level, total_xp, streak, subscription_status
  Future<void> setUserProperty(String name, String value) async {
    try {
      await _analytics.setUserProperty(name: name, value: value);
      Logger.info('Analytics user property set: $name = $value');
    } catch (e) {
      Logger.error('Failed to set analytics user property: $name', error: e);
    }
  }

  /// Log screen view event
  /// Automatically tracks which screens users visit
  Future<void> logScreenView(String screenName, String screenClass) async {
    try {
      await _analytics.logScreenView(
        screenName: screenName,
        screenClass: screenClass,
      );
      Logger.info('Screen view logged: $screenName');
    } catch (e) {
      Logger.error('Failed to log screen view', error: e);
    }
  }

  /// Log app open event
  /// Tracks when users open the app
  Future<void> logAppOpen() async {
    try {
      await _analytics.logAppOpen();
      Logger.info('App open event logged');
    } catch (e) {
      Logger.error('Failed to log app open event', error: e);
    }
  }

  /// Clear user ID and reset analytics
  /// Should be called on logout
  Future<void> clearUserId() async {
    try {
      await _analytics.setUserId(id: null);
      Logger.info('Analytics user ID cleared');
    } catch (e) {
      Logger.error('Failed to clear analytics user ID', error: e);
    }
  }
}
