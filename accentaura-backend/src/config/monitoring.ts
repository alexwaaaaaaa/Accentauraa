import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Application } from 'express';
import { env, isProduction } from './env';
import logger from './logger';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes if SENTRY_DSN is configured
 */
export function initializeSentry(_app: Application): void {
  if (!env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured - skipping Sentry initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      
      // Performance Monitoring
      tracesSampleRate: isProduction() ? 0.1 : 1.0, // 10% in production, 100% in dev
      
      // Profiling
      profilesSampleRate: isProduction() ? 0.1 : 1.0,
      integrations: [
        // Enable HTTP calls tracing
        Sentry.httpIntegration(),
        
        // Enable Express.js middleware tracing
        Sentry.expressIntegration(),
        
        // Enable profiling
        nodeProfilingIntegration(),
      ],
      
      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        // Remove sensitive data from extra context
        if (event.extra) {
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
          for (const key of sensitiveKeys) {
            if (event.extra[key]) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser/client errors that shouldn't be tracked
        'Non-Error promise rejection captured',
        'Network request failed',
        'NetworkError',
        'AbortError',
      ],
    });

    logger.info('✅ Sentry initialized successfully', {
      environment: env.NODE_ENV,
      tracesSampleRate: isProduction() ? 0.1 : 1.0,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

/**
 * Setup Sentry Express error handler
 * Must be called with the Express app after all routes
 */
export function setupSentryErrorHandler(app: Application): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Manually capture an exception to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context from Sentry
 */
export function clearUserContext(): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Initialize DataDog APM (Application Performance Monitoring)
 * Must be called before any other imports in the application
 */
export function initializeDataDog(): void {
  if (!env.DATADOG_API_KEY) {
    logger.info('DataDog API key not configured - skipping DataDog initialization');
    return;
  }

  try {
    // DataDog tracer must be initialized before any other imports
    // This is typically done in a separate file that's imported first
    const tracer = require('dd-trace');
    
    tracer.init({
      service: 'accentaura-backend',
      env: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      
      // Performance settings
      runtimeMetrics: true,
      profiling: isProduction(),
      
      // Sampling rate
      sampleRate: isProduction() ? 0.1 : 1.0,
      
      // Log injection for correlation
      logInjection: true,
      
      // Tags
      tags: {
        'service.name': 'accentaura-backend',
        'service.version': process.env.npm_package_version || '1.0.0',
      },
    });

    logger.info('✅ DataDog APM initialized successfully', {
      environment: env.NODE_ENV,
      service: 'accentaura-backend',
    });
  } catch (error) {
    logger.error('Failed to initialize DataDog', { error });
  }
}

/**
 * Health check for monitoring services
 */
export function getMonitoringHealth(): {
  sentry: { enabled: boolean; configured: boolean };
  datadog: { enabled: boolean; configured: boolean };
} {
  return {
    sentry: {
      enabled: !!env.SENTRY_DSN,
      configured: !!env.SENTRY_DSN,
    },
    datadog: {
      enabled: !!env.DATADOG_API_KEY,
      configured: !!env.DATADOG_API_KEY,
    },
  };
}

/**
 * Gracefully close monitoring connections
 */
export async function closeMonitoring(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (env.SENTRY_DSN) {
    promises.push(
      Sentry.close(2000).then(() => {
        logger.info('Sentry connection closed');
      })
    );
  }
  
  await Promise.all(promises);
}
