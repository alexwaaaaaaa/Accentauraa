class LeaderboardEntry {
  final String userId;
  final String username;
  final String? avatarUrl;
  final int totalXp;
  final int rank;
  final int streak;

  LeaderboardEntry({
    required this.userId,
    required this.username,
    this.avatarUrl,
    required this.totalXp,
    required this.rank,
    required this.streak,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      userId: json['userId'] as String,
      username: json['username'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      totalXp: json['totalXp'] as int,
      rank: json['rank'] as int,
      streak: json['streak'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'username': username,
      'avatarUrl': avatarUrl,
      'totalXp': totalXp,
      'rank': rank,
      'streak': streak,
    };
  }
}

class LeaderboardData {
  final List<LeaderboardEntry> entries;
  final DateTime lastUpdated;

  LeaderboardData({
    required this.entries,
    required this.lastUpdated,
  });

  factory LeaderboardData.fromJson(Map<String, dynamic> json) {
    return LeaderboardData(
      entries: (json['entries'] as List<dynamic>)
          .map((entry) => LeaderboardEntry.fromJson(entry as Map<String, dynamic>))
          .toList(),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'entries': entries.map((entry) => entry.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

class UserRank {
  final int rank;
  final int totalUsers;
  final int percentile;

  UserRank({
    required this.rank,
    required this.totalUsers,
    required this.percentile,
  });

  factory UserRank.fromJson(Map<String, dynamic> json) {
    return UserRank(
      rank: json['rank'] as int,
      totalUsers: json['totalUsers'] as int,
      percentile: json['percentile'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rank': rank,
      'totalUsers': totalUsers,
      'percentile': percentile,
    };
  }
}
