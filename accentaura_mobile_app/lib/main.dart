import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/logger.dart';
import 'presentation/navigation/app_router.dart';

/// Main entry point for the AccentAura mobile application
/// 
/// Initializes:
/// - Firebase (Core, Analytics, Crashlytics)
/// - Hive for local storage
/// - Error handling and crash reporting
/// - Breadcrumb logging for debugging
/// 
/// Implements Requirement 9.6 (Analytics and Crash Reporting)
void main() async {
  // Ensure Flutter bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // Initialize Firebase
    await Firebase.initializeApp();
    Logger.info('Firebase initialized successfully', tag: 'main');

    // Initialize Firebase Analytics
    final analytics = FirebaseAnalytics.instance;
    Logger.info('Firebase Analytics initialized', tag: 'main');

    // Initialize Firebase Crashlytics
    await _initializeCrashlytics();
    Logger.info('Firebase Crashlytics initialized', tag: 'main');

    // Log app open event
    await analytics.logAppOpen();
    Logger.info('App open event logged', tag: 'main');

    // Initialize Hive for local storage
    await Hive.initFlutter();
    Logger.info('Hive initialized successfully', tag: 'main');

    // Run the app
    runApp(
      const ProviderScope(
        child: AccentAuraApp(),
      ),
    );
  } catch (e, stackTrace) {
    Logger.error('Failed to initialize app', error: e, stackTrace: stackTrace, tag: 'main');
    
    // Report to Crashlytics if available
    try {
      await FirebaseCrashlytics.instance.recordError(
        e,
        stackTrace,
        reason: 'App initialization failed',
        fatal: true,
      );
    } catch (_) {
      // Crashlytics not available, ignore
    }
    
    // Run app with error screen if initialization fails
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Failed to initialize app',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  _sanitizeErrorMessage(e.toString()),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Initialize Firebase Crashlytics with proper error handlers
/// 
/// Sets up:
/// - Flutter error handler for synchronous errors
/// - Platform dispatcher error handler for asynchronous errors
/// - Breadcrumb logging for debugging context
Future<void> _initializeCrashlytics() async {
  final crashlytics = FirebaseCrashlytics.instance;

  // Enable Crashlytics collection (can be disabled for debug builds)
  await crashlytics.setCrashlyticsCollectionEnabled(!kDebugMode);

  // Pass all uncaught Flutter errors to Crashlytics
  FlutterError.onError = (FlutterErrorDetails details) {
    // Log breadcrumb for context
    _logBreadcrumb('Flutter Error: ${details.exception}');
    
    // Filter sensitive data before reporting
    final sanitizedDetails = FlutterErrorDetails(
      exception: _sanitizeException(details.exception),
      stack: details.stack,
      library: details.library,
      context: details.context,
      informationCollector: null, // Remove potentially sensitive info
    );
    
    // Record to Crashlytics
    crashlytics.recordFlutterFatalError(sanitizedDetails);
    
    // Also log locally for debugging
    Logger.error(
      'Flutter error caught',
      error: sanitizedDetails.exception,
      stackTrace: sanitizedDetails.stack,
      tag: 'Crashlytics',
    );
  };

  // Catch asynchronous errors that aren't caught by Flutter framework
  PlatformDispatcher.instance.onError = (error, stack) {
    // Log breadcrumb for context
    _logBreadcrumb('Async Error: $error');
    
    // Filter sensitive data before reporting
    final sanitizedException = _sanitizeException(error);
    
    // Record to Crashlytics
    crashlytics.recordError(
      sanitizedException,
      stack,
      reason: 'Uncaught async error',
      fatal: false,
    );
    
    // Also log locally for debugging
    Logger.error(
      'Async error caught',
      error: sanitizedException,
      stackTrace: stack,
      tag: 'Crashlytics',
    );
    
    return true; // Handled
  };

  // Set custom keys for debugging context
  await crashlytics.setCustomKey('app_version', '1.0.0');
  await crashlytics.setCustomKey('build_mode', kDebugMode ? 'debug' : 'release');
  
  Logger.info('Crashlytics error handlers configured', tag: 'Crashlytics');
}

/// Log a breadcrumb for debugging context
/// 
/// Breadcrumbs help understand the sequence of events leading to a crash
/// They are automatically included in crash reports
void _logBreadcrumb(String message) {
  try {
    FirebaseCrashlytics.instance.log(message);
    Logger.debug('Breadcrumb: $message', tag: 'Crashlytics');
  } catch (e) {
    // Ignore breadcrumb logging errors
    Logger.debug('Failed to log breadcrumb: $e', tag: 'Crashlytics');
  }
}

/// Sanitize exception to remove sensitive data
/// 
/// Ensures no tokens, passwords, emails, or other PII are logged
Object _sanitizeException(Object exception) {
  final exceptionStr = exception.toString();
  
  // Remove common sensitive patterns
  var sanitized = exceptionStr
      // Remove JWT tokens (pattern: xxx.yyy.zzz)
      .replaceAll(RegExp(r'[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+'), '[TOKEN_REDACTED]')
      // Remove email addresses
      .replaceAll(RegExp(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL_REDACTED]')
      // Remove phone numbers (various formats)
      .replaceAll(RegExp(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), '[PHONE_REDACTED]')
      // Remove potential passwords (password=xxx, pwd=xxx, etc.)
      .replaceAll(RegExp(r'(password|pwd|pass|token|secret|key)\s*[:=]\s*\S+', caseSensitive: false), r'$1=[REDACTED]')
      // Remove API keys (common patterns)
      .replaceAll(RegExp(r'(api[_-]?key|apikey)\s*[:=]\s*\S+', caseSensitive: false), r'$1=[REDACTED]');
  
  return sanitized;
}

/// Sanitize error message for display to user
/// 
/// Removes technical details and sensitive information
String _sanitizeErrorMessage(String message) {
  // Remove stack traces
  final lines = message.split('\n');
  final firstLine = lines.isNotEmpty ? lines.first : message;
  
  // Apply same sanitization as exceptions
  return _sanitizeException(firstLine).toString();
}

/// Root widget for the AccentAura application
/// 
/// Uses Riverpod for state management and go_router for navigation
class AccentAuraApp extends ConsumerWidget {
  const AccentAuraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'AccentAura',
      debugShowCheckedModeBanner: false,
      
      // Theme configuration
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      
      // Router configuration
      routerConfig: router,
    );
  }
}
