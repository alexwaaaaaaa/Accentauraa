import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'app_router.dart';

/// Extension methods for easier navigation
/// 
/// These extensions provide convenient methods for navigating
/// to specific screens without needing to remember route paths.
/// 
/// Example usage:
/// ```dart
/// context.goToHome();
/// context.goToLesson(5);
/// context.goToAIPractice();
/// ```
extension NavigationExtensions on BuildContext {
  // Basic navigation
  
  /// Navigate to splash screen
  void goToSplash() => go(AppRoutes.splash);
  
  /// Navigate to auth screen
  void goToAuth() => go(AppRoutes.auth);
  
  /// Navigate to home screen
  void goToHome() => go(AppRoutes.home);
  
  // Feature navigation
  
  /// Navigate to lesson tree screen
  void goToLessonTree() => go(AppRoutes.lessonTree);
  
  /// Navigate to lesson player screen with level
  void goToLesson(int level) => go(AppRoutes.lessonWithLevel(level));
  
  /// Navigate to AI practice screen
  void goToAIPractice() => go(AppRoutes.aiPractice);
  
  /// Navigate to interview screen
  void goToInterview() => go(AppRoutes.interview);
  
  /// Navigate to leaderboard screen
  void goToLeaderboard() => go(AppRoutes.leaderboard);
  
  /// Navigate to profile screen
  void goToProfile() => go(AppRoutes.profile);
  
  // Utility methods
  
  /// Go back to previous screen
  void goBack() => pop();
  
  /// Check if can go back
  bool get canGoBack => canPop();
  
  /// Get current route path
  String get currentRoute => GoRouterState.of(this).uri.path;
  
  /// Check if currently on a specific route
  bool isOnRoute(String route) => currentRoute == route;
}

/// Extension methods for navigation with named routes
/// 
/// These provide an alternative way to navigate using named routes
/// which can be useful for deep linking or more complex navigation scenarios.
extension NamedNavigationExtensions on BuildContext {
  /// Navigate to a named route
  void goToNamed(String name, {Map<String, String>? pathParameters}) {
    goNamed(name, pathParameters: pathParameters ?? {});
  }
  
  /// Navigate to lesson using named route
  void goToLessonNamed(int level) {
    goNamed('lesson', pathParameters: {'level': level.toString()});
  }
}

/// Extension for checking current location
extension RouteCheckExtensions on BuildContext {
  /// Check if currently on splash screen
  bool get isOnSplash => isOnRoute(AppRoutes.splash);
  
  /// Check if currently on auth screen
  bool get isOnAuth => isOnRoute(AppRoutes.auth);
  
  /// Check if currently on home screen
  bool get isOnHome => isOnRoute(AppRoutes.home);
  
  /// Check if currently on lesson tree screen
  bool get isOnLessonTree => isOnRoute(AppRoutes.lessonTree);
  
  /// Check if currently on AI practice screen
  bool get isOnAIPractice => isOnRoute(AppRoutes.aiPractice);
  
  /// Check if currently on interview screen
  bool get isOnInterview => isOnRoute(AppRoutes.interview);
  
  /// Check if currently on leaderboard screen
  bool get isOnLeaderboard => isOnRoute(AppRoutes.leaderboard);
  
  /// Check if currently on profile screen
  bool get isOnProfile => isOnRoute(AppRoutes.profile);
  
  /// Check if currently on any lesson player screen
  bool get isOnLesson => currentRoute.startsWith('/home/lesson/');
}
