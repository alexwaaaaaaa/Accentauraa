import { Request, Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { sendSuccess } from '../utils/response.util';
import logger from '../config/logger';

/**
 * Leaderboard Controller
 * Handles all leaderboard-related HTTP requests
 */

/**
 * Get Leaderboard Handler
 * GET /leaderboard?limit=100
 * Mobile app expects limit query param
 * 
 * Query params: { limit?: number }
 * Response: { entries: [{ userId, username, avatarUrl, totalXp, rank, streak }], lastUpdated }
 */
export async function getLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Parse limit from query params, default to 100
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      throw new Error('Invalid limit parameter. Must be between 1 and 1000.');
    }

    logger.info(`Get leaderboard request with limit: ${limit}`);

    const leaderboard = await leaderboardService.getLeaderboard(limit);

    logger.info(`Leaderboard retrieved with ${leaderboard.entries.length} entries`);

    // Mobile app expects direct leaderboard data
    sendSuccess(res, leaderboard);
  } catch (error) {
    next(error);
  }
}

/**
 * Get User Rank Handler
 * GET /leaderboard/rank/:userId
 * Mobile app expects userId path param
 * 
 * Path params: { userId: string }
 * Response: { rank: number, totalUsers: number, percentile: number }
 */
export async function getUserRank(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }

    logger.info(`Get user rank request for user: ${userId}`);

    const userRank = await leaderboardService.getUserRank(userId);

    logger.info(
      `User rank retrieved for user: ${userId}, rank: ${userRank.rank}, percentile: ${userRank.percentile}%`
    );

    // Mobile app expects direct rank data
    sendSuccess(res, userRank);
  } catch (error) {
    next(error);
  }
}
