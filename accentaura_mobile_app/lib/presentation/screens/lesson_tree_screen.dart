import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/lesson.dart';
import '../../data/models/user_progress.dart';
import '../providers/lesson_provider.dart';
import '../providers/user_progress_provider.dart';
import '../widgets/level_card.dart';

/// Lesson tree screen displaying all 100 lesson nodes
/// 
/// This screen:
/// - Displays scrollable grid/tree view for 100 lesson nodes
/// - Implements lazy loading (render visible + 10 above/below)
/// - Shows progress indicator at top
/// - Displays level cards with lock/unlock status
class LessonTreeScreen extends ConsumerStatefulWidget {
  const LessonTreeScreen({super.key});

  @override
  ConsumerState<LessonTreeScreen> createState() => _LessonTreeScreenState();
}

class _LessonTreeScreenState extends ConsumerState<LessonTreeScreen> {
  final ScrollController _scrollController = ScrollController();
  
  // Track which lesson ranges are currently loaded
  final Set<int> _loadedRanges = {};
  
  // Pagination settings
  static const int _lessonsPerPage = 20;
  static const int _totalLessons = 100;
  
  @override
  void initState() {
    super.initState();
    // Load initial lessons
    _loadLessonRange(0);
    
    // Set up scroll listener for lazy loading
    _scrollController.addListener(_onScroll);
  }
  
  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
  
  void _onScroll() {
    // Calculate which range should be visible based on scroll position
    final scrollPosition = _scrollController.position.pixels;
    final maxScroll = _scrollController.position.maxScrollExtent;
    
    if (maxScroll == 0) return;
    
    // Calculate approximate range index based on scroll percentage
    final scrollPercentage = scrollPosition / maxScroll;
    final approximateLesson = (scrollPercentage * _totalLessons).floor();
    final rangeIndex = approximateLesson ~/ _lessonsPerPage;
    
    // Load current range and adjacent ranges (for smooth scrolling)
    _loadLessonRange(rangeIndex);
    if (rangeIndex > 0) _loadLessonRange(rangeIndex - 1);
    if (rangeIndex < (_totalLessons ~/ _lessonsPerPage) - 1) {
      _loadLessonRange(rangeIndex + 1);
    }
  }
  
  void _loadLessonRange(int rangeIndex) {
    if (_loadedRanges.contains(rangeIndex)) return;
    
    _loadedRanges.add(rangeIndex);
    
    final from = rangeIndex * _lessonsPerPage + 1;
    final to = ((rangeIndex + 1) * _lessonsPerPage).clamp(1, _totalLessons);
    
    // Trigger provider to load this range
    ref.read(lessonsProvider(LessonRange(from: from, to: to)));
  }

  @override
  Widget build(BuildContext context) {
    final progressAsync = ref.watch(userProgressProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lesson Tree'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Progress indicator at top
          _buildProgressIndicator(progressAsync),
          
          // Lesson grid
          Expanded(
            child: _buildLessonGrid(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildProgressIndicator(AsyncValue<UserProgress?> progressAsync) {
    return progressAsync.when(
      data: (progress) {
        if (progress == null) {
          return const SizedBox.shrink();
        }
        
        final completedLessons = progress.lessonProgress.values
            .where((lp) => lp.completed)
            .length;
        final progressPercentage = completedLessons / _totalLessons;
        
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Your Progress',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '$completedLessons / $_totalLessons',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: progressPercentage,
                  minHeight: 12,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${(progressPercentage * 100).toStringAsFixed(1)}% Complete',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
  
  Widget _buildLessonGrid() {
    // Build a grid that loads lessons in chunks
    return GridView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: _totalLessons,
      itemBuilder: (context, index) {
        final level = index + 1;
        final rangeIndex = index ~/ _lessonsPerPage;
        final from = rangeIndex * _lessonsPerPage + 1;
        final to = ((rangeIndex + 1) * _lessonsPerPage).clamp(1, _totalLessons);
        
        // Watch the lessons for this range
        final lessonsAsync = ref.watch(
          lessonsProvider(LessonRange(from: from, to: to))
        );
        
        return lessonsAsync.when(
          data: (lessons) {
            // Find the lesson for this level
            final lesson = lessons.firstWhere(
              (l) => l.level == level,
              orElse: () => Lesson(
                level: level,
                title: 'Lesson $level',
                xpReward: 50,
                activities: [],
                isLocked: level > 1,
                isCompleted: false,
              ),
            );
            
            return LevelCard(lesson: lesson);
          },
          loading: () => Card(
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
          error: (error, _) => Card(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    color: Theme.of(context).colorScheme.error,
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Error loading',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
