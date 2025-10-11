import request from 'supertest';
import express, { Express } from 'express';
import {
  generalRateLimiter,
  aiRateLimiter,
  createRateLimiter,
} from '../rateLimit.middleware';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('Rate Limit Middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('generalRateLimiter', () => {
    beforeEach(() => {
      app.use(generalRateLimiter);
      app.get('/test', (_req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests within the limit', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'success' });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Make 100 requests (the limit)
      const requests = Array(100)
        .fill(null)
        .map(() => request(app).get('/test'));

      await Promise.all(requests);

      // The 101st request should be rate limited
      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too Many Requests');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Too many requests');
    });

    it('should include retryAfter in error response', async () => {
      // Exceed the limit
      const requests = Array(101)
        .fill(null)
        .map(() => request(app).get('/test'));

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find((r) => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse?.body).toHaveProperty('retryAfter');
    });
  });

  describe('aiRateLimiter', () => {
    beforeEach(() => {
      app.use(aiRateLimiter);
      app.post('/ai/chat', (_req, res) => {
        res.json({ response: 'AI response' });
      });
    });

    it('should allow requests within the AI limit', async () => {
      const response = await request(app)
        .post('/ai/chat')
        .send({ prompt: 'Hello' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ response: 'AI response' });
    });

    it('should have stricter limits than general rate limiter', async () => {
      // AI limiter allows 10 requests per minute
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).post('/ai/chat').send({ prompt: 'test' }));

      await Promise.all(requests);

      // The 11th request should be rate limited
      const response = await request(app)
        .post('/ai/chat')
        .send({ prompt: 'test' });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too Many Requests');
      expect(response.body.message).toContain('AI requests');
    });

    it('should include rate limit headers for AI endpoints', async () => {
      const response = await request(app)
        .post('/ai/chat')
        .send({ prompt: 'Hello' });

      expect(response.headers).toHaveProperty('ratelimit-limit', '10');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('createRateLimiter', () => {
    it('should create a custom rate limiter with specified limits', async () => {
      const customLimiter = createRateLimiter(
        60 * 1000, // 1 minute
        5, // 5 requests
        'Custom rate limit exceeded'
      );

      app.use(customLimiter);
      app.get('/custom', (_req, res) => {
        res.json({ message: 'custom endpoint' });
      });

      // Make 5 requests (the limit)
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get('/custom'));

      await Promise.all(requests);

      // The 6th request should be rate limited
      const response = await request(app).get('/custom');

      expect(response.status).toBe(429);
      expect(response.body.message).toBe('Custom rate limit exceeded');
    });

    it('should allow customization of window and max requests', async () => {
      const shortWindowLimiter = createRateLimiter(
        1000, // 1 second
        2, // 2 requests
        'Too fast!'
      );

      app.use(shortWindowLimiter);
      app.get('/fast', (_req, res) => {
        res.json({ message: 'fast endpoint' });
      });

      // First two requests should succeed
      await request(app).get('/fast');
      await request(app).get('/fast');

      // Third request should be rate limited
      const response = await request(app).get('/fast');

      expect(response.status).toBe(429);
      expect(response.body.message).toBe('Too fast!');
    });
  });

  describe('Rate limiter integration', () => {
    it('should apply different rate limits to different routes', async () => {
      // Create fresh app for this test
      const integrationApp = express();

      // Create fresh rate limiters for this test
      const testGeneralLimiter = createRateLimiter(
        15 * 60 * 1000,
        100,
        'Too many requests'
      );
      const testAiLimiter = createRateLimiter(
        60 * 1000,
        10,
        'Too many AI requests'
      );

      // General endpoints with general rate limiter
      integrationApp.get('/api/lessons', testGeneralLimiter, (_req, res) => {
        res.json({ lessons: [] });
      });

      // AI endpoints with stricter rate limiter
      integrationApp.post('/api/ai/chat', testAiLimiter, (_req, res) => {
        res.json({ response: 'AI response' });
      });

      // General endpoint should allow more requests
      const generalResponse = await request(integrationApp).get('/api/lessons');
      expect(generalResponse.status).toBe(200);

      // AI endpoint should have stricter limits
      const aiResponse = await request(integrationApp)
        .post('/api/ai/chat')
        .send({ prompt: 'test' });
      expect(aiResponse.status).toBe(200);

      // Verify headers show different limits
      expect(generalResponse.headers['ratelimit-limit']).toBe('100');
      expect(aiResponse.headers['ratelimit-limit']).toBe('10');
    });
  });

  describe('Error response format', () => {
    beforeEach(() => {
      const strictLimiter = createRateLimiter(1000, 1, 'Rate limit test');
      app.use(strictLimiter);
      app.get('/test', (_req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should return properly formatted error response', async () => {
      // First request succeeds
      await request(app).get('/test');

      // Second request is rate limited
      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: expect.any(String),
      });
      expect(response.body).toHaveProperty('retryAfter');
    });

    it('should include ISO timestamp for retryAfter', async () => {
      await request(app).get('/test');
      const response = await request(app).get('/test');

      expect(response.body.retryAfter).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });
});
