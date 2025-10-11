import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable validation schema using Zod
 * This ensures all required environment variables are present and valid at startup
 */
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),

  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid MongoDB connection string'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters for security'),

  // AI Service Configuration
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for AI features'),
  FASTAPI_URL: z.string().url('FASTAPI_URL must be a valid URL'),

  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required for Google OAuth'),
  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required for Facebook OAuth'),

  // AWS S3 Configuration (Optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  DATADOG_API_KEY: z.string().optional(),
});

/**
 * Validate environment variables
 * Throws an error if validation fails with detailed error messages
 * Note: Uses console directly to avoid circular dependencies with logger
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      });

      console.error('❌ Environment variable validation failed:\n');
      console.error(errorMessages.join('\n'));
      console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
      console.error('Refer to .env.example for the expected format.\n');
      
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated and typed environment configuration
 * Export this to use throughout the application
 */
export const env = validateEnv();

/**
 * Type definition for environment variables
 * Useful for TypeScript autocomplete and type checking
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Helper function to check if running in production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Helper function to check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Helper function to check if running in test mode
 */
export const isTest = () => env.NODE_ENV === 'test';

/**
 * Helper function to check if AWS S3 is configured
 */
export const isS3Configured = () => {
  return !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET);
};

/**
 * Helper function to check if monitoring is configured
 */
export const isMonitoringConfigured = () => {
  return !!(env.SENTRY_DSN || env.DATADOG_API_KEY);
};
