class ActivityResult {
  final String activityId;
  final bool completed;
  final double? score;
  final DateTime completedAt;

  ActivityResult({
    required this.activityId,
    required this.completed,
    this.score,
    required this.completedAt,
  });

  factory ActivityResult.fromJson(Map<String, dynamic> json) {
    return ActivityResult(
      activityId: json['activityId'] as String,
      completed: json['completed'] as bool,
      score: json['score'] as double?,
      completedAt: DateTime.parse(json['completedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'activityId': activityId,
      'completed': completed,
      'score': score,
      'completedAt': completedAt.toIso8601String(),
    };
  }
}

class LessonProgress {
  final int level;
  final bool completed;
  final int xpEarned;
  final Map<String, ActivityResult> activityResults;

  LessonProgress({
    required this.level,
    required this.completed,
    required this.xpEarned,
    required this.activityResults,
  });

  factory LessonProgress.fromJson(Map<String, dynamic> json) {
    final activityResultsJson = json['activityResults'] as Map<String, dynamic>? ?? {};
    final activityResults = activityResultsJson.map(
      (key, value) => MapEntry(
        key,
        ActivityResult.fromJson(value as Map<String, dynamic>),
      ),
    );

    return LessonProgress(
      level: json['level'] as int,
      completed: json['completed'] as bool,
      xpEarned: json['xpEarned'] as int,
      activityResults: activityResults,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'level': level,
      'completed': completed,
      'xpEarned': xpEarned,
      'activityResults': activityResults.map(
        (key, value) => MapEntry(key, value.toJson()),
      ),
    };
  }

  LessonProgress copyWith({
    int? level,
    bool? completed,
    int? xpEarned,
    Map<String, ActivityResult>? activityResults,
  }) {
    return LessonProgress(
      level: level ?? this.level,
      completed: completed ?? this.completed,
      xpEarned: xpEarned ?? this.xpEarned,
      activityResults: activityResults ?? this.activityResults,
    );
  }
}
