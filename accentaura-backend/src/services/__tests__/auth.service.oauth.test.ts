import { AuthService } from '../auth.service';
import axios from 'axios';
import { UnauthorizedError } from '../../utils/errors.util';

// Mock dependencies
jest.mock('axios');
jest.mock('../../config/logger');
jest.mock('../../config/env', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    FACEBOOK_APP_ID: 'test-facebook-app-id',
  },
}));

// Mock Prisma client
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService - OAuth Token Verification', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('verifyGoogleToken', () => {
    it('should successfully verify a valid Google token', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: 'true',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-user-id-123',
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      // Access private method through any type casting for testing
      const result = await (authService as any).verifyGoogleToken('valid-google-token');

      expect(result).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        providerId: 'google-user-id-123',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/tokeninfo',
        {
          params: {
            id_token: 'valid-google-token',
          },
          timeout: 10000,
        }
      );
    });

    it('should throw UnauthorizedError for audience mismatch', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'wrong-client-id',
          email: 'test@example.com',
          email_verified: 'true',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      await expect(
        (authService as any).verifyGoogleToken('invalid-token')
      ).rejects.toThrow('Invalid Google token: audience mismatch');
    });

    it('should throw UnauthorizedError for expired token', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: 'true',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      await expect(
        (authService as any).verifyGoogleToken('expired-token')
      ).rejects.toThrow('Google token has expired');
    });

    it('should throw UnauthorizedError for unverified email', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: 'false',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      await expect(
        (authService as any).verifyGoogleToken('unverified-token')
      ).rejects.toThrow('Google email not verified');
    });

    it('should handle Google API error response', async () => {
      const mockError = {
        response: {
          data: {
            error: 'invalid_token',
            error_description: 'Invalid token',
          },
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        (authService as any).verifyGoogleToken('invalid-token')
      ).rejects.toThrow('Invalid Google token');
    });

    it('should handle network error', async () => {
      const mockError = {
        request: {},
        message: 'Network error',
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        (authService as any).verifyGoogleToken('token')
      ).rejects.toThrow('Unable to verify token - network error');
    });

    it('should handle boolean email_verified value', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: true, // Boolean instead of string
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-user-id-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      const result = await (authService as any).verifyGoogleToken('valid-google-token');

      expect(result.email).toBe('test@example.com');
    });
  });

  describe('verifyFacebookToken', () => {
    it('should successfully verify a valid Facebook token', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            user_id: 'facebook-user-id-123',
            expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          },
        },
      };

      const mockUserResponse = {
        data: {
          id: 'facebook-user-id-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: {
            data: {
              url: 'https://example.com/avatar.jpg',
            },
          },
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockDebugResponse)
        .mockResolvedValueOnce(mockUserResponse);

      const result = await (authService as any).verifyFacebookToken('valid-facebook-token');

      expect(result).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        providerId: 'facebook-user-id-123',
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        'https://graph.facebook.com/debug_token',
        {
          params: {
            input_token: 'valid-facebook-token',
            access_token: 'test-facebook-app-id|valid-facebook-token',
          },
          timeout: 10000,
        }
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        2,
        'https://graph.facebook.com/me',
        {
          params: {
            fields: 'id,email,name,picture.type(large)',
            access_token: 'valid-facebook-token',
          },
          timeout: 10000,
        }
      );
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: false,
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockDebugResponse);

      await expect(
        (authService as any).verifyFacebookToken('invalid-token')
      ).rejects.toThrow('Invalid Facebook token');
    });

    it('should throw UnauthorizedError for app ID mismatch', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'wrong-app-id',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockDebugResponse);

      await expect(
        (authService as any).verifyFacebookToken('invalid-token')
      ).rejects.toThrow('Invalid Facebook token: app ID mismatch');
    });

    it('should throw UnauthorizedError for expired token', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockDebugResponse);

      await expect(
        (authService as any).verifyFacebookToken('expired-token')
      ).rejects.toThrow('Facebook token has expired');
    });

    it('should throw UnauthorizedError when email is missing', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      };

      const mockUserResponse = {
        data: {
          id: 'facebook-user-id-123',
          name: 'Test User',
          // email is missing
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockDebugResponse)
        .mockResolvedValueOnce(mockUserResponse);

      await expect(
        (authService as any).verifyFacebookToken('token-without-email')
      ).rejects.toThrow('Facebook account does not have an email address');
    });

    it('should handle Facebook API error response', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Invalid OAuth access token',
              type: 'OAuthException',
            },
          },
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        (authService as any).verifyFacebookToken('invalid-token')
      ).rejects.toThrow('Invalid Facebook token');
    });

    it('should handle network error', async () => {
      const mockError = {
        request: {},
        message: 'Network error',
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        (authService as any).verifyFacebookToken('token')
      ).rejects.toThrow('Unable to verify token - network error');
    });

    it('should handle token with no expiration (long-lived token)', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            expires_at: 0, // Long-lived token with no expiration
          },
        },
      };

      const mockUserResponse = {
        data: {
          id: 'facebook-user-id-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: {
            data: {
              url: 'https://example.com/avatar.jpg',
            },
          },
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockDebugResponse)
        .mockResolvedValueOnce(mockUserResponse);

      const result = await (authService as any).verifyFacebookToken('long-lived-token');

      expect(result.email).toBe('test@example.com');
    });

    it('should handle missing picture data', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      };

      const mockUserResponse = {
        data: {
          id: 'facebook-user-id-123',
          email: 'test@example.com',
          name: 'Test User',
          // picture is missing
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockDebugResponse)
        .mockResolvedValueOnce(mockUserResponse);

      const result = await (authService as any).verifyFacebookToken('token');

      expect(result.avatarUrl).toBeUndefined();
    });
  });

  describe('verifyOAuthToken', () => {
    it('should call verifyGoogleToken for google provider', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: 'true',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-user-id-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      const result = await (authService as any).verifyOAuthToken('google', 'token');

      expect(result.email).toBe('test@example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/tokeninfo',
        expect.any(Object)
      );
    });

    it('should call verifyFacebookToken for facebook provider', async () => {
      const mockDebugResponse = {
        data: {
          data: {
            is_valid: true,
            app_id: 'test-facebook-app-id',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      };

      const mockUserResponse = {
        data: {
          id: 'facebook-user-id-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockDebugResponse)
        .mockResolvedValueOnce(mockUserResponse);

      const result = await (authService as any).verifyOAuthToken('facebook', 'token');

      expect(result.email).toBe('test@example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/debug_token',
        expect.any(Object)
      );
    });

    it('should handle case-insensitive provider names', async () => {
      const mockGoogleResponse = {
        data: {
          aud: 'test-google-client-id',
          email: 'test@example.com',
          email_verified: 'true',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockGoogleResponse);

      await (authService as any).verifyOAuthToken('GOOGLE', 'token');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for unsupported provider', async () => {
      await expect(
        (authService as any).verifyOAuthToken('twitter', 'token')
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        (authService as any).verifyOAuthToken('twitter', 'token')
      ).rejects.toThrow('Unsupported OAuth provider: twitter');
    });
  });
});
