import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../data/services/api_service.dart';
import 'logger.dart';

/// Centralized error handling utility
/// Provides consistent error messages and handling across the app
class ErrorHandler {
  /// Show error snackbar with appropriate message
  static void showErrorSnackbar(
    BuildContext context,
    dynamic error, {
    Duration duration = const Duration(seconds: 4),
    SnackBarAction? action,
  }) {
    final message = getErrorMessage(error);
    
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        backgroundColor: Theme.of(context).colorScheme.error,
        action: action,
      ),
    );
  }

  /// Show offline snackbar
  static void showOfflineSnackbar(BuildContext context) {
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.cloud_off, color: Colors.white),
            SizedBox(width: 12),
            Expanded(
              child: Text("You're offline. Using cached content."),
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
        backgroundColor: Colors.orange.shade700,
      ),
    );
  }

  /// Show online snackbar
  static void showOnlineSnackbar(BuildContext context) {
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.cloud_done, color: Colors.white),
            SizedBox(width: 12),
            Text("Back online. Syncing..."),
          ],
        ),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green.shade700,
      ),
    );
  }

  /// Get user-friendly error message from exception
  static String getErrorMessage(dynamic error) {
    Logger.error('Error occurred', error: error, tag: 'ErrorHandler');

    if (error is ApiException) {
      return error.message;
    }

    if (error is NetworkException) {
      return error.message;
    }

    if (error is PermissionException) {
      return error.message;
    }

    // Generic error message
    return 'An unexpected error occurred. Please try again.';
  }

  /// Check if error is a network error
  static bool isNetworkError(dynamic error) {
    if (error is ApiException) {
      return error.statusCode == 0 || error.statusCode == 408;
    }
    if (error is NetworkException) {
      return true;
    }
    return false;
  }

  /// Check if error is an authentication error
  static bool isAuthError(dynamic error) {
    if (error is ApiException) {
      return error.statusCode == 401;
    }
    return false;
  }

  /// Check if error is a not found error
  static bool isNotFoundError(dynamic error) {
    if (error is ApiException) {
      return error.statusCode == 404;
    }
    return false;
  }

  /// Check if error is a server error
  static bool isServerError(dynamic error) {
    if (error is ApiException) {
      return error.statusCode >= 500 && error.statusCode < 600;
    }
    return false;
  }
}

/// Network exception for connectivity issues
class NetworkException implements Exception {
  final String message;

  NetworkException(this.message);

  @override
  String toString() => message;
}

/// Permission exception for denied permissions
class PermissionException implements Exception {
  final String message;
  final String permission;

  PermissionException(this.message, {required this.permission});

  @override
  String toString() => message;
}

/// Network connectivity checker
class NetworkChecker {
  static final Connectivity _connectivity = Connectivity();

  /// Check if device has internet connection
  static Future<bool> hasConnection() async {
    try {
      final results = await _connectivity.checkConnectivity();
      return results.any((result) =>
          result == ConnectivityResult.wifi ||
          result == ConnectivityResult.mobile ||
          result == ConnectivityResult.ethernet);
    } catch (e) {
      Logger.error('Error checking connectivity', error: e, tag: 'NetworkChecker');
      return false;
    }
  }

  /// Check if device is on WiFi
  static Future<bool> isOnWifi() async {
    try {
      final results = await _connectivity.checkConnectivity();
      return results.contains(ConnectivityResult.wifi);
    } catch (e) {
      Logger.error('Error checking WiFi', error: e, tag: 'NetworkChecker');
      return false;
    }
  }

  /// Stream of connectivity changes
  static Stream<List<ConnectivityResult>> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged;
  }
}
