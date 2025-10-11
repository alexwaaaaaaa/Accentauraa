import 'badge.dart';
import 'lesson_progress.dart';

class UserProgress {
  final String userId;
  final int currentLevel;
  final int totalXp;
  final int streak;
  final DateTime? lastActivityDate;
  final int coins;
  final List<Badge> badges;
  final Map<int, LessonProgress> lessonProgress;

  UserProgress({
    required this.userId,
    required this.currentLevel,
    required this.totalXp,
    required this.streak,
    this.lastActivityDate,
    required this.coins,
    required this.badges,
    required this.lessonProgress,
  });

  factory UserProgress.fromJson(Map<String, dynamic> json) {
    final lessonProgressJson = json['lessonProgress'] as Map<String, dynamic>? ?? {};
    final lessonProgress = lessonProgressJson.map(
      (key, value) => MapEntry(
        int.parse(key),
        LessonProgress.fromJson(value as Map<String, dynamic>),
      ),
    );

    return UserProgress(
      userId: json['userId'] as String,
      currentLevel: json['currentLevel'] as int,
      totalXp: json['totalXp'] as int,
      streak: json['streak'] as int,
      lastActivityDate: json['lastActivityDate'] != null
          ? DateTime.parse(json['lastActivityDate'] as String)
          : null,
      coins: json['coins'] as int,
      badges: (json['badges'] as List<dynamic>?)
              ?.map((badge) => Badge.fromJson(badge as Map<String, dynamic>))
              .toList() ??
          [],
      lessonProgress: lessonProgress,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'currentLevel': currentLevel,
      'totalXp': totalXp,
      'streak': streak,
      'lastActivityDate': lastActivityDate?.toIso8601String(),
      'coins': coins,
      'badges': badges.map((badge) => badge.toJson()).toList(),
      'lessonProgress': lessonProgress.map(
        (key, value) => MapEntry(key.toString(), value.toJson()),
      ),
    };
  }

  /// Check if streak should be reset based on current date
  /// Returns true if more than 1 day has passed since last activity
  bool shouldResetStreak(DateTime currentDate) {
    if (lastActivityDate == null) return false;
    
    final daysSinceLastActivity = currentDate.difference(lastActivityDate!).inDays;
    return daysSinceLastActivity > 1;
  }

  /// Check if streak should be incremented
  /// Returns true if exactly 1 day has passed since last activity
  bool shouldIncrementStreak(DateTime currentDate) {
    if (lastActivityDate == null) return true;
    
    final lastActivityDateOnly = DateTime(
      lastActivityDate!.year,
      lastActivityDate!.month,
      lastActivityDate!.day,
    );
    final currentDateOnly = DateTime(
      currentDate.year,
      currentDate.month,
      currentDate.day,
    );
    
    final daysSinceLastActivity = currentDateOnly.difference(lastActivityDateOnly).inDays;
    return daysSinceLastActivity == 1;
  }

  UserProgress copyWith({
    String? userId,
    int? currentLevel,
    int? totalXp,
    int? streak,
    DateTime? lastActivityDate,
    int? coins,
    List<Badge>? badges,
    Map<int, LessonProgress>? lessonProgress,
  }) {
    return UserProgress(
      userId: userId ?? this.userId,
      currentLevel: currentLevel ?? this.currentLevel,
      totalXp: totalXp ?? this.totalXp,
      streak: streak ?? this.streak,
      lastActivityDate: lastActivityDate ?? this.lastActivityDate,
      coins: coins ?? this.coins,
      badges: badges ?? this.badges,
      lessonProgress: lessonProgress ?? this.lessonProgress,
    );
  }
}
