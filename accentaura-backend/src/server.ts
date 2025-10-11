// Initialize DataDog APM first (if configured)
import './datadog';

// Validate environment variables first (this will exit if validation fails)
import { env } from './config/env';
import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { connectMongoDB, disconnectMongoDB, isMongoDBConnected } from './config/mongo';
import { connectRedis, disconnectRedis, pingRedis } from './config/redis';
import prisma from './config/db';
import logger from './config/logger';
import { corsMiddleware, errorMiddleware, notFoundMiddleware } from './middlewares';
import authRoutes from './routes/auth.routes';
import lessonRoutes from './routes/lesson.routes';
import progressRoutes from './routes/progress.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import aiRoutes from './routes/ai.routes';
import axios from 'axios';
import {
  initializeSentry,
  setupSentryErrorHandler,
  closeMonitoring,
  getMonitoringHealth,
} from './config/monitoring';
import { startHealthMonitoring, stopHealthMonitoring } from './config/alerts';

const app: Application = express();
const PORT = env.PORT;

// Initialize Sentry (must be before other middleware)
initializeSentry(app);

// Security middleware - helmet (must be early in middleware chain)
app.use(helmet());

// CORS middleware (must be before routes)
app.use(corsMiddleware);

// Compression middleware for response compression
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint for health checks
app.get('/', (_req, res) => {
  res.json({
    name: 'Accentaura API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/v1'
    }
  });
});

// Health check endpoint (not under /v1 - for load balancers)
app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const checks: Record<string, { status: string; message?: string; responseTime?: number }> = {};
  
  // Check MongoDB connection (via Prisma)
  const dbStart = Date.now();
  try {
    await prisma.user.findFirst();
    checks.mongodb_prisma = {
      status: 'connected',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.postgresql = {
      status: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Check MongoDB connection
  const mongoStart = Date.now();
  try {
    const mongoConnected = isMongoDBConnected();
    checks.mongodb = {
      status: mongoConnected ? 'connected' : 'disconnected',
      responseTime: Date.now() - mongoStart
    };
  } catch (error) {
    checks.mongodb = {
      status: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Check Redis connection
  const redisStart = Date.now();
  try {
    const redisHealthy = await pingRedis();
    checks.redis = {
      status: redisHealthy ? 'connected' : 'disconnected',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    checks.redis = {
      status: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Check AI service connectivity
  const aiStart = Date.now();
  try {
    const aiHealthUrl = `${env.FASTAPI_URL}/health`;
    const aiResponse = await axios.get(aiHealthUrl, { timeout: 5000 });
    checks.ai_service = {
      status: aiResponse.data.status === 'healthy' ? 'connected' : 'degraded',
      responseTime: Date.now() - aiStart,
      message: aiResponse.data.gemini_api || undefined
    };
  } catch (error) {
    checks.ai_service = {
      status: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Check monitoring services
  const monitoringHealth = getMonitoringHealth();
  checks.monitoring = {
    status: 'info',
    message: JSON.stringify(monitoringHealth)
  };
  
  // Determine overall status
  const allHealthy = Object.values(checks)
    .filter(check => check.status !== 'info')
    .every(check => check.status === 'connected');
  const anyDisconnected = Object.values(checks)
    .filter(check => check.status !== 'info')
    .some(check => check.status === 'disconnected');
  
  const overallStatus = allHealthy ? 'healthy' : anyDisconnected ? 'unhealthy' : 'degraded';
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    status: overallStatus,
    timestamp,
    environment: env.NODE_ENV,
    services: checks
  });
});

// API Routes under /v1 prefix (mobile app expects /v1/auth/*, /v1/lessons/*, /v1/progress/*, /v1/leaderboard/*, /v1/ai/*)
app.use('/v1/auth', authRoutes);
app.use('/v1/lessons', lessonRoutes);
app.use('/v1/progress', progressRoutes);
app.use('/v1/leaderboard', leaderboardRoutes);
app.use('/v1/ai', aiRoutes);

// 404 handler for undefined routes
app.use(notFoundMiddleware);

// Sentry error handler (must be before other error handlers)
setupSentryErrorHandler(app);

// Global error handler (must be last)
app.use(errorMiddleware);

// Initialize connections and start server
async function startServer() {
  let healthMonitoringInterval: NodeJS.Timeout | null = null;
  
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Connect to Redis
    await connectRedis();
    
    // Start health monitoring
    healthMonitoringInterval = startHealthMonitoring();
    logger.info('✅ Health monitoring started');
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Accentaura Backend API running on port ${PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      
      // Log monitoring status
      const monitoringHealth = getMonitoringHealth();
      if (monitoringHealth.sentry.enabled) {
        logger.info('✅ Sentry error tracking enabled');
      }
      if (monitoringHealth.datadog.enabled) {
        logger.info('✅ DataDog APM enabled');
      }
      if (!monitoringHealth.sentry.enabled && !monitoringHealth.datadog.enabled) {
        logger.info('ℹ️  No monitoring services configured (optional for development)');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Stop health monitoring
          if (healthMonitoringInterval) {
            stopHealthMonitoring(healthMonitoringInterval);
          }
          
          // Close monitoring connections
          await closeMonitoring();
          
          // Close database connections
          await disconnectMongoDB();
          await disconnectRedis();
          
          logger.info('All connections closed. Exiting process.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;
