import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'logger.dart';
import 'error_handler.dart';

/// Centralized permission handling utility
/// Handles requesting and checking permissions with user-friendly dialogs
class PermissionManager {
  /// Request camera permission with explanation
  static Future<bool> requestCameraPermission(BuildContext context) async {
    return await _requestPermission(
      context,
      Permission.camera,
      'Camera Access',
      'AccentAura needs access to your camera to record video for interview practice.',
      'camera',
    );
  }

  /// Request microphone permission with explanation
  static Future<bool> requestMicrophonePermission(BuildContext context) async {
    return await _requestPermission(
      context,
      Permission.microphone,
      'Microphone Access',
      'AccentAura needs access to your microphone to record your speech for pronunciation practice.',
      'microphone',
    );
  }

  /// Request both camera and microphone permissions
  static Future<bool> requestCameraAndMicrophonePermissions(
    BuildContext context,
  ) async {
    if (!context.mounted) return false;
    final cameraGranted = await requestCameraPermission(context);
    if (!cameraGranted) return false;

    if (!context.mounted) return false;
    final microphoneGranted = await requestMicrophonePermission(context);
    return microphoneGranted;
  }

  /// Request storage permission with explanation
  static Future<bool> requestStoragePermission(BuildContext context) async {
    return await _requestPermission(
      context,
      Permission.storage,
      'Storage Access',
      'AccentAura needs access to storage to save your recordings and cache lesson content.',
      'storage',
    );
  }

  /// Check if camera permission is granted
  static Future<bool> hasCameraPermission() async {
    return await Permission.camera.isGranted;
  }

  /// Check if microphone permission is granted
  static Future<bool> hasMicrophonePermission() async {
    return await Permission.microphone.isGranted;
  }

  /// Check if storage permission is granted
  static Future<bool> hasStoragePermission() async {
    return await Permission.storage.isGranted;
  }

  /// Generic permission request with explanation dialog
  static Future<bool> _requestPermission(
    BuildContext context,
    Permission permission,
    String title,
    String explanation,
    String permissionName,
  ) async {
    try {
      // Check current status
      final status = await permission.status;

      // If already granted, return true
      if (status.isGranted) {
        Logger.info('$permissionName permission already granted', tag: 'PermissionManager');
        return true;
      }

      // If permanently denied, show settings dialog
      if (status.isPermanentlyDenied) {
        if (context.mounted) {
          return await _showSettingsDialog(context, title, explanation);
        }
        return false;
      }

      // If denied but not permanently, show explanation dialog
      if (status.isDenied) {
        if (context.mounted) {
          final shouldRequest = await _showExplanationDialog(
            context,
            title,
            explanation,
          );

          if (!shouldRequest) {
            Logger.info('User declined $permissionName permission', tag: 'PermissionManager');
            return false;
          }
        }
      }

      // Request permission
      final result = await permission.request();

      if (result.isGranted) {
        Logger.info('$permissionName permission granted', tag: 'PermissionManager');
        return true;
      } else if (result.isPermanentlyDenied) {
        // Show settings dialog if permanently denied after request
        if (context.mounted) {
          return await _showSettingsDialog(context, title, explanation);
        }
      } else {
        Logger.warning('$permissionName permission denied', tag: 'PermissionManager');
        if (context.mounted) {
          ErrorHandler.showErrorSnackbar(
            context,
            PermissionException(
              '$title is required for this feature.',
              permission: permissionName,
            ),
          );
        }
      }

      return false;
    } catch (e) {
      Logger.error('Error requesting $permissionName permission', error: e, tag: 'PermissionManager');
      if (context.mounted) {
        ErrorHandler.showErrorSnackbar(
          context,
          'Failed to request permission. Please try again.',
        );
      }
      return false;
    }
  }

  /// Show explanation dialog before requesting permission
  static Future<bool> _showExplanationDialog(
    BuildContext context,
    String title,
    String explanation,
  ) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(title),
            content: Text(explanation),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Not Now'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Allow'),
              ),
            ],
          ),
        ) ??
        false;
  }

  /// Show settings dialog when permission is permanently denied
  static Future<bool> _showSettingsDialog(
    BuildContext context,
    String title,
    String explanation,
  ) async {
    final shouldOpenSettings = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('$title Required'),
            content: Text(
              '$explanation\n\nPermission has been denied. Please enable it in app settings.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Open Settings'),
              ),
            ],
          ),
        ) ??
        false;

    if (shouldOpenSettings) {
      final opened = await openAppSettings();
      Logger.info('Opened app settings: $opened', tag: 'PermissionManager');
      return false; // User needs to manually grant and return to app
    }

    return false;
  }

  /// Show a generic permission denied error
  static void showPermissionDeniedError(
    BuildContext context,
    String permissionName,
  ) {
    ErrorHandler.showErrorSnackbar(
      context,
      PermissionException(
        '$permissionName permission is required for this feature.',
        permission: permissionName,
      ),
    );
  }
}
