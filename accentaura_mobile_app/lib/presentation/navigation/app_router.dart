import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import '../providers/auth_provider.dart';
import '../providers/analytics_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth_screen.dart';
import '../screens/home_screen.dart';
import '../screens/lesson_tree_screen.dart';
import '../screens/lesson_player_screen.dart';
import '../screens/ai_practice_screen.dart';
import '../screens/interview_screen.dart';
import '../screens/leaderboard_screen.dart';
import '../screens/profile_screen.dart';
import '../../core/utils/logger.dart';

/// Route paths
class AppRoutes {
  static const splash = '/splash';
  static const auth = '/auth';
  static const home = '/home';
  static const lessonTree = '/home/lesson-tree';
  static const lesson = '/home/lesson/:level';
  static const aiPractice = '/home/ai-practice';
  static const interview = '/home/interview';
  static const leaderboard = '/home/leaderboard';
  static const profile = '/home/profile';

  /// Helper to build lesson route with level parameter
  static String lessonWithLevel(int level) => '/home/lesson/$level';
}

/// Custom NavigatorObserver for analytics tracking
class AnalyticsNavigatorObserver extends NavigatorObserver {
  final FirebaseAnalytics analytics;

  AnalyticsNavigatorObserver(this.analytics);

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _logScreenView(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null) {
      _logScreenView(previousRoute);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _logScreenView(newRoute);
    }
  }

  void _logScreenView(Route<dynamic> route) {
    final screenName = route.settings.name;
    if (screenName != null && screenName.isNotEmpty) {
      Logger.info('Screen view: $screenName', tag: 'AnalyticsNavigatorObserver');
      
      analytics.logScreenView(
        screenName: screenName,
        screenClass: screenName,
      ).catchError((error) {
        Logger.error('Failed to log screen view', error: error, tag: 'AnalyticsNavigatorObserver');
      });
    }
  }
}

/// Provider for the app router
/// 
/// This provider creates and manages the GoRouter instance with:
/// - Authentication-based redirects
/// - All app routes
/// - Analytics tracking via NavigatorObserver
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  final analytics = ref.watch(firebaseAnalyticsProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    
    // Redirect logic for authentication
    redirect: (BuildContext context, GoRouterState state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final currentLocation = state.uri.path;

      Logger.info(
        'Router redirect check - isAuthenticated: $isAuthenticated, isLoading: $isLoading, location: $currentLocation',
        tag: 'AppRouter',
      );

      // Don't redirect while checking authentication
      if (isLoading) {
        return null;
      }

      // Allow splash screen to handle initial auth check
      if (currentLocation == AppRoutes.splash) {
        return null;
      }

      // Allow home screen access (demo mode - no auth required)
      // TODO: Re-enable auth check once backend is integrated
      if (currentLocation == AppRoutes.home || currentLocation.startsWith('/home')) {
        Logger.info('Allowing access to home (demo mode)', tag: 'AppRouter');
        return null;
      }

      // Redirect to auth if not authenticated and not already on auth page
      if (!isAuthenticated && currentLocation != AppRoutes.auth) {
        Logger.info('Redirecting to auth screen', tag: 'AppRouter');
        return AppRoutes.auth;
      }

      // Redirect to home if authenticated and on auth page
      if (isAuthenticated && currentLocation == AppRoutes.auth) {
        Logger.info('Redirecting to home screen', tag: 'AppRouter');
        return AppRoutes.home;
      }

      // No redirect needed
      return null;
    },

    // Navigator observers for analytics
    observers: [
      AnalyticsNavigatorObserver(analytics),
    ],

    // Route configuration
    routes: [
      // Splash screen
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Authentication screen
      GoRoute(
        path: AppRoutes.auth,
        name: 'auth',
        builder: (context, state) => const AuthScreen(),
      ),

      // Home screen with nested routes
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => const HomeScreen(),
        routes: [
          // Lesson tree screen
          GoRoute(
            path: 'lesson-tree',
            name: 'lesson-tree',
            builder: (context, state) => const LessonTreeScreen(),
          ),

          // Lesson player screen with level parameter
          GoRoute(
            path: 'lesson/:level',
            name: 'lesson',
            builder: (context, state) {
              final levelStr = state.pathParameters['level'];
              final level = int.tryParse(levelStr ?? '');
              
              if (level == null) {
                Logger.error('Invalid level parameter: $levelStr', tag: 'AppRouter');
                // Redirect to lesson tree if invalid level
                return const LessonTreeScreen();
              }

              return LessonPlayerScreen(level: level);
            },
          ),

          // AI practice screen
          GoRoute(
            path: 'ai-practice',
            name: 'ai-practice',
            builder: (context, state) => const AIPracticeScreen(),
          ),

          // Interview screen
          GoRoute(
            path: 'interview',
            name: 'interview',
            builder: (context, state) => const InterviewScreen(),
          ),

          // Leaderboard screen
          GoRoute(
            path: 'leaderboard',
            name: 'leaderboard',
            builder: (context, state) => const LeaderboardScreen(),
          ),

          // Profile screen
          GoRoute(
            path: 'profile',
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],

    // Error page
    errorBuilder: (context, state) {
      Logger.error('Router error: ${state.error}', tag: 'AppRouter');
      
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Page not found',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                state.uri.path,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go(AppRoutes.home),
                child: const Text('Go to Home'),
              ),
            ],
          ),
        ),
      );
    },
  );
});
