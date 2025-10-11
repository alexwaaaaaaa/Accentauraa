import 'dart:async';
import '../models/user_progress.dart';
import '../models/badge.dart';
import '../models/lesson_progress.dart';
import '../models/progress_update.dart' as models;
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../../core/utils/logger.dart';

/// Repository for managing user progress with gamification logic
/// Handles XP, streaks, badges, and offline progress synchronization
class ProgressRepository {
  final ApiService _apiService;
  final CacheService _cacheService;

  // Stream controller for real-time progress updates
  final _progressController = StreamController<UserProgress>.broadcast();

  // In-memory cache for quick access
  UserProgress? _cachedProgress;

  ProgressRepository({
    required ApiService apiService,
    required CacheService cacheService,
  })  : _apiService = apiService,
        _cacheService = cacheService;

  /// Get user progress with real-time streaming
  /// 
  /// Strategy:
  /// 1. Return cached progress immediately if available
  /// 2. Fetch from API in background
  /// 3. Update cache and stream with fresh data
  /// 
  /// Parameters:
  /// - [userId]: The user ID to fetch progress for
  /// - [forceRefresh]: If true, bypass cache and fetch from API
  /// 
  /// Returns: UserProgress object
  Future<UserProgress> getUserProgress(
    String userId, {
    bool forceRefresh = false,
  }) async {
    try {
      Logger.debug(
        'Getting user progress for $userId (forceRefresh: $forceRefresh)',
        tag: 'ProgressRepository',
      );

      // If not forcing refresh and we have cached data, return it
      if (!forceRefresh && _cachedProgress != null) {
        Logger.debug(
          'Returning cached progress',
          tag: 'ProgressRepository',
        );
        return _cachedProgress!;
      }

      // Fetch from API
      Logger.debug('Fetching progress from API', tag: 'ProgressRepository');
      final progress = await _apiService.getUserProgress(userId);

      // Update cache
      _cachedProgress = progress;

      // Emit to stream
      _progressController.add(progress);

      Logger.debug(
        'Successfully fetched user progress',
        tag: 'ProgressRepository',
      );

      return progress;
    } catch (e) {
      Logger.error(
        'Error getting user progress',
        error: e,
        tag: 'ProgressRepository',
      );

      // If API fails and we have cached data, return it
      if (_cachedProgress != null) {
        Logger.info(
          'Returning cached progress after API error',
          tag: 'ProgressRepository',
        );
        return _cachedProgress!;
      }

      rethrow;
    }
  }

  /// Watch user progress for real-time updates
  /// 
  /// Returns a stream that emits UserProgress whenever it is updated
  /// This is useful for UI components that need to react to progress changes
  /// 
  /// Parameters:
  /// - [userId]: The user ID to watch progress for
  /// 
  /// Example:
  /// ```dart
  /// repository.watchProgress(userId).listen((progress) {
  ///   // Update UI with new progress
  /// });
  /// ```
  Stream<UserProgress> watchProgress(String userId) async* {
    // Emit cached progress immediately if available
    if (_cachedProgress != null && _cachedProgress!.userId == userId) {
      yield _cachedProgress!;
    }

    // Fetch fresh data in background
    try {
      final progress = await getUserProgress(userId);
      yield progress;
    } catch (e) {
      Logger.error(
        'Error fetching initial progress for stream',
        error: e,
        tag: 'ProgressRepository',
      );
    }

    // Yield all future updates
    yield* _progressController.stream.where((p) => p.userId == userId);
  }

  /// Update progress with offline queueing
  /// 
  /// If online, sends update to API immediately
  /// If offline, queues update for later synchronization
  /// 
  /// Parameters:
  /// - [update]: The progress update to save
  Future<void> updateProgress(models.ProgressUpdate update) async {
    try {
      Logger.debug(
        'Updating progress for user ${update.userId}',
        tag: 'ProgressRepository',
      );

      // Try to send to API
      try {
        // Convert to API format
        final apiUpdate = ProgressUpdate(
          id: update.id,
          userId: update.userId,
          lessonLevel: update.level,
          xpEarned: update.xpEarned,
          lessonCompleted: update.lessonCompleted,
          activityResults: update.activityResults,
          timestamp: update.timestamp,
        );
        await _apiService.saveProgress(apiUpdate);
        Logger.debug('Progress update sent to API', tag: 'ProgressRepository');
      } catch (e) {
        // If API call fails, queue for later sync
        Logger.warning(
          'API unavailable, queueing progress update',
          tag: 'ProgressRepository',
        );
        await _cacheService.queueProgressUpdate(update);
      }

      // Update local cache
      await _updateLocalProgress(update);

      Logger.debug('Progress update completed', tag: 'ProgressRepository');
    } catch (e) {
      Logger.error(
        'Error updating progress',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Award XP to a user
  /// 
  /// Calculates new total XP and level, updates progress
  /// Queues update for offline sync if needed
  /// 
  /// Parameters:
  /// - [userId]: The user ID to award XP to
  /// - [xp]: Amount of XP to award
  /// - [source]: Optional source of XP (e.g., 'lesson_completion', 'activity')
  Future<void> awardXp(
    String userId,
    int xp, {
    String? source,
  }) async {
    try {
      Logger.info(
        'Awarding $xp XP to user $userId (source: ${source ?? "unknown"})',
        tag: 'ProgressRepository',
      );

      // Get current progress
      final currentProgress = _cachedProgress ?? await getUserProgress(userId);

      // Calculate new XP and level
      final newTotalXp = currentProgress.totalXp + xp;
      final newLevel = _calculateLevel(newTotalXp);

      // Create updated progress
      final updatedProgress = currentProgress.copyWith(
        totalXp: newTotalXp,
        currentLevel: newLevel,
      );

      // Update cache and stream
      _cachedProgress = updatedProgress;
      _progressController.add(updatedProgress);

      // Create progress update
      final update = models.ProgressUpdate(
        id: _generateId(),
        userId: userId,
        level: 0, // Not lesson-specific
        xpEarned: xp,
        lessonCompleted: false,
        timestamp: DateTime.now(),
        activityResults: source != null ? {'source': source} : null,
      );

      // Send update (will queue if offline)
      await updateProgress(update);

      Logger.info(
        'Successfully awarded $xp XP. New total: $newTotalXp, Level: $newLevel',
        tag: 'ProgressRepository',
      );
    } catch (e) {
      Logger.error(
        'Error awarding XP',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Update user streak
  /// 
  /// Checks if streak should be incremented based on last activity date
  /// Automatically resets streak if more than 1 day has passed
  /// 
  /// Parameters:
  /// - [userId]: The user ID to update streak for
  Future<void> updateStreak(String userId) async {
    try {
      Logger.debug('Updating streak for user $userId', tag: 'ProgressRepository');

      // Get current progress
      final currentProgress = _cachedProgress ?? await getUserProgress(userId);

      final now = DateTime.now();
      int newStreak = currentProgress.streak;

      // Check if streak should be reset
      if (currentProgress.shouldResetStreak(now)) {
        Logger.info(
          'Resetting streak (was ${currentProgress.streak})',
          tag: 'ProgressRepository',
        );
        newStreak = 1; // Start new streak
      }
      // Check if streak should be incremented
      else if (currentProgress.shouldIncrementStreak(now)) {
        newStreak = currentProgress.streak + 1;
        Logger.info(
          'Incrementing streak to $newStreak',
          tag: 'ProgressRepository',
        );
      } else {
        // Same day activity - no change to streak
        Logger.debug(
          'Same day activity, streak remains ${currentProgress.streak}',
          tag: 'ProgressRepository',
        );
      }

      // Create updated progress
      final updatedProgress = currentProgress.copyWith(
        streak: newStreak,
        lastActivityDate: now,
      );

      // Update cache and stream
      _cachedProgress = updatedProgress;
      _progressController.add(updatedProgress);

      // Create progress update
      final update = models.ProgressUpdate(
        id: _generateId(),
        userId: userId,
        level: 0,
        xpEarned: 0,
        lessonCompleted: false,
        timestamp: now,
        activityResults: {'streakUpdate': newStreak},
      );

      // Send update (will queue if offline)
      await updateProgress(update);

      Logger.debug('Streak update completed', tag: 'ProgressRepository');
    } catch (e) {
      Logger.error(
        'Error updating streak',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Reset user streak to zero
  /// 
  /// Used when user misses a day or manually resets
  /// 
  /// Parameters:
  /// - [userId]: The user ID to reset streak for
  Future<void> resetStreak(String userId) async {
    try {
      Logger.info('Resetting streak for user $userId', tag: 'ProgressRepository');

      // Get current progress
      final currentProgress = _cachedProgress ?? await getUserProgress(userId);

      // Create updated progress with reset streak
      final updatedProgress = currentProgress.copyWith(
        streak: 0,
        lastActivityDate: DateTime.now(),
      );

      // Update cache and stream
      _cachedProgress = updatedProgress;
      _progressController.add(updatedProgress);

      // Create progress update
      final update = models.ProgressUpdate(
        id: _generateId(),
        userId: userId,
        level: 0,
        xpEarned: 0,
        lessonCompleted: false,
        timestamp: DateTime.now(),
        activityResults: {'streakReset': true},
      );

      // Send update (will queue if offline)
      await updateProgress(update);

      Logger.info('Streak reset completed', tag: 'ProgressRepository');
    } catch (e) {
      Logger.error(
        'Error resetting streak',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Award a badge to a user
  /// 
  /// Adds badge to user's collection if not already earned
  /// 
  /// Parameters:
  /// - [userId]: The user ID to award badge to
  /// - [badgeId]: The badge ID to award
  /// - [badgeName]: The badge name
  /// - [badgeDescription]: The badge description
  /// - [badgeIconUrl]: The badge icon URL
  Future<void> awardBadge(
    String userId,
    String badgeId, {
    required String badgeName,
    required String badgeDescription,
    required String badgeIconUrl,
  }) async {
    try {
      Logger.info(
        'Awarding badge "$badgeName" to user $userId',
        tag: 'ProgressRepository',
      );

      // Get current progress
      final currentProgress = _cachedProgress ?? await getUserProgress(userId);

      // Check if badge already earned
      final alreadyEarned = currentProgress.badges.any((b) => b.id == badgeId);
      if (alreadyEarned) {
        Logger.warning(
          'Badge $badgeId already earned by user',
          tag: 'ProgressRepository',
        );
        return;
      }

      // Create new badge
      final newBadge = Badge(
        id: badgeId,
        name: badgeName,
        description: badgeDescription,
        iconUrl: badgeIconUrl,
        earnedAt: DateTime.now(),
      );

      // Add badge to collection
      final updatedBadges = [...currentProgress.badges, newBadge];

      // Create updated progress
      final updatedProgress = currentProgress.copyWith(badges: updatedBadges);

      // Update cache and stream
      _cachedProgress = updatedProgress;
      _progressController.add(updatedProgress);

      // Create progress update
      final update = models.ProgressUpdate(
        id: _generateId(),
        userId: userId,
        level: 0,
        xpEarned: 0,
        lessonCompleted: false,
        timestamp: DateTime.now(),
        activityResults: {
          'badgeAwarded': badgeId,
          'badgeName': badgeName,
        },
      );

      // Send update (will queue if offline)
      await updateProgress(update);

      Logger.info(
        'Successfully awarded badge "$badgeName"',
        tag: 'ProgressRepository',
      );
    } catch (e) {
      Logger.error(
        'Error awarding badge',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Sync pending updates to the backend
  /// 
  /// Processes all queued progress updates and sends them to the API
  /// Removes successfully synced updates from the queue
  /// 
  /// Returns: Number of updates successfully synced
  Future<int> syncPendingUpdates() async {
    try {
      Logger.info('Starting sync of pending updates', tag: 'ProgressRepository');

      // Get all pending updates
      final pendingUpdates = await _cacheService.getPendingUpdates();

      if (pendingUpdates.isEmpty) {
        Logger.debug('No pending updates to sync', tag: 'ProgressRepository');
        return 0;
      }

      Logger.info(
        'Found ${pendingUpdates.length} pending updates',
        tag: 'ProgressRepository',
      );

      int syncedCount = 0;

      // Process each update
      for (final update in pendingUpdates) {
        try {
          // Convert to API format
          final apiUpdate = ProgressUpdate(
            id: update.id,
            userId: update.userId,
            lessonLevel: update.level,
            xpEarned: update.xpEarned,
            lessonCompleted: update.lessonCompleted,
            activityResults: update.activityResults,
            timestamp: update.timestamp,
          );
          
          // Send to API
          await _apiService.saveProgress(apiUpdate);

          // Remove from queue on success
          await _cacheService.clearPendingUpdate(update.id);

          syncedCount++;

          Logger.debug(
            'Synced update ${update.id} ($syncedCount/${pendingUpdates.length})',
            tag: 'ProgressRepository',
          );
        } catch (e) {
          Logger.error(
            'Failed to sync update ${update.id}',
            error: e,
            tag: 'ProgressRepository',
          );
          // Continue with next update instead of failing completely
        }
      }

      Logger.info(
        'Sync completed: $syncedCount/${pendingUpdates.length} updates synced',
        tag: 'ProgressRepository',
      );

      // Refresh progress after sync
      if (syncedCount > 0 && _cachedProgress != null) {
        await getUserProgress(_cachedProgress!.userId, forceRefresh: true);
      }

      return syncedCount;
    } catch (e) {
      Logger.error(
        'Error syncing pending updates',
        error: e,
        tag: 'ProgressRepository',
      );
      return 0;
    }
  }

  /// Update lesson progress
  /// 
  /// Records completion of a lesson and its activities
  /// Awards XP and updates streak automatically
  /// 
  /// Parameters:
  /// - [userId]: The user ID
  /// - [level]: The lesson level
  /// - [xpEarned]: XP earned from the lesson
  /// - [activityResults]: Map of activity results
  /// - [completed]: Whether the lesson is completed
  Future<void> updateLessonProgress(
    String userId,
    int level,
    int xpEarned,
    Map<String, ActivityResult> activityResults, {
    bool completed = true,
  }) async {
    try {
      Logger.info(
        'Updating lesson progress: level $level, XP $xpEarned, completed $completed',
        tag: 'ProgressRepository',
      );

      // Get current progress
      final currentProgress = _cachedProgress ?? await getUserProgress(userId);

      // Create lesson progress
      final lessonProgress = LessonProgress(
        level: level,
        completed: completed,
        xpEarned: xpEarned,
        activityResults: activityResults,
      );

      // Update lesson progress map
      final updatedLessonProgress = Map<int, LessonProgress>.from(
        currentProgress.lessonProgress,
      );
      updatedLessonProgress[level] = lessonProgress;

      // Calculate new total XP
      final newTotalXp = currentProgress.totalXp + xpEarned;
      final newLevel = _calculateLevel(newTotalXp);

      // Update streak if lesson completed
      final now = DateTime.now();
      int newStreak = currentProgress.streak;

      if (completed) {
        if (currentProgress.shouldResetStreak(now)) {
          newStreak = 1;
        } else if (currentProgress.shouldIncrementStreak(now)) {
          newStreak = currentProgress.streak + 1;
        }
      }

      // Create updated progress
      final updatedProgress = currentProgress.copyWith(
        totalXp: newTotalXp,
        currentLevel: newLevel,
        streak: newStreak,
        lastActivityDate: now,
        lessonProgress: updatedLessonProgress,
      );

      // Update cache and stream
      _cachedProgress = updatedProgress;
      _progressController.add(updatedProgress);

      // Create progress update
      final update = models.ProgressUpdate(
        id: _generateId(),
        userId: userId,
        level: level,
        xpEarned: xpEarned,
        lessonCompleted: completed,
        timestamp: now,
        activityResults: activityResults.map(
          (key, value) => MapEntry(key, value.toJson()),
        ),
      );

      // Send update (will queue if offline)
      await updateProgress(update);

      Logger.info(
        'Lesson progress updated successfully. New XP: $newTotalXp, Level: $newLevel, Streak: $newStreak',
        tag: 'ProgressRepository',
      );
    } catch (e) {
      Logger.error(
        'Error updating lesson progress',
        error: e,
        tag: 'ProgressRepository',
      );
      rethrow;
    }
  }

  /// Helper method to update local progress from a progress update
  Future<void> _updateLocalProgress(models.ProgressUpdate update) async {
    if (_cachedProgress == null || _cachedProgress!.userId != update.userId) {
      return;
    }

    // This is a simplified local update
    // In a real implementation, you might want to merge the update more carefully
    final updatedProgress = _cachedProgress!.copyWith(
      totalXp: _cachedProgress!.totalXp + update.xpEarned,
      lastActivityDate: update.timestamp,
    );

    _cachedProgress = updatedProgress;
    _progressController.add(updatedProgress);
  }

  /// Calculate user level based on total XP
  /// 
  /// Uses a simple formula: level = floor(totalXp / 100) + 1
  /// You can adjust this formula based on your game design
  /// 
  /// Parameters:
  /// - [totalXp]: Total XP earned by the user
  /// 
  /// Returns: Calculated level
  int _calculateLevel(int totalXp) {
    // Simple level calculation: 100 XP per level
    // Level 1: 0-99 XP
    // Level 2: 100-199 XP
    // Level 3: 200-299 XP, etc.
    return (totalXp ~/ 100) + 1;
  }

  /// Generate a unique ID for progress updates
  /// Uses timestamp and random component for uniqueness
  String _generateId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return 'progress_${timestamp}_$random';
  }

  /// Get the number of pending updates in the queue
  Future<int> getPendingUpdateCount() async {
    return await _cacheService.getPendingUpdateCount();
  }

  /// Clear cached progress
  /// 
  /// Removes progress from memory cache
  /// Useful for forcing a refresh or on logout
  void clearCache() {
    _cachedProgress = null;
    Logger.debug('Cleared progress cache', tag: 'ProgressRepository');
  }

  /// Dispose resources
  /// 
  /// Closes the stream controller and clears cache
  /// Should be called when the repository is no longer needed
  void dispose() {
    _progressController.close();
    _cachedProgress = null;
  }
}
