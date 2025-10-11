import winston from 'winston';
import path from 'path';

// Sensitive fields to sanitize from logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'secret',
  'apiKey',
  'jwt',
  'creditCard',
  'ssn',
  'pin',
];

/**
 * Sanitize sensitive data from log objects
 * Recursively removes or masks sensitive fields
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field name
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Custom format to sanitize sensitive data
 */
const sanitizeFormat = winston.format((info) => {
  // Sanitize metadata if it exists
  if (info.metadata && typeof info.metadata === 'object') {
    info.metadata = sanitizeLogData(info.metadata);
  }
  
  // Sanitize any other properties (excluding Winston's internal fields)
  const internalFields = ['level', 'message', 'timestamp', 'splat', Symbol.for('level'), Symbol.for('message'), Symbol.for('splat')];
  
  for (const key of Object.keys(info)) {
    if (!internalFields.includes(key) && key !== 'metadata') {
      if (typeof info[key] === 'object' && info[key] !== null) {
        info[key] = sanitizeLogData(info[key]);
      }
    }
  }
  
  // Must return the info object for Winston to continue processing
  return info;
});

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return 'info';
  } else if (env === 'test') {
    return 'error';
  }
  
  return 'debug';
};

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Configure Winston logger with different transports for development and production
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    sanitizeFormat() // Sanitize AFTER metadata is extracted
  ),
  defaultMeta: { service: 'accentaura-backend' },
  transports: [],
});

// Configure transports based on environment
const env = process.env.NODE_ENV || 'development';

if (env === 'production') {
  // Production transports: JSON format to files
  
  // Combined log file (all levels)
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  // Error log file (errors only)
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  // Console output in production (for container logs)
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.json()
      ),
    })
  );
} else if (env === 'test') {
  // Test environment: minimal logging
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple()
      ),
      silent: process.env.SILENT_LOGS === 'true',
    })
  );
} else {
  // Development transports: Console with colors
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, metadata }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          
          if (metadata && Object.keys(metadata).length > 0) {
            log += `\n${JSON.stringify(metadata, null, 2)}`;
          }
          
          return log;
        })
      ),
    })
  );
}

export default logger;
