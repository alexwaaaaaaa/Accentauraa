import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/utils/logger.dart';

/// Provider for connectivity service
final connectivityServiceProvider = Provider<Connectivity>((ref) {
  return Connectivity();
});

/// Provider for network connectivity status
/// 
/// This StreamProvider monitors the device's network connectivity
/// and emits updates whenever the connection status changes
/// 
/// Returns `List<ConnectivityResult>` which can contain:
/// - ConnectivityResult.wifi: Connected via WiFi
/// - ConnectivityResult.mobile: Connected via mobile data
/// - ConnectivityResult.ethernet: Connected via ethernet
/// - ConnectivityResult.none: No connection
/// 
/// Example usage:
/// ```dart
/// final connectivityAsync = ref.watch(connectivityProvider);
/// connectivityAsync.when(
///   data: (results) {
///     final isOnline = !results.contains(ConnectivityResult.none);
///     return Text(isOnline ? 'Online' : 'Offline');
///   },
///   loading: () => CircularProgressIndicator(),
///   error: (error, stack) => Text('Error: $error'),
/// );
/// ```
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) async* {
  final connectivity = ref.watch(connectivityServiceProvider);

  try {
    Logger.debug('Starting connectivity stream', tag: 'ConnectivityProvider');

    // Emit initial connectivity status
    final initialStatus = await connectivity.checkConnectivity();
    Logger.info('Initial connectivity: $initialStatus', tag: 'ConnectivityProvider');
    yield initialStatus;

    // Listen for connectivity changes
    await for (final result in connectivity.onConnectivityChanged) {
      Logger.info('Connectivity changed: $result', tag: 'ConnectivityProvider');
      yield result;
    }
  } catch (e) {
    Logger.error('Error in connectivity stream', error: e, tag: 'ConnectivityProvider');
    rethrow;
  }
});

/// Provider for checking if device is online
/// 
/// Derived from connectivityProvider for convenience
/// Returns true if connected to any network (WiFi, mobile, ethernet)
/// Returns false if no connection or only Bluetooth/VPN
final isOnlineProvider = Provider<bool>((ref) {
  final connectivityAsync = ref.watch(connectivityProvider);

  return connectivityAsync.when(
    data: (results) {
      // Check if any result indicates an active internet connection
      final hasConnection = results.any((result) =>
          result == ConnectivityResult.wifi ||
          result == ConnectivityResult.mobile ||
          result == ConnectivityResult.ethernet);

      Logger.debug('Is online: $hasConnection', tag: 'IsOnlineProvider');
      return hasConnection;
    },
    loading: () {
      // Assume online while checking
      Logger.debug('Connectivity loading, assuming online', tag: 'IsOnlineProvider');
      return true;
    },
    error: (error, stack) {
      // Assume offline on error
      Logger.warning('Connectivity error, assuming offline', tag: 'IsOnlineProvider');
      return false;
    },
  );
});

/// Provider for checking if device is on WiFi
/// 
/// Useful for determining if large downloads should be allowed
final isOnWifiProvider = Provider<bool>((ref) {
  final connectivityAsync = ref.watch(connectivityProvider);

  return connectivityAsync.when(
    data: (results) => results.contains(ConnectivityResult.wifi),
    loading: () => false,
    error: (_, __) => false,
  );
});

/// Provider for checking if device is on mobile data
/// 
/// Useful for showing data usage warnings
final isOnMobileDataProvider = Provider<bool>((ref) {
  final connectivityAsync = ref.watch(connectivityProvider);

  return connectivityAsync.when(
    data: (results) => results.contains(ConnectivityResult.mobile),
    loading: () => false,
    error: (_, __) => false,
  );
});

/// Provider for connectivity status text
/// 
/// Returns a human-readable string describing the connection status
final connectivityStatusTextProvider = Provider<String>((ref) {
  final connectivityAsync = ref.watch(connectivityProvider);

  return connectivityAsync.when(
    data: (results) {
      if (results.contains(ConnectivityResult.wifi)) {
        return 'Connected via WiFi';
      } else if (results.contains(ConnectivityResult.mobile)) {
        return 'Connected via Mobile Data';
      } else if (results.contains(ConnectivityResult.ethernet)) {
        return 'Connected via Ethernet';
      } else if (results.contains(ConnectivityResult.none)) {
        return 'No Internet Connection';
      } else {
        return 'Unknown Connection';
      }
    },
    loading: () => 'Checking connection...',
    error: (_, __) => 'Connection Error',
  );
});
