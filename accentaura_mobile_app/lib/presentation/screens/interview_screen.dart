import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../data/services/webrtc_service.dart';
import '../../data/services/audio_service.dart';
import '../../data/services/api_service.dart';
import '../../core/utils/logger.dart';
import 'interview_results_screen.dart';

/// Interview screen for AI video interview simulation
/// 
/// Implements Requirements 6.1, 6.2, 6.3, 6.4, and 6.7:
/// - Display camera preview showing user's front camera
/// - Show animated AI interviewer overlay
/// - Display question text at top
/// - Add timer for response time
/// - Record audio/video and submit for analysis
/// - Handle permission requests with explanations
/// - Provide settings navigation if permissions denied
class InterviewScreen extends StatefulWidget {
  const InterviewScreen({super.key});

  @override
  State<InterviewScreen> createState() => _InterviewScreenState();
}

class _InterviewScreenState extends State<InterviewScreen> {
  final WebRtcService _webRtcService = WebRtcService();
  final AudioService _audioService = AudioService();
  final ApiService _apiService = ApiService();
  
  bool _isInitializing = true;
  String? _errorMessage;
  
  // Interview state
  String? _sessionId;
  final String _currentQuestion = "Tell me about yourself and your background.";
  int _remainingSeconds = 120; // 2 minutes per question
  Timer? _timer;
  bool _isInterviewStarted = false;
  bool _isRecording = false;
  bool _isSubmitting = false;
  
  // Recording files
  File? _recordedAudioFile;
  File? _recordedVideoFile;

  @override
  void initState() {
    super.initState();
    _checkPermissionsAndInitialize();
  }

  /// Check permissions and initialize camera and audio
  Future<void> _checkPermissionsAndInitialize() async {
    setState(() {
      _isInitializing = true;
      _errorMessage = null;
    });

    try {
      // Check camera permission
      final cameraStatus = await Permission.camera.status;
      if (cameraStatus.isDenied) {
        final result = await _showPermissionDialog(
          'Camera Permission Required',
          'Interview mode needs access to your camera to record your responses. This helps the AI analyze your confidence and body language.',
          Permission.camera,
        );
        
        if (!result) {
          throw Exception('Camera permission denied');
        }
      } else if (cameraStatus.isPermanentlyDenied) {
        await _showSettingsDialog(
          'Camera Permission',
          'Camera permission is permanently denied. Please enable it in settings to use interview mode.',
        );
        throw Exception('Camera permission permanently denied');
      }

      // Check microphone permission
      final micStatus = await Permission.microphone.status;
      if (micStatus.isDenied) {
        final result = await _showPermissionDialog(
          'Microphone Permission Required',
          'Interview mode needs access to your microphone to record your voice responses for analysis.',
          Permission.microphone,
        );
        
        if (!result) {
          throw Exception('Microphone permission denied');
        }
      } else if (micStatus.isPermanentlyDenied) {
        await _showSettingsDialog(
          'Microphone Permission',
          'Microphone permission is permanently denied. Please enable it in settings to use interview mode.',
        );
        throw Exception('Microphone permission permanently denied');
      }

      // Initialize services
      await _webRtcService.initializeCamera(useFrontCamera: true);
      await _audioService.initialize();

      if (mounted) {
        setState(() {
          _isInitializing = false;
        });
      }
    } catch (e) {
      Logger.error('Failed to initialize interview screen', error: e);
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _errorMessage = _getErrorMessage(e);
        });
      }
    }
  }

  /// Show permission request dialog with explanation
  Future<bool> _showPermissionDialog(
    String title,
    String message,
    Permission permission,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Grant Permission'),
          ),
        ],
      ),
    );

    if (result == true) {
      final status = await permission.request();
      return status.isGranted;
    }

    return false;
  }

  /// Show settings dialog when permission is permanently denied
  Future<void> _showSettingsDialog(String title, String message) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  String _getErrorMessage(dynamic error) {
    final errorString = error.toString().toLowerCase();
    if (errorString.contains('camera permission')) {
      return 'Camera permission is required for interview mode.\nPlease grant permission in settings.';
    } else if (errorString.contains('microphone permission')) {
      return 'Microphone permission is required for interview mode.\nPlease grant permission in settings.';
    } else if (errorString.contains('no cameras available')) {
      return 'No camera found on this device.';
    } else {
      return 'Failed to initialize camera.\nPlease try again.';
    }
  }

  /// Start the interview session
  Future<void> _startInterview() async {
    try {
      // Start interview session with backend
      final session = await _apiService.startInterview();
      
      setState(() {
        _sessionId = session.sessionId;
        _isInterviewStarted = true;
        _remainingSeconds = 120;
      });
      
      _startTimer();
      Logger.info('Interview session started: $_sessionId');
    } catch (e) {
      Logger.error('Failed to start interview session', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start interview: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Start recording audio and video
  Future<void> _startRecording() async {
    if (_isRecording) return;

    try {
      setState(() {
        _isRecording = true;
      });

      // Start audio recording
      await _audioService.startRecording();
      
      // Start video recording
      await _webRtcService.startRecording();

      Logger.info('Recording started');
    } catch (e) {
      Logger.error('Failed to start recording', error: e);
      setState(() {
        _isRecording = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start recording: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Stop recording and save files
  Future<void> _stopRecording() async {
    if (!_isRecording) return;

    try {
      // Stop audio recording
      final audioFile = await _audioService.stopRecording();
      
      // Stop video recording
      final videoFile = await _webRtcService.stopRecording();

      setState(() {
        _isRecording = false;
        _recordedAudioFile = audioFile;
        _recordedVideoFile = videoFile;
      });

      Logger.info('Recording stopped - Audio: ${audioFile.path}, Video: ${videoFile.path}');
      
      // Show submission confirmation
      _showSubmissionDialog();
    } catch (e) {
      Logger.error('Failed to stop recording', error: e);
      setState(() {
        _isRecording = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to stop recording: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show dialog to confirm submission
  Future<void> _showSubmissionDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit Response?'),
        content: const Text(
          'Your response has been recorded. Would you like to submit it for analysis?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Re-record'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (result == true) {
      await _submitInterview();
    } else {
      // Clear recorded files for re-recording
      setState(() {
        _recordedAudioFile = null;
        _recordedVideoFile = null;
      });
    }
  }

  /// Submit interview recording to backend for analysis
  Future<void> _submitInterview() async {
    if (_sessionId == null || _recordedAudioFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No recording to submit'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Submit to backend
      final result = await _apiService.submitInterview(
        _sessionId!,
        _recordedAudioFile!,
        _recordedVideoFile,
      );

      Logger.info('Interview submitted successfully');

      if (mounted) {
        // Navigate to results screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => InterviewResultsScreen(result: result),
          ),
        );
      }
    } catch (e) {
      Logger.error('Failed to submit interview', error: e);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit interview: ${e.toString()}'),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Retry',
              onPressed: _submitInterview,
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        _timer?.cancel();
      }
    });
  }

  String _formatTime(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    // Properly dispose all resources to prevent memory leaks
    _timer?.cancel();
    _timer = null;
    
    // Dispose services asynchronously
    _webRtcService.dispose().catchError((e) {
      Logger.error('Error disposing WebRtcService', error: e);
    });
    
    _audioService.dispose().catchError((e) {
      Logger.error('Error disposing AudioService', error: e);
    });
    
    _apiService.dispose();
    
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Interview Mode'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isInitializing) {
      return _buildLoadingView();
    }

    if (_errorMessage != null) {
      return _buildErrorView();
    }

    if (!_webRtcService.isInitialized) {
      return _buildErrorView();
    }

    return _buildInterviewView();
  }

  Widget _buildLoadingView() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: Colors.white),
          SizedBox(height: 16),
          Text(
            'Initializing camera...',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'An error occurred',
              style: const TextStyle(color: Colors.white, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _checkPermissionsAndInitialize,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInterviewView() {
    return Stack(
      children: [
        // Camera preview (full screen)
        _buildCameraPreview(),
        
        // Question text at top
        _buildQuestionOverlay(),
        
        // AI interviewer overlay
        _buildAIInterviewerOverlay(),
        
        // Timer overlay
        _buildTimerOverlay(),
        
        // Start/Control buttons
        if (!_isInterviewStarted) 
          _buildStartButton()
        else
          _buildRecordingControls(),
        
        // Submitting overlay
        if (_isSubmitting) _buildSubmittingOverlay(),
      ],
    );
  }

  Widget _buildCameraPreview() {
    final controller = _webRtcService.cameraController;
    if (controller == null || !controller.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return SizedBox.expand(
      child: FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: controller.value.previewSize?.height ?? 1,
          height: controller.value.previewSize?.width ?? 1,
          child: CameraPreview(controller),
        ),
      ),
    );
  }

  Widget _buildQuestionOverlay() {
    if (!_isInterviewStarted) return const SizedBox.shrink();

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withValues(alpha: 0.7),
              Colors.transparent,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Question:',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _currentQuestion,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAIInterviewerOverlay() {
    if (!_isInterviewStarted) return const SizedBox.shrink();

    return Positioned(
      bottom: 100,
      right: 16,
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          color: Colors.blue.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.blue, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.person,
              size: 48,
              color: Colors.blue.shade200,
            ),
            const SizedBox(height: 8),
            Text(
              'AI Interviewer',
              style: TextStyle(
                color: Colors.blue.shade200,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimerOverlay() {
    if (!_isInterviewStarted) return const SizedBox.shrink();

    final isLowTime = _remainingSeconds <= 30;
    
    return Positioned(
      top: 16,
      right: 16,
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isLowTime ? Colors.red.withValues(alpha: 0.9) : Colors.black.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isLowTime ? Colors.red : Colors.white,
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                _formatTime(_remainingSeconds),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStartButton() {
    return Positioned(
      bottom: 40,
      left: 0,
      right: 0,
      child: Center(
        child: ElevatedButton.icon(
          onPressed: _startInterview,
          icon: const Icon(Icons.play_arrow),
          label: const Text(
            'Start Interview',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(30),
            ),
          ),
        ),
      ),
    );
  }

  /// Build recording controls (record/stop button)
  Widget _buildRecordingControls() {
    return Positioned(
      bottom: 40,
      left: 0,
      right: 0,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Recording status indicator
            if (_isRecording)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Recording...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            
            // Record/Stop button
            GestureDetector(
              onTap: _isRecording ? _stopRecording : _startRecording,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isRecording ? Colors.red : Colors.white,
                  border: Border.all(
                    color: _isRecording ? Colors.white : Colors.red,
                    width: 4,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  _isRecording ? Icons.stop : Icons.mic,
                  size: 40,
                  color: _isRecording ? Colors.white : Colors.red,
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Instruction text
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _isRecording 
                    ? 'Tap to stop recording' 
                    : 'Tap to start recording your response',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build submitting overlay
  Widget _buildSubmittingOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.7),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 3,
            ),
            SizedBox(height: 24),
            Text(
              'Submitting your response...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'This may take a few moments',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
