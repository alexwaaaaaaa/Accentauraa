import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'logger.dart';

/// Helper class for Firebase Crashlytics operations
/// 
/// Provides utilities for:
/// - Breadcrumb logging
/// - Custom key/value pairs
/// - User identification
/// - Manual error reporting
/// 
/// Implements Requirement 9.6 (Analytics and Crash Reporting)
class CrashlyticsHelper {
  static final FirebaseCrashlytics _crashlytics = FirebaseCrashlytics.instance;

  /// Log a breadcrumb for debugging context
  /// 
  /// Breadcrumbs help understand the sequence of events leading to a crash.
  /// They are automatically included in crash reports.
  /// 
  /// Example:
  /// ```dart
  /// CrashlyticsHelper.logBreadcrumb('User tapped login button');
  /// CrashlyticsHelper.logBreadcrumb('API call started: /auth/login');
  /// ```
  static void logBreadcrumb(String message) {
    try {
      _crashlytics.log(message);
      Logger.debug('Breadcrumb: $message', tag: 'Crashlytics');
    } catch (e) {
      Logger.debug('Failed to log breadcrumb: $e', tag: 'Crashlytics');
    }
  }

  /// Set a custom key-value pair for crash context
  /// 
  /// Custom keys are included in crash reports to provide additional context.
  /// 
  /// Example:
  /// ```dart
  /// CrashlyticsHelper.setCustomKey('current_screen', 'lesson_player');
  /// CrashlyticsHelper.setCustomKey('lesson_level', 5);
  /// ```
  static Future<void> setCustomKey(String key, Object value) async {
    try {
      await _crashlytics.setCustomKey(key, value);
      Logger.debug('Custom key set: $key = $value', tag: 'Crashlytics');
    } catch (e) {
      Logger.debug('Failed to set custom key: $e', tag: 'Crashlytics');
    }
  }

  /// Set user identifier for crash reports
  /// 
  /// IMPORTANT: Only use non-sensitive user identifiers (e.g., user ID, not email)
  /// 
  /// Example:
  /// ```dart
  /// CrashlyticsHelper.setUserId('user_12345');
  /// ```
  static Future<void> setUserId(String userId) async {
    try {
      // Sanitize user ID to ensure no sensitive data
      final sanitizedId = _sanitizeUserId(userId);
      await _crashlytics.setUserIdentifier(sanitizedId);
      Logger.debug('User ID set: $sanitizedId', tag: 'Crashlytics');
    } catch (e) {
      Logger.debug('Failed to set user ID: $e', tag: 'Crashlytics');
    }
  }

  /// Clear user identifier (e.g., on logout)
  static Future<void> clearUserId() async {
    try {
      await _crashlytics.setUserIdentifier('');
      Logger.debug('User ID cleared', tag: 'Crashlytics');
    } catch (e) {
      Logger.debug('Failed to clear user ID: $e', tag: 'Crashlytics');
    }
  }

  /// Manually record a non-fatal error
  /// 
  /// Use this for caught exceptions that you want to track in Crashlytics.
  /// 
  /// Example:
  /// ```dart
  /// try {
  ///   await riskyOperation();
  /// } catch (e, stack) {
  ///   CrashlyticsHelper.recordError(e, stack, reason: 'Failed to load lesson');
  /// }
  /// ```
  static Future<void> recordError(
    dynamic exception,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
  }) async {
    try {
      // Sanitize exception before reporting
      final sanitizedException = _sanitizeException(exception);
      
      await _crashlytics.recordError(
        sanitizedException,
        stack,
        reason: reason,
        fatal: fatal,
      );
      
      Logger.error(
        'Error recorded to Crashlytics: ${reason ?? 'No reason provided'}',
        error: sanitizedException,
        stackTrace: stack,
        tag: 'Crashlytics',
      );
    } catch (e) {
      Logger.error('Failed to record error to Crashlytics: $e', tag: 'Crashlytics');
    }
  }

  /// Record a Flutter error details object
  /// 
  /// Use this when you have a FlutterErrorDetails object from error boundaries.
  static Future<void> recordFlutterError(FlutterErrorDetails details) async {
    try {
      // Sanitize exception before reporting
      final sanitizedException = _sanitizeException(details.exception);
      
      final sanitizedDetails = FlutterErrorDetails(
        exception: sanitizedException,
        stack: details.stack,
        library: details.library,
        context: details.context,
        informationCollector: null, // Remove potentially sensitive info
      );
      
      await _crashlytics.recordFlutterError(sanitizedDetails);
      
      Logger.error(
        'Flutter error recorded to Crashlytics',
        error: sanitizedException,
        stackTrace: details.stack,
        tag: 'Crashlytics',
      );
    } catch (e) {
      Logger.error('Failed to record Flutter error to Crashlytics: $e', tag: 'Crashlytics');
    }
  }

  /// Sanitize user ID to remove sensitive information
  /// 
  /// Ensures no email addresses or other PII are used as user identifiers
  static String _sanitizeUserId(String userId) {
    // If it looks like an email, hash it or use a generic identifier
    if (userId.contains('@')) {
      return 'user_${userId.hashCode.abs()}';
    }
    return userId;
  }

  /// Sanitize exception to remove sensitive data
  /// 
  /// Ensures no tokens, passwords, emails, or other PII are logged
  static Object _sanitizeException(Object exception) {
    final exceptionStr = exception.toString();
    
    // Remove common sensitive patterns
    var sanitized = exceptionStr
        // Remove JWT tokens (pattern: xxx.yyy.zzz)
        .replaceAll(
          RegExp(r'[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+'),
          '[TOKEN_REDACTED]',
        )
        // Remove email addresses
        .replaceAll(
          RegExp(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
          '[EMAIL_REDACTED]',
        )
        // Remove phone numbers (various formats)
        .replaceAll(
          RegExp(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
          '[PHONE_REDACTED]',
        )
        // Remove potential passwords (password=xxx, pwd=xxx, etc.)
        .replaceAll(
          RegExp(r'(password|pwd|pass|token|secret|key)\s*[:=]\s*\S+', caseSensitive: false),
          r'$1=[REDACTED]',
        )
        // Remove API keys (common patterns)
        .replaceAll(
          RegExp(r'(api[_-]?key|apikey)\s*[:=]\s*\S+', caseSensitive: false),
          r'$1=[REDACTED]',
        )
        // Remove authorization headers
        .replaceAll(
          RegExp(r'(authorization|bearer)\s*[:=]\s*\S+', caseSensitive: false),
          r'$1=[REDACTED]',
        );
    
    return sanitized;
  }

  /// Log a screen view breadcrumb
  /// 
  /// Convenience method for logging screen navigation
  static void logScreenView(String screenName) {
    logBreadcrumb('Screen view: $screenName');
  }

  /// Log an API call breadcrumb
  /// 
  /// Convenience method for logging API interactions
  static void logApiCall(String method, String endpoint) {
    logBreadcrumb('API call: $method $endpoint');
  }

  /// Log a user action breadcrumb
  /// 
  /// Convenience method for logging user interactions
  static void logUserAction(String action) {
    logBreadcrumb('User action: $action');
  }

  /// Log a data operation breadcrumb
  /// 
  /// Convenience method for logging data operations
  static void logDataOperation(String operation) {
    logBreadcrumb('Data operation: $operation');
  }
}
