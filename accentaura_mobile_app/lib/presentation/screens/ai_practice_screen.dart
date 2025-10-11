import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:lottie/lottie.dart';
import '../../data/services/api_service.dart';
import '../../data/services/tts_service.dart';
import '../providers/connectivity_provider.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/performance_utils.dart';

/// Message model for chat interface
class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final bool isLoading;

  ChatMessage({
    required this.text,
    required this.isUser,
    DateTime? timestamp,
    this.isLoading = false,
  }) : timestamp = timestamp ?? DateTime.now();
}

/// AI practice screen for conversational practice
/// 
/// Implements Requirements 5.1-5.7:
/// - Chat interface with message bubbles
/// - Text input field with send button
/// - Microphone button for voice input
/// - Speech-to-text integration
/// - TTS for AI responses
/// - Offline state handling
class AIPracticeScreen extends ConsumerStatefulWidget {
  const AIPracticeScreen({super.key});

  @override
  ConsumerState<AIPracticeScreen> createState() => _AIPracticeScreenState();
}

class _AIPracticeScreenState extends ConsumerState<AIPracticeScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  
  late final stt.SpeechToText _speechToText;
  late final TtsService _ttsService;
  late final ApiService _apiService;
  
  bool _isListening = false;
  bool _isSending = false;
  bool _speechAvailable = false;
  String _lastWords = '';
  
  // Debounced send message function (500ms delay)
  late final Function _debouncedSendMessage;

  @override
  void initState() {
    super.initState();
    _speechToText = stt.SpeechToText();
    _ttsService = TtsService();
    _apiService = ApiService();
    
    // Initialize debounced send message function (500ms delay)
    _debouncedSendMessage = PerformanceUtils.debounce(
      _sendMessageInternal,
      duration: const Duration(milliseconds: 500),
    );
    
    _initializeSpeech();
    _initializeTts();
    _addWelcomeMessage();
  }

  /// Initialize speech recognition
  Future<void> _initializeSpeech() async {
    try {
      _speechAvailable = await _speechToText.initialize(
        onError: (error) {
          Logger.error('Speech recognition error', error: error);
          setState(() => _isListening = false);
        },
        onStatus: (status) {
          Logger.debug('Speech status: $status');
          if (status == 'done' || status == 'notListening') {
            setState(() => _isListening = false);
          }
        },
      );
      Logger.info('Speech recognition initialized: $_speechAvailable');
    } catch (e) {
      Logger.error('Failed to initialize speech recognition', error: e);
      _speechAvailable = false;
    }
  }

  /// Initialize TTS service
  Future<void> _initializeTts() async {
    try {
      await _ttsService.initialize();
      Logger.info('TTS service initialized');
    } catch (e) {
      Logger.error('Failed to initialize TTS', error: e);
    }
  }

  /// Add welcome message from AI
  void _addWelcomeMessage() {
    setState(() {
      _messages.add(ChatMessage(
        text: "Hello! I'm your AI practice partner. Let's practice your communication skills together. You can type or use the microphone to speak!",
        isUser: false,
      ));
    });
  }

  /// Send text message (debounced wrapper)
  void _sendMessage(String text) {
    _debouncedSendMessage(text);
  }
  
  /// Internal send message implementation
  Future<void> _sendMessageInternal(String text) async {
    if (text.trim().isEmpty || _isSending) return;

    final isOnline = ref.read(isOnlineProvider);
    
    if (!isOnline) {
      _showOfflineMessage();
      return;
    }

    // Add user message
    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _textController.clear();
      _isSending = true;
    });

    _scrollToBottom();

    // Add loading indicator
    setState(() {
      _messages.add(ChatMessage(
        text: '',
        isUser: false,
        isLoading: true,
      ));
    });

    try {
      // Send to AI backend
      final response = await _apiService.sendChatMessage(text);
      
      // Remove loading indicator
      setState(() {
        _messages.removeLast();
        _messages.add(ChatMessage(
          text: response.message,
          isUser: false,
        ));
      });

      // Speak the response using TTS
      await _ttsService.speak(response.message);
      
      _scrollToBottom();
    } catch (e) {
      Logger.error('Failed to send message', error: e);
      
      // Remove loading indicator and show error
      setState(() {
        _messages.removeLast();
        _messages.add(ChatMessage(
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
        ));
      });
    } finally {
      setState(() => _isSending = false);
    }
  }

  /// Start listening for voice input
  Future<void> _startListening() async {
    if (!_speechAvailable) {
      _showSnackBar('Speech recognition is not available');
      return;
    }

    final isOnline = ref.read(isOnlineProvider);
    if (!isOnline) {
      _showOfflineMessage();
      return;
    }

    if (_isListening) {
      await _stopListening();
      return;
    }

    setState(() {
      _isListening = true;
      _lastWords = '';
    });

    try {
      await _speechToText.listen(
        onResult: (result) {
          setState(() {
            _lastWords = result.recognizedWords;
            _textController.text = _lastWords;
          });
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        listenOptions: stt.SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: stt.ListenMode.confirmation,
        ),
      );
    } catch (e) {
      Logger.error('Failed to start listening', error: e);
      setState(() => _isListening = false);
      _showSnackBar('Failed to start voice input');
    }
  }

  /// Stop listening for voice input
  Future<void> _stopListening() async {
    if (_isListening) {
      await _speechToText.stop();
      setState(() => _isListening = false);
      
      // Send the recognized text if available
      if (_lastWords.isNotEmpty) {
        _sendMessage(_lastWords);
      }
    }
  }

  /// Show offline message
  void _showOfflineMessage() {
    _showSnackBar('You are offline. AI features require an internet connection.');
  }

  /// Show snackbar message
  void _showSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  /// Scroll to bottom of chat
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _speechToText.cancel();
    _ttsService.dispose();
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = ref.watch(isOnlineProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Practice'),
        actions: [
          // Online/Offline indicator
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isOnline ? Colors.green : Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isOnline ? 'Online' : 'Offline',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline banner
          if (!isOnline)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: Colors.orange.shade100,
              child: Row(
                children: [
                  Icon(Icons.wifi_off, color: Colors.orange.shade900),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'AI features require an internet connection',
                      style: TextStyle(color: Colors.orange.shade900),
                    ),
                  ),
                ],
              ),
            ),
          
          // Animated AI Avatar Header
          if (_messages.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                border: Border(
                  bottom: BorderSide(
                    color: theme.colorScheme.outline.withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
              ),
              child: Center(
                child: Column(
                  children: [
                    // Lottie animation for AI avatar
                    // Using a placeholder URL - in production, use a local asset
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: Lottie.network(
                        'https://assets2.lottiefiles.com/packages/lf20_w51pcehl.json',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          // Fallback to icon if animation fails to load
                          return CircleAvatar(
                            radius: 40,
                            backgroundColor: theme.colorScheme.primary,
                            child: Icon(
                              Icons.smart_toy,
                              size: 40,
                              color: theme.colorScheme.onPrimary,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'AI Practice Partner',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          // Chat messages
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 64,
                          color: theme.colorScheme.primary.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Start a conversation',
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return _MessageBubble(
                        message: message,
                        theme: theme,
                      );
                    },
                  ),
          ),
          
          // Input area
          Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(8),
            child: SafeArea(
              child: Row(
                children: [
                  // Microphone button
                  IconButton(
                    onPressed: _startListening,
                    icon: Icon(
                      _isListening ? Icons.mic : Icons.mic_none,
                      color: _isListening
                          ? Colors.red
                          : (isOnline ? theme.colorScheme.primary : Colors.grey),
                    ),
                    tooltip: _isListening ? 'Stop recording' : 'Start voice input',
                  ),
                  
                  // Text input field
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: InputDecoration(
                        hintText: _isListening
                            ? 'Listening...'
                            : 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: theme.colorScheme.surfaceContainerHighest,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      maxLines: null,
                      textCapitalization: TextCapitalization.sentences,
                      enabled: !_isListening && isOnline,
                      onSubmitted: (text) => _sendMessage(text),
                    ),
                  ),
                  
                  const SizedBox(width: 8),
                  
                  // Send button
                  IconButton(
                    onPressed: _isSending || !isOnline
                        ? null
                        : () => _sendMessage(_textController.text),
                    icon: _isSending
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: theme.colorScheme.primary,
                            ),
                          )
                        : Icon(
                            Icons.send,
                            color: isOnline
                                ? theme.colorScheme.primary
                                : Colors.grey,
                          ),
                    tooltip: 'Send message',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Message bubble widget
class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final ThemeData theme;

  const _MessageBubble({
    required this.message,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI avatar (left side for AI messages)
          if (!message.isUser) ...[
            SizedBox(
              width: 32,
              height: 32,
              child: Lottie.network(
                'https://assets2.lottiefiles.com/packages/lf20_w51pcehl.json',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  // Fallback to icon if animation fails to load
                  return CircleAvatar(
                    radius: 16,
                    backgroundColor: theme.colorScheme.primary,
                    child: Icon(
                      Icons.smart_toy,
                      size: 18,
                      color: theme.colorScheme.onPrimary,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 8),
          ],
          
          // Message bubble
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: message.isUser
                    ? theme.colorScheme.primary
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(message.isUser ? 16 : 4),
                  bottomRight: Radius.circular(message.isUser ? 4 : 16),
                ),
              ),
              child: message.isLoading
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Thinking...',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    )
                  : Text(
                      message.text,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: message.isUser
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurface,
                      ),
                    ),
            ),
          ),
          
          // User avatar (right side for user messages)
          if (message.isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.secondary,
              child: Icon(
                Icons.person,
                size: 18,
                color: theme.colorScheme.onSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
