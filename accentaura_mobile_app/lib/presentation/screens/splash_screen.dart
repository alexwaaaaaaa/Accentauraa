import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../navigation/app_router.dart';
import '../../core/utils/logger.dart';

/// Splash screen displayed on app launch
///
/// This screen will:
/// - Display app logo with loading animation
/// - Check for cached authentication token
/// - Validate token and fetch user progress
/// - Navigate to auth or home based on token validity
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    // Initialize animations
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
      ),
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
      ),
    );

    // Start animation
    _animationController.forward();

    // Start authentication check after a brief delay
    _initializeApp();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// Initialize app by checking authentication and fetching user data
  Future<void> _initializeApp() async {
    try {
      Logger.info('Initializing app from splash screen', tag: 'SplashScreen');

      // Wait for animation to complete (minimum splash time)
      await Future.delayed(const Duration(milliseconds: 1500));

      if (!mounted) return;

      // For now, skip session restore to avoid backend dependency
      // TODO: Re-enable session restore once backend is running
      Logger.info(
        'Skipping session restore, navigating to auth screen',
        tag: 'SplashScreen',
      );

      // Navigate to auth screen
      if (mounted) {
        context.go(AppRoutes.auth);
      }
    } catch (e, stackTrace) {
      Logger.error(
        'Error during app initialization',
        error: e,
        stackTrace: stackTrace,
        tag: 'SplashScreen',
      );

      // On any error, navigate to auth screen
      if (mounted) {
        try {
          context.go(AppRoutes.auth);
        } catch (navError) {
          Logger.error(
            'Navigation error',
            error: navError,
            tag: 'SplashScreen',
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.primary,
      body: Center(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App logo icon
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.language,
                        size: 80,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // App name
                    Text(
                      'AccentAura',
                      style: theme.textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Tagline
                    Text(
                      'Master Your Accent',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 64),

                    // Loading indicator
                    SizedBox(
                      width: 40,
                      height: 40,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
