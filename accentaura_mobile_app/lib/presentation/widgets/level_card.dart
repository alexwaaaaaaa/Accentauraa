import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/models/lesson.dart';
import '../../core/utils/accessibility_helper.dart';

/// Level card widget for displaying lesson information in the lesson tree
/// 
/// Features:
/// - Displays level number, title, XP reward
/// - Shows lock/unlock icon and completion checkmark
/// - Implements locked/unlocked visual states
/// - Tap handler to navigate to lesson player
/// - Prevents interaction when locked
/// - Full accessibility support with semantic labels
/// - Minimum 44x44 tap target size
class LevelCard extends ConsumerWidget {
  final Lesson lesson;

  const LevelCard({
    super.key,
    required this.lesson,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // Determine card state colors
    final isLocked = lesson.isLocked;
    final isCompleted = lesson.isCompleted;
    
    // Wrap in RepaintBoundary for performance optimization
    // This prevents unnecessary repaints of individual cards when other cards change
    return RepaintBoundary(
      child: _buildCard(context, theme, colorScheme, isLocked, isCompleted),
    );
  }
  
  Widget _buildCard(
    BuildContext context,
    ThemeData theme,
    ColorScheme colorScheme,
    bool isLocked,
    bool isCompleted,
  ) {
    
    Color cardColor;
    Color textColor;
    Color iconColor;
    
    if (isCompleted) {
      cardColor = colorScheme.primaryContainer;
      textColor = colorScheme.onPrimaryContainer;
      iconColor = colorScheme.primary;
    } else if (isLocked) {
      cardColor = colorScheme.surfaceContainerHighest.withValues(alpha: 0.5);
      textColor = colorScheme.onSurfaceVariant.withValues(alpha: 0.5);
      iconColor = colorScheme.onSurfaceVariant.withValues(alpha: 0.5);
    } else {
      cardColor = colorScheme.secondaryContainer;
      textColor = colorScheme.onSecondaryContainer;
      iconColor = colorScheme.secondary;
    }
    
    // Build semantic label for screen readers
    final semanticLabel = AccessibilityHelper.lessonCardLabel(
      level: lesson.level,
      title: lesson.title,
      xpReward: lesson.xpReward,
      isLocked: isLocked,
      isCompleted: isCompleted,
      activityCount: lesson.activities.length,
    );

    return Semantics(
      label: semanticLabel,
      button: !isLocked,
      enabled: !isLocked,
      excludeSemantics: true, // Exclude child semantics since we provide custom label
      child: AccessibilityHelper.ensureMinTapTarget(
        child: Card(
          elevation: isLocked ? 0 : 2,
          color: cardColor,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: isLocked ? null : () => _onTap(context),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              // Top section: Level number and status icon
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Level number badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: iconColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${lesson.level}',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: iconColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  
                  // Status icon (lock, checkmark, or nothing)
                  _buildStatusIcon(iconColor, isLocked, isCompleted),
                ],
              ),
              
              const SizedBox(height: 8),
              
              // Middle section: Title
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      lesson.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: textColor,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 8),
              
              // Bottom section: XP reward
              Row(
                children: [
                  Icon(
                    Icons.stars,
                    size: 16,
                    color: iconColor,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${lesson.xpReward} XP',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: textColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              
              // Activity count indicator
              if (lesson.activities.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      Icon(
                        Icons.assignment,
                        size: 14,
                        color: textColor.withValues(alpha: 0.7),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${lesson.activities.length} activities',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: textColor.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
      ),
    );
  }
  
  Widget _buildStatusIcon(Color iconColor, bool isLocked, bool isCompleted) {
    if (isCompleted) {
      return Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.2),
          shape: BoxShape.circle,
        ),
        child: Icon(
          Icons.check_circle,
          color: iconColor,
          size: 20,
        ),
      );
    } else if (isLocked) {
      return Icon(
        Icons.lock,
        color: iconColor,
        size: 20,
      );
    } else {
      return Icon(
        Icons.play_circle_outline,
        color: iconColor,
        size: 20,
      );
    }
  }
  
  void _onTap(BuildContext context) {
    // Navigate to lesson player screen
    context.push('/home/lesson/${lesson.level}');
  }
}
