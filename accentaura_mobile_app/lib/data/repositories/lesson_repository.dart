import 'dart:async';
import '../models/lesson.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../../core/utils/logger.dart';

/// Repository for managing lesson data with offline support
/// Implements cache-first strategy for optimal performance
class LessonRepository {
  final ApiService _apiService;
  final CacheService _cacheService;

  // Stream controller for real-time lesson updates
  final _lessonsController = StreamController<List<Lesson>>.broadcast();

  // In-memory cache for quick access
  final Map<int, Lesson> _memoryCache = {};

  LessonRepository({
    required ApiService apiService,
    required CacheService cacheService,
  })  : _apiService = apiService,
        _cacheService = cacheService;

  /// Get a range of lessons with cache-first strategy
  /// 
  /// Strategy:
  /// 1. Check memory cache first
  /// 2. If not in memory, check Hive cache
  /// 3. If not cached or forceRefresh is true, fetch from API
  /// 4. Cache the result and update stream
  /// 
  /// Parameters:
  /// - [from]: Starting level number (inclusive)
  /// - [to]: Ending level number (inclusive)
  /// - [forceRefresh]: If true, bypass cache and fetch from API
  /// 
  /// Returns: List of lessons in the specified range
  Future<List<Lesson>> getLessons(
    int from,
    int to, {
    bool forceRefresh = false,
  }) async {
    try {
      Logger.debug(
        'Getting lessons $from-$to (forceRefresh: $forceRefresh)',
        tag: 'LessonRepository',
      );

      // If not forcing refresh, try to get from cache
      if (!forceRefresh) {
        final cachedLessons = await _getCachedLessons(from, to);
        if (cachedLessons.isNotEmpty && cachedLessons.length == (to - from + 1)) {
          Logger.debug(
            'Returning ${cachedLessons.length} lessons from cache',
            tag: 'LessonRepository',
          );
          _lessonsController.add(cachedLessons);
          return cachedLessons;
        }
      }

      // Fetch from API
      Logger.debug('Fetching lessons from API', tag: 'LessonRepository');
      final lessons = await _apiService.getLevels(from, to);

      // Cache each lesson
      await _cacheLessons(lessons);

      // Update stream
      _lessonsController.add(lessons);

      Logger.debug(
        'Successfully fetched and cached ${lessons.length} lessons',
        tag: 'LessonRepository',
      );

      return lessons;
    } catch (e) {
      Logger.error(
        'Error getting lessons $from-$to',
        error: e,
        tag: 'LessonRepository',
      );

      // If API fails, try to return cached data as fallback
      if (!forceRefresh) {
        final cachedLessons = await _getCachedLessons(from, to);
        if (cachedLessons.isNotEmpty) {
          Logger.info(
            'Returning ${cachedLessons.length} cached lessons after API error',
            tag: 'LessonRepository',
          );
          return cachedLessons;
        }
      }

      rethrow;
    }
  }

  /// Get a specific lesson by level
  /// 
  /// Strategy:
  /// 1. Check memory cache first
  /// 2. If not in memory, check Hive cache
  /// 3. If not cached or forceRefresh is true, fetch from API
  /// 4. Cache the result
  /// 
  /// Parameters:
  /// - [level]: The lesson level to retrieve
  /// - [forceRefresh]: If true, bypass cache and fetch from API
  /// 
  /// Returns: The requested lesson
  Future<Lesson> getLesson(int level, {bool forceRefresh = false}) async {
    try {
      Logger.debug(
        'Getting lesson $level (forceRefresh: $forceRefresh)',
        tag: 'LessonRepository',
      );

      // If not forcing refresh, try memory cache first
      if (!forceRefresh && _memoryCache.containsKey(level)) {
        Logger.debug('Returning lesson from memory cache', tag: 'LessonRepository');
        return _memoryCache[level]!;
      }

      // Try Hive cache
      if (!forceRefresh) {
        final cachedLesson = await _cacheService.getCachedLesson(level);
        if (cachedLesson != null) {
          Logger.debug('Returning lesson from Hive cache', tag: 'LessonRepository');
          _memoryCache[level] = cachedLesson;
          return cachedLesson;
        }
      }

      // Fetch from API
      Logger.debug('Fetching lesson from API', tag: 'LessonRepository');
      final lesson = await _apiService.getLevel(level);

      // Cache the lesson
      await _cacheLesson(lesson);

      Logger.debug('Successfully fetched and cached lesson', tag: 'LessonRepository');

      return lesson;
    } catch (e) {
      Logger.error(
        'Error getting lesson $level',
        error: e,
        tag: 'LessonRepository',
      );

      // If API fails, try to return cached data as fallback
      if (!forceRefresh) {
        final cachedLesson = await _cacheService.getCachedLesson(level);
        if (cachedLesson != null) {
          Logger.info(
            'Returning cached lesson after API error',
            tag: 'LessonRepository',
          );
          _memoryCache[level] = cachedLesson;
          return cachedLesson;
        }
      }

      rethrow;
    }
  }

  /// Watch lessons for real-time updates
  /// 
  /// Returns a stream that emits lesson lists whenever they are updated
  /// This is useful for UI components that need to react to lesson changes
  /// 
  /// Example:
  /// ```dart
  /// repository.watchLessons().listen((lessons) {
  ///   // Update UI with new lessons
  /// });
  /// ```
  Stream<List<Lesson>> watchLessons() {
    return _lessonsController.stream;
  }

  /// Helper method to get cached lessons for a range
  Future<List<Lesson>> _getCachedLessons(int from, int to) async {
    final lessons = <Lesson>[];

    for (int level = from; level <= to; level++) {
      // Check memory cache first
      if (_memoryCache.containsKey(level)) {
        lessons.add(_memoryCache[level]!);
        continue;
      }

      // Check Hive cache
      final cachedLesson = await _cacheService.getCachedLesson(level);
      if (cachedLesson != null) {
        _memoryCache[level] = cachedLesson;
        lessons.add(cachedLesson);
      } else {
        // If any lesson is missing, return empty list to trigger API fetch
        return [];
      }
    }

    return lessons;
  }

  /// Helper method to cache a single lesson
  Future<void> _cacheLesson(Lesson lesson) async {
    // Update memory cache
    _memoryCache[lesson.level] = lesson;

    // Update Hive cache
    await _cacheService.cacheLessonData(lesson);
  }

  /// Helper method to cache multiple lessons
  Future<void> _cacheLessons(List<Lesson> lessons) async {
    for (final lesson in lessons) {
      await _cacheLesson(lesson);
    }
  }

  /// Preload lessons for offline use
  /// 
  /// This method fetches and caches lessons in the background
  /// Useful for preparing content when the user has a good connection
  /// 
  /// Parameters:
  /// - [from]: Starting level number
  /// - [to]: Ending level number
  Future<void> preloadLessons(int from, int to) async {
    try {
      Logger.info(
        'Preloading lessons $from-$to',
        tag: 'LessonRepository',
      );

      final lessons = await _apiService.getLevels(from, to);
      await _cacheLessons(lessons);

      // Preload media for each lesson
      for (final lesson in lessons) {
        await _cacheService.preloadLessonMedia(lesson);
      }

      Logger.info(
        'Successfully preloaded ${lessons.length} lessons',
        tag: 'LessonRepository',
      );
    } catch (e) {
      Logger.error(
        'Error preloading lessons',
        error: e,
        tag: 'LessonRepository',
      );
      // Don't rethrow - preloading is best-effort
    }
  }

  /// Update a lesson's completion status locally
  /// 
  /// This updates the cached lesson without making an API call
  /// Useful for immediate UI updates while progress sync happens in background
  /// 
  /// Parameters:
  /// - [level]: The lesson level to update
  /// - [isCompleted]: New completion status
  Future<void> updateLessonCompletion(int level, bool isCompleted) async {
    try {
      // Get the current lesson
      final lesson = await getLesson(level);

      // Create updated lesson
      final updatedLesson = lesson.copyWith(isCompleted: isCompleted);

      // Cache the updated lesson
      await _cacheLesson(updatedLesson);

      Logger.debug(
        'Updated lesson $level completion status to $isCompleted',
        tag: 'LessonRepository',
      );
    } catch (e) {
      Logger.error(
        'Error updating lesson completion',
        error: e,
        tag: 'LessonRepository',
      );
    }
  }

  /// Update a lesson's lock status locally
  /// 
  /// This updates the cached lesson without making an API call
  /// Useful for unlocking the next lesson immediately after completion
  /// 
  /// Parameters:
  /// - [level]: The lesson level to update
  /// - [isLocked]: New lock status
  Future<void> updateLessonLockStatus(int level, bool isLocked) async {
    try {
      // Get the current lesson
      final lesson = await getLesson(level);

      // Create updated lesson
      final updatedLesson = lesson.copyWith(isLocked: isLocked);

      // Cache the updated lesson
      await _cacheLesson(updatedLesson);

      Logger.debug(
        'Updated lesson $level lock status to $isLocked',
        tag: 'LessonRepository',
      );
    } catch (e) {
      Logger.error(
        'Error updating lesson lock status',
        error: e,
        tag: 'LessonRepository',
      );
    }
  }

  /// Clear all cached lessons
  /// 
  /// This removes all lessons from both memory and Hive cache
  /// Useful for forcing a complete refresh or clearing storage
  Future<void> clearCache() async {
    try {
      _memoryCache.clear();
      await _cacheService.clearLessonCache();
      Logger.info('Cleared lesson cache', tag: 'LessonRepository');
    } catch (e) {
      Logger.error(
        'Error clearing lesson cache',
        error: e,
        tag: 'LessonRepository',
      );
    }
  }

  /// Dispose resources
  /// 
  /// Closes the stream controller and clears memory cache
  /// Should be called when the repository is no longer needed
  void dispose() {
    _lessonsController.close();
    _memoryCache.clear();
  }
}
