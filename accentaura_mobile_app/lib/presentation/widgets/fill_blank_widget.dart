import 'package:flutter/material.dart';
import '../../data/models/activity.dart';
import '../../core/utils/logger.dart';

/// Widget for displaying fill-in-the-blank activities
/// Implements Requirement 4.4: Fill blank activity with text input and validation
class FillBlankWidget extends StatefulWidget {
  final FillBlankActivity activity;
  final VoidCallback? onComplete;

  const FillBlankWidget({
    super.key,
    required this.activity,
    this.onComplete,
  });

  @override
  State<FillBlankWidget> createState() => _FillBlankWidgetState();
}

class _FillBlankWidgetState extends State<FillBlankWidget> {
  final TextEditingController _controller = TextEditingController();
  bool _hasSubmitted = false;
  bool _isCorrect = false;
  bool _showHints = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Submit the answer
  void _submitAnswer() {
    final answer = _controller.text.trim();
    
    if (answer.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an answer')),
      );
      return;
    }

    setState(() {
      _hasSubmitted = true;
      // Case-insensitive comparison
      _isCorrect = answer.toLowerCase() == widget.activity.correctAnswer.toLowerCase();
    });

    Logger.info(
      'Fill blank answer submitted: $answer (${_isCorrect ? "correct" : "incorrect"})',
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
      _controller.clear();
      _hasSubmitted = false;
      _isCorrect = false;
    });
    Logger.debug('Fill blank reset for retry');
  }

  /// Toggle hints visibility
  void _toggleHints() {
    setState(() {
      _showHints = !_showHints;
    });
  }

  /// Parse sentence and split by blank marker (_____ or ___)
  List<String> _parseSentence() {
    // Split by common blank markers
    final parts = widget.activity.sentence.split(RegExp(r'_{3,}'));
    return parts;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final sentenceParts = _parseSentence();

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
                      Icons.info_outline,
                      color: colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Fill in the blank with the correct word',
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

            // Sentence with blank
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // First part of sentence
                    if (sentenceParts.isNotEmpty)
                      Text(
                        sentenceParts[0],
                        style: TextStyle(
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),

                    // Input field or answer display
                    if (_hasSubmitted)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: _isCorrect
                              ? Colors.green.withValues(alpha: 0.2)
                              : Colors.red.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _isCorrect ? Colors.green : Colors.red,
                            width: 2,
                          ),
                        ),
                        child: Text(
                          _controller.text,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _isCorrect ? Colors.green.shade800 : Colors.red.shade800,
                          ),
                        ),
                      )
                    else
                      Container(
                        width: 200,
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        child: TextField(
                          controller: _controller,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          decoration: InputDecoration(
                            hintText: '______',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(
                                color: colorScheme.primary,
                                width: 2,
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                          onSubmitted: (_) => _submitAnswer(),
                        ),
                      ),

                    // Second part of sentence
                    if (sentenceParts.length > 1)
                      Text(
                        sentenceParts[1],
                        style: TextStyle(
                          fontSize: 18,
                          color: colorScheme.onSurface,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Hints section
            if (widget.activity.hints != null && widget.activity.hints!.isNotEmpty) ...[
              TextButton.icon(
                onPressed: _toggleHints,
                icon: Icon(_showHints ? Icons.visibility_off : Icons.lightbulb_outline),
                label: Text(_showHints ? 'Hide Hints' : 'Show Hints'),
              ),
              
              if (_showHints) ...[
                const SizedBox(height: 8),
                Card(
                  elevation: 1,
                  color: colorScheme.secondaryContainer,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.lightbulb,
                              color: colorScheme.onSecondaryContainer,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Hints:',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSecondaryContainer,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...widget.activity.hints!.map((hint) => Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '• ',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: colorScheme.onSecondaryContainer,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  hint,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: colorScheme.onSecondaryContainer,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
            ],

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
                onPressed: _controller.text.trim().isNotEmpty ? _submitAnswer : null,
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
