import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import '../../core/utils/logger.dart';
import '../models/auth.dart';
import '../services/api_service.dart';

/// Repository for managing user authentication and token management
/// Handles email/password login, OAuth (Google, Facebook), and secure token storage
class UserRepository {
  final ApiService _apiService;
  final FlutterSecureStorage _secureStorage;
  final GoogleSignIn _googleSignIn;
  final FacebookAuth _facebookAuth;

  // Secure storage keys
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';

  UserRepository({
    required ApiService apiService,
    FlutterSecureStorage? secureStorage,
    GoogleSignIn? googleSignIn,
    FacebookAuth? facebookAuth,
  }) : _apiService = apiService,
       _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _googleSignIn =
           googleSignIn ?? GoogleSignIn(scopes: ['email', 'profile']),
       _facebookAuth = facebookAuth ?? FacebookAuth.instance;

  // ==================== Authentication Methods ====================

  /// Register a new user with email and password
  /// Returns AuthResult containing token, user, and progress data
  /// Throws ApiException on registration failure
  Future<AuthResult> registerWithEmail(
    String email,
    String password, {
    String? name,
  }) async {
    try {
      Logger.info(
        'Attempting email registration for: $email',
        tag: 'UserRepository',
      );

      final result = await _apiService.registerWithCredentials(
        email,
        password,
        name: name,
      );

      // Store tokens securely
      await _saveAuthData(result);

      // Set token in API service for subsequent requests
      _apiService.setAuthToken(result.token);

      Logger.info('Email registration successful', tag: 'UserRepository');
      return result;
    } catch (e) {
      Logger.error(
        'Email registration failed',
        error: e,
        tag: 'UserRepository',
      );
      rethrow;
    }
  }

  /// Login with email and password
  /// Returns AuthResult containing token, user, and progress data
  /// Throws ApiException on authentication failure
  Future<AuthResult> loginWithEmail(String email, String password) async {
    try {
      Logger.info('Attempting email login for: $email', tag: 'UserRepository');

      final result = await _apiService.loginWithCredentials(email, password);

      // Store tokens securely
      await _saveAuthData(result);

      // Set token in API service for subsequent requests
      _apiService.setAuthToken(result.token);

      Logger.info('Email login successful', tag: 'UserRepository');
      return result;
    } catch (e) {
      Logger.error('Email login failed', error: e, tag: 'UserRepository');
      rethrow;
    }
  }

  /// Login with Google OAuth
  /// Opens Google sign-in flow, exchanges token with backend
  /// Returns AuthResult containing token, user, and progress data
  /// Throws ApiException on authentication failure
  Future<AuthResult> loginWithGoogle() async {
    try {
      Logger.info('Attempting Google login', tag: 'UserRepository');

      // Trigger Google sign-in flow
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw ApiException('Google sign-in was cancelled', statusCode: 0);
      }

      // Get authentication tokens
      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken == null) {
        throw ApiException('Failed to get Google ID token', statusCode: 0);
      }

      // Exchange Google token with backend
      final result = await _apiService.loginWithOAuth('google', idToken);

      // Store tokens securely
      await _saveAuthData(result);

      // Set token in API service for subsequent requests
      _apiService.setAuthToken(result.token);

      Logger.info('Google login successful', tag: 'UserRepository');
      return result;
    } catch (e) {
      Logger.error('Google login failed', error: e, tag: 'UserRepository');

      // Clean up Google sign-in state on error
      await _googleSignIn.signOut();

      rethrow;
    }
  }

  /// Login with Facebook OAuth
  /// Opens Facebook sign-in flow, exchanges token with backend
  /// Returns AuthResult containing token, user, and progress data
  /// Throws ApiException on authentication failure
  Future<AuthResult> loginWithFacebook() async {
    try {
      Logger.info('Attempting Facebook login', tag: 'UserRepository');

      // Trigger Facebook sign-in flow
      final result = await _facebookAuth.login(
        permissions: ['email', 'public_profile'],
      );

      if (result.status != LoginStatus.success) {
        throw ApiException(
          'Facebook sign-in failed: ${result.status}',
          statusCode: 0,
        );
      }

      final accessToken = result.accessToken?.tokenString;
      if (accessToken == null) {
        throw ApiException(
          'Failed to get Facebook access token',
          statusCode: 0,
        );
      }

      // Exchange Facebook token with backend
      final authResult = await _apiService.loginWithOAuth(
        'facebook',
        accessToken,
      );

      // Store tokens securely
      await _saveAuthData(authResult);

      // Set token in API service for subsequent requests
      _apiService.setAuthToken(authResult.token);

      Logger.info('Facebook login successful', tag: 'UserRepository');
      return authResult;
    } catch (e) {
      Logger.error('Facebook login failed', error: e, tag: 'UserRepository');

      // Clean up Facebook sign-in state on error
      await _facebookAuth.logOut();

      rethrow;
    }
  }

  /// Logout user and clear all authentication data
  /// Clears tokens from secure storage and API service
  /// Also signs out from OAuth providers
  Future<void> logout() async {
    try {
      Logger.info('Logging out user', tag: 'UserRepository');

      // Clear tokens from secure storage
      await clearToken();

      // Clear token from API service
      _apiService.clearAuthToken();

      // Sign out from OAuth providers
      await Future.wait([_googleSignIn.signOut(), _facebookAuth.logOut()]);

      Logger.info('Logout successful', tag: 'UserRepository');
    } catch (e) {
      Logger.error('Logout failed', error: e, tag: 'UserRepository');
      rethrow;
    }
  }

  // ==================== Token Management ====================

  /// Get cached authentication token from secure storage
  /// Returns null if no token is stored
  Future<String?> getCachedToken() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);

      if (token != null) {
        Logger.debug('Retrieved cached token', tag: 'UserRepository');
      }

      return token;
    } catch (e) {
      Logger.error(
        'Failed to read cached token',
        error: e,
        tag: 'UserRepository',
      );
      return null;
    }
  }

  /// Get cached refresh token from secure storage
  /// Returns null if no refresh token is stored
  Future<String?> getCachedRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      Logger.error(
        'Failed to read cached refresh token',
        error: e,
        tag: 'UserRepository',
      );
      return null;
    }
  }

  /// Get cached user ID from secure storage
  /// Returns null if no user ID is stored
  Future<String?> getCachedUserId() async {
    try {
      return await _secureStorage.read(key: _userIdKey);
    } catch (e) {
      Logger.error(
        'Failed to read cached user ID',
        error: e,
        tag: 'UserRepository',
      );
      return null;
    }
  }

  /// Save authentication token to secure storage
  /// Also saves refresh token and user ID
  Future<void> saveToken(
    String token, {
    String? refreshToken,
    String? userId,
  }) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);

      if (refreshToken != null) {
        await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      }

      if (userId != null) {
        await _secureStorage.write(key: _userIdKey, value: userId);
      }

      Logger.debug('Saved authentication tokens', tag: 'UserRepository');
    } catch (e) {
      Logger.error('Failed to save token', error: e, tag: 'UserRepository');
      rethrow;
    }
  }

  /// Clear all authentication tokens from secure storage
  Future<void> clearToken() async {
    try {
      await Future.wait([
        _secureStorage.delete(key: _tokenKey),
        _secureStorage.delete(key: _refreshTokenKey),
        _secureStorage.delete(key: _userIdKey),
      ]);

      Logger.debug('Cleared authentication tokens', tag: 'UserRepository');
    } catch (e) {
      Logger.error('Failed to clear tokens', error: e, tag: 'UserRepository');
      rethrow;
    }
  }

  /// Validate the current authentication token with the backend
  /// Returns true if token is valid, false otherwise
  Future<bool> validateToken(String token) async {
    try {
      Logger.debug('Validating token', tag: 'UserRepository');

      final isValid = await _apiService.validateToken(token);

      if (isValid) {
        Logger.info('Token is valid', tag: 'UserRepository');
      } else {
        Logger.warning('Token is invalid', tag: 'UserRepository');
      }

      return isValid;
    } catch (e) {
      Logger.error('Token validation failed', error: e, tag: 'UserRepository');
      return false;
    }
  }

  /// Refresh the authentication token using the refresh token
  /// Returns new token on success
  /// Throws ApiException if refresh fails
  Future<String> refreshToken(String refreshToken) async {
    try {
      Logger.info('Refreshing authentication token', tag: 'UserRepository');

      final response = await _apiService.refreshAuthToken(refreshToken);

      // Save new tokens
      await saveToken(response.token, refreshToken: response.refreshToken);

      // Update token in API service
      _apiService.setAuthToken(response.token);

      Logger.info('Token refresh successful', tag: 'UserRepository');
      return response.token;
    } catch (e) {
      Logger.error('Token refresh failed', error: e, tag: 'UserRepository');

      // If refresh fails, clear all tokens (user needs to re-login)
      await clearToken();
      _apiService.clearAuthToken();

      rethrow;
    }
  }

  /// Check if user is currently authenticated
  /// Validates cached token with backend
  Future<bool> isAuthenticated() async {
    final token = await getCachedToken();

    if (token == null) {
      return false;
    }

    return await validateToken(token);
  }

  /// Attempt to restore authentication session
  /// Validates cached token, refreshes if needed
  /// Returns true if session restored successfully
  Future<bool> restoreSession() async {
    try {
      final token = await getCachedToken();

      if (token == null) {
        Logger.info('No cached token found', tag: 'UserRepository');
        return false;
      }

      // Validate token
      final isValid = await validateToken(token);

      if (isValid) {
        // Set token in API service
        _apiService.setAuthToken(token);
        Logger.info('Session restored successfully', tag: 'UserRepository');
        return true;
      }

      // Try to refresh token
      final refreshToken = await getCachedRefreshToken();

      if (refreshToken == null) {
        Logger.warning('No refresh token available', tag: 'UserRepository');
        return false;
      }

      // Attempt token refresh
      await this.refreshToken(refreshToken);
      Logger.info('Session restored via token refresh', tag: 'UserRepository');
      return true;
    } catch (e) {
      Logger.error(
        'Failed to restore session',
        error: e,
        tag: 'UserRepository',
      );
      return false;
    }
  }

  // ==================== Private Helper Methods ====================

  /// Save authentication data from AuthResult to secure storage
  Future<void> _saveAuthData(AuthResult result) async {
    await saveToken(
      result.token,
      refreshToken: result.refreshToken,
      userId: result.user.id,
    );
  }
}
