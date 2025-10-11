import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_progress.dart';
import '../../data/repositories/progress_repository.dart';
import '../../core/utils/logger.dart';
import 'auth_provider.dart';

/// Provider for progress repository
final progressRepositoryProvider = Provider<ProgressRepository>((ref) {
  return ProgressRepository(
    apiService: ref.watch(apiServiceProvider),
    cacheService: ref.watch(cacheServiceProvider),
  );
});

/// Provider for user progress with real-time updates
/// 
/// This StreamProvider watches the user's progress and emits updates
/// whenever progress changes (XP earned, streak updated, badges awarded, etc.)
/// 
/// Returns null if user is not authenticated
/// 
/// Example usage:
/// ```dart
/// final progressAsync = ref.watch(userProgressProvider);
/// progressAsync.when(
///   data: (progress) => Text('XP: ${progress.totalXp}'),
///   loading: () => CircularProgressIndicator(),
///   error: (error, stack) => Text('Error: $error'),
/// );
/// ```
final userProgressProvider = StreamProvider<UserProgress?>((ref) async* {
  final authState = ref.watch(authProvider);
  
  // If user is not authenticated, return null
  if (!authState.isAuthenticated || authState.user == null) {
    Logger.debug('User not authenticated, returning null progress', tag: 'UserProgressProvider');
    yield null;
    return;
  }

  final userId = authState.user!.id;
  final repository = ref.watch(progressRepositoryProvider);

  try {
    Logger.debug('Starting progress stream for user $userId', tag: 'UserProgressProvider');
    
    // Watch progress stream from repository
    await for (final progress in repository.watchProgress(userId)) {
      Logger.debug('Progress update received for user $userId', tag: 'UserProgressProvider');
      yield progress;
    }
  } catch (e) {
    Logger.error('Error in progress stream', error: e, tag: 'UserProgressProvider');
    rethrow;
  }
});

/// Provider for current user's total XP
/// 
/// Derived from userProgressProvider for convenience
final currentXpProvider = Provider<int>((ref) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) => progress?.totalXp ?? 0,
    loading: () => 0,
    error: (_, __) => 0,
  );
});

/// Provider for current user's level
/// 
/// Derived from userProgressProvider for convenience
final currentLevelProvider = Provider<int>((ref) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) => progress?.currentLevel ?? 1,
    loading: () => 1,
    error: (_, __) => 1,
  );
});

/// Provider for current user's streak
/// 
/// Derived from userProgressProvider for convenience
final currentStreakProvider = Provider<int>((ref) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) => progress?.streak ?? 0,
    loading: () => 0,
    error: (_, __) => 0,
  );
});

/// Provider for current user's coins
/// 
/// Derived from userProgressProvider for convenience
final currentCoinsProvider = Provider<int>((ref) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) => progress?.coins ?? 0,
    loading: () => 0,
    error: (_, __) => 0,
  );
});

/// Provider for current user's badges
/// 
/// Derived from userProgressProvider for convenience
final currentBadgesProvider = Provider<List<dynamic>>((ref) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) => progress?.badges ?? [],
    loading: () => [],
    error: (_, __) => [],
  );
});

/// Provider for checking if a specific lesson is completed
/// 
/// Parameters:
/// - [level]: The lesson level to check
/// 
/// Returns true if the lesson is completed, false otherwise
final isLessonCompletedProvider = Provider.family<bool, int>((ref, level) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) {
      if (progress == null) return false;
      final lessonProgress = progress.lessonProgress[level];
      return lessonProgress?.completed ?? false;
    },
    loading: () => false,
    error: (_, __) => false,
  );
});

/// Provider for getting XP earned from a specific lesson
/// 
/// Parameters:
/// - [level]: The lesson level to check
/// 
/// Returns XP earned from the lesson, or 0 if not completed
final lessonXpProvider = Provider.family<int, int>((ref, level) {
  final progressAsync = ref.watch(userProgressProvider);
  
  return progressAsync.when(
    data: (progress) {
      if (progress == null) return 0;
      final lessonProgress = progress.lessonProgress[level];
      return lessonProgress?.xpEarned ?? 0;
    },
    loading: () => 0,
    error: (_, __) => 0,
  );
});

/// Provider for pending sync updates count
/// 
/// Useful for showing sync status in UI
final pendingSyncCountProvider = FutureProvider<int>((ref) async {
  final repository = ref.watch(progressRepositoryProvider);
  
  try {
    return await repository.getPendingUpdateCount();
  } catch (e) {
    Logger.error('Error getting pending sync count', error: e, tag: 'PendingSyncCountProvider');
    return 0;
  }
});
