import prisma from '../config/db';
import logger from '../config/logger';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.util';
import { UnauthorizedError, ConflictError, ExternalServiceError } from '../utils/errors.util';
import { AuthProvider } from '@prisma/client';
import { env } from '../config/env';
import axios from 'axios';

/**
 * Authentication Result Interface
 * Returned by login and OAuth methods
 */
export interface AuthResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    provider: AuthProvider;
    currentLevel: number;
    totalXp: number;
    streak: number;
    coins: number;
  };
  progress?: {
    currentLevel: number;
    totalXp: number;
    streak: number;
    coins: number;
    lastActivityDate: Date | null;
  };
}

/**
 * Token Refresh Result Interface
 */
export interface RefreshResult {
  token: string;
  refreshToken: string;
}

/**
 * Token Validation Result Interface
 */
export interface ValidationResult {
  valid: boolean;
}

/**
 * OAuth User Info Interface
 */
export interface OAuthUserInfo {
  email: string;
  name?: string;
  avatarUrl?: string;
  providerId: string;
}

/**
 * AuthService Class
 * Handles all authentication-related operations
 */
export class AuthService {
  /**
   * Sign up a new user with email and password
   * @param email - User's email address
   * @param password - User's plain text password
   * @param name - User's name (optional)
   * @returns Authentication result with tokens and user data
   */
  async signup(email: string, password: string, name?: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create the user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          provider: AuthProvider.EMAIL,
        },
      });

      logger.info(`User signed up successfully: ${user.id}`);

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Return auth result
      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
        },
        progress: {
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
          lastActivityDate: user.lastActivityDate,
        },
      };
    } catch (error) {
      logger.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Authentication result with tokens, user data, and progress
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if user has a password (not OAuth user)
      if (!user.password) {
        throw new UnauthorizedError('Please login using your social account');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      logger.info(`User logged in successfully: ${user.id}`);

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Return auth result with progress
      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
        },
        progress: {
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
          lastActivityDate: user.lastActivityDate,
        },
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Login with OAuth (Google or Facebook)
   * @param provider - OAuth provider ('google' or 'facebook')
   * @param token - OAuth token from provider
   * @returns Authentication result with tokens, user data, and progress
   */
  async loginWithOAuth(provider: string, token: string): Promise<AuthResult> {
    try {
      // Verify OAuth token and get user info
      const oauthUserInfo = await this.verifyOAuthToken(provider, token);

      // Determine provider enum
      const authProvider = provider.toUpperCase() === 'GOOGLE' 
        ? AuthProvider.GOOGLE 
        : AuthProvider.FACEBOOK;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: oauthUserInfo.email },
      });

      if (user) {
        // Update existing user if needed
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: oauthUserInfo.name || user.name,
            avatarUrl: oauthUserInfo.avatarUrl || user.avatarUrl,
            provider: authProvider,
          },
        });

        logger.info(`User logged in with OAuth: ${user.id}`);
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: oauthUserInfo.email,
            name: oauthUserInfo.name,
            avatarUrl: oauthUserInfo.avatarUrl,
            provider: authProvider,
            password: null, // OAuth users don't have passwords
          },
        });

        logger.info(`New user created via OAuth: ${user.id}`);
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Return auth result with progress
      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
        },
        progress: {
          currentLevel: user.currentLevel,
          totalXp: user.totalXp,
          streak: user.streak,
          coins: user.coins,
          lastActivityDate: user.lastActivityDate,
        },
      };
    } catch (error) {
      logger.error('OAuth login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns New access token and refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken, true);

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Delete expired token
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedError('Refresh token has expired');
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      logger.info(`Token refreshed for user: ${user.id}`);

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Delete old refresh token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user by invalidating refresh token
   * @param refreshToken - Refresh token to invalidate
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      // Find and delete refresh token
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        logger.info(`User logged out: ${storedToken.userId}`);
      }
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Validate access token
   * @param token - Access token to validate
   * @returns Validation result
   */
  async validateToken(token: string): Promise<ValidationResult> {
    try {
      // Verify token
      const payload = verifyToken(token, false);

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return { valid: false };
      }

      return { valid: true };
    } catch (error) {
      logger.debug('Token validation failed:', error);
      return { valid: false };
    }
  }

  /**
   * Generate access and refresh tokens
   * @param userId - User's ID
   * @param email - User's email
   * @returns Object containing both tokens
   * @private
   */
  private async generateTokens(userId: string, email: string): Promise<{ token: string; refreshToken: string }> {
    // Generate access token
    const token = generateAccessToken(userId, email);

    // Generate refresh token
    const refreshToken = generateRefreshToken(userId, email);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Try to create, if duplicate exists (shouldn't happen with JWT timestamps), ignore
    try {
      await prisma.refreshToken.create({
        data: {
          userId,
          token: refreshToken,
          expiresAt,
        },
      });
    } catch (error) {
      // If duplicate token (very rare), just continue - the token is still valid
      logger.warn(`Duplicate refresh token for user ${userId}, continuing...`);
    }

    return { token, refreshToken };
  }

  /**
   * Verify OAuth token with provider
   * @param provider - OAuth provider ('google' or 'facebook')
   * @param token - OAuth token from provider
   * @returns User information from OAuth provider
   * @private
   */
  private async verifyOAuthToken(provider: string, token: string): Promise<OAuthUserInfo> {
    const providerLower = provider.toLowerCase();

    if (providerLower === 'google') {
      return await this.verifyGoogleToken(token);
    } else if (providerLower === 'facebook') {
      return await this.verifyFacebookToken(token);
    } else {
      throw new UnauthorizedError(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Verify Google OAuth token
   * @param token - Google OAuth token (ID token)
   * @returns User information from Google
   * @private
   */
  private async verifyGoogleToken(token: string): Promise<OAuthUserInfo> {
    try {
      // Google's tokeninfo endpoint to verify the token
      const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: {
          id_token: token,
        },
        timeout: 10000, // 10 second timeout
      });

      const data = response.data;

      // Verify the token is for our application
      if (data.aud !== env.GOOGLE_CLIENT_ID) {
        throw new UnauthorizedError('Invalid Google token: audience mismatch');
      }

      // Verify the token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (data.exp && data.exp < now) {
        throw new UnauthorizedError('Google token has expired');
      }

      // Verify email is verified
      if (data.email_verified !== 'true' && data.email_verified !== true) {
        throw new UnauthorizedError('Google email not verified');
      }

      logger.info(`Google token verified for email: ${data.email}`);

      return {
        email: data.email,
        name: data.name,
        avatarUrl: data.picture,
        providerId: data.sub, // Google's unique user ID
      };
    } catch (error) {
      // Re-throw if it's already one of our custom errors
      if (error instanceof UnauthorizedError || error instanceof ExternalServiceError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Google API returned an error
          logger.error('Google token verification failed:', error.response.data);
          throw new UnauthorizedError('Invalid Google token');
        } else if (error.request) {
          // Network error
          logger.error('Google API network error:', error.message);
          throw new ExternalServiceError('Google', 'Unable to verify token - network error');
        }
      }

      logger.error('Unexpected error verifying Google token:', error);
      throw new ExternalServiceError('Google', 'Token verification failed');
    }
  }

  /**
   * Verify Facebook OAuth token
   * @param token - Facebook OAuth access token
   * @returns User information from Facebook
   * @private
   */
  private async verifyFacebookToken(token: string): Promise<OAuthUserInfo> {
    try {
      // Step 1: Verify the token with Facebook's debug_token endpoint
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: token,
          access_token: `${env.FACEBOOK_APP_ID}|${token}`, // App token format
        },
        timeout: 10000, // 10 second timeout
      });

      const debugData = debugResponse.data.data;

      // Verify the token is valid
      if (!debugData.is_valid) {
        throw new UnauthorizedError('Invalid Facebook token');
      }

      // Verify the token is for our application
      if (debugData.app_id !== env.FACEBOOK_APP_ID) {
        throw new UnauthorizedError('Invalid Facebook token: app ID mismatch');
      }

      // Verify the token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (debugData.expires_at && debugData.expires_at > 0 && debugData.expires_at < now) {
        throw new UnauthorizedError('Facebook token has expired');
      }

      // Step 2: Fetch user information from Facebook Graph API
      const userResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,email,name,picture.type(large)',
          access_token: token,
        },
        timeout: 10000,
      });

      const userData = userResponse.data;

      // Verify email is present
      if (!userData.email) {
        throw new UnauthorizedError('Facebook account does not have an email address');
      }

      logger.info(`Facebook token verified for email: ${userData.email}`);

      return {
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture?.data?.url,
        providerId: userData.id, // Facebook's unique user ID
      };
    } catch (error) {
      // Re-throw if it's already one of our custom errors
      if (error instanceof UnauthorizedError || error instanceof ExternalServiceError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Facebook API returned an error
          logger.error('Facebook token verification failed:', error.response.data);
          throw new UnauthorizedError('Invalid Facebook token');
        } else if (error.request) {
          // Network error
          logger.error('Facebook API network error:', error.message);
          throw new ExternalServiceError('Facebook', 'Unable to verify token - network error');
        }
      }

      logger.error('Unexpected error verifying Facebook token:', error);
      throw new ExternalServiceError('Facebook', 'Token verification failed');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

