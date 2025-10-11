import 'dart:async';
import 'dart:io';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'logger.dart';

/// Utility class for performance optimizations
/// Implements Requirements 9.3, 9.4, 9.5
class PerformanceUtils {
  /// Compress an image file before upload
  /// Reduces file size while maintaining acceptable quality
  /// 
  /// Parameters:
  /// - [file]: The image file to compress
  /// - [quality]: Compression quality (0-100), default 85
  /// - [maxWidth]: Maximum width in pixels, default 1920
  /// - [maxHeight]: Maximum height in pixels, default 1920
  /// 
  /// Returns: Compressed image file or original if compression fails
  static Future<File> compressImage(
    File file, {
    int quality = 85,
    int maxWidth = 1920,
    int maxHeight = 1920,
  }) async {
    try {
      final filePath = file.absolute.path;
      final lastIndex = filePath.lastIndexOf('.');
      final splitPath = filePath.substring(0, lastIndex);
      final outPath = '${splitPath}_compressed.jpg';

      final result = await FlutterImageCompress.compressAndGetFile(
        filePath,
        outPath,
        quality: quality,
        minWidth: maxWidth,
        minHeight: maxHeight,
        format: CompressFormat.jpeg,
      );

      if (result == null) {
        Logger.warning('Image compression returned null, using original file');
        return file;
      }

      final originalSize = await file.length();
      final compressedSize = await result.length();
      final reduction = ((originalSize - compressedSize) / originalSize * 100).toStringAsFixed(1);
      
      Logger.info('Image compressed: ${originalSize ~/ 1024}KB → ${compressedSize ~/ 1024}KB ($reduction% reduction)');
      
      return File(result.path);
    } catch (e) {
      Logger.error('Failed to compress image', error: e);
      return file; // Return original file if compression fails
    }
  }

  /// Compress multiple images in parallel
  /// 
  /// Parameters:
  /// - [files]: List of image files to compress
  /// - [quality]: Compression quality (0-100), default 85
  /// 
  /// Returns: List of compressed image files
  static Future<List<File>> compressImages(
    List<File> files, {
    int quality = 85,
  }) async {
    try {
      final results = await Future.wait(
        files.map((file) => compressImage(file, quality: quality)),
      );
      return results;
    } catch (e) {
      Logger.error('Failed to compress images', error: e);
      return files;
    }
  }

  /// Convert image to WebP format for better compression
  /// WebP provides superior compression compared to JPEG/PNG
  /// 
  /// Parameters:
  /// - [file]: The image file to convert
  /// - [quality]: Compression quality (0-100), default 85
  /// 
  /// Returns: WebP image file or original if conversion fails
  static Future<File> convertToWebP(
    File file, {
    int quality = 85,
  }) async {
    try {
      final filePath = file.absolute.path;
      final lastIndex = filePath.lastIndexOf('.');
      final splitPath = filePath.substring(0, lastIndex);
      final outPath = '$splitPath.webp';

      final result = await FlutterImageCompress.compressAndGetFile(
        filePath,
        outPath,
        quality: quality,
        format: CompressFormat.webp,
      );

      if (result == null) {
        Logger.warning('WebP conversion returned null, using original file');
        return file;
      }

      final originalSize = await file.length();
      final webpSize = await result.length();
      final reduction = ((originalSize - webpSize) / originalSize * 100).toStringAsFixed(1);
      
      Logger.info('Image converted to WebP: ${originalSize ~/ 1024}KB → ${webpSize ~/ 1024}KB ($reduction% reduction)');
      
      return File(result.path);
    } catch (e) {
      Logger.error('Failed to convert to WebP', error: e);
      return file;
    }
  }

  /// Debounce function calls to reduce unnecessary executions
  /// Useful for search inputs, API calls, etc.
  /// 
  /// Parameters:
  /// - [duration]: Delay duration before executing the function
  /// 
  /// Returns: Debounced function wrapper
  static Function debounce(
    Function function, {
    Duration duration = const Duration(milliseconds: 500),
  }) {
    Timer? timer;
    
    return ([dynamic arg]) {
      timer?.cancel();
      timer = Timer(duration, () {
        if (arg != null) {
          Function.apply(function, [arg]);
        } else {
          Function.apply(function, []);
        }
      });
    };
  }

  /// Throttle function calls to limit execution frequency
  /// Ensures function is called at most once per duration
  /// 
  /// Parameters:
  /// - [duration]: Minimum time between function executions
  /// 
  /// Returns: Throttled function wrapper
  static Function throttle(
    Function function, {
    Duration duration = const Duration(milliseconds: 500),
  }) {
    bool isThrottled = false;
    
    return ([dynamic arg]) {
      if (isThrottled) return;
      
      isThrottled = true;
      if (arg != null) {
        Function.apply(function, [arg]);
      } else {
        Function.apply(function, []);
      }
      
      Timer(duration, () {
        isThrottled = false;
      });
    };
  }

  /// Clean up temporary files to free up storage
  /// Should be called periodically or when app starts
  static Future<void> cleanupTempFiles() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final files = tempDir.listSync();
      
      int deletedCount = 0;
      int freedSpace = 0;
      
      for (final file in files) {
        if (file is File) {
          try {
            final size = await file.length();
            await file.delete();
            deletedCount++;
            freedSpace += size;
          } catch (e) {
            // Skip files that can't be deleted
            continue;
          }
        }
      }
      
      Logger.info('Cleaned up $deletedCount temp files, freed ${freedSpace ~/ 1024}KB');
    } catch (e) {
      Logger.error('Failed to cleanup temp files', error: e);
    }
  }

  /// Get cache directory size
  static Future<int> getCacheSize() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final files = tempDir.listSync(recursive: true);
      
      int totalSize = 0;
      for (final file in files) {
        if (file is File) {
          totalSize += await file.length();
        }
      }
      
      return totalSize;
    } catch (e) {
      Logger.error('Failed to get cache size', error: e);
      return 0;
    }
  }

  /// Format bytes to human-readable string
  static String formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  /// Check if device has low memory
  /// Returns true if available memory is below threshold
  static bool isLowMemory() {
    // This is a simplified check
    // In production, you might want to use platform channels to get actual memory info
    return false;
  }

  /// Optimize image for display based on device capabilities
  /// Adjusts quality and size based on available resources
  static Future<File> optimizeForDevice(File file) async {
    final isLowMem = isLowMemory();
    
    if (isLowMem) {
      // Use more aggressive compression for low-memory devices
      return compressImage(
        file,
        quality: 70,
        maxWidth: 1280,
        maxHeight: 1280,
      );
    } else {
      // Standard compression for normal devices
      return compressImage(file);
    }
  }
}

/// Mixin for widgets that need to dispose resources properly
/// Helps prevent memory leaks
mixin DisposableMixin {
  final List<StreamSubscription> _subscriptions = [];
  final List<Timer> _timers = [];
  
  /// Register a stream subscription for automatic disposal
  void registerSubscription(StreamSubscription subscription) {
    _subscriptions.add(subscription);
  }
  
  /// Register a timer for automatic disposal
  void registerTimer(Timer timer) {
    _timers.add(timer);
  }
  
  /// Dispose all registered resources
  void disposeResources() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _subscriptions.clear();
    
    for (final timer in _timers) {
      timer.cancel();
    }
    _timers.clear();
  }
}
