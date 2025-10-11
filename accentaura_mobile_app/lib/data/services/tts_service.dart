import 'dart:async';
import 'package:flutter_tts/flutter_tts.dart';
import '../../../core/utils/logger.dart';

/// Enum representing the current TTS status
enum TtsState {
  idle,
  playing,
  paused,
  stopped,
  completed,
}

/// Service for handling text-to-speech functionality
/// Implements Requirement 5.5 (AI Practice TTS for AI responses)
class TtsService {
  final FlutterTts _tts = FlutterTts();
  
  final StreamController<TtsState> _stateController =
      StreamController<TtsState>.broadcast();
  
  TtsState _currentState = TtsState.idle;
  bool _isInitialized = false;
  
  String? _currentLanguage;
  String? _currentVoice;

  /// Stream of TTS state updates
  Stream<TtsState> get stateStream => _stateController.stream;
  
  /// Current TTS state
  TtsState get state => _currentState;
  
  /// Current language code (e.g., 'en-US', 'es-ES')
  String? get currentLanguage => _currentLanguage;
  
  /// Current voice identifier
  String? get currentVoice => _currentVoice;

  /// Initialize the TTS service
  /// Must be called before using TTS features
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    try {
      // Set up TTS handlers
      _tts.setStartHandler(() {
        _updateState(TtsState.playing);
        Logger.info('TTS started speaking');
      });

      _tts.setCompletionHandler(() {
        _updateState(TtsState.completed);
        Logger.info('TTS completed speaking');
      });

      _tts.setCancelHandler(() {
        _updateState(TtsState.stopped);
        Logger.info('TTS cancelled');
      });

      _tts.setErrorHandler((message) {
        _updateState(TtsState.idle);
        Logger.error('TTS error: $message');
      });

      _tts.setPauseHandler(() {
        _updateState(TtsState.paused);
        Logger.info('TTS paused');
      });

      _tts.setContinueHandler(() {
        _updateState(TtsState.playing);
        Logger.info('TTS continued');
      });

      // Set default configuration
      await _tts.setVolume(1.0);
      await _tts.setSpeechRate(0.5); // Normal speed
      await _tts.setPitch(1.0); // Normal pitch

      // Set default language to English (US)
      _currentLanguage = 'en-US';
      await _tts.setLanguage(_currentLanguage!);

      _isInitialized = true;
      Logger.info('TtsService initialized successfully');
    } catch (e) {
      Logger.error('Failed to initialize TtsService', error: e);
      rethrow;
    }
  }

  /// Speak the given text with optional language override
  /// 
  /// [text] - The text to speak
  /// [language] - Optional language code (e.g., 'en-US', 'es-ES', 'fr-FR')
  ///              If not provided, uses the currently set language
  Future<void> speak(String text, {String? language}) async {
    if (!_isInitialized) {
      await initialize();
    }

    if (text.isEmpty) {
      Logger.warning('Attempted to speak empty text');
      return;
    }

    try {
      // Stop any ongoing speech
      if (_currentState == TtsState.playing) {
        await stop();
      }

      // Set language if provided and different from current
      if (language != null && language != _currentLanguage) {
        await _tts.setLanguage(language);
        _currentLanguage = language;
        Logger.info('TTS language changed to: $language');
      }

      // Speak the text
      await _tts.speak(text);
      Logger.info('TTS speaking: ${text.substring(0, text.length > 50 ? 50 : text.length)}...');
    } catch (e) {
      Logger.error('Failed to speak text', error: e);
      _updateState(TtsState.idle);
      rethrow;
    }
  }

  /// Stop the current speech
  Future<void> stop() async {
    if (!_isInitialized) {
      return;
    }

    try {
      await _tts.stop();
      _updateState(TtsState.stopped);
      Logger.info('TTS stopped');
    } catch (e) {
      Logger.error('Failed to stop TTS', error: e);
      rethrow;
    }
  }

  /// Pause the current speech
  Future<void> pause() async {
    if (!_isInitialized) {
      throw Exception('TtsService not initialized');
    }

    if (_currentState != TtsState.playing) {
      throw Exception('No active speech to pause');
    }

    try {
      await _tts.pause();
      Logger.info('TTS paused');
    } catch (e) {
      Logger.error('Failed to pause TTS', error: e);
      rethrow;
    }
  }

  /// Set the voice to use for speech
  /// 
  /// [voice] - Voice identifier (platform-specific)
  /// On iOS: voice identifier like 'com.apple.ttsbundle.Samantha-compact'
  /// On Android: voice name like 'en-us-x-sfg#male_1-local'
  Future<void> setVoice(String voice) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      await _tts.setVoice({'name': voice, 'locale': _currentLanguage ?? 'en-US'});
      _currentVoice = voice;
      Logger.info('TTS voice set to: $voice');
    } catch (e) {
      Logger.error('Failed to set TTS voice', error: e);
      rethrow;
    }
  }

  /// Get available voices for the current language
  Future<List<dynamic>> getVoices() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final voices = await _tts.getVoices;
      return voices;
    } catch (e) {
      Logger.error('Failed to get available voices', error: e);
      return [];
    }
  }

  /// Get available languages
  Future<List<dynamic>> getLanguages() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final languages = await _tts.getLanguages;
      return languages;
    } catch (e) {
      Logger.error('Failed to get available languages', error: e);
      return [];
    }
  }

  /// Set the speech rate (speed)
  /// 
  /// [rate] - Speech rate (0.0 to 1.0, where 0.5 is normal)
  Future<void> setSpeechRate(double rate) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      await _tts.setSpeechRate(rate.clamp(0.0, 1.0));
      Logger.info('TTS speech rate set to: $rate');
    } catch (e) {
      Logger.error('Failed to set speech rate', error: e);
      rethrow;
    }
  }

  /// Set the pitch
  /// 
  /// [pitch] - Pitch value (0.5 to 2.0, where 1.0 is normal)
  Future<void> setPitch(double pitch) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      await _tts.setPitch(pitch.clamp(0.5, 2.0));
      Logger.info('TTS pitch set to: $pitch');
    } catch (e) {
      Logger.error('Failed to set pitch', error: e);
      rethrow;
    }
  }

  /// Set the volume
  /// 
  /// [volume] - Volume level (0.0 to 1.0)
  Future<void> setVolume(double volume) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      await _tts.setVolume(volume.clamp(0.0, 1.0));
      Logger.info('TTS volume set to: $volume');
    } catch (e) {
      Logger.error('Failed to set volume', error: e);
      rethrow;
    }
  }

  /// Check if TTS is currently speaking
  bool get isSpeaking => _currentState == TtsState.playing;

  /// Update TTS state and notify listeners
  void _updateState(TtsState state) {
    _currentState = state;
    _stateController.add(state);
  }

  /// Dispose of resources
  Future<void> dispose() async {
    try {
      await _tts.stop();
      await _stateController.close();
      _isInitialized = false;
      Logger.info('TtsService disposed');
    } catch (e) {
      Logger.error('Error disposing TtsService', error: e);
    }
  }
}
