import 'package:dio/dio.dart';
import '../../core/utils/logger.dart';

/// Interceptor for handling API errors and retries
class ApiErrorInterceptor extends Interceptor {
  final void Function()? onUnauthorized;

  ApiErrorInterceptor({this.onUnauthorized});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final statusCode = err.response?.statusCode;

    Logger.error(
      'API Error: ${err.requestOptions.method} ${err.requestOptions.uri}',
      error: err,
      tag: 'ApiInterceptor',
    );

    // Handle 401 Unauthorized - clear token and navigate to auth
    if (statusCode == 401) {
      Logger.warning('Unauthorized request, triggering auth flow', tag: 'ApiInterceptor');
      onUnauthorized?.call();
    }

    super.onError(err, handler);
  }
}

/// Interceptor for logging requests and responses
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    Logger.debug(
      'Request: ${options.method} ${options.uri}',
      tag: 'ApiRequest',
    );

    if (options.data != null) {
      Logger.debug(
        'Request Data: ${_sanitizeData(options.data)}',
        tag: 'ApiRequest',
      );
    }

    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    Logger.debug(
      'Response: ${response.statusCode} ${response.requestOptions.uri}',
      tag: 'ApiResponse',
    );

    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    Logger.error(
      'Error: ${err.requestOptions.method} ${err.requestOptions.uri}',
      error: err,
      tag: 'ApiError',
    );

    if (err.response != null) {
      Logger.error(
        'Error Response: ${err.response?.statusCode} - ${err.response?.data}',
        tag: 'ApiError',
      );
    }

    super.onError(err, handler);
  }

  /// Sanitize sensitive data from logs
  String _sanitizeData(dynamic data) {
    if (data is Map) {
      final sanitized = Map<String, dynamic>.from(data);
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'refreshToken', 'authToken'];
      for (final field in sensitiveFields) {
        if (sanitized.containsKey(field)) {
          sanitized[field] = '***REDACTED***';
        }
      }
      
      return sanitized.toString();
    }
    
    return data.toString();
  }
}

/// Interceptor for adding authentication token to requests
class AuthInterceptor extends Interceptor {
  String? Function() getToken;

  AuthInterceptor({required this.getToken});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = getToken();
    
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
      Logger.debug('Added auth token to request', tag: 'AuthInterceptor');
    }

    super.onRequest(options, handler);
  }
}

/// Interceptor for retry logic with exponential backoff
class RetryInterceptor extends Interceptor {
  final int maxRetries;
  final Duration initialDelay;
  final Duration maxDelay;

  RetryInterceptor({
    this.maxRetries = 3,
    this.initialDelay = const Duration(seconds: 1),
    this.maxDelay = const Duration(seconds: 30),
  });

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final statusCode = err.response?.statusCode;

    // Don't retry on client errors (4xx) except 408 (timeout)
    if (statusCode != null && statusCode >= 400 && statusCode < 500 && statusCode != 408) {
      return super.onError(err, handler);
    }

    // Don't retry if max retries reached
    final retryCount = err.requestOptions.extra['retryCount'] as int? ?? 0;
    if (retryCount >= maxRetries) {
      Logger.warning(
        'Max retries ($maxRetries) reached for ${err.requestOptions.uri}',
        tag: 'RetryInterceptor',
      );
      return super.onError(err, handler);
    }

    // Calculate delay with exponential backoff
    final delay = Duration(
      milliseconds: (initialDelay.inMilliseconds * (1 << retryCount))
          .clamp(0, maxDelay.inMilliseconds),
    );

    Logger.info(
      'Retrying request (attempt ${retryCount + 1}/$maxRetries) after ${delay.inSeconds}s',
      tag: 'RetryInterceptor',
    );

    await Future.delayed(delay);

    // Increment retry count
    err.requestOptions.extra['retryCount'] = retryCount + 1;

    // Retry the request
    try {
      final response = await Dio().fetch(err.requestOptions);
      return handler.resolve(response);
    } on DioException catch (e) {
      return super.onError(e, handler);
    }
  }
}

/// Helper to create a configured Dio instance with all interceptors
Dio createDioWithInterceptors({
  required String baseUrl,
  Duration? connectTimeout,
  Duration? receiveTimeout,
  String? Function()? getToken,
  void Function()? onUnauthorized,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: connectTimeout ?? const Duration(seconds: 30),
      receiveTimeout: receiveTimeout ?? const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  // Add interceptors in order
  dio.interceptors.addAll([
    LoggingInterceptor(),
    if (getToken != null) AuthInterceptor(getToken: getToken),
    ApiErrorInterceptor(onUnauthorized: onUnauthorized),
    RetryInterceptor(),
  ]);

  return dio;
}
