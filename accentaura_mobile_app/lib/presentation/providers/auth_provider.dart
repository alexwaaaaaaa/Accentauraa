import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/auth.dart';
import '../../data/models/user.dart';
import '../../data/repositories/user_repository.dart';
import '../../data/services/api_service.dart';
import '../../data/services/cache_service.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/crashlytics_helper.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Authentication state
class AuthState {
  final User? user;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Authentication state notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final UserRepository _userRepository;

  AuthNotifier(this._userRepository) : super(const AuthState());

  /// Register with email and password
  Future<void> registerWithEmail(
    String email,
    String password, {
    String? name,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.info('Attempting email registration', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Registration attempt: email');

      final result = await _userRepository.registerWithEmail(
        email,
        password,
        name: name,
      );

      state = AuthState(
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      );

      // Set user ID for crash reports (use non-sensitive ID)
      await CrashlyticsHelper.setUserId(result.user.id);

      Logger.info('Email registration successful', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Registration successful: email');
    } catch (e) {
      Logger.error('Email registration failed', error: e, tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Registration failed: email');

      state = state.copyWith(isLoading: false, error: e.toString());

      rethrow;
    }
  }

  /// Login with email and password
  Future<void> loginWithEmail(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.info('Attempting email login', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login attempt: email');

      final result = await _userRepository.loginWithEmail(email, password);

      state = AuthState(
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      );

      // Set user ID for crash reports (use non-sensitive ID)
      await CrashlyticsHelper.setUserId(result.user.id);

      Logger.info('Email login successful', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login successful: email');
    } catch (e) {
      Logger.error('Email login failed', error: e, tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login failed: email');

      state = state.copyWith(isLoading: false, error: e.toString());

      rethrow;
    }
  }

  /// Login with Google OAuth
  Future<void> loginWithGoogle() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.info('Attempting Google login', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login attempt: Google');

      final result = await _userRepository.loginWithGoogle();

      state = AuthState(
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      );

      // Set user ID for crash reports (use non-sensitive ID)
      await CrashlyticsHelper.setUserId(result.user.id);

      Logger.info('Google login successful', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login successful: Google');
    } catch (e) {
      Logger.error('Google login failed', error: e, tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login failed: Google');

      state = state.copyWith(isLoading: false, error: e.toString());

      rethrow;
    }
  }

  /// Login with Facebook OAuth
  Future<void> loginWithFacebook() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.info('Attempting Facebook login', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login attempt: Facebook');

      final result = await _userRepository.loginWithFacebook();

      state = AuthState(
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      );

      // Set user ID for crash reports (use non-sensitive ID)
      await CrashlyticsHelper.setUserId(result.user.id);

      Logger.info('Facebook login successful', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login successful: Facebook');
    } catch (e) {
      Logger.error('Facebook login failed', error: e, tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Login failed: Facebook');

      state = state.copyWith(isLoading: false, error: e.toString());

      rethrow;
    }
  }

  /// Logout user
  Future<void> logout() async {
    try {
      Logger.info('Logging out user', tag: 'AuthNotifier');
      CrashlyticsHelper.logUserAction('Logout');

      await _userRepository.logout();

      // Clear user ID from crash reports
      await CrashlyticsHelper.clearUserId();

      state = const AuthState();

      Logger.info('Logout successful', tag: 'AuthNotifier');
    } catch (e) {
      Logger.error('Logout failed', error: e, tag: 'AuthNotifier');
      rethrow;
    }
  }

  /// Restore authentication session from cached token
  Future<bool> restoreSession() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      Logger.info('Attempting to restore session', tag: 'AuthNotifier');

      final restored = await _userRepository.restoreSession();

      if (restored) {
        // Get user ID from cache
        final userId = await _userRepository.getCachedUserId();

        if (userId != null) {
          // Create a minimal user object
          // In a real app, you might want to fetch full user details
          final user = User(
            id: userId,
            email: '', // Will be populated when full profile is fetched
            name: null,
            avatarUrl: null,
            provider: AuthProvider.email,
          );

          state = AuthState(
            user: user,
            isAuthenticated: true,
            isLoading: false,
          );

          Logger.info('Session restored successfully', tag: 'AuthNotifier');
          return true;
        }
      }

      state = state.copyWith(isLoading: false);
      Logger.info('Session restoration failed', tag: 'AuthNotifier');
      return false;
    } catch (e) {
      Logger.error('Session restoration error', error: e, tag: 'AuthNotifier');

      state = state.copyWith(isLoading: false, error: e.toString());

      return false;
    }
  }

  /// Check if user is authenticated
  Future<bool> checkAuthentication() async {
    try {
      return await _userRepository.isAuthenticated();
    } catch (e) {
      Logger.error(
        'Authentication check failed',
        error: e,
        tag: 'AuthNotifier',
      );
      return false;
    }
  }

  /// Get current user ID
  String? get userId => state.user?.id;

  /// Handle unauthorized error (401)
  /// Clears token and resets auth state
  Future<void> handleUnauthorized() async {
    Logger.warning(
      'Handling unauthorized error, clearing session',
      tag: 'AuthNotifier',
    );

    try {
      await _userRepository.logout();
      state = const AuthState();

      Logger.info(
        'Session cleared due to unauthorized error',
        tag: 'AuthNotifier',
      );
    } catch (e) {
      Logger.error('Error clearing session', error: e, tag: 'AuthNotifier');
    }
  }
}

/// Provider for API service
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

/// Provider for cache service
final cacheServiceProvider = Provider<CacheService>((ref) {
  return CacheService();
});

/// Provider for user repository
final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepository(
    apiService: ref.watch(apiServiceProvider),
    secureStorage: const FlutterSecureStorage(),
  );
});

/// Provider for authentication state
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(userRepositoryProvider));
});
