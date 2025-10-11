import logger from './logger';
import { captureException, captureMessage } from './monitoring';
import { isProduction } from './env';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert categories for better organization
 */
export enum AlertCategory {
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AI_SERVICE = 'ai_service',
  EXTERNAL_API = 'external_api',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SYSTEM = 'system',
}

/**
 * Alert configuration interface
 */
interface AlertConfig {
  severity: AlertSeverity;
  category: AlertCategory;
  message: string;
  error?: Error;
  context?: Record<string, any>;
  notifyImmediately?: boolean;
}

/**
 * Alert thresholds and configurations
 */
const ALERT_THRESHOLDS = {
  // Database connection failures
  DATABASE_CONNECTION_FAILURES: 3,
  
  // API response time (ms)
  SLOW_API_RESPONSE: 5000,
  
  // Error rate (errors per minute)
  HIGH_ERROR_RATE: 10,
  
  // AI service failures
  AI_SERVICE_FAILURES: 5,
  
  // Authentication failures
  AUTH_FAILURES_PER_IP: 10,
};

/**
 * In-memory counters for alert throttling
 */
const alertCounters: Map<string, { count: number; lastReset: number }> = new Map();

/**
 * Reset counter every minute
 */
const COUNTER_RESET_INTERVAL = 60000; // 1 minute

/**
 * Check if alert should be throttled
 */
function shouldThrottle(key: string, threshold: number): boolean {
  const now = Date.now();
  const counter = alertCounters.get(key);
  
  if (!counter || now - counter.lastReset > COUNTER_RESET_INTERVAL) {
    alertCounters.set(key, { count: 1, lastReset: now });
    return false;
  }
  
  counter.count++;
  
  if (counter.count > threshold) {
    return true;
  }
  
  return false;
}

/**
 * Send alert through configured channels
 */
export function sendAlert(config: AlertConfig): void {
  const {
    severity,
    category,
    message,
    error,
    context = {},
    notifyImmediately = false,
  } = config;
  
  // Create alert key for throttling
  const alertKey = `${category}:${severity}:${message}`;
  
  // Throttle non-critical alerts
  if (!notifyImmediately && severity !== AlertSeverity.CRITICAL) {
    const threshold = severity === AlertSeverity.ERROR ? 5 : 10;
    if (shouldThrottle(alertKey, threshold)) {
      return;
    }
  }
  
  // Log the alert
  const logContext = {
    severity,
    category,
    ...context,
  };
  
  switch (severity) {
    case AlertSeverity.CRITICAL:
    case AlertSeverity.ERROR:
      if (error) {
        logger.error(message, { ...logContext, error: error.message, stack: error.stack });
      } else {
        logger.error(message, logContext);
      }
      break;
    case AlertSeverity.WARNING:
      logger.warn(message, logContext);
      break;
    case AlertSeverity.INFO:
      logger.info(message, logContext);
      break;
  }
  
  // Send to Sentry for ERROR and CRITICAL
  if (severity === AlertSeverity.ERROR || severity === AlertSeverity.CRITICAL) {
    if (error) {
      captureException(error, { ...logContext, message });
    } else {
      captureMessage(message, severity === AlertSeverity.CRITICAL ? 'fatal' : 'error');
    }
  }
  
  // In production, you could add additional notification channels here:
  // - PagerDuty for critical alerts
  // - Slack webhooks for team notifications
  // - Email for specific alert types
  // - SMS for critical system failures
  
  if (isProduction() && severity === AlertSeverity.CRITICAL) {
    // Placeholder for critical alert notifications
    logger.error('🚨 CRITICAL ALERT - Immediate attention required', {
      message,
      category,
      context,
    });
  }
}

/**
 * Predefined alert functions for common scenarios
 */

export function alertDatabaseConnectionFailure(error: Error, database: string): void {
  sendAlert({
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.DATABASE,
    message: `Database connection failure: ${database}`,
    error,
    context: { database },
    notifyImmediately: true,
  });
}

export function alertDatabaseQuerySlow(query: string, duration: number): void {
  if (duration > ALERT_THRESHOLDS.SLOW_API_RESPONSE) {
    sendAlert({
      severity: AlertSeverity.WARNING,
      category: AlertCategory.PERFORMANCE,
      message: 'Slow database query detected',
      context: { query, duration },
    });
  }
}

export function alertAIServiceFailure(error: Error, endpoint: string): void {
  sendAlert({
    severity: AlertSeverity.ERROR,
    category: AlertCategory.AI_SERVICE,
    message: `AI service failure: ${endpoint}`,
    error,
    context: { endpoint },
  });
}

export function alertExternalAPIFailure(error: Error, service: string, endpoint: string): void {
  sendAlert({
    severity: AlertSeverity.ERROR,
    category: AlertCategory.EXTERNAL_API,
    message: `External API failure: ${service}`,
    error,
    context: { service, endpoint },
  });
}

export function alertHighErrorRate(errorCount: number, timeWindow: string): void {
  if (errorCount > ALERT_THRESHOLDS.HIGH_ERROR_RATE) {
    sendAlert({
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.SYSTEM,
      message: 'High error rate detected',
      context: { errorCount, timeWindow },
      notifyImmediately: true,
    });
  }
}

export function alertAuthenticationFailure(ip: string, attempts: number): void {
  if (attempts > ALERT_THRESHOLDS.AUTH_FAILURES_PER_IP) {
    sendAlert({
      severity: AlertSeverity.WARNING,
      category: AlertCategory.SECURITY,
      message: 'Multiple authentication failures from same IP',
      context: { ip, attempts },
    });
  }
}

export function alertSlowAPIResponse(endpoint: string, duration: number): void {
  if (duration > ALERT_THRESHOLDS.SLOW_API_RESPONSE) {
    sendAlert({
      severity: AlertSeverity.WARNING,
      category: AlertCategory.PERFORMANCE,
      message: 'Slow API response detected',
      context: { endpoint, duration },
    });
  }
}

export function alertMemoryUsageHigh(usage: number, threshold: number): void {
  if (usage > threshold) {
    sendAlert({
      severity: AlertSeverity.WARNING,
      category: AlertCategory.SYSTEM,
      message: 'High memory usage detected',
      context: { usage, threshold, percentage: (usage / threshold) * 100 },
    });
  }
}

export function alertDiskSpaceLow(available: number, threshold: number): void {
  if (available < threshold) {
    sendAlert({
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.SYSTEM,
      message: 'Low disk space detected',
      context: { available, threshold },
      notifyImmediately: true,
    });
  }
}

/**
 * Monitor system health and send alerts
 */
export function startHealthMonitoring(): NodeJS.Timeout {
  const interval = setInterval(() => {
    // Monitor memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // Alert if heap usage is over 80%
    if (heapUsedMB / heapTotalMB > 0.8) {
      alertMemoryUsageHigh(heapUsedMB, heapTotalMB);
    }
    
    // Log health metrics
    logger.debug('System health check', {
      memory: {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        heapTotal: `${heapTotalMB.toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
    });
  }, 60000); // Check every minute
  
  return interval;
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  logger.info('Health monitoring stopped');
}

/**
 * Get alert statistics
 */
export function getAlertStatistics(): Record<string, any> {
  const stats: Record<string, any> = {};
  
  alertCounters.forEach((value, key) => {
    stats[key] = {
      count: value.count,
      lastReset: new Date(value.lastReset).toISOString(),
    };
  });
  
  return stats;
}

/**
 * Clear alert counters (useful for testing)
 */
export function clearAlertCounters(): void {
  alertCounters.clear();
}
