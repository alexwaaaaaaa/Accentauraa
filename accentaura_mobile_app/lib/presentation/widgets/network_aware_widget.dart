import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/connectivity_provider.dart';
import '../../core/utils/error_handler.dart';

/// Widget that displays offline indicator when network is unavailable
/// Wraps child widget and shows a banner at the top when offline
class NetworkAwareWidget extends ConsumerStatefulWidget {
  final Widget child;
  final bool showOfflineBanner;

  const NetworkAwareWidget({
    super.key,
    required this.child,
    this.showOfflineBanner = true,
  });

  @override
  ConsumerState<NetworkAwareWidget> createState() => _NetworkAwareWidgetState();
}

class _NetworkAwareWidgetState extends ConsumerState<NetworkAwareWidget> {
  bool? _previousOnlineStatus;

  @override
  Widget build(BuildContext context) {
    final isOnline = ref.watch(isOnlineProvider);

    // Show snackbar when connectivity changes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_previousOnlineStatus != null && _previousOnlineStatus != isOnline) {
        if (isOnline) {
          ErrorHandler.showOnlineSnackbar(context);
        } else {
          ErrorHandler.showOfflineSnackbar(context);
        }
      }
      _previousOnlineStatus = isOnline;
    });

    return Column(
      children: [
        if (!isOnline && widget.showOfflineBanner)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            color: Colors.orange.shade700,
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.cloud_off, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text(
                  'Offline Mode',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}

/// Mixin for screens that need to handle connectivity changes
mixin ConnectivityAware<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  bool? _previousOnlineStatus;

  /// Called when connectivity changes
  void onConnectivityChanged(bool isOnline) {
    // Override in subclass to handle connectivity changes
  }

  /// Monitor connectivity and call onConnectivityChanged
  void monitorConnectivity() {
    ref.listen(isOnlineProvider, (previous, next) {
      if (_previousOnlineStatus != null && _previousOnlineStatus != next) {
        onConnectivityChanged(next);
        
        if (mounted) {
          if (next) {
            ErrorHandler.showOnlineSnackbar(context);
          } else {
            ErrorHandler.showOfflineSnackbar(context);
          }
        }
      }
      _previousOnlineStatus = next;
    });
  }

  /// Check if device is currently online
  bool get isOnline => ref.read(isOnlineProvider);

  /// Show offline error if not connected
  void showOfflineErrorIfNeeded() {
    if (!isOnline && mounted) {
      ErrorHandler.showOfflineSnackbar(context);
    }
  }
}
