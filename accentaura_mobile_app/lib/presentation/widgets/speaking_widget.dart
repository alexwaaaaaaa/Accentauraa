import 'package:flutter/material.dart';
import 'dart:io';
import '../../data/models/activity.dart';
import '../../data/services/audio_service.dart';
import '../../data/services/api_service.dart';
import '../../core/utils/logger.dart';

/// Widget for displaying speaking activities
/// Implements Requirement 4.6: Speaking activity with record button, waveform, score display
class SpeakingWidget extends StatefulWidget {
  final SpeakingActivity activity;
  final AudioService audioService;
  final ApiService apiService;
  final VoidCallback? onComplete;

  const SpeakingWidget({
    super.key,
    required this.activity,
    required this.audioService,
    required this.apiService,
    this.onComplete,
  });

  @override
  State<SpeakingWidget> createState() => _SpeakingWidgetState();
}

class _SpeakingWidgetState extends State<SpeakingWidget>
    with SingleTickerProviderStateMixin {
  bool _isRecording = false;
  bool _hasRecorded = false;
  bool _isAnalyzing = false;
  File? _recordedFile;
  double? _score;
  String? _feedback;
  late AnimationController _waveformController;

  @override
  void initState() {
    super.initState();
    _setupRecordingListener();
    _waveformController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _waveformController.dispose();
    super.dispose();
  }

  /// Set up recording status listener
  void _setupRecordingListener() {
    widget.audioService.recordingStream.listen((status) {
      if (mounted) {
        setState(() {
          _isRecording = status == RecordingStatus.recording;
        });
      }
    });
  }

  /// Start recording
  Future<void> _startRecording() async {
    try {
      await widget.audioService.startRecording();
      setState(() {
        _isRecording = true;
        _hasRecorded = false;
        _score = null;
        _feedback = null;
      });
      Logger.info('Started recording for speaking activity');
    } catch (e) {
      Logger.error('Failed to start recording', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start recording: ${e.toString()}')),
        );
      }
    }
  }

  /// Stop recording
  Future<void> _stopRecording() async {
    try {
      final file = await widget.audioService.stopRecording();
      setState(() {
        _isRecording = false;
        _hasRecorded = true;
        _recordedFile = file;
      });
      Logger.info('Stopped recording: ${file.path}');
    } catch (e) {
      Logger.error('Failed to stop recording', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to stop recording: ${e.toString()}')),
        );
      }
    }
  }

  /// Play recorded audio
  Future<void> _playRecording() async {
    if (_recordedFile == null) return;

    try {
      await widget.audioService.playAudio(_recordedFile!.path);
      Logger.info('Playing recorded audio');
    } catch (e) {
      Logger.error('Failed to play recording', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to play recording')),
        );
      }
    }
  }

  /// Submit recording for analysis
  Future<void> _submitRecording() async {
    if (_recordedFile == null) return;

    setState(() {
      _isAnalyzing = true;
    });

    try {
      // Send audio to backend for analysis
      final analysis = await widget.apiService.analyzeSpeech(_recordedFile!);
      
      setState(() {
        _score = analysis.score;
        _feedback = analysis.feedback;
        _isAnalyzing = false;
      });

      Logger.info('Speech analysis received: score=$_score');

      // Auto-advance after showing result
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          widget.onComplete?.call();
        }
      });
    } catch (e) {
      Logger.error('Failed to analyze speech', error: e);
      setState(() {
        _isAnalyzing = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to analyze speech: ${e.toString()}')),
        );
      }
    }
  }

  /// Retry recording
  void _retryRecording() {
    setState(() {
      _hasRecorded = false;
      _recordedFile = null;
      _score = null;
      _feedback = null;
    });
    Logger.debug('Speaking activity reset for retry');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Instructions
            Card(
              elevation: 2,
              color: colorScheme.primaryContainer,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(
                      Icons.mic,
                      color: colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Read the prompt aloud and record your voice',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Prompt
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(
                      Icons.format_quote,
                      size: 40,
                      color: colorScheme.primary.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.activity.prompt,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Recording area
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Container(
                padding: const EdgeInsets.all(32.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colorScheme.primaryContainer,
                      colorScheme.secondaryContainer,
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    // Waveform visualization (animated when recording)
                    if (_isRecording)
                      AnimatedBuilder(
                        animation: _waveformController,
                        builder: (context, child) {
                          return Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: List.generate(5, (index) {
                              final height = 20.0 +
                                  (40.0 * _waveformController.value) *
                                      (index % 2 == 0 ? 1 : 0.7);
                              return Container(
                                width: 8,
                                height: height,
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                decoration: BoxDecoration(
                                  color: colorScheme.primary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              );
                            }),
                          );
                        },
                      )
                    else
                      Icon(
                        _hasRecorded ? Icons.check_circle : Icons.mic_none,
                        size: 80,
                        color: _hasRecorded
                            ? Colors.green
                            : colorScheme.primary.withValues(alpha: 0.5),
                      ),

                    const SizedBox(height: 24),

                    // Recording status text
                    Text(
                      _isRecording
                          ? 'Recording...'
                          : _hasRecorded
                              ? 'Recording complete'
                              : 'Tap to start recording',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Record button
                    if (!_hasRecorded && !_isAnalyzing)
                      GestureDetector(
                        onTapDown: (_) => _startRecording(),
                        onTapUp: (_) => _stopRecording(),
                        onTapCancel: () => _stopRecording(),
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isRecording ? Colors.red : colorScheme.primary,
                            boxShadow: [
                              BoxShadow(
                                color: (_isRecording ? Colors.red : colorScheme.primary)
                                    .withValues(alpha: 0.3),
                                blurRadius: 20,
                                spreadRadius: 5,
                              ),
                            ],
                          ),
                          child: Icon(
                            _isRecording ? Icons.stop : Icons.mic,
                            size: 40,
                            color: Colors.white,
                          ),
                        ),
                      ),

                    // Playback and submit buttons
                    if (_hasRecorded && !_isAnalyzing) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Play button
                          IconButton(
                            onPressed: _playRecording,
                            icon: const Icon(Icons.play_arrow),
                            iconSize: 32,
                            tooltip: 'Play recording',
                            color: colorScheme.primary,
                          ),
                          const SizedBox(width: 16),
                          // Retry button
                          IconButton(
                            onPressed: _retryRecording,
                            icon: const Icon(Icons.refresh),
                            iconSize: 32,
                            tooltip: 'Record again',
                            color: colorScheme.primary,
                          ),
                        ],
                      ),
                    ],

                    // Analyzing indicator
                    if (_isAnalyzing) ...[
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        'Analyzing your speech...',
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onPrimaryContainer.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Score display
            if (_score != null) ...[
              Card(
                elevation: 2,
                color: _score! >= 70
                    ? Colors.green.withValues(alpha: 0.1)
                    : _score! >= 50
                        ? Colors.orange.withValues(alpha: 0.1)
                        : Colors.red.withValues(alpha: 0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: _score! >= 70
                        ? Colors.green
                        : _score! >= 50
                            ? Colors.orange
                            : Colors.red,
                    width: 2,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _score! >= 70
                                ? Icons.star
                                : _score! >= 50
                                    ? Icons.thumb_up
                                    : Icons.info_outline,
                            color: _score! >= 70
                                ? Colors.green
                                : _score! >= 50
                                    ? Colors.orange
                                    : Colors.red,
                            size: 32,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Score: ${_score!.toStringAsFixed(0)}%',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: _score! >= 70
                                  ? Colors.green.shade800
                                  : _score! >= 50
                                      ? Colors.orange.shade800
                                      : Colors.red.shade800,
                            ),
                          ),
                        ],
                      ),
                      if (_feedback != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _feedback!,
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.8),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit button
            if (_hasRecorded && !_isAnalyzing && _score == null)
              ElevatedButton(
                onPressed: _submitRecording,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Submit Recording',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),

            // Retry button after scoring
            if (_score != null && _score! < 70)
              OutlinedButton(
                onPressed: _retryRecording,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Try Again',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
