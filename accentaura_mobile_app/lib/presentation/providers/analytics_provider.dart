import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import '../../data/services/analytics_service.dart';
import '../../core/utils/logger.dart';

/// Provider for Firebase Analytics instance
final firebaseAnalyticsProvider = Provider<FirebaseAnalytics>((ref) {
  return FirebaseAnalytics.instance;
});

/// Provider for Analytics Service
/// 
/// This provider gives access to the AnalyticsService which wraps
/// Firebase Analytics and provides convenient methods for logging events
/// 
/// Example usage:
/// ```dart
/// final analytics = ref.read(analyticsProvider);
/// await analytics.logLessonCompleted(level, xp, duration);
/// ```
final analyticsProvider = Provider<AnalyticsService>((ref) {
  final firebaseAnalytics = ref.watch(firebaseAnalyticsProvider);
  return AnalyticsService(firebaseAnalytics);
});

/// Provider for Firebase Analytics Observer
/// 
/// Used with go_router to automatically track screen views
/// 
/// Example usage in router configuration:
/// ```dart
/// final router = GoRouter(
///   observers: [
///     FirebaseAnalyticsObserver(analytics: ref.read(firebaseAnalyticsProvider)),
///   ],
///   // ... routes
/// );
/// ```
final analyticsObserverProvider = Provider<FirebaseAnalyticsObserver>((ref) {
  final firebaseAnalytics = ref.watch(firebaseAnalyticsProvider);
  return FirebaseAnalyticsObserver(analytics: firebaseAnalytics);
});

/// Helper provider for logging events
/// 
/// This is a convenience provider that exposes common analytics operations
/// as simple functions that can be called from anywhere in the app
class AnalyticsHelper {
  final AnalyticsService _service;

  AnalyticsHelper(this._service);

  /// Log user login event
  Future<void> logLogin(String method) async {
    try {
      await _service.logLogin(method);
    } catch (e) {
      Logger.error('Failed to log login event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log lesson started event
  Future<void> logLessonStarted(int level) async {
    try {
      await _service.logLessonStarted(level);
    } catch (e) {
      Logger.error('Failed to log lesson started event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log lesson completed event
  Future<void> logLessonCompleted(int level, int xpEarned, Duration timeTaken) async {
    try {
      await _service.logLessonCompleted(level, xpEarned, timeTaken);
    } catch (e) {
      Logger.error('Failed to log lesson completed event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log activity completed event
  Future<void> logActivityCompleted(String activityType, double score) async {
    try {
      await _service.logActivityCompleted(activityType, score);
    } catch (e) {
      Logger.error('Failed to log activity completed event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log XP earned event
  Future<void> logXpEarned(int amount, String source) async {
    try {
      await _service.logXpEarned(amount, source);
    } catch (e) {
      Logger.error('Failed to log XP earned event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log streak incremented event
  Future<void> logStreakIncremented(int newStreak) async {
    try {
      await _service.logStreakIncremented(newStreak);
    } catch (e) {
      Logger.error('Failed to log streak incremented event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log badge awarded event
  Future<void> logBadgeAwarded(String badgeId) async {
    try {
      await _service.logBadgeAwarded(badgeId);
    } catch (e) {
      Logger.error('Failed to log badge awarded event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log interview completed event
  Future<void> logInterviewCompleted(double confidenceScore, double grammarScore) async {
    try {
      await _service.logInterviewCompleted(confidenceScore, grammarScore);
    } catch (e) {
      Logger.error('Failed to log interview completed event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log screen view event
  Future<void> logScreenView(String screenName, String screenClass) async {
    try {
      await _service.logScreenView(screenName, screenClass);
    } catch (e) {
      Logger.error('Failed to log screen view event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log app open event
  Future<void> logAppOpen() async {
    try {
      await _service.logAppOpen();
    } catch (e) {
      Logger.error('Failed to log app open event', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Set user ID for analytics
  Future<void> setUserId(String userId) async {
    try {
      await _service.setUserId(userId);
    } catch (e) {
      Logger.error('Failed to set user ID', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Set user property
  Future<void> setUserProperty(String name, String value) async {
    try {
      await _service.setUserProperty(name, value);
    } catch (e) {
      Logger.error('Failed to set user property', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Clear user ID (on logout)
  Future<void> clearUserId() async {
    try {
      await _service.clearUserId();
    } catch (e) {
      Logger.error('Failed to clear user ID', error: e, tag: 'AnalyticsHelper');
    }
  }

  /// Log custom event
  Future<void> logEvent(String name, Map<String, Object>? parameters) async {
    try {
      await _service.logEvent(name, parameters);
    } catch (e) {
      Logger.error('Failed to log custom event', error: e, tag: 'AnalyticsHelper');
    }
  }
}

/// Provider for analytics helper
/// 
/// Provides convenient access to analytics logging functions
final analyticsHelperProvider = Provider<AnalyticsHelper>((ref) {
  final service = ref.watch(analyticsProvider);
  return AnalyticsHelper(service);
});
