import 'dart:io';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/lesson.dart';
import '../models/progress_update.dart';
import 'custom_cache_manager.dart';

/// Service for managing local caching using Hive and flutter_cache_manager
/// Handles lesson data caching and offline progress update queueing
class CacheService {
  static const String _lessonsBoxName = 'lessons';
  static const String _progressQueueBoxName = 'progress_queue';

  Box<dynamic>? _lessonsBox;
  Box<dynamic>? _progressQueueBox;
  final BaseCacheManager _mediaCacheManager;
  final BaseCacheManager _audioCacheManager;
  final BaseCacheManager _imageCacheManager;

  CacheService({
    BaseCacheManager? mediaCacheManager,
    BaseCacheManager? audioCacheManager,
    BaseCacheManager? imageCacheManager,
  })  : _mediaCacheManager = mediaCacheManager ?? AccentAuraMediaCacheManager(),
        _audioCacheManager = audioCacheManager ?? AccentAuraAudioCacheManager(),
        _imageCacheManager = imageCacheManager ?? AccentAuraImageCacheManager();

  /// Initialize Hive and open required boxes
  /// Must be called before using any other methods
  Future<void> initialize() async {
    await Hive.initFlutter();

    // Register Hive adapters
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(ProgressUpdateAdapter());
    }

    // Open boxes
    _lessonsBox = await Hive.openBox(_lessonsBoxName);
    _progressQueueBox = await Hive.openBox(_progressQueueBoxName);
  }

  /// Cache lesson data in Hive
  /// Stores lesson as JSON for easy serialization
  Future<void> cacheLessonData(Lesson lesson) async {
    // Try to get box if not already set
    _lessonsBox ??= Hive.isBoxOpen(_lessonsBoxName) ? Hive.box(_lessonsBoxName) : null;
    
    if (_lessonsBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    final key = 'lesson_${lesson.level}';
    await _lessonsBox!.put(key, lesson.toJson());
  }

  /// Retrieve cached lesson data from Hive
  /// Returns null if lesson is not cached
  Future<Lesson?> getCachedLesson(int level) async {
    // Try to get box if not already set
    _lessonsBox ??= Hive.isBoxOpen(_lessonsBoxName) ? Hive.box(_lessonsBoxName) : null;
    
    if (_lessonsBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    final key = 'lesson_$level';
    final cachedData = _lessonsBox!.get(key);

    if (cachedData == null) {
      return null;
    }

    try {
      return Lesson.fromJson(Map<String, dynamic>.from(cachedData as Map));
    } catch (e) {
      // If deserialization fails, remove corrupted data
      await _lessonsBox!.delete(key);
      return null;
    }
  }

  /// Queue a progress update for later synchronization
  /// Used when offline to ensure progress is not lost
  Future<void> queueProgressUpdate(ProgressUpdate update) async {
    // Try to get box if not already set
    _progressQueueBox ??= Hive.isBoxOpen(_progressQueueBoxName) ? Hive.box(_progressQueueBoxName) : null;
    
    if (_progressQueueBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    await _progressQueueBox!.put(update.id, update);
  }

  /// Get all pending progress updates from the queue
  /// Returns list of updates waiting to be synced
  Future<List<ProgressUpdate>> getPendingUpdates() async {
    // Try to get box if not already set
    _progressQueueBox ??= Hive.isBoxOpen(_progressQueueBoxName) ? Hive.box(_progressQueueBoxName) : null;
    
    if (_progressQueueBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    final updates = <ProgressUpdate>[];
    for (var value in _progressQueueBox!.values) {
      if (value is ProgressUpdate) {
        updates.add(value);
      }
    }

    // Sort by timestamp to sync in chronological order
    updates.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return updates;
  }

  /// Clear a specific progress update from the queue
  /// Called after successful synchronization
  Future<void> clearPendingUpdate(String id) async {
    // Try to get box if not already set
    _progressQueueBox ??= Hive.isBoxOpen(_progressQueueBoxName) ? Hive.box(_progressQueueBoxName) : null;
    
    if (_progressQueueBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    await _progressQueueBox!.delete(id);
  }

  /// Cache a media file using flutter_cache_manager
  /// Returns the cached file
  /// Uses general media cache manager
  Future<File> cacheMediaFile(String url) async {
    return await _mediaCacheManager.getSingleFile(url);
  }

  /// Get cached media file if available
  /// Returns null if not cached
  /// Uses general media cache manager
  Future<File?> getCachedMedia(String url) async {
    final fileInfo = await _mediaCacheManager.getFileFromCache(url);
    return fileInfo?.file;
  }

  /// Cache an audio file using the audio-specific cache manager
  /// Returns the cached file
  Future<File> cacheAudioFile(String url) async {
    return await _audioCacheManager.getSingleFile(url);
  }

  /// Get cached audio file if available
  /// Returns null if not cached
  Future<File?> getCachedAudio(String url) async {
    final fileInfo = await _audioCacheManager.getFileFromCache(url);
    return fileInfo?.file;
  }

  /// Cache an image file using the image-specific cache manager
  /// Returns the cached file
  Future<File> cacheImageFile(String url) async {
    return await _imageCacheManager.getSingleFile(url);
  }

  /// Get cached image file if available
  /// Returns null if not cached
  Future<File?> getCachedImage(String url) async {
    final fileInfo = await _imageCacheManager.getFileFromCache(url);
    return fileInfo?.file;
  }

  /// Preload media files for a lesson (images and audio)
  /// Downloads and caches all media URLs in the background
  Future<void> preloadLessonMedia(Lesson lesson) async {
    final futures = <Future>[];

    // Cache all activity media
    for (final activity in lesson.activities) {
      // Extract media URLs from activities based on type
      // This is a simplified version - actual implementation would need
      // to handle different activity types and their specific media fields
      
      // For now, we'll just demonstrate the pattern
      // In a real implementation, you'd check activity type and extract URLs
      futures.add(_cacheMediaFile(activity.id)); // Placeholder
    }

    await Future.wait(futures, eagerError: false);
  }

  /// Helper method to cache a media file with error handling
  Future<void> _cacheMediaFile(String url) async {
    try {
      await cacheMediaFile(url);
    } catch (e) {
      // Silently fail - preloading is best-effort
      // In production, you might want to log this
    }
  }

  /// Clear all media caches (images, audio, and general media)
  Future<void> clearMediaCache() async {
    await Future.wait([
      _mediaCacheManager.emptyCache(),
      _audioCacheManager.emptyCache(),
      _imageCacheManager.emptyCache(),
    ]);
  }

  /// Get total size of cached media files
  /// Returns size in bytes
  Future<int> getCacheSize() async {
    // Note: flutter_cache_manager doesn't provide a direct way to get cache size
    // This would need to be implemented by iterating through cached files
    // For now, returning 0 as a placeholder
    return 0;
  }

  /// Clear all cached lessons
  Future<void> clearLessonCache() async {
    // Try to get box if not already set
    _lessonsBox ??= Hive.isBoxOpen(_lessonsBoxName) ? Hive.box(_lessonsBoxName) : null;
    
    if (_lessonsBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    await _lessonsBox!.clear();
  }

  /// Clear all pending progress updates
  /// Use with caution - this will lose unsynced progress
  Future<void> clearProgressQueue() async {
    // Try to get box if not already set
    _progressQueueBox ??= Hive.isBoxOpen(_progressQueueBoxName) ? Hive.box(_progressQueueBoxName) : null;
    
    if (_progressQueueBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    await _progressQueueBox!.clear();
  }

  /// Get the number of pending updates in the queue
  Future<int> getPendingUpdateCount() async {
    // Try to get box if not already set
    _progressQueueBox ??= Hive.isBoxOpen(_progressQueueBoxName) ? Hive.box(_progressQueueBoxName) : null;
    
    if (_progressQueueBox == null) {
      throw StateError('CacheService not initialized. Call initialize() first.');
    }

    return _progressQueueBox!.length;
  }

  /// Close all Hive boxes
  /// Should be called when the service is no longer needed
  Future<void> dispose() async {
    await _lessonsBox?.close();
    await _progressQueueBox?.close();
  }
}
