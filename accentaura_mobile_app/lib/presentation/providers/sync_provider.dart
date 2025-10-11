import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/sync_service.dart';
import '../../data/services/cache_service.dart';
import '../../data/services/api_service.dart';
import 'connectivity_provider.dart';
import '../../core/utils/logger.dart';

/// Provider for SyncService
final syncServiceProvider = Provider<SyncService>((ref) {
  final cacheService = ref.watch(cacheServiceProvider);
  final apiService = ref.watch(apiServiceProvider);
  
  final syncService = SyncService(
    cacheService: cacheService,
    apiService: apiService,
  );

  // Initialize sync service
  syncService.initialize();

  // Listen for connectivity changes and trigger sync
  ref.listen(isOnlineProvider, (previous, next) {
    if (previous == false && next == true) {
      Logger.info('Connectivity restored, triggering sync', tag: 'SyncProvider');
      syncService.onConnectivityRestored();
    }
  });

  // Dispose when provider is disposed
  ref.onDispose(() {
    syncService.dispose();
  });

  return syncService;
});

/// Provider for pending update count
final pendingUpdateCountProvider = FutureProvider<int>((ref) async {
  final syncService = ref.watch(syncServiceProvider);
  return await syncService.getPendingUpdateCount();
});

/// Provider for sync status
final syncStatusProvider = StateProvider<SyncStatus>((ref) {
  return SyncStatus.idle;
});

/// Enum for sync status
enum SyncStatus {
  idle,
  syncing,
  success,
  error,
}

/// Provider for triggering manual sync
final manualSyncProvider = FutureProvider.autoDispose<bool>((ref) async {
  final syncService = ref.watch(syncServiceProvider);
  final isOnline = ref.watch(isOnlineProvider);

  if (!isOnline) {
    Logger.warning('Cannot sync while offline', tag: 'ManualSyncProvider');
    return false;
  }

  Logger.info('Manual sync triggered', tag: 'ManualSyncProvider');
  return await syncService.syncPendingUpdates();
});

/// Provider for cache service (placeholder - should be defined elsewhere)
final cacheServiceProvider = Provider<CacheService>((ref) {
  throw UnimplementedError('CacheService provider not implemented');
});

/// Provider for API service (placeholder - should be defined elsewhere)
final apiServiceProvider = Provider<ApiService>((ref) {
  throw UnimplementedError('ApiService provider not implemented');
});
