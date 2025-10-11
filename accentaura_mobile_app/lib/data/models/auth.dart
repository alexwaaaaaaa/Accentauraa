import 'user.dart';
import 'user_progress.dart';

enum AuthProvider {
  email,
  google,
  facebook;

  static AuthProvider fromString(String provider) {
    switch (provider) {
      case 'email':
        return AuthProvider.email;
      case 'google':
        return AuthProvider.google;
      case 'facebook':
        return AuthProvider.facebook;
      default:
        throw ArgumentError('Unknown auth provider: $provider');
    }
  }

  String toJsonString() {
    switch (this) {
      case AuthProvider.email:
        return 'email';
      case AuthProvider.google:
        return 'google';
      case AuthProvider.facebook:
        return 'facebook';
    }
  }
}

class AuthResult {
  final String token;
  final String refreshToken;
  final User user;
  final UserProgress progress;

  AuthResult({
    required this.token,
    required this.refreshToken,
    required this.user,
    required this.progress,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      token: json['token'] as String,
      refreshToken: json['refreshToken'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      progress: UserProgress.fromJson(json['progress'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'refreshToken': refreshToken,
      'user': user.toJson(),
      'progress': progress.toJson(),
    };
  }
}
