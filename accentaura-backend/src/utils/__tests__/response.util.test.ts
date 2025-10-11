import { Response } from 'express';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendInternalError,
  sendServiceUnavailable,
} from '../response.util';

describe('Response Utility Functions', () => {
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('sendSuccess', () => {
    it('should send direct data without wrapping (mobile app expectation)', () => {
      const data = { token: 'abc123', user: { id: '1', email: 'test@example.com' } };
      
      sendSuccess(mockResponse as Response, data);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(data);
      // Verify data is NOT wrapped in { success: true, data: {...} }
      expect(jsonMock).not.toHaveBeenCalledWith({ success: true, data });
    });

    it('should send data with custom status code', () => {
      const data = { id: '123', created: true };
      
      sendSuccess(mockResponse as Response, data, 201);
      
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(data);
    });

    it('should handle null data', () => {
      sendSuccess(mockResponse as Response, null);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(null);
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      
      sendSuccess(mockResponse as Response, data);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(data);
    });

    it('should handle primitive data', () => {
      sendSuccess(mockResponse as Response, 'success');
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith('success');
    });
  });

  describe('sendError', () => {
    it('should send error with message format (mobile app expectation)', () => {
      sendError(mockResponse as Response, 'Something went wrong', 500);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Something went wrong' });
    });

    it('should send error with default 500 status code', () => {
      sendError(mockResponse as Response, 'Error occurred');
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Error occurred' });
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      
      sendError(mockResponse as Response, 'Validation error', 400, details);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Validation error',
        details,
      });
    });

    it('should not include details field when not provided', () => {
      sendError(mockResponse as Response, 'Error', 400);
      
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Error' });
      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('details');
    });
  });

  describe('sendValidationError', () => {
    it('should send validation error with 400 status', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      
      sendValidationError(mockResponse as Response, errors);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Validation failed',
        details: errors,
      });
    });
  });

  describe('sendUnauthorized', () => {
    it('should send 401 with default message', () => {
      sendUnauthorized(mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should send 401 with custom message', () => {
      sendUnauthorized(mockResponse as Response, 'Invalid token');
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid token' });
    });
  });

  describe('sendForbidden', () => {
    it('should send 403 with default message', () => {
      sendForbidden(mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    it('should send 403 with custom message', () => {
      sendForbidden(mockResponse as Response, 'Access denied');
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Access denied' });
    });
  });

  describe('sendNotFound', () => {
    it('should send 404 with default message', () => {
      sendNotFound(mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Resource not found' });
    });

    it('should send 404 with custom message', () => {
      sendNotFound(mockResponse as Response, 'User not found');
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('sendConflict', () => {
    it('should send 409 with default message', () => {
      sendConflict(mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Resource conflict' });
    });

    it('should send 409 with custom message', () => {
      sendConflict(mockResponse as Response, 'Email already exists');
      
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email already exists' });
    });
  });

  describe('sendInternalError', () => {
    it('should send 500 with default message', () => {
      sendInternalError(mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Internal server error' });
    });

    it('should send 500 with custom message', () => {
      sendInternalError(mockResponse as Response, 'Database connection failed');
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Database connection failed' });
    });
  });

  describe('sendServiceUnavailable', () => {
    it('should send 503 with service name and default message', () => {
      sendServiceUnavailable(mockResponse as Response, 'AI');
      
      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'AI service unavailable: Service unavailable',
      });
    });

    it('should send 503 with service name and custom message', () => {
      sendServiceUnavailable(mockResponse as Response, 'FastAPI', 'Connection timeout');
      
      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'FastAPI service unavailable: Connection timeout',
      });
    });
  });

  describe('Mobile App Integration', () => {
    it('should match mobile app expectations for login response', () => {
      const loginResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        user: {
          id: 'user123',
          email: 'user@example.com',
          name: 'Test User',
        },
        progress: {
          currentLevel: 5,
          totalXp: 1250,
        },
      };
      
      sendSuccess(mockResponse as Response, loginResponse);
      
      // Verify response is sent directly without wrapping
      expect(jsonMock).toHaveBeenCalledWith(loginResponse);
      expect(jsonMock).not.toHaveBeenCalledWith({
        success: true,
        data: loginResponse,
      });
    });

    it('should match mobile app expectations for error response', () => {
      sendError(mockResponse as Response, 'Invalid credentials', 401);
      
      // Verify error has message field as expected by mobile app
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should match mobile app expectations for lessons response', () => {
      const lessonsResponse = {
        lessons: [
          { id: '1', level: 1, title: 'Basics', isLocked: false },
          { id: '2', level: 2, title: 'Intermediate', isLocked: true },
        ],
      };
      
      sendSuccess(mockResponse as Response, lessonsResponse);
      
      // Verify direct response without wrapping
      expect(jsonMock).toHaveBeenCalledWith(lessonsResponse);
    });
  });
});
