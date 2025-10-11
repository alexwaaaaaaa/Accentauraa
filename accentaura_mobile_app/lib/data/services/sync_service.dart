import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'cache_service.dart';
import 'api_service.dart' hide ProgressUpdate;
import '../../core/utils/logger.dart';

/// Service for synchronizing offline progress updates with the backend
/// Implements automatic retry with exponential backoff
class SyncService {
  final CacheService _cacheService;
  final ApiService _apiService;
  final Connectivity _connectivity;
  
  Timer? _periodicSyncTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _isSyncing = false;
  int _failedAttempts = 0;
  
  // Exponential backoff configuration
  static const int _maxRetries = 5;
  static const Duration _baseDelay = Duration(seconds: 1);
  static const Duration _maxDelay = Duration(seconds: 30);
  static const Duration _periodicSyncInterval = Duration(minutes: 5);

  SyncService({
    required CacheService cacheService,
    required ApiService apiService,
    Connectivity? connectivity,
  })  : _cacheService = cacheService,
        _apiService = apiService,
        _connectivity = connectivity ?? Connectivity();

  /// Initialize the sync service
  /// Starts periodic sync and listens for connectivity changes
  Future<void> initialize() async {
    // Start periodic sync timer
    startPeriodicSync();
    
    // Listen for connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (List<ConnectivityResult> results) {
        _onConnectivityChanged(results);
      },
    );
    
    // Perform initial sync if connected
    final connectivityResult = await _connectivity.checkConnectivity();
    if (_hasConnection(connectivityResult)) {
      await syncPendingUpdates();
    }
  }

  /// Start periodic sync timer (every 5 minutes)
  void startPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(_periodicSyncInterval, (_) {
      syncPendingUpdates();
    });
  }

  /// Stop periodic sync timer
  void stopPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = null;
  }

  /// Sync all pending progress updates with the backend
  /// Returns true if all updates were synced successfully
  Future<bool> syncPendingUpdates() async {
    // Prevent concurrent sync operations
    if (_isSyncing) {
      Logger.info('Sync already in progress, skipping', tag: 'SyncService');
      return false;
    }

    // Check connectivity
    final connectivityResult = await _connectivity.checkConnectivity();
    if (!_hasConnection(connectivityResult)) {
      Logger.info('No internet connection, skipping sync', tag: 'SyncService');
      return false;
    }

    _isSyncing = true;
    bool allSynced = true;

    try {
      final pendingUpdates = await _cacheService.getPendingUpdates();
      
      if (pendingUpdates.isEmpty) {
        Logger.info('No pending updates to sync', tag: 'SyncService');
        _failedAttempts = 0; // Reset failed attempts
        return true;
      }

      Logger.info('Syncing ${pendingUpdates.length} pending updates', tag: 'SyncService');

      for (final update in pendingUpdates) {
        try {
          // Send update to backend
          await (_apiService as dynamic).saveProgress(update);
          
          // Remove from queue on success
          await _cacheService.clearPendingUpdate(update.id);
          
          Logger.info('Successfully synced update: ${update.id}', tag: 'SyncService');
        } catch (e) {
          Logger.error('Failed to sync update ${update.id}: $e', tag: 'SyncService');
          allSynced = false;
          
          // Stop syncing on first failure to maintain order
          // Will retry later with exponential backoff
          break;
        }
      }

      if (allSynced) {
        _failedAttempts = 0;
        Logger.info('All pending updates synced successfully', tag: 'SyncService');
      } else {
        _failedAttempts++;
        _scheduleRetry();
      }

      return allSynced;
    } catch (e) {
      Logger.error('Error during sync: $e', tag: 'SyncService');
      _failedAttempts++;
      _scheduleRetry();
      return false;
    } finally {
      _isSyncing = false;
    }
  }

  /// Schedule a retry with exponential backoff
  void _scheduleRetry() {
    if (_failedAttempts >= _maxRetries) {
      Logger.warning('Max retry attempts reached, will retry on next periodic sync', tag: 'SyncService');
      _failedAttempts = 0; // Reset for next periodic sync
      return;
    }

    // Calculate delay with exponential backoff: baseDelay * 2^failedAttempts
    final delay = Duration(
      milliseconds: (_baseDelay.inMilliseconds * (1 << _failedAttempts))
          .clamp(0, _maxDelay.inMilliseconds),
    );

    Logger.info('Scheduling retry in ${delay.inSeconds} seconds (attempt ${_failedAttempts + 1}/$_maxRetries)', tag: 'SyncService');

    Timer(delay, () {
      syncPendingUpdates();
    });
  }

  /// Handle connectivity changes
  void _onConnectivityChanged(List<ConnectivityResult> results) {
    if (_hasConnection(results)) {
      Logger.info('Connectivity restored, triggering sync', tag: 'SyncService');
      onConnectivityRestored();
    } else {
      Logger.info('Connectivity lost', tag: 'SyncService');
    }
  }

  /// Called when connectivity is restored
  /// Triggers immediate sync of pending updates
  void onConnectivityRestored() {
    _failedAttempts = 0; // Reset failed attempts on connectivity restore
    syncPendingUpdates();
  }

  /// Check if there is an active internet connection
  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((result) => 
      result == ConnectivityResult.mobile ||
      result == ConnectivityResult.wifi ||
      result == ConnectivityResult.ethernet
    );
  }

  /// Get the number of pending updates waiting to be synced
  Future<int> getPendingUpdateCount() async {
    return await _cacheService.getPendingUpdateCount();
  }

  /// Check if sync is currently in progress
  bool get isSyncing => _isSyncing;

  /// Get the number of failed sync attempts
  int get failedAttempts => _failedAttempts;

  /// Dispose of resources
  Future<void> dispose() async {
    stopPeriodicSync();
    await _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }
}
