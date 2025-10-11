import 'dart:developer' as developer;

/// Simple logger utility for AccentAura
class Logger {
  static bool _enableLogging = true;

  /// Initialize logger with configuration
  static void init({bool enableLogging = true}) {
    _enableLogging = enableLogging;
  }

  static void debug(String message, {String? tag}) {
    if (!_enableLogging) return;
    developer.log(message, name: tag ?? 'AccentAura', level: 500);
  }

  static void info(String message, {String? tag}) {
    if (!_enableLogging) return;
    developer.log(message, name: tag ?? 'AccentAura', level: 800);
  }

  static void warning(String message, {String? tag}) {
    if (!_enableLogging) return;
    developer.log(message, name: tag ?? 'AccentAura', level: 900);
  }

  static void error(String message, {Object? error, StackTrace? stackTrace, String? tag}) {
    if (!_enableLogging) return;
    developer.log(
      message,
      name: tag ?? 'AccentAura',
      level: 1000,
      error: error,
      stackTrace: stackTrace,
    );
  }

  Logger._();
}
