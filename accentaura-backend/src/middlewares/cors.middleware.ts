import cors, { CorsOptions } from 'cors';
import { isDevelopment, isProduction, isTest } from '../config/env';

/**
 * CORS Middleware Configuration
 * Configures Cross-Origin Resource Sharing for the API
 * 
 * Development: Allows localhost origins for mobile app testing
 * Production: Allows specific production domains
 */

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): (string | RegExp)[] {
  // Development and test environments: Allow localhost and common development ports
  if (isDevelopment() || isTest()) {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
      // Mobile app development (Expo, React Native)
      'exp://localhost:19000',
      'exp://127.0.0.1:19000',
      // Allow any localhost for development
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ];
  }

  if (isProduction()) {
    // Production: Only allow specific domains
    return [
      'https://accentaura.com',
      'https://www.accentaura.com',
      'https://api.accentaura.com',
      'https://app.accentaura.com',
      // Add mobile app domains if applicable
      'capacitor://localhost',
      'ionic://localhost',
    ];
  }

  // Staging or other environments
  return [
    'https://staging.accentaura.com',
    'https://staging-api.accentaura.com',
    'http://localhost:3000',
    'http://localhost:8080',
  ];
}

/**
 * CORS options configuration
 */
export const corsOptions: CorsOptions = {
  /**
   * Origin validation function
   * Checks if the request origin is allowed
   */
  origin: (origin, callback) => {
    // Get allowed origins dynamically based on current environment
    const allowedOrigins = getAllowedOrigins();
    
    // Debug logging (can be enabled for troubleshooting)
    // console.log('CORS Check - Origin:', origin);
    // console.log('CORS Check - Allowed Origins:', allowedOrigins);
    // console.log('CORS Check - isDevelopment:', isDevelopment());

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      // Handle regex patterns
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },

  /**
   * Allow credentials (cookies, authorization headers)
   * Required for JWT authentication
   */
  credentials: true,

  /**
   * Allowed HTTP methods
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  /**
   * Allowed headers
   * Include Authorization for JWT tokens and Content-Type for JSON/multipart
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],

  /**
   * Exposed headers
   * Headers that the client can access
   */
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id',
    'X-Response-Time',
  ],

  /**
   * Preflight cache duration (in seconds)
   * How long browsers can cache preflight OPTIONS requests
   */
  maxAge: 86400, // 24 hours

  /**
   * Pass the CORS preflight response to the next handler
   */
  preflightContinue: false,

  /**
   * Provide a status code to use for successful OPTIONS requests
   */
  optionsSuccessStatus: 204,
};

/**
 * CORS middleware instance
 * Use this in Express app configuration
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Permissive CORS for specific routes (e.g., health checks)
 * Allows all origins - use sparingly and only for public endpoints
 */
export const permissiveCorsOptions: CorsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

/**
 * Permissive CORS middleware
 * Use for public endpoints like /health
 */
export const permissiveCorsMiddleware = cors(permissiveCorsOptions);
