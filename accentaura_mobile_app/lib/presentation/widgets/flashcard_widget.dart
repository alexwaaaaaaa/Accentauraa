import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../data/models/activity.dart';
import '../../data/services/audio_service.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/accessibility_helper.dart';

/// Widget for displaying flashcard activities
/// Implements Requirement 4.2: Flashcard activity with swipeable card, image, audio button
/// Full accessibility support with semantic labels and announcements
class FlashcardWidget extends StatefulWidget {
  final FlashcardActivity activity;
  final VoidCallback? onComplete;
  final AudioService audioService;

  const FlashcardWidget({
    super.key,
    required this.activity,
    required this.audioService,
    this.onComplete,
  });

  @override
  State<FlashcardWidget> createState() => _FlashcardWidgetState();
}

class _FlashcardWidgetState extends State<FlashcardWidget> {
  int _currentCardIndex = 0;
  bool _showTranslation = false;
  bool _isPlayingAudio = false;

  /// Navigate to next card
  void _nextCard() {
    if (_currentCardIndex < widget.activity.items.length - 1) {
      setState(() {
        _currentCardIndex++;
        _showTranslation = false;
      });
      Logger.debug('Moved to card ${_currentCardIndex + 1}/${widget.activity.items.length}');
    } else {
      // All cards completed
      Logger.info('All flashcards completed');
      widget.onComplete?.call();
    }
  }

  /// Navigate to previous card
  void _previousCard() {
    if (_currentCardIndex > 0) {
      setState(() {
        _currentCardIndex--;
        _showTranslation = false;
      });
      Logger.debug('Moved back to card ${_currentCardIndex + 1}/${widget.activity.items.length}');
    }
  }

  /// Toggle translation visibility
  void _toggleTranslation() {
    setState(() {
      _showTranslation = !_showTranslation;
    });
  }

  /// Play audio for current card
  Future<void> _playAudio() async {
    final currentItem = widget.activity.items[_currentCardIndex];
    
    if (currentItem.audioUrl == null) {
      Logger.warning('No audio URL for current flashcard');
      return;
    }

    setState(() {
      _isPlayingAudio = true;
    });

    try {
      await widget.audioService.playAudio(currentItem.audioUrl!);
      Logger.info('Playing audio: ${currentItem.audioUrl}');
      
      // Wait for audio to complete
      await Future.delayed(const Duration(seconds: 2));
    } catch (e) {
      Logger.error('Failed to play audio', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to play audio')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPlayingAudio = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final currentItem = widget.activity.items[_currentCardIndex];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Progress indicator
        Semantics(
          label: 'Flashcard ${_currentCardIndex + 1} of ${widget.activity.items.length}',
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${_currentCardIndex + 1} / ${widget.activity.items.length}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Swipeable card
        Expanded(
          child: Semantics(
            label: 'Flashcard: ${currentItem.word}. ${_showTranslation && currentItem.translation != null ? currentItem.translation : "Tap to see translation"}. Swipe left for next card, swipe right for previous card.',
            button: true,
            child: GestureDetector(
              onHorizontalDragEnd: (details) {
                if (details.primaryVelocity! > 0) {
                  // Swiped right (previous)
                  _previousCard();
                } else if (details.primaryVelocity! < 0) {
                  // Swiped left (next)
                  _nextCard();
                }
              },
              onTap: _toggleTranslation,
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              child: Container(
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
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
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Image
                    if (currentItem.imageUrl != null) ...[
                      Semantics(
                        label: 'Image for ${currentItem.word}',
                        image: true,
                        child: Expanded(
                          flex: 3,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: CachedNetworkImage(
                              imageUrl: currentItem.imageUrl!,
                              fit: BoxFit.contain,
                              placeholder: (context, url) => Center(
                                child: CircularProgressIndicator(
                                  color: colorScheme.primary,
                                ),
                              ),
                              errorWidget: (context, url, error) => Icon(
                                Icons.image_not_supported,
                                size: 80,
                                color: colorScheme.onPrimaryContainer.withValues(alpha: 0.5),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Word
                    Expanded(
                      flex: 2,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              currentItem.word,
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onPrimaryContainer,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            
                            // Translation (shown on tap)
                            if (_showTranslation && currentItem.translation != null) ...[
                              const SizedBox(height: 16),
                              Text(
                                currentItem.translation!,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w500,
                                  color: colorScheme.onPrimaryContainer.withValues(alpha: 0.8),
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),

                    // Audio button
                    if (currentItem.audioUrl != null) ...[
                      const SizedBox(height: 16),
                      Semantics(
                        label: _isPlayingAudio ? 'Playing audio for ${currentItem.word}' : 'Play audio pronunciation for ${currentItem.word}',
                        button: true,
                        enabled: !_isPlayingAudio,
                        child: AccessibilityHelper.ensureMinTapTarget(
                          child: IconButton(
                            onPressed: _isPlayingAudio ? null : _playAudio,
                            icon: Icon(
                              _isPlayingAudio ? Icons.volume_up : Icons.volume_up_outlined,
                              size: 48,
                            ),
                            color: colorScheme.onPrimaryContainer,
                            tooltip: 'Play audio',
                          ),
                        ),
                      ),
                    ],

                    // Tap hint
                    const SizedBox(height: 16),
                    Text(
                      'Tap to see translation • Swipe to navigate',
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onPrimaryContainer.withValues(alpha: 0.6),
                        fontStyle: FontStyle.italic,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            ),
          ),
        ),

        // Navigation buttons
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Previous button
              Semantics(
                label: 'Previous flashcard',
                button: true,
                enabled: _currentCardIndex > 0,
                child: AccessibilityHelper.ensureMinTapTarget(
                  child: IconButton(
                    onPressed: _currentCardIndex > 0 ? _previousCard : null,
                    icon: const Icon(Icons.arrow_back),
                    iconSize: 32,
                    tooltip: 'Previous card',
                  ),
                ),
              ),

              // Next/Complete button
              Semantics(
                label: _currentCardIndex < widget.activity.items.length - 1
                    ? 'Next flashcard'
                    : 'Complete flashcard activity',
                button: true,
                child: AccessibilityHelper.ensureMinTapTarget(
                  child: ElevatedButton.icon(
                    onPressed: _nextCard,
                    icon: Icon(
                      _currentCardIndex < widget.activity.items.length - 1
                          ? Icons.arrow_forward
                          : Icons.check,
                    ),
                    label: Text(
                      _currentCardIndex < widget.activity.items.length - 1
                          ? 'Next'
                          : 'Complete',
                      style: const TextStyle(fontSize: 16),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
