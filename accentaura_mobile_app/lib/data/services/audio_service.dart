import 'dart:async';
import 'dart:io';
import 'package:flutter_sound/flutter_sound.dart' as sound;
import 'package:audioplayers/audioplayers.dart' as players;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/utils/logger.dart';

/// Enum representing the current recording status
enum RecordingStatus {
  idle,
  recording,
  paused,
  stopped,
}

/// Enum representing the current playback status
enum PlaybackStatus {
  idle,
  playing,
  paused,
  stopped,
  completed,
}

/// Service for handling audio recording and playback
/// Implements Requirements 4.6 (Speaking Activity) and 5.3 (AI Practice Voice Input)
class AudioService {
  final sound.FlutterSoundRecorder _recorder = sound.FlutterSoundRecorder();
  final players.AudioPlayer _player = players.AudioPlayer();
  
  final StreamController<RecordingStatus> _recordingStatusController =
      StreamController<RecordingStatus>.broadcast();
  final StreamController<PlaybackStatus> _playbackStatusController =
      StreamController<PlaybackStatus>.broadcast();
  
  RecordingStatus _currentRecordingStatus = RecordingStatus.idle;
  PlaybackStatus _currentPlaybackStatus = PlaybackStatus.idle;
  
  String? _currentRecordingPath;
  bool _isInitialized = false;

  /// Stream of recording status updates
  Stream<RecordingStatus> get recordingStream => _recordingStatusController.stream;
  
  /// Stream of playback status updates
  Stream<PlaybackStatus> get playbackStream => _playbackStatusController.stream;
  
  /// Current recording status
  RecordingStatus get recordingStatus => _currentRecordingStatus;
  
  /// Current playback status
  PlaybackStatus get playbackStatus => _currentPlaybackStatus;

  /// Initialize the audio service
  /// Must be called before using recording or playback features
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    try {
      // Request microphone permission
      final micPermission = await Permission.microphone.request();
      if (!micPermission.isGranted) {
        throw Exception('Microphone permission not granted');
      }

      // Open the audio session for recording
      await _recorder.openRecorder();
      
      // Set up player state listener
      _player.onPlayerStateChanged.listen((players.PlayerState state) {
        switch (state) {
          case players.PlayerState.playing:
            _updatePlaybackStatus(PlaybackStatus.playing);
            break;
          case players.PlayerState.paused:
            _updatePlaybackStatus(PlaybackStatus.paused);
            break;
          case players.PlayerState.stopped:
            _updatePlaybackStatus(PlaybackStatus.stopped);
            break;
          case players.PlayerState.completed:
            _updatePlaybackStatus(PlaybackStatus.completed);
            break;
          case players.PlayerState.disposed:
            _updatePlaybackStatus(PlaybackStatus.idle);
            break;
        }
      });

      _isInitialized = true;
      Logger.info('AudioService initialized successfully');
    } catch (e) {
      Logger.error('Failed to initialize AudioService', error: e);
      rethrow;
    }
  }

  /// Start recording audio
  /// Returns the path where the recording will be saved
  Future<String> startRecording() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      // Stop any ongoing playback
      if (_currentPlaybackStatus == PlaybackStatus.playing) {
        await stopAudio();
      }

      // Generate a unique file path for the recording
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      _currentRecordingPath = '${directory.path}/recording_$timestamp.aac';

      // Start recording
      await _recorder.startRecorder(
        toFile: _currentRecordingPath,
        codec: sound.Codec.aacADTS,
      );

      _updateRecordingStatus(RecordingStatus.recording);
      Logger.info('Recording started: $_currentRecordingPath');

      return _currentRecordingPath!;
    } catch (e) {
      Logger.error('Failed to start recording', error: e);
      _updateRecordingStatus(RecordingStatus.idle);
      rethrow;
    }
  }

  /// Stop recording and return the recorded file
  Future<File> stopRecording() async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    if (_currentRecordingStatus != RecordingStatus.recording) {
      throw Exception('No active recording to stop');
    }

    try {
      await _recorder.stopRecorder();
      _updateRecordingStatus(RecordingStatus.stopped);

      if (_currentRecordingPath == null) {
        throw Exception('Recording path is null');
      }

      final file = File(_currentRecordingPath!);
      if (!await file.exists()) {
        throw Exception('Recording file does not exist');
      }

      Logger.info('Recording stopped: $_currentRecordingPath');
      return file;
    } catch (e) {
      Logger.error('Failed to stop recording', error: e);
      _updateRecordingStatus(RecordingStatus.idle);
      rethrow;
    }
  }

  /// Pause the current recording
  Future<void> pauseRecording() async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    if (_currentRecordingStatus != RecordingStatus.recording) {
      throw Exception('No active recording to pause');
    }

    try {
      await _recorder.pauseRecorder();
      _updateRecordingStatus(RecordingStatus.paused);
      Logger.info('Recording paused');
    } catch (e) {
      Logger.error('Failed to pause recording', error: e);
      rethrow;
    }
  }

  /// Resume a paused recording
  Future<void> resumeRecording() async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    if (_currentRecordingStatus != RecordingStatus.paused) {
      throw Exception('No paused recording to resume');
    }

    try {
      await _recorder.resumeRecorder();
      _updateRecordingStatus(RecordingStatus.recording);
      Logger.info('Recording resumed');
    } catch (e) {
      Logger.error('Failed to resume recording', error: e);
      rethrow;
    }
  }

  /// Play audio from a URL or file path
  Future<void> playAudio(String source) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      // Stop any ongoing recording
      if (_currentRecordingStatus == RecordingStatus.recording) {
        await stopRecording();
      }

      // Stop current playback if any
      await stopAudio();

      // Determine if source is a URL or file path
      if (source.startsWith('http://') || source.startsWith('https://')) {
        await _player.play(players.UrlSource(source));
      } else {
        await _player.play(players.DeviceFileSource(source));
      }

      Logger.info('Playing audio: $source');
    } catch (e) {
      Logger.error('Failed to play audio', error: e);
      _updatePlaybackStatus(PlaybackStatus.idle);
      rethrow;
    }
  }

  /// Stop audio playback
  Future<void> stopAudio() async {
    if (!_isInitialized) {
      return;
    }

    try {
      await _player.stop();
      _updatePlaybackStatus(PlaybackStatus.stopped);
      Logger.info('Audio playback stopped');
    } catch (e) {
      Logger.error('Failed to stop audio', error: e);
      rethrow;
    }
  }

  /// Pause audio playback
  Future<void> pauseAudio() async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    if (_currentPlaybackStatus != PlaybackStatus.playing) {
      throw Exception('No active playback to pause');
    }

    try {
      await _player.pause();
      Logger.info('Audio playback paused');
    } catch (e) {
      Logger.error('Failed to pause audio', error: e);
      rethrow;
    }
  }

  /// Resume paused audio playback
  Future<void> resumeAudio() async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    if (_currentPlaybackStatus != PlaybackStatus.paused) {
      throw Exception('No paused playback to resume');
    }

    try {
      await _player.resume();
      Logger.info('Audio playback resumed');
    } catch (e) {
      Logger.error('Failed to resume audio', error: e);
      rethrow;
    }
  }

  /// Get the current recording duration in milliseconds
  Future<Duration?> getRecordingDuration() async {
    if (!_isInitialized || _currentRecordingStatus != RecordingStatus.recording) {
      return null;
    }

    try {
      // flutter_sound doesn't provide a direct method to get recording duration
      // This would need to be tracked manually if needed
      return null;
    } catch (e) {
      Logger.error('Failed to get recording duration', error: e);
      return null;
    }
  }

  /// Get the current playback position in milliseconds
  Future<Duration?> getPlaybackPosition() async {
    if (!_isInitialized) {
      return null;
    }

    try {
      return await _player.getCurrentPosition();
    } catch (e) {
      Logger.error('Failed to get playback position', error: e);
      return null;
    }
  }

  /// Get the total duration of the currently playing audio
  Future<Duration?> getPlaybackDuration() async {
    if (!_isInitialized) {
      return null;
    }

    try {
      return await _player.getDuration();
    } catch (e) {
      Logger.error('Failed to get playback duration', error: e);
      return null;
    }
  }

  /// Set the playback volume (0.0 to 1.0)
  Future<void> setVolume(double volume) async {
    if (!_isInitialized) {
      throw Exception('AudioService not initialized');
    }

    try {
      await _player.setVolume(volume.clamp(0.0, 1.0));
      Logger.info('Volume set to: $volume');
    } catch (e) {
      Logger.error('Failed to set volume', error: e);
      rethrow;
    }
  }

  /// Update recording status and notify listeners
  void _updateRecordingStatus(RecordingStatus status) {
    _currentRecordingStatus = status;
    _recordingStatusController.add(status);
  }

  /// Update playback status and notify listeners
  void _updatePlaybackStatus(PlaybackStatus status) {
    _currentPlaybackStatus = status;
    _playbackStatusController.add(status);
  }

  /// Dispose of resources
  Future<void> dispose() async {
    try {
      await _recorder.closeRecorder();
      await _player.dispose();
      await _recordingStatusController.close();
      await _playbackStatusController.close();
      _isInitialized = false;
      Logger.info('AudioService disposed');
    } catch (e) {
      Logger.error('Error disposing AudioService', error: e);
    }
  }
}
