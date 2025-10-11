import 'package:flutter/material.dart';
import '../../data/models/activity.dart';
import '../../core/utils/logger.dart';

/// Widget for displaying multiple choice question activities
/// Implements Requirement 4.3: MCQ activity with question and radio button options
class McqWidget extends StatefulWidget {
  final McqActivity activity;
  final VoidCallback? onComplete;

  const McqWidget({
    super.key,
    required this.activity,
    this.onComplete,
  });

  @override
  State<McqWidget> createState() => _McqWidgetState();
}

class _McqWidgetState extends State<McqWidget> {
  String? _selectedAnswer;
  bool _hasSubmitted = false;
  bool _isCorrect = false;

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
      'MCQ answer submitted: $_selectedAnswer (${_isCorrect ? "correct" : "incorrect"})',
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
    Logger.debug('MCQ reset for retry');
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
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Options
            ...widget.activity.options.map((option) {
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
                    Logger.debug('MCQ option selected: $option');
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

            const SizedBox(height: 32),

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
