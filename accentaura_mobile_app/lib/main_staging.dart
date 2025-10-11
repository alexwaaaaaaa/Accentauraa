import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'core/config/environment.dart';
import 'core/utils/logger.dart';
import 'main.dart' as app;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Configure for staging
  const config = EnvironmentConfig.staging;
  
  // Enable logging in staging
  Logger.init(enableLogging: config.enableLogging);
  Logger.info('Starting AccentAura in STAGING mode');
  Logger.info('API Base URL: ${config.apiBaseUrl}');

  // Enable Crashlytics in staging
  await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
  
  // Pass all uncaught errors to Crashlytics
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;

  // Run the app
  app.main();
}
