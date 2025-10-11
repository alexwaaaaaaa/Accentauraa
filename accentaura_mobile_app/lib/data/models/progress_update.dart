import 'package:hive/hive.dart';

part 'progress_update.g.dart';

@HiveType(typeId: 0)
class ProgressUpdate {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final int level;

  @HiveField(3)
  final int xpEarned;

  @HiveField(4)
  final bool lessonCompleted;

  @HiveField(5)
  final DateTime timestamp;

  @HiveField(6)
  final Map<String, dynamic>? activityResults;

  ProgressUpdate({
    required this.id,
    required this.userId,
    required this.level,
    required this.xpEarned,
    required this.lessonCompleted,
    required this.timestamp,
    this.activityResults,
  });

  factory ProgressUpdate.fromJson(Map<String, dynamic> json) {
    return ProgressUpdate(
      id: json['id'] as String,
      userId: json['userId'] as String,
      level: json['level'] as int,
      xpEarned: json['xpEarned'] as int,
      lessonCompleted: json['lessonCompleted'] as bool,
      timestamp: DateTime.parse(json['timestamp'] as String),
      activityResults: json['activityResults'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'level': level,
      'xpEarned': xpEarned,
      'lessonCompleted': lessonCompleted,
      'timestamp': timestamp.toIso8601String(),
      'activityResults': activityResults,
    };
  }
}
