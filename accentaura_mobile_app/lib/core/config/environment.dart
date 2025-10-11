/// Environment configuration for different build variants
enum Environment { development, staging, production }

class EnvironmentConfig {
  final Environment environment;
  final String apiBaseUrl;
  final String apiKey;
  final bool enableLogging;
  final bool enableAnalytics;
  final bool enableCrashlytics;

  const EnvironmentConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.apiKey,
    required this.enableLogging,
    required this.enableAnalytics,
    required this.enableCrashlytics,
  });

  /// Development environment configuration (Localhost)
  static const development = EnvironmentConfig(
    environment: Environment.development,
    apiBaseUrl: 'http://10.0.2.2:3000/v1', // Android emulator localhost
    // For iOS simulator use: 'http://localhost:3000/v1'
    // For physical device use: 'http://YOUR_IP:3000/v1' (e.g., 'http://192.168.1.100:3000/v1')
    apiKey: 'dev_api_key_placeholder',
    enableLogging: true,
    enableAnalytics: false,
    enableCrashlytics: false,
  );

  /// Staging environment configuration
  static const staging = EnvironmentConfig(
    environment: Environment.staging,
    apiBaseUrl: 'https://accentaura-api.onrender.com/v1',
    apiKey: 'staging_api_key_placeholder',
    enableLogging: true,
    enableAnalytics: true,
    enableCrashlytics: true,
  );

  /// Production environment configuration
  static const production = EnvironmentConfig(
    environment: Environment.production,
    apiBaseUrl: 'https://accentaura-api.onrender.com/v1',
    apiKey: 'prod_api_key_placeholder',
    enableLogging: false,
    enableAnalytics: true,
    enableCrashlytics: true,
  );

  /// Current environment configuration
  static EnvironmentConfig get current {
    const env = String.fromEnvironment('ENV', defaultValue: 'development');
    switch (env) {
      case 'production':
        return production;
      case 'staging':
        return staging;
      case 'development':
      default:
        return development;
    }
  }

  bool get isDevelopment => environment == Environment.development;
  bool get isStaging => environment == Environment.staging;
  bool get isProduction => environment == Environment.production;

  @override
  String toString() => 'EnvironmentConfig(${environment.name})';
}
