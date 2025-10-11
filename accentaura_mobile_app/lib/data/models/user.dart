import 'auth.dart';

class User {
  final String id;
  final String email;
  final String? name;
  final String? avatarUrl;
  final AuthProvider provider;

  User({
    required this.id,
    required this.email,
    this.name,
    this.avatarUrl,
    required this.provider,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      provider: AuthProvider.fromString(json['provider'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatarUrl': avatarUrl,
      'provider': provider.toJsonString(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? avatarUrl,
    AuthProvider? provider,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      provider: provider ?? this.provider,
    );
  }
}
