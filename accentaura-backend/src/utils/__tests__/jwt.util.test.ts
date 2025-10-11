import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  TokenPayload,
} from '../jwt.util';

// Mock the env config
jest.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-purposes-only',
  },
}));

describe('JWT Utility Functions', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and email in token payload', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = jwt.decode(token) as TokenPayload;
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should set expiration time for access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = jwt.decode(token) as TokenPayload;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Token should expire in approximately 15 minutes (900 seconds)
      const expiresIn = decoded.exp! - decoded.iat!;
      expect(expiresIn).toBe(900); // 15 minutes
    });

    it('should use HS256 algorithm', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = jwt.decode(token, { complete: true });
      
      expect(decoded?.header.alg).toBe('HS256');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and email in token payload', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = jwt.decode(token) as TokenPayload;
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should set expiration time for refresh token (7 days)', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = jwt.decode(token) as TokenPayload;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Token should expire in approximately 7 days (604800 seconds)
      const expiresIn = decoded.exp! - decoded.iat!;
      expect(expiresIn).toBe(604800); // 7 days
    });

    it('should generate different tokens for access and refresh', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const payload = verifyToken(token, false);
      
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
    });

    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const payload = verifyToken(token, true);
      
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
    });

    it('should throw error for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        'test-jwt-secret-key-for-testing-purposes-only',
        { expiresIn: '-1s' } // Already expired
      );
      
      expect(() => verifyToken(expiredToken, false)).toThrow('Token has expired');
    });

    it('should throw error for invalid token signature', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const tamperedToken = token.slice(0, -5) + 'xxxxx'; // Tamper with signature
      
      expect(() => verifyToken(tamperedToken, false)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      expect(() => verifyToken(malformedToken, false)).toThrow('Invalid token');
    });

    it('should throw error when using wrong secret (access token verified as refresh)', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      
      expect(() => verifyToken(accessToken, true)).toThrow('Invalid token');
    });

    it('should throw error when using wrong secret (refresh token verified as access)', () => {
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      expect(() => verifyToken(refreshToken, false)).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = decodeToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it('should decode an expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        'test-jwt-secret-key-for-testing-purposes-only',
        { expiresIn: '-1s' }
      );
      
      const decoded = decodeToken(expiredToken);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-valid-token';
      const decoded = decodeToken(malformedToken);
      
      expect(decoded).toBeNull();
    });

    it('should decode token with tampered signature', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      // Decode doesn't verify signature, so it should still work
      const decoded = decodeToken(tamperedToken);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for a valid non-expired token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const expired = isTokenExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for an expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        'test-jwt-secret-key-for-testing-purposes-only',
        { expiresIn: '-1s' }
      );
      
      const expired = isTokenExpired(expiredToken);
      
      expect(expired).toBe(true);
    });

    it('should return true for malformed token', () => {
      const malformedToken = 'not-a-valid-token';
      const expired = isTokenExpired(malformedToken);
      
      expect(expired).toBe(true);
    });

    it('should return true for token without expiration', () => {
      const tokenWithoutExp = jwt.sign(
        { userId: testUserId, email: testEmail },
        'test-jwt-secret-key-for-testing-purposes-only'
        // No expiresIn specified
      );
      
      // Remove exp claim manually
      const payload = jwt.decode(tokenWithoutExp) as any;
      delete payload.exp;
      const tokenNoExp = jwt.sign(payload, 'test-jwt-secret-key-for-testing-purposes-only');
      
      const expired = isTokenExpired(tokenNoExp);
      
      expect(expired).toBe(true);
    });

    it('should handle token that expires in the future', () => {
      const futureToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        'test-jwt-secret-key-for-testing-purposes-only',
        { expiresIn: '1h' }
      );
      
      const expired = isTokenExpired(futureToken);
      
      expect(expired).toBe(false);
    });
  });

  describe('Token Integration', () => {
    it('should generate, verify, and decode tokens consistently', () => {
      const token = generateAccessToken(testUserId, testEmail);
      
      // Verify
      const verified = verifyToken(token, false);
      expect(verified.userId).toBe(testUserId);
      expect(verified.email).toBe(testEmail);
      
      // Decode
      const decoded = decodeToken(token);
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
      
      // Check expiration
      const expired = isTokenExpired(token);
      expect(expired).toBe(false);
    });

    it('should handle different user data correctly', () => {
      const users = [
        { userId: 'user-1', email: 'user1@test.com' },
        { userId: 'user-2', email: 'user2@test.com' },
        { userId: 'user-3', email: 'user3@test.com' },
      ];
      
      users.forEach(user => {
        const token = generateAccessToken(user.userId, user.email);
        const verified = verifyToken(token, false);
        
        expect(verified.userId).toBe(user.userId);
        expect(verified.email).toBe(user.email);
      });
    });
  });
});
