import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
} from '../validation.middleware';
import { ValidationError } from '../../utils/errors.util';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('validateRequest', () => {
    it('should pass validation with valid data', () => {
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
        query: z.object({}),
        params: z.object({}),
      });

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should fail validation with invalid data', () => {
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
        query: z.object({}),
        params: z.object({}),
      });

      mockRequest.body = {
        email: 'invalid-email',
        password: 'short',
      };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error.errors).toHaveLength(2);
    });

    it('should validate query parameters', () => {
      const schema = z.object({
        body: z.object({}),
        query: z.object({
          page: z.string().regex(/^\d+$/),
          limit: z.string().regex(/^\d+$/),
        }),
        params: z.object({}),
      });

      mockRequest.query = {
        page: '1',
        limit: '10',
      };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate route parameters', () => {
      const schema = z.object({
        body: z.object({}),
        query: z.object({}),
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('validateBody', () => {
    it('should pass validation with valid body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 30,
      };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should fail validation with invalid body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 'thirty', // Invalid type
      };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should fail validation with missing required fields', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string(),
      });

      mockRequest.body = {
        email: 'test@example.com',
        // password is missing
      };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateQuery', () => {
    it('should pass validation with valid query parameters', () => {
      const schema = z.object({
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).optional(),
      });

      mockRequest.query = {
        search: 'test',
        page: '1',
      };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should fail validation with invalid query parameters', () => {
      const schema = z.object({
        page: z.string().regex(/^\d+$/),
      });

      mockRequest.query = {
        page: 'invalid',
      };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateParams', () => {
    it('should pass validation with valid route parameters', () => {
      const schema = z.object({
        userId: z.string().uuid(),
      });

      mockRequest.params = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should fail validation with invalid route parameters', () => {
      const schema = z.object({
        userId: z.string().uuid(),
      });

      mockRequest.params = {
        userId: 'not-a-uuid',
      };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Error formatting', () => {
    it('should format Zod errors correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      mockRequest.body = {
        email: 'invalid',
        age: 15,
      };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      const error = (nextFunction as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors).toBeDefined();
      expect(error.errors.length).toBeGreaterThan(0);
      expect(error.errors[0]).toHaveProperty('field');
      expect(error.errors[0]).toHaveProperty('message');
    });
  });
});
