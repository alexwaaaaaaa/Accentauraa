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

  // Configure for development
  const config = EnvironmentConfig.development;
  
  // Enable verbose logging in development
  Logger.init(enableLogging: config.enableLogging);
  Logger.info('Starting AccentAura in DEVELOPMENT mode');
  Logger.info('API Base URL: ${config.apiBaseUrl}');

  // Don't enable Crashlytics in development
  await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(false);

  // Run the app
  app.main();
}
