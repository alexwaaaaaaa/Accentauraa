import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/lesson.dart';
import '../../data/models/activity.dart';
import '../../data/repositories/lesson_repository.dart';
import '../../data/repositories/progress_repository.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/crashlytics_helper.dart';
import 'auth_provider.dart';
import 'user_progress_provider.dart';

/// Lesson range parameter for fetching lessons
class LessonRange {
  final int from;
  final int to;

  const LessonRange({
    required this.from,
    required this.to,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LessonRange &&
          runtimeType == other.runtimeType &&
          from == other.from &&
          to == other.to;

  @override
  int get hashCode => from.hashCode ^ to.hashCode;
}

/// Provider for lesson repository
final lessonRepositoryProvider = Provider<LessonRepository>((ref) {
  return LessonRepository(
    apiService: ref.watch(apiServiceProvider),
    cacheService: ref.watch(cacheServiceProvider),
  );
});

/// FutureProvider.family for fetching lessons by range
/// 
/// This provider fetches lessons for a specific range (from-to)
/// It uses cache-first strategy for optimal performance
/// 
/// Usage:
/// ```dart
/// final lessonsAsync = ref.watch(lessonsProvider(LessonRange(from: 1, to: 20)));
/// ```
final lessonsProvider = FutureProvider.family<List<Lesson>, LessonRange>(
  (ref, range) async {
    Logger.debug(
      'Fetching lessons ${range.from}-${range.to}',
      tag: 'lessonsProvider',
    );
    
    CrashlyticsHelper.logDataOperation('Fetch lessons ${range.from}-${range.to}');

    final repository = ref.watch(lessonRepositoryProvider);
    return repository.getLessons(range.from, range.to);
  },
);

/// StateProvider for the current lesson being played
/// 
/// This provider holds the currently active lesson in the lesson player
/// It's used to track which lesson the user is currently working on
/// 
/// Usage:
/// ```dart
/// // Read current lesson
/// final currentLesson = ref.watch(currentLessonProvider);
/// 
/// // Set current lesson
/// ref.read(currentLessonProvider.notifier).state = lesson;
/// ```
final currentLessonProvider = StateProvider<Lesson?>((ref) => null);

/// Activity state for tracking activity progress
class ActivityState {
  final String activityId;
  final ActivityType type;
  final bool isCompleted;
  final double? score;
  final String? userAnswer;
  final bool isCorrect;
  final String? feedback;
  final bool isLoading;
  final String? error;

  const ActivityState({
    required this.activityId,
    required this.type,
    this.isCompleted = false,
    this.score,
    this.userAnswer,
    this.isCorrect = false,
    this.feedback,
    this.isLoading = false,
    this.error,
  });

  ActivityState copyWith({
    String? activityId,
    ActivityType? type,
    bool? isCompleted,
    double? score,
    String? userAnswer,
    bool? isCorrect,
    String? feedback,
    bool? isLoading,
    String? error,
  }) {
    return ActivityState(
      activityId: activityId ?? this.activityId,
      type: type ?? this.type,
      isCompleted: isCompleted ?? this.isCompleted,
      score: score ?? this.score,
      userAnswer: userAnswer ?? this.userAnswer,
      isCorrect: isCorrect ?? this.isCorrect,
      feedback: feedback ?? this.feedback,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Activity state notifier for managing activity progress and submission
class ActivityNotifier extends StateNotifier<ActivityState> {
  final String activityId;
  final ProgressRepository _progressRepository;

  ActivityNotifier(
    this.activityId,
    ActivityType type,
    this._progressRepository,
  ) : super(ActivityState(activityId: activityId, type: type));

  /// Submit an answer for MCQ or Fill Blank activities
  /// 
  /// Parameters:
  /// - [answer]: The user's answer
  /// - [correctAnswer]: The correct answer to compare against
  /// - [userId]: The current user's ID
  /// - [lessonLevel]: The lesson level this activity belongs to
  Future<void> submitAnswer({
    required String answer,
    required String correctAnswer,
    required String userId,
    required int lessonLevel,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.debug(
        'Submitting answer for activity $activityId',
        tag: 'ActivityNotifier',
      );

      final isCorrect = answer.trim().toLowerCase() == 
                        correctAnswer.trim().toLowerCase();
      
      // Calculate score based on correctness
      final score = isCorrect ? 100.0 : 0.0;
      
      // Calculate XP based on score
      final xpEarned = (score * 0.1).round(); // 10 XP for perfect score

      // Update state
      state = state.copyWith(
        userAnswer: answer,
        isCorrect: isCorrect,
        score: score,
        isCompleted: true,
        isLoading: false,
        feedback: isCorrect 
            ? 'Correct! Well done!' 
            : 'Incorrect. The correct answer is: $correctAnswer',
      );

      // Award XP if correct
      if (isCorrect && xpEarned > 0) {
        await _progressRepository.awardXp(
          userId,
          xpEarned,
          source: 'activity_${state.type.toJsonString()}',
        );
      }

      Logger.info(
        'Activity completed: correct=$isCorrect, score=$score, xp=$xpEarned',
        tag: 'ActivityNotifier',
      );
    } catch (e) {
      Logger.error(
        'Error submitting answer',
        error: e,
        tag: 'ActivityNotifier',
      );

      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );

      rethrow;
    }
  }

  /// Submit audio for speaking activities
  /// 
  /// Parameters:
  /// - [audioFilePath]: Path to the recorded audio file
  /// - [userId]: The current user's ID
  /// - [lessonLevel]: The lesson level this activity belongs to
  Future<void> submitSpeakingActivity({
    required String audioFilePath,
    required String userId,
    required int lessonLevel,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.debug(
        'Submitting speaking activity $activityId',
        tag: 'ActivityNotifier',
      );

      // In a real implementation, this would send the audio to the backend
      // For now, we'll simulate a response
      // TODO: Implement actual API call when backend is ready
      
      // Simulate processing delay
      await Future.delayed(const Duration(seconds: 2));
      
      // Simulate score (in real app, this comes from backend)
      final score = 85.0;
      final xpEarned = (score * 0.15).round(); // 12-13 XP for good speaking

      state = state.copyWith(
        score: score,
        isCompleted: true,
        isLoading: false,
        feedback: 'Good pronunciation! Keep practicing.',
      );

      // Award XP
      await _progressRepository.awardXp(
        userId,
        xpEarned,
        source: 'activity_speaking',
      );

      Logger.info(
        'Speaking activity completed: score=$score, xp=$xpEarned',
        tag: 'ActivityNotifier',
      );
    } catch (e) {
      Logger.error(
        'Error submitting speaking activity',
        error: e,
        tag: 'ActivityNotifier',
      );

      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );

      rethrow;
    }
  }

  /// Mark activity as completed without scoring (for flashcards, listening)
  /// 
  /// Parameters:
  /// - [userId]: The current user's ID
  /// - [lessonLevel]: The lesson level this activity belongs to
  /// - [xpAmount]: Optional XP amount to award (default: 5)
  Future<void> completeActivity({
    required String userId,
    required int lessonLevel,
    int xpAmount = 5,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.debug(
        'Completing activity $activityId',
        tag: 'ActivityNotifier',
      );

      state = state.copyWith(
        isCompleted: true,
        isLoading: false,
      );

      // Award XP
      await _progressRepository.awardXp(
        userId,
        xpAmount,
        source: 'activity_${state.type.toJsonString()}',
      );

      Logger.info(
        'Activity completed: xp=$xpAmount',
        tag: 'ActivityNotifier',
      );
    } catch (e) {
      Logger.error(
        'Error completing activity',
        error: e,
        tag: 'ActivityNotifier',
      );

      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );

      rethrow;
    }
  }

  /// Reset activity state (for retry)
  void reset() {
    state = ActivityState(
      activityId: activityId,
      type: state.type,
    );
  }
}

/// StateNotifierProvider.family for activity state
/// 
/// This provider manages the state of individual activities
/// Each activity gets its own state notifier instance
/// 
/// The family parameter is a tuple of (activityId, activityType)
/// 
/// Usage:
/// ```dart
/// final activityState = ref.watch(
///   activityStateProvider((activityId: 'act_123', type: ActivityType.mcq))
/// );
/// 
/// // Submit answer
/// await ref.read(
///   activityStateProvider((activityId: 'act_123', type: ActivityType.mcq)).notifier
/// ).submitAnswer(
///   answer: 'Paris',
///   correctAnswer: 'Paris',
///   userId: 'user_123',
///   lessonLevel: 5,
/// );
/// ```
final activityStateProvider = StateNotifierProvider.family<
    ActivityNotifier,
    ActivityState,
    ({String activityId, ActivityType type})>(
  (ref, params) {
    final progressRepository = ref.watch(progressRepositoryProvider);
    return ActivityNotifier(
      params.activityId,
      params.type,
      progressRepository,
    );
  },
);

/// Helper provider to get activity state by activity object
/// 
/// This is a convenience provider that extracts the ID and type from an Activity object
/// 
/// Usage:
/// ```dart
/// final activityState = ref.watch(activityStateFromActivityProvider(activity));
/// ```
final activityStateFromActivityProvider = StateNotifierProvider.family<
    ActivityNotifier,
    ActivityState,
    Activity>(
  (ref, activity) {
    final progressRepository = ref.watch(progressRepositoryProvider);
    return ActivityNotifier(
      activity.id,
      activity.type,
      progressRepository,
    );
  },
);
