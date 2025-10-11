import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Custom cache manager for AccentAura media files (images and audio)
/// Configured with specific size limits and expiration policies
class AccentAuraMediaCacheManager extends CacheManager {
  static const key = 'accentAuraMediaCache';
  
  static AccentAuraMediaCacheManager? _instance;
  
  factory AccentAuraMediaCacheManager() {
    _instance ??= AccentAuraMediaCacheManager._();
    return _instance!;
  }
  
  AccentAuraMediaCacheManager._() : super(
    Config(
      key,
      stalePeriod: const Duration(days: 30), // Cache expires after 30 days
      maxNrOfCacheObjects: 500, // Maximum 500 cached files
      repo: JsonCacheInfoRepository(databaseName: key),
      fileService: HttpFileService(),
    ),
  );
}

/// Custom cache manager specifically for audio files
/// Configured with larger size limits for audio content
class AccentAuraAudioCacheManager extends CacheManager {
  static const key = 'accentAuraAudioCache';
  
  static AccentAuraAudioCacheManager? _instance;
  
  factory AccentAuraAudioCacheManager() {
    _instance ??= AccentAuraAudioCacheManager._();
    return _instance!;
  }
  
  AccentAuraAudioCacheManager._() : super(
    Config(
      key,
      stalePeriod: const Duration(days: 60), // Audio cached longer (60 days)
      maxNrOfCacheObjects: 300, // Maximum 300 audio files
      repo: JsonCacheInfoRepository(databaseName: key),
      fileService: HttpFileService(),
    ),
  );
}

/// Custom cache manager specifically for images
/// Configured with appropriate limits for image content
class AccentAuraImageCacheManager extends CacheManager {
  static const key = 'accentAuraImageCache';
  
  static AccentAuraImageCacheManager? _instance;
  
  factory AccentAuraImageCacheManager() {
    _instance ??= AccentAuraImageCacheManager._();
    return _instance!;
  }
  
  AccentAuraImageCacheManager._() : super(
    Config(
      key,
      stalePeriod: const Duration(days: 30), // Images cached for 30 days
      maxNrOfCacheObjects: 200, // Maximum 200 images
      repo: JsonCacheInfoRepository(databaseName: key),
      fileService: HttpFileService(),
    ),
  );
}
