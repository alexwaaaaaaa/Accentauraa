import 'package:flutter/material.dart';
import '../../data/models/activity.dart';
import '../../data/services/audio_service.dart';
import '../../core/utils/logger.dart';

/// Widget for displaying listening activities
/// Implements Requirement 4.5: Listening activity with audio player and questions
class ListeningWidget extends StatefulWidget {
  final ListeningActivity activity;
  final AudioService audioService;
  final VoidCallback? onComplete;

  const ListeningWidget({
    super.key,
    required this.activity,
    required this.audioService,
    this.onComplete,
  });

  @override
  State<ListeningWidget> createState() => _ListeningWidgetState();
}

class _ListeningWidgetState extends State<ListeningWidget> {
  String? _selectedAnswer;
  bool _hasSubmitted = false;
  bool _isCorrect = false;
  bool _isPlayingAudio = false;
  bool _hasPlayedAudio = false;

  @override
  void initState() {
    super.initState();
    _setupAudioListener();
  }

  /// Set up audio playback listener
  void _setupAudioListener() {
    widget.audioService.playbackStream.listen((status) {
      if (mounted) {
        setState(() {
          _isPlayingAudio = status == PlaybackStatus.playing;
          if (status == PlaybackStatus.completed || status == PlaybackStatus.stopped) {
            _hasPlayedAudio = true;
          }
        });
      }
    });
  }

  /// Play the audio
  Future<void> _playAudio() async {
    setState(() {
      _isPlayingAudio = true;
    });

    try {
      await widget.audioService.playAudio(widget.activity.audioUrl);
      Logger.info('Playing listening audio: ${widget.activity.audioUrl}');
    } catch (e) {
      Logger.error('Failed to play audio', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to play audio')),
        );
        setState(() {
          _isPlayingAudio = false;
        });
      }
    }
  }

  /// Stop the audio
  Future<void> _stopAudio() async {
    try {
      await widget.audioService.stopAudio();
      Logger.info('Stopped listening audio');
    } catch (e) {
      Logger.error('Failed to stop audio', error: e);
    }
  }

  /// Submit the selected answer
  void _submitAnswer() {
    if (_selectedAnswer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an answer')),
      );
      return;
    }

    setState(() {
      _hasSubmitted = true;
      _isCorrect = _selectedAnswer == widget.activity.correctAnswer;
    });

    Logger.info(
      'Listening answer submitted: $_selectedAnswer (${_isCorrect ? "correct" : "incorrect"})',
    );

    // Auto-advance after showing result
    if (_isCorrect) {
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          widget.onComplete?.call();
        }
      });
    }
  }

  /// Try again after incorrect answer
  void _tryAgain() {
    setState(() {
      _selectedAnswer = null;
      _hasSubmitted = false;
      _isCorrect = false;
    });
    Logger.debug('Listening activity reset for retry');
  }

  @override
  void dispose() {
    _stopAudio();
    super.dispose();
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
                      Icons.headphones,
                      color: colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Listen to the audio and answer the question',
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

            // Audio player
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
                    // Audio icon with animation
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isPlayingAudio
                            ? colorScheme.primary.withValues(alpha: 0.2)
                            : colorScheme.surface,
                      ),
                      child: Icon(
                        _isPlayingAudio ? Icons.graphic_eq : Icons.headphones,
                        size: 50,
                        color: colorScheme.primary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Play/Stop button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _isPlayingAudio ? _stopAudio : _playAudio,
                          icon: Icon(
                            _isPlayingAudio ? Icons.stop : Icons.play_arrow,
                            size: 28,
                          ),
                          label: Text(
                            _isPlayingAudio ? 'Stop' : 'Play Audio',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                          ),
                        ),
                      ],
                    ),

                    if (_hasPlayedAudio) ...[
                      const SizedBox(height: 12),
                      Text(
                        'You can replay the audio anytime',
                        style: TextStyle(
                          fontSize: 12,
                          color: colorScheme.onPrimaryContainer.withValues(alpha: 0.6),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Question
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text(
                  widget.activity.question,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Options
            ...widget.activity.options.asMap().entries.map((entry) {
              final option = entry.value;
              final isSelected = _selectedAnswer == option;
              final isCorrectAnswer = option == widget.activity.correctAnswer;
              
              // Determine color based on state
              Color? backgroundColor;
              Color? borderColor;
              
              if (_hasSubmitted) {
                if (isCorrectAnswer) {
                  backgroundColor = Colors.green.withValues(alpha: 0.1);
                  borderColor = Colors.green;
                } else if (isSelected && !_isCorrect) {
                  backgroundColor = Colors.red.withValues(alpha: 0.1);
                  borderColor = Colors.red;
                }
              } else if (isSelected) {
                backgroundColor = colorScheme.primaryContainer;
                borderColor = colorScheme.primary;
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: InkWell(
                  onTap: _hasSubmitted ? null : () {
                    setState(() {
                      _selectedAnswer = option;
                    });
                    Logger.debug('Listening option selected: $option');
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: backgroundColor ?? colorScheme.surface,
                      border: Border.all(
                        color: borderColor ?? colorScheme.outline.withValues(alpha: 0.3),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        // Radio button
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: borderColor ?? colorScheme.outline,
                              width: 2,
                            ),
                            color: isSelected
                                ? (borderColor ?? colorScheme.primary)
                                : Colors.transparent,
                          ),
                          child: isSelected
                              ? Icon(
                                  Icons.circle,
                                  size: 12,
                                  color: colorScheme.onPrimary,
                                )
                              : null,
                        ),
                        const SizedBox(width: 16),

                        // Option text
                        Expanded(
                          child: Text(
                            option,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ),

                        // Result icon
                        if (_hasSubmitted && (isCorrectAnswer || (isSelected && !_isCorrect))) ...[
                          const SizedBox(width: 8),
                          Icon(
                            isCorrectAnswer ? Icons.check_circle : Icons.cancel,
                            color: isCorrectAnswer ? Colors.green : Colors.red,
                            size: 24,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 24),

            // Feedback message
            if (_hasSubmitted) ...[
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: _isCorrect
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isCorrect ? Colors.green : Colors.red,
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isCorrect ? Icons.check_circle : Icons.error,
                      color: _isCorrect ? Colors.green : Colors.red,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _isCorrect
                            ? 'Correct! Well done!'
                            : 'Incorrect. The correct answer is: ${widget.activity.correctAnswer}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: _isCorrect ? Colors.green.shade800 : Colors.red.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Action button
            if (!_hasSubmitted)
              ElevatedButton(
                onPressed: _selectedAnswer != null ? _submitAnswer : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Check Answer',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              )
            else if (!_isCorrect)
              OutlinedButton(
                onPressed: _tryAgain,
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
