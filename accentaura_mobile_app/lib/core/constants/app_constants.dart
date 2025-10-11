/// App-wide constants for AccentAura
class AppConstants {
  // API Configuration
  static const String apiBaseUrl = 'https://api.accentaura.com';
  static const Duration apiTimeout = Duration(seconds: 30);
  
  // Cache Configuration
  static const int maxCacheSize = 100 * 1024 * 1024; // 100MB
  static const Duration cacheExpiration = Duration(days: 7);
  
  // Sync Configuration
  static const Duration syncInterval = Duration(minutes: 5);
  static const int maxRetryAttempts = 3;
  
  // Gamification
  static const int xpPerLevel = 1000;
  static const int totalLevels = 100;
  
  // Pagination
  static const int lessonsPerPage = 20;
  static const int leaderboardLimit = 100;
  
  // Media
  static const int maxImageQuality = 85;
  static const int maxAudioDuration = 300; // 5 minutes
  
  AppConstants._();
}
