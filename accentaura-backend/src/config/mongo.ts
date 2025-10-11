import mongoose from 'mongoose';
import logger from './logger';
import { env } from './env';

const MONGODB_URI = env.MONGODB_URI;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 */
export async function connectMongoDB(): Promise<void> {
  let retries = 0;

  const connect = async (): Promise<void> => {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected successfully', {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
      });

    } catch (error) {
      retries++;
      logger.error(`MongoDB connection failed (attempt ${retries}/${MAX_RETRIES}):`, error);

      if (retries < MAX_RETRIES) {
        logger.info(`Retrying MongoDB connection in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return connect();
      } else {
        logger.error('Max MongoDB connection retries reached. Exiting...');
        throw new Error('Failed to connect to MongoDB after maximum retries');
      }
    }
  };

  await connect();
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

/**
 * Check MongoDB connection status
 */
export function isMongoDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export default mongoose;
