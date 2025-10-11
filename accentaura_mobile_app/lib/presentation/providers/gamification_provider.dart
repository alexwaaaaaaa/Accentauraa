import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/leaderboard.dart';
import '../../data/repositories/progress_repository.dart';
import '../../core/utils/logger.dart';
import 'auth_provider.dart';
import 'user_progress_provider.dart';

/// Service for managing user streaks
/// 
/// Provides methods to update and reset streaks based on user activity
class StreakService {
  final ProgressRepository _progressRepository;

  StreakService(this._progressRepository);

  /// Update streak for a user
  /// 
  /// Automatically handles streak increment or reset based on last activity date
  /// 
  /// Parameters:
  /// - [userId]: The user ID to update streak for
  Future<void> updateStreak(String userId) async {
    try {
      Logger.info('Updating streak for user $userId', tag: 'StreakService');
      await _progressRepository.updateStreak(userId);
      Logger.info('Streak updated successfully', tag: 'StreakService');
    } catch (e) {
      Logger.error('Failed to update streak', error: e, tag: 'StreakService');
      rethrow;
    }
  }

  /// Reset streak for a user
  /// 
  /// Sets the streak counter to zero
  /// 
  /// Parameters:
  /// - [userId]: The user ID to reset streak for
  Future<void> resetStreak(String userId) async {
    try {
      Logger.info('Resetting streak for user $userId', tag: 'StreakService');
      await _progressRepository.resetStreak(userId);
      Logger.info('Streak reset successfully', tag: 'StreakService');
    } catch (e) {
      Logger.error('Failed to reset streak', error: e, tag: 'StreakService');
      rethrow;
    }
  }

  /// Check if streak should be updated based on current date
  /// 
  /// This is a helper method that can be called before updating streak
  /// to determine if an update is necessary
  /// 
  /// Parameters:
  /// - [userId]: The user ID to check
  /// 
  /// Returns: true if streak should be updated, false otherwise
  Future<bool> shouldUpdateStreak(String userId) async {
    try {
      final progress = await _progressRepository.getUserProgress(userId);
      final now = DateTime.now();
      
      // Should update if it's a new day and streak should be incremented
      return progress.shouldIncrementStreak(now);
    } catch (e) {
      Logger.error(
        'Failed to check if streak should be updated',
        error: e,
        tag: 'StreakService',
      );
      return false;
    }
  }
}

/// Provider for streak service
/// 
/// Provides access to streak management functionality
/// 
/// Example usage:
/// ```dart
/// final streakService = ref.read(streakProvider);
/// await streakService.updateStreak(userId);
/// ```
final streakProvider = Provider<StreakService>((ref) {
  return StreakService(ref.watch(progressRepositoryProvider));
});

/// Provider for leaderboard data
/// 
/// Fetches the top 100 users ranked by total XP
/// This is a FutureProvider that automatically handles loading and error states
/// 
/// Example usage:
/// ```dart
/// final leaderboardAsync = ref.watch(leaderboardProvider);
/// leaderboardAsync.when(
///   data: (leaderboard) => LeaderboardWidget(data: leaderboard),
///   loading: () => CircularProgressIndicator(),
///   error: (error, stack) => ErrorWidget(error),
/// );
/// ```
final leaderboardProvider = FutureProvider<LeaderboardData>((ref) async {
  try {
    Logger.info('Fetching leaderboard data', tag: 'LeaderboardProvider');
    
    final apiService = ref.watch(apiServiceProvider);
    final leaderboard = await apiService.getLeaderboard(limit: 100);
    
    Logger.info(
      'Leaderboard fetched: ${leaderboard.entries.length} entries',
      tag: 'LeaderboardProvider',
    );
    
    return leaderboard;
  } catch (e) {
    Logger.error(
      'Failed to fetch leaderboard',
      error: e,
      tag: 'LeaderboardProvider',
    );
    rethrow;
  }
});

/// Provider for user rank in the leaderboard
/// 
/// Fetches the current user's rank, total users, and percentile
/// This is a FutureProvider that depends on the authenticated user
/// 
/// Example usage:
/// ```dart
/// final userRankAsync = ref.watch(userRankProvider);
/// userRankAsync.when(
///   data: (rank) => Text('Your rank: ${rank.rank}'),
///   loading: () => CircularProgressIndicator(),
///   error: (error, stack) => Text('Failed to load rank'),
/// );
/// ```
final userRankProvider = FutureProvider<UserRank>((ref) async {
  try {
    // Get the current user ID from auth state
    final authState = ref.watch(authProvider);
    final userId = authState.user?.id;
    
    if (userId == null) {
      Logger.warning(
        'Cannot fetch user rank: user not authenticated',
        tag: 'UserRankProvider',
      );
      throw Exception('User not authenticated');
    }
    
    Logger.info('Fetching rank for user $userId', tag: 'UserRankProvider');
    
    final apiService = ref.watch(apiServiceProvider);
    final userRank = await apiService.getUserRank(userId);
    
    Logger.info(
      'User rank fetched: ${userRank.rank}/${userRank.totalUsers} (${userRank.percentile}th percentile)',
      tag: 'UserRankProvider',
    );
    
    return userRank;
  } catch (e) {
    Logger.error(
      'Failed to fetch user rank',
      error: e,
      tag: 'UserRankProvider',
    );
    rethrow;
  }
});

/// Provider for refreshing leaderboard data
/// 
/// This is a helper provider that can be used to manually refresh the leaderboard
/// Call ref.refresh(leaderboardRefreshProvider) to trigger a refresh
final leaderboardRefreshProvider = Provider<void>((ref) {
  // This provider doesn't hold state, it's just used to trigger refreshes
  ref.invalidate(leaderboardProvider);
});

/// Provider for refreshing user rank data
/// 
/// This is a helper provider that can be used to manually refresh the user rank
/// Call ref.refresh(userRankRefreshProvider) to trigger a refresh
final userRankRefreshProvider = Provider<void>((ref) {
  // This provider doesn't hold state, it's just used to trigger refreshes
  ref.invalidate(userRankProvider);
});
