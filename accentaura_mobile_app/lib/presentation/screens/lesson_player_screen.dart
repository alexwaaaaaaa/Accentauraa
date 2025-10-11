import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/lesson.dart';
import '../../data/models/activity.dart';
import '../../data/models/lesson_progress.dart';
import '../../data/services/audio_service.dart';
import '../../data/services/api_service.dart';
import '../../data/services/analytics_service.dart';
import '../providers/lesson_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/user_progress_provider.dart';
import '../widgets/flashcard_widget.dart';
import '../widgets/mcq_widget.dart';
import '../widgets/fill_blank_widget.dart';
import '../widgets/listening_widget.dart';
import '../widgets/speaking_widget.dart';
import '../widgets/lesson_completion_screen.dart';
import '../../core/utils/logger.dart';

// Provider for AudioService
final audioServiceProvider = Provider<AudioService>((ref) {
  final service = AudioService();
  service.initialize();
  return service;
});

// Provider for ApiService
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

// Provider for AnalyticsService
final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService.instance();
});

/// Lesson player screen for completing activities
/// 
/// This screen:
/// - Displays lesson title and progress indicator in the top bar
/// - Renders activities dynamically based on type in the activity area
/// - Provides bottom buttons (Skip, Check Answer, Continue)
/// - Loads all activities on lesson start
/// - Awards XP and shows completion screen (to be implemented in task 12.3)
class LessonPlayerScreen extends ConsumerStatefulWidget {
  final int level;

  const LessonPlayerScreen({
    super.key,
    required this.level,
  });

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  int _currentActivityIndex = 0;
  bool _isLoading = true;
  String? _error;
  Lesson? _lesson;
  DateTime? _lessonStartTime;
  final Map<String, ActivityResult> _activityResults = {};

  @override
  void initState() {
    super.initState();
    _lessonStartTime = DateTime.now();
    _loadLesson();
    _logLessonStarted();
  }

  /// Log lesson started event to analytics
  void _logLessonStarted() {
    final analytics = ref.read(analyticsServiceProvider);
    analytics.logLessonStarted(widget.level);
  }

  /// Load lesson data on screen initialization
  Future<void> _loadLesson() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      Logger.debug(
        'Loading lesson ${widget.level}',
        tag: 'LessonPlayerScreen',
      );

      final repository = ref.read(lessonRepositoryProvider);
      final lesson = await repository.getLesson(widget.level);

      // Set current lesson in provider for other components to access
      ref.read(currentLessonProvider.notifier).state = lesson;

      setState(() {
        _lesson = lesson;
        _isLoading = false;
      });

      Logger.info(
        'Lesson loaded: ${lesson.title} with ${lesson.activities.length} activities',
        tag: 'LessonPlayerScreen',
      );
    } catch (e) {
      Logger.error(
        'Error loading lesson',
        error: e,
        tag: 'LessonPlayerScreen',
      );

      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  /// Navigate to next activity
  void _nextActivity({double? activityScore}) {
    if (_lesson == null) return;

    // Record result for current activity
    final currentActivity = _lesson!.activities[_currentActivityIndex];
    _recordActivityResult(currentActivity, score: activityScore);

    if (_currentActivityIndex < _lesson!.activities.length - 1) {
      setState(() {
        _currentActivityIndex++;
      });
      Logger.debug(
        'Moving to activity ${_currentActivityIndex + 1}/${_lesson!.activities.length}',
        tag: 'LessonPlayerScreen',
      );
    } else {
      // All activities completed - show completion screen
      _showCompletionScreen();
    }
  }

  /// Skip current activity (if allowed)
  void _skipActivity() {
    Logger.debug(
      'Skipping activity ${_currentActivityIndex + 1}',
      tag: 'LessonPlayerScreen',
    );
    _nextActivity();
  }

  /// Show completion screen with XP animation and progress update
  Future<void> _showCompletionScreen() async {
    if (_lesson == null) return;

    Logger.info(
      'Lesson ${widget.level} completed',
      tag: 'LessonPlayerScreen',
    );

    try {
      // Calculate XP earned (base XP from lesson)
      final xpEarned = _lesson!.xpReward;

      // Get current user progress
      final authState = ref.read(authProvider);
      if (!authState.isAuthenticated || authState.user == null) {
        Logger.error('User not authenticated', tag: 'LessonPlayerScreen');
        return;
      }

      final userId = authState.user!.id;
      final progressRepository = ref.read(progressRepositoryProvider);

      // Update lesson progress with offline queueing
      await progressRepository.updateLessonProgress(
        userId,
        widget.level,
        xpEarned,
        _activityResults,
        completed: true,
      );

      // Log analytics event
      final timeTaken = DateTime.now().difference(_lessonStartTime ?? DateTime.now());
      final analytics = ref.read(analyticsServiceProvider);
      await analytics.logLessonCompleted(widget.level, xpEarned, timeTaken);
      await analytics.logXpEarned(xpEarned, 'lesson_completion');

      Logger.info(
        'Progress updated: Level ${widget.level}, XP $xpEarned',
        tag: 'LessonPlayerScreen',
      );

      // Get updated progress for display
      final userProgress = await progressRepository.getUserProgress(userId);

      // Navigate to completion screen
      if (!mounted) return;

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => LessonCompletionScreen(
            lessonTitle: _lesson!.title,
            xpEarned: xpEarned,
            totalXp: userProgress.totalXp,
            currentLevel: userProgress.currentLevel,
            onNextLesson: () {
              // Navigate to next lesson
              Navigator.of(context).pop(); // Close completion screen
              Navigator.of(context).pop(); // Return to lesson tree
              // TODO: Could navigate directly to next lesson if desired
            },
            onReturnToTree: () {
              // Return to lesson tree
              Navigator.of(context).pop(); // Close completion screen
              Navigator.of(context).pop(); // Return to lesson tree
            },
          ),
        ),
      );
    } catch (e) {
      Logger.error(
        'Error showing completion screen',
        error: e,
        tag: 'LessonPlayerScreen',
      );

      // Show error dialog
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Error'),
          content: Text('Failed to save progress: ${e.toString()}'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Close dialog
                Navigator.of(context).pop(); // Return to lesson tree
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  /// Record activity result for progress tracking
  void _recordActivityResult(Activity activity, {double? score}) {
    final result = ActivityResult(
      activityId: activity.id,
      completed: true,
      score: score,
      completedAt: DateTime.now(),
    );

    _activityResults[activity.id] = result;

    Logger.debug(
      'Activity result recorded: ${activity.id}, score: $score',
      tag: 'LessonPlayerScreen',
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      // Top bar with lesson title and progress indicator
      appBar: AppBar(
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _lesson?.title ?? 'Lesson ${widget.level}',
              style: const TextStyle(fontSize: 18),
            ),
            if (_lesson != null) ...[
              const SizedBox(height: 4),
              Text(
                '${_currentActivityIndex + 1}/${_lesson!.activities.length}',
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ],
        ),
        bottom: _lesson != null
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: LinearProgressIndicator(
                  value: (_currentActivityIndex + 1) / _lesson!.activities.length,
                  backgroundColor: colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
                ),
              )
            : null,
      ),

      // Activity area with dynamic rendering
      body: _buildBody(colorScheme),

      // Bottom buttons (Skip, Check Answer, Continue)
      bottomNavigationBar: _lesson != null && !_isLoading
          ? _buildBottomButtons(colorScheme)
          : null,
    );
  }

  /// Build the main body content
  Widget _buildBody(ColorScheme colorScheme) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Error loading lesson',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.error,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadLesson,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_lesson == null || _lesson!.activities.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No activities available',
              style: TextStyle(
                fontSize: 18,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      );
    }

    // Render current activity
    final currentActivity = _lesson!.activities[_currentActivityIndex];
    return _buildActivityArea(currentActivity, colorScheme);
  }

  /// Build the activity area with dynamic rendering based on activity type
  Widget _buildActivityArea(Activity activity, ColorScheme colorScheme) {
    final audioService = ref.read(audioServiceProvider);
    final apiService = ref.read(apiServiceProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Activity type indicator
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getActivityIcon(activity.type),
                  size: 16,
                  color: colorScheme.onPrimaryContainer,
                ),
                const SizedBox(width: 6),
                Text(
                  _getActivityTypeName(activity.type),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Activity widget based on type
        Expanded(
          child: _buildActivityWidget(activity, audioService, apiService),
        ),
      ],
    );
  }

  /// Build the appropriate activity widget based on activity type
  Widget _buildActivityWidget(
    Activity activity,
    AudioService audioService,
    ApiService apiService,
  ) {
    // Wrapper to handle activity completion with score
    void onCompleteWithScore([double? score]) {
      _nextActivity(activityScore: score);
    }

    switch (activity.type) {
      case ActivityType.flashcard:
        return FlashcardWidget(
          activity: activity as FlashcardActivity,
          audioService: audioService,
          onComplete: () => onCompleteWithScore(1.0), // Flashcards are always 100%
        );
      
      case ActivityType.mcq:
        return McqWidget(
          activity: activity as McqActivity,
          onComplete: () => onCompleteWithScore(1.0), // MCQ score handled by widget
        );
      
      case ActivityType.fillBlank:
        return FillBlankWidget(
          activity: activity as FillBlankActivity,
          onComplete: () => onCompleteWithScore(1.0), // Fill blank score handled by widget
        );
      
      case ActivityType.listening:
        return ListeningWidget(
          activity: activity as ListeningActivity,
          audioService: audioService,
          onComplete: () => onCompleteWithScore(1.0), // Listening score handled by widget
        );
      
      case ActivityType.speaking:
        return SpeakingWidget(
          activity: activity as SpeakingActivity,
          audioService: audioService,
          apiService: apiService,
          onComplete: () => onCompleteWithScore(), // Speaking score from API
        );
    }
  }

  /// Build bottom navigation buttons
  Widget _buildBottomButtons(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Skip button (optional, can be disabled for certain activities)
            OutlinedButton(
              onPressed: _skipActivity,
              child: const Text('Skip'),
            ),
            const SizedBox(width: 12),

            // Check Answer / Continue button (primary action)
            Expanded(
              child: ElevatedButton(
                onPressed: _nextActivity,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: Text(
                  _currentActivityIndex < _lesson!.activities.length - 1
                      ? 'Continue'
                      : 'Finish',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Get icon for activity type
  IconData _getActivityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.flashcard:
        return Icons.style;
      case ActivityType.mcq:
        return Icons.quiz;
      case ActivityType.fillBlank:
        return Icons.edit_note;
      case ActivityType.listening:
        return Icons.headphones;
      case ActivityType.speaking:
        return Icons.mic;
    }
  }

  /// Get display name for activity type
  String _getActivityTypeName(ActivityType type) {
    switch (type) {
      case ActivityType.flashcard:
        return 'Flashcard';
      case ActivityType.mcq:
        return 'Multiple Choice';
      case ActivityType.fillBlank:
        return 'Fill in the Blank';
      case ActivityType.listening:
        return 'Listening';
      case ActivityType.speaking:
        return 'Speaking';
    }
  }
}
