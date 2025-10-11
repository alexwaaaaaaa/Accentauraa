import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * JWT Token Payload Interface
 * Contains the data stored in the JWT token
 */
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate Access Token
 * Creates a JWT access token with 15-minute expiry
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @returns JWT access token string
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m', // 15 minutes
    algorithm: 'HS256',
  });
}

/**
 * Generate Refresh Token
 * Creates a JWT refresh token with 7-day expiry
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @returns JWT refresh token string
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7 days
    algorithm: 'HS256',
  });
}

/**
 * Verify Token
 * Validates and decodes a JWT token
 * 
 * @param token - JWT token string to verify
 * @param isRefreshToken - Whether this is a refresh token (uses different secret)
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyToken(token: string, isRefreshToken: boolean = false): TokenPayload {
  try {
    const secret = isRefreshToken ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;
    
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    
    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not yet valid');
    }
    
    // Generic error for any other JWT-related issues
    throw new Error('Token verification failed');
  }
}

/**
 * Decode Token Without Verification
 * Extracts payload from token without validating signature
 * Useful for debugging or extracting info from expired tokens
 * 
 * @param token - JWT token string to decode
 * @returns Decoded token payload or null if invalid
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if Token is Expired
 * Determines if a token has expired without throwing an error
 * 
 * @param token - JWT token string to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}
