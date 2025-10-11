import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/crashlytics_helper.dart';
import '../../core/config/environment.dart';
import '../models/auth.dart';
import '../models/lesson.dart';
import '../models/user_progress.dart';
import '../models/leaderboard.dart';

/// API Service for handling all HTTP requests with Dio
class ApiService {
  late final Dio _dio;
  String? _authToken;

  ApiService({
    String? baseUrl,
    Duration? connectTimeout,
    Duration? receiveTimeout,
  }) {
    // Use environment config for base URL
    final effectiveBaseUrl = baseUrl ?? EnvironmentConfig.current.apiBaseUrl;

    _dio = Dio(
      BaseOptions(
        baseUrl: effectiveBaseUrl,
        connectTimeout: connectTimeout ?? const Duration(seconds: 30),
        receiveTimeout: receiveTimeout ?? const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    Logger.info(
      'API Service initialized with baseUrl: $effectiveBaseUrl',
      tag: 'ApiService',
    );
    _setupInterceptors();
  }

  /// Set up Dio interceptors for logging, auth, and error handling
  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Add auth token to headers if available
          if (_authToken != null) {
            options.headers['Authorization'] = 'Bearer $_authToken';
          }

          // Log breadcrumb for API call
          CrashlyticsHelper.logApiCall(options.method, options.path);

          Logger.debug(
            'Request: ${options.method} ${options.uri}',
            tag: 'ApiService',
          );

          return handler.next(options);
        },
        onResponse: (response, handler) {
          Logger.debug(
            'Response: ${response.statusCode} ${response.requestOptions.uri}',
            tag: 'ApiService',
          );

          return handler.next(response);
        },
        onError: (error, handler) {
          Logger.error(
            'Error: ${error.requestOptions.uri}',
            error: error,
            tag: 'ApiService',
          );

          return handler.next(error);
        },
      ),
    );
  }

  /// Set the authentication token for subsequent requests
  void setAuthToken(String? token) {
    _authToken = token;
  }

  /// Clear the authentication token
  void clearAuthToken() {
    _authToken = null;
  }

  // ==================== Authentication Endpoints ====================

  /// Register a new user with email and password
  Future<AuthResult> registerWithCredentials(
    String email,
    String password, {
    String? name,
  }) async {
    try {
      final response = await _retryRequest(
        () => _dio.post(
          '/auth/signup',
          data: {
            'email': email,
            'password': password,
            if (name != null) 'name': name,
          },
        ),
      );

      return AuthResult.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Login with email and password credentials
  Future<AuthResult> loginWithCredentials(String email, String password) async {
    try {
      final response = await _retryRequest(
        () => _dio.post(
          '/auth/login',
          data: {'email': email, 'password': password},
        ),
      );

      return AuthResult.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Login with OAuth provider (Google, Facebook)
  Future<AuthResult> loginWithOAuth(String provider, String token) async {
    try {
      final response = await _retryRequest(
        () => _dio.post(
          '/auth/oauth',
          data: {'provider': provider, 'token': token},
        ),
      );

      return AuthResult.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Refresh the authentication token
  Future<TokenResponse> refreshAuthToken(String refreshToken) async {
    try {
      final response = await _retryRequest(
        () => _dio.post('/auth/refresh', data: {'refreshToken': refreshToken}),
      );

      return TokenResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Validate the current authentication token
  Future<bool> validateToken(String token) async {
    try {
      final response = await _dio.post(
        '/auth/validate',
        data: {'token': token},
      );

      return response.data['valid'] == true;
    } catch (e) {
      Logger.warning('Token validation failed', tag: 'ApiService');
      return false;
    }
  }

  // ==================== Lesson Endpoints ====================

  /// Get a range of lessons (e.g., levels 1-20)
  Future<List<Lesson>> getLevels(int from, int to) async {
    try {
      final response = await _retryRequest(
        () => _dio.get('/lessons', queryParameters: {'from': from, 'to': to}),
      );

      final lessonsData = response.data['lessons'] as List<dynamic>;
      return lessonsData
          .map((json) => Lesson.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get a specific lesson by level
  Future<Lesson> getLevel(int level) async {
    try {
      final response = await _retryRequest(() => _dio.get('/lessons/$level'));

      return Lesson.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== Progress Endpoints ====================

  /// Save user progress update
  Future<void> saveProgress(ProgressUpdate update) async {
    try {
      await _retryRequest(() => _dio.post('/progress', data: update.toJson()));
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get user progress
  Future<UserProgress> getUserProgress(String userId) async {
    try {
      final response = await _retryRequest(() => _dio.get('/progress/$userId'));

      return UserProgress.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== AI Endpoints ====================

  /// Send a chat message to the AI and get a response
  Future<AIChatResponse> sendChatMessage(String prompt) async {
    try {
      final response = await _retryRequest(
        () => _dio.post('/ai/chat', data: {'prompt': prompt}),
      );

      return AIChatResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Analyze speech audio and get feedback
  Future<SpeechAnalysis> analyzeSpeech(File audioFile) async {
    try {
      final formData = FormData.fromMap({
        'audio': await MultipartFile.fromFile(
          audioFile.path,
          filename: 'speech.wav',
        ),
      });

      final response = await _retryRequest(
        () => _dio.post('/ai/analyze-speech', data: formData),
      );

      return SpeechAnalysis.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Start an interview session
  Future<InterviewSession> startInterview() async {
    try {
      final response = await _retryRequest(
        () => _dio.post('/ai/interview/start'),
      );

      return InterviewSession.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Submit interview audio/video and get results
  Future<InterviewResult> submitInterview(
    String sessionId,
    File audioFile,
    File? videoFile,
  ) async {
    try {
      final formData = FormData.fromMap({
        'sessionId': sessionId,
        'audio': await MultipartFile.fromFile(
          audioFile.path,
          filename: 'interview_audio.wav',
        ),
        if (videoFile != null)
          'video': await MultipartFile.fromFile(
            videoFile.path,
            filename: 'interview_video.mp4',
          ),
      });

      final response = await _retryRequest(
        () => _dio.post('/ai/interview/submit', data: formData),
      );

      return InterviewResult.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== Leaderboard Endpoints ====================

  /// Get leaderboard data
  Future<LeaderboardData> getLeaderboard({int limit = 100}) async {
    try {
      final response = await _retryRequest(
        () => _dio.get('/leaderboard', queryParameters: {'limit': limit}),
      );

      return LeaderboardData.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get user's rank in the leaderboard
  Future<UserRank> getUserRank(String userId) async {
    try {
      final response = await _retryRequest(
        () => _dio.get('/leaderboard/rank/$userId'),
      );

      return UserRank.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== Error Handling ====================

  /// Handle and transform errors into user-friendly exceptions
  /// Implements requirements from Task 17.3:
  /// - Handle 401 (clear token, navigate to auth)
  /// - Handle 404 (show "Content not available")
  /// - Handle 500 (show "Something went wrong")
  /// - Handle timeout errors
  Exception _handleError(dynamic error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          Logger.warning('Request timeout', tag: 'ApiService');
          return ApiException(
            'Request timed out. Please check your connection.',
            statusCode: 408,
          );

        case DioExceptionType.badResponse:
          final statusCode = error.response?.statusCode;
          final message = error.response?.data?['message'] as String?;

          Logger.warning('Bad response: $statusCode', tag: 'ApiService');

          switch (statusCode) {
            case 401:
              // Unauthorized - token invalid or expired
              // This should trigger logout and navigation to auth screen
              Logger.error('Unauthorized request (401)', tag: 'ApiService');
              return ApiException(
                message ?? 'Authentication failed. Please login again.',
                statusCode: 401,
              );

            case 403:
              // Forbidden - user doesn't have permission
              return ApiException(
                message ??
                    'You do not have permission to access this resource.',
                statusCode: 403,
              );

            case 404:
              // Not found - content doesn't exist
              Logger.warning('Resource not found (404)', tag: 'ApiService');
              return ApiException(
                message ?? 'Content not available.',
                statusCode: 404,
              );

            case 408:
              // Request timeout
              return ApiException(
                message ?? 'Request timed out. Please try again.',
                statusCode: 408,
              );

            case 429:
              // Too many requests
              return ApiException(
                message ?? 'Too many requests. Please try again later.',
                statusCode: 429,
              );

            case 500:
            case 502:
            case 503:
            case 504:
              // Server errors
              Logger.error('Server error ($statusCode)', tag: 'ApiService');
              return ApiException(
                message ?? 'Something went wrong. Please try again.',
                statusCode: statusCode ?? 500,
              );

            default:
              return ApiException(
                message ?? 'An error occurred. Please try again.',
                statusCode: statusCode ?? 0,
              );
          }

        case DioExceptionType.connectionError:
          // Network connection error
          Logger.error('Connection error', tag: 'ApiService');

          if (error.error is SocketException) {
            return ApiException(
              'No internet connection. Please check your network.',
              statusCode: 0,
            );
          }
          return ApiException(
            'Connection error. Please try again.',
            statusCode: 0,
          );

        case DioExceptionType.cancel:
          Logger.info('Request cancelled', tag: 'ApiService');
          return ApiException('Request was cancelled.', statusCode: 0);

        case DioExceptionType.badCertificate:
          Logger.error('Bad certificate', tag: 'ApiService');
          return ApiException(
            'Security error. Please check your connection.',
            statusCode: 0,
          );

        case DioExceptionType.unknown:
          Logger.error('Unknown error', tag: 'ApiService');
          return ApiException('An unexpected error occurred.', statusCode: 0);
      }
    }

    // Non-Dio exceptions
    Logger.error('Non-Dio exception', error: error, tag: 'ApiService');
    return ApiException('An unexpected error occurred.', statusCode: 0);
  }

  // ==================== Retry Logic ====================

  /// Retry a request with exponential backoff
  Future<Response> _retryRequest(
    Future<Response> Function() request, {
    int maxRetries = 3,
  }) async {
    int retryCount = 0;
    Duration delay = const Duration(seconds: 1);

    while (true) {
      try {
        return await request();
      } catch (e) {
        retryCount++;

        // Don't retry on client errors (4xx) or if max retries reached
        if (e is DioException) {
          final statusCode = e.response?.statusCode;
          if (statusCode != null && statusCode >= 400 && statusCode < 500) {
            rethrow;
          }
        }

        if (retryCount >= maxRetries) {
          Logger.warning(
            'Max retries ($maxRetries) reached',
            tag: 'ApiService',
          );
          rethrow;
        }

        Logger.info(
          'Retrying request (attempt $retryCount/$maxRetries) after ${delay.inSeconds}s',
          tag: 'ApiService',
        );

        await Future.delayed(delay);

        // Exponential backoff: 1s, 2s, 4s, 8s (max 30s)
        delay = Duration(seconds: (delay.inSeconds * 2).clamp(1, 30));
      }
    }
  }

  /// Dispose resources
  void dispose() {
    _dio.close();
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, {required this.statusCode});

  @override
  String toString() => message;
}

/// Token response model
class TokenResponse {
  final String token;
  final String refreshToken;

  TokenResponse({required this.token, required this.refreshToken});

  factory TokenResponse.fromJson(Map<String, dynamic> json) {
    return TokenResponse(
      token: json['token'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {'token': token, 'refreshToken': refreshToken};
  }
}

/// Progress update model for syncing user progress
class ProgressUpdate {
  final String id;
  final String userId;
  final int? lessonLevel;
  final int? xpEarned;
  final bool? lessonCompleted;
  final Map<String, dynamic>? activityResults;
  final DateTime timestamp;

  ProgressUpdate({
    required this.id,
    required this.userId,
    this.lessonLevel,
    this.xpEarned,
    this.lessonCompleted,
    this.activityResults,
    required this.timestamp,
  });

  factory ProgressUpdate.fromJson(Map<String, dynamic> json) {
    return ProgressUpdate(
      id: json['id'] as String,
      userId: json['userId'] as String,
      lessonLevel: json['lessonLevel'] as int?,
      xpEarned: json['xpEarned'] as int?,
      lessonCompleted: json['lessonCompleted'] as bool?,
      activityResults: json['activityResults'] as Map<String, dynamic>?,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      if (lessonLevel != null) 'lessonLevel': lessonLevel,
      if (xpEarned != null) 'xpEarned': xpEarned,
      if (lessonCompleted != null) 'lessonCompleted': lessonCompleted,
      if (activityResults != null) 'activityResults': activityResults,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

/// AI chat response model
class AIChatResponse {
  final String message;
  final String? audioUrl;

  AIChatResponse({required this.message, this.audioUrl});

  factory AIChatResponse.fromJson(Map<String, dynamic> json) {
    return AIChatResponse(
      message: json['message'] as String,
      audioUrl: json['audioUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {'message': message, if (audioUrl != null) 'audioUrl': audioUrl};
  }
}

/// Speech analysis result model
class SpeechAnalysis {
  final double score;
  final String feedback;
  final Map<String, dynamic>? details;

  SpeechAnalysis({required this.score, required this.feedback, this.details});

  factory SpeechAnalysis.fromJson(Map<String, dynamic> json) {
    return SpeechAnalysis(
      score: (json['score'] as num).toDouble(),
      feedback: json['feedback'] as String,
      details: json['details'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'score': score,
      'feedback': feedback,
      if (details != null) 'details': details,
    };
  }
}

/// Interview session model
class InterviewSession {
  final String sessionId;
  final List<String> questions;

  InterviewSession({required this.sessionId, required this.questions});

  factory InterviewSession.fromJson(Map<String, dynamic> json) {
    return InterviewSession(
      sessionId: json['sessionId'] as String,
      questions: (json['questions'] as List<dynamic>)
          .map((q) => q as String)
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'sessionId': sessionId, 'questions': questions};
  }
}

/// Interview result model
class InterviewResult {
  final double confidenceScore;
  final double grammarScore;
  final String feedback;
  final Map<String, dynamic>? performanceMetrics;

  InterviewResult({
    required this.confidenceScore,
    required this.grammarScore,
    required this.feedback,
    this.performanceMetrics,
  });

  factory InterviewResult.fromJson(Map<String, dynamic> json) {
    return InterviewResult(
      confidenceScore: (json['confidenceScore'] as num).toDouble(),
      grammarScore: (json['grammarScore'] as num).toDouble(),
      feedback: json['feedback'] as String,
      performanceMetrics: json['performanceMetrics'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'confidenceScore': confidenceScore,
      'grammarScore': grammarScore,
      'feedback': feedback,
      if (performanceMetrics != null) 'performanceMetrics': performanceMetrics,
    };
  }
}
