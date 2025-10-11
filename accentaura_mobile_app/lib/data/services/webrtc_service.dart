import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/utils/logger.dart';

/// Enum representing the current video recording status
enum VideoRecordingStatus {
  idle,
  initializing,
  ready,
  recording,
  paused,
  stopped,
  error,
}

/// Service for handling video recording using camera
/// Implements Requirements 6.1 (Camera Preview) and 6.3 (Video Recording)
class WebRtcService {
  CameraController? _cameraController;
  List<CameraDescription>? _availableCameras;
  
  final StreamController<VideoRecordingStatus> _statusController =
      StreamController<VideoRecordingStatus>.broadcast();
  
  VideoRecordingStatus _currentStatus = VideoRecordingStatus.idle;
  String? _currentRecordingPath;
  bool _isInitialized = false;

  /// Stream of video recording status updates
  Stream<VideoRecordingStatus> get statusStream => _statusController.stream;
  
  /// Current video recording status
  VideoRecordingStatus get status => _currentStatus;
  
  /// Get the camera controller for rendering preview
  CameraController? get cameraController => _cameraController;
  
  /// Check if the service is initialized and ready
  bool get isInitialized => _isInitialized && _cameraController?.value.isInitialized == true;

  /// Initialize the camera
  /// By default, initializes the front camera for interview mode
  Future<void> initializeCamera({bool useFrontCamera = true}) async {
    if (_isInitialized) {
      Logger.info('WebRtcService already initialized');
      return;
    }

    _updateStatus(VideoRecordingStatus.initializing);

    try {
      // Request camera permission
      final cameraPermission = await Permission.camera.request();
      if (!cameraPermission.isGranted) {
        throw Exception('Camera permission not granted');
      }

      // Request microphone permission for video with audio
      final micPermission = await Permission.microphone.request();
      if (!micPermission.isGranted) {
        throw Exception('Microphone permission not granted');
      }

      // Get available cameras
      _availableCameras = await availableCameras();
      
      if (_availableCameras == null || _availableCameras!.isEmpty) {
        throw Exception('No cameras available on this device');
      }

      // Select camera based on preference
      CameraDescription selectedCamera;
      if (useFrontCamera) {
        selectedCamera = _availableCameras!.firstWhere(
          (camera) => camera.lensDirection == CameraLensDirection.front,
          orElse: () => _availableCameras!.first,
        );
      } else {
        selectedCamera = _availableCameras!.firstWhere(
          (camera) => camera.lensDirection == CameraLensDirection.back,
          orElse: () => _availableCameras!.first,
        );
      }

      // Initialize camera controller
      _cameraController = CameraController(
        selectedCamera,
        ResolutionPreset.high,
        enableAudio: true,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();

      _isInitialized = true;
      _updateStatus(VideoRecordingStatus.ready);
      Logger.info('WebRtcService initialized successfully with ${selectedCamera.lensDirection} camera');
    } catch (e) {
      Logger.error('Failed to initialize WebRtcService', error: e);
      _updateStatus(VideoRecordingStatus.error);
      rethrow;
    }
  }

  /// Switch between front and back camera
  Future<void> switchCamera() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (_currentStatus == VideoRecordingStatus.recording) {
      throw Exception('Cannot switch camera while recording');
    }

    try {
      final currentLensDirection = _cameraController!.description.lensDirection;
      final newLensDirection = currentLensDirection == CameraLensDirection.front
          ? CameraLensDirection.back
          : CameraLensDirection.front;

      final newCamera = _availableCameras!.firstWhere(
        (camera) => camera.lensDirection == newLensDirection,
        orElse: () => throw Exception('Camera not found'),
      );

      // Dispose current controller
      await _cameraController!.dispose();

      // Initialize new controller
      _cameraController = CameraController(
        newCamera,
        ResolutionPreset.high,
        enableAudio: true,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();
      _updateStatus(VideoRecordingStatus.ready);
      Logger.info('Switched to $newLensDirection camera');
    } catch (e) {
      Logger.error('Failed to switch camera', error: e);
      _updateStatus(VideoRecordingStatus.error);
      rethrow;
    }
  }

  /// Start recording video
  /// Returns the path where the recording will be saved
  Future<String> startRecording() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (!_cameraController!.value.isInitialized) {
      throw Exception('Camera not initialized');
    }

    if (_cameraController!.value.isRecordingVideo) {
      throw Exception('Already recording');
    }

    try {
      // Generate a unique file path for the recording
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      _currentRecordingPath = '${directory.path}/video_$timestamp.mp4';

      // Start recording
      await _cameraController!.startVideoRecording();

      _updateStatus(VideoRecordingStatus.recording);
      Logger.info('Video recording started: $_currentRecordingPath');

      return _currentRecordingPath!;
    } catch (e) {
      Logger.error('Failed to start video recording', error: e);
      _updateStatus(VideoRecordingStatus.error);
      rethrow;
    }
  }

  /// Stop recording and return the recorded file
  Future<File> stopRecording() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (!_cameraController!.value.isRecordingVideo) {
      throw Exception('No active recording to stop');
    }

    try {
      final videoFile = await _cameraController!.stopVideoRecording();
      _updateStatus(VideoRecordingStatus.stopped);

      // Move the file to our desired location if needed
      final file = File(videoFile.path);
      
      if (_currentRecordingPath != null && videoFile.path != _currentRecordingPath) {
        final targetFile = File(_currentRecordingPath!);
        await file.copy(targetFile.path);
        await file.delete();
        Logger.info('Video recording stopped and saved: $_currentRecordingPath');
        return targetFile;
      }

      Logger.info('Video recording stopped: ${file.path}');
      return file;
    } catch (e) {
      Logger.error('Failed to stop video recording', error: e);
      _updateStatus(VideoRecordingStatus.error);
      rethrow;
    }
  }

  /// Pause the current video recording
  Future<void> pauseRecording() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (!_cameraController!.value.isRecordingVideo) {
      throw Exception('No active recording to pause');
    }

    try {
      await _cameraController!.pauseVideoRecording();
      _updateStatus(VideoRecordingStatus.paused);
      Logger.info('Video recording paused');
    } catch (e) {
      Logger.error('Failed to pause video recording', error: e);
      rethrow;
    }
  }

  /// Resume a paused video recording
  Future<void> resumeRecording() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (!_cameraController!.value.isRecordingPaused) {
      throw Exception('No paused recording to resume');
    }

    try {
      await _cameraController!.resumeVideoRecording();
      _updateStatus(VideoRecordingStatus.recording);
      Logger.info('Video recording resumed');
    } catch (e) {
      Logger.error('Failed to resume video recording', error: e);
      rethrow;
    }
  }

  /// Take a snapshot/photo from the camera
  Future<File> takePhoto() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    if (!_cameraController!.value.isInitialized) {
      throw Exception('Camera not initialized');
    }

    try {
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final path = '${directory.path}/photo_$timestamp.jpg';

      final image = await _cameraController!.takePicture();
      final file = File(image.path);
      
      // Move to desired location
      final targetFile = File(path);
      await file.copy(targetFile.path);
      await file.delete();

      Logger.info('Photo taken: $path');
      return targetFile;
    } catch (e) {
      Logger.error('Failed to take photo', error: e);
      rethrow;
    }
  }

  /// Set the flash mode for the camera
  Future<void> setFlashMode(FlashMode mode) async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    try {
      await _cameraController!.setFlashMode(mode);
      Logger.info('Flash mode set to: $mode');
    } catch (e) {
      Logger.error('Failed to set flash mode', error: e);
      rethrow;
    }
  }

  /// Set the zoom level (1.0 = no zoom)
  Future<void> setZoomLevel(double zoom) async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    try {
      final maxZoom = await _cameraController!.getMaxZoomLevel();
      final minZoom = await _cameraController!.getMinZoomLevel();
      final clampedZoom = zoom.clamp(minZoom, maxZoom);
      
      await _cameraController!.setZoomLevel(clampedZoom);
      Logger.info('Zoom level set to: $clampedZoom');
    } catch (e) {
      Logger.error('Failed to set zoom level', error: e);
      rethrow;
    }
  }

  /// Get the current zoom level
  Future<double> getZoomLevel() async {
    if (!_isInitialized || _cameraController == null) {
      throw Exception('WebRtcService not initialized');
    }

    try {
      // Camera package doesn't provide a direct method to get current zoom
      // This would need to be tracked manually if needed
      return 1.0;
    } catch (e) {
      Logger.error('Failed to get zoom level', error: e);
      return 1.0;
    }
  }

  /// Update status and notify listeners
  void _updateStatus(VideoRecordingStatus status) {
    _currentStatus = status;
    _statusController.add(status);
  }

  /// Dispose of resources
  Future<void> dispose() async {
    try {
      if (_cameraController != null) {
        if (_cameraController!.value.isRecordingVideo) {
          await _cameraController!.stopVideoRecording();
        }
        await _cameraController!.dispose();
        _cameraController = null;
      }
      await _statusController.close();
      _isInitialized = false;
      Logger.info('WebRtcService disposed');
    } catch (e) {
      Logger.error('Error disposing WebRtcService', error: e);
    }
  }
}
