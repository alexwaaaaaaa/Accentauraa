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

  // Configure for production
  const config = EnvironmentConfig.production;
  
  // Disable verbose logging in production
  Logger.init(enableLogging: config.enableLogging);
  Logger.info('Starting AccentAura in PRODUCTION mode');

  // Enable Crashlytics in production
  await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
  
  // Pass all uncaught errors to Crashlytics
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;

  // Run the app
  app.main();
}
