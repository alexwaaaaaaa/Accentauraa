class Badge {
  final String id;
  final String name;
  final String description;
  final String iconUrl;
  final DateTime earnedAt;

  Badge({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.earnedAt,
  });

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      iconUrl: json['iconUrl'] as String,
      earnedAt: DateTime.parse(json['earnedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'iconUrl': iconUrl,
      'earnedAt': earnedAt.toIso8601String(),
    };
  }

  Badge copyWith({
    String? id,
    String? name,
    String? description,
    String? iconUrl,
    DateTime? earnedAt,
  }) {
    return Badge(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      iconUrl: iconUrl ?? this.iconUrl,
      earnedAt: earnedAt ?? this.earnedAt,
    );
  }
}
