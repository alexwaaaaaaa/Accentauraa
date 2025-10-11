import 'activity.dart';

class Lesson {
  final int level;
  final String title;
  final int xpReward;
  final List<Activity> activities;
  final bool isLocked;
  final bool isCompleted;

  Lesson({
    required this.level,
    required this.title,
    required this.xpReward,
    required this.activities,
    required this.isLocked,
    required this.isCompleted,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      level: json['level'] as int,
      title: json['title'] as String,
      xpReward: json['xpReward'] as int,
      activities: (json['activities'] as List<dynamic>)
          .map((activity) => Activity.fromJson(activity as Map<String, dynamic>))
          .toList(),
      isLocked: json['isLocked'] as bool? ?? false,
      isCompleted: json['isCompleted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'level': level,
      'title': title,
      'xpReward': xpReward,
      'activities': activities.map((activity) => activity.toJson()).toList(),
      'isLocked': isLocked,
      'isCompleted': isCompleted,
    };
  }

  Lesson copyWith({
    int? level,
    String? title,
    int? xpReward,
    List<Activity>? activities,
    bool? isLocked,
    bool? isCompleted,
  }) {
    return Lesson(
      level: level ?? this.level,
      title: title ?? this.title,
      xpReward: xpReward ?? this.xpReward,
      activities: activities ?? this.activities,
      isLocked: isLocked ?? this.isLocked,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}
