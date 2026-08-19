import { Redis } from 'ioredis';

// Dedicated connection for the rate limiter (Option B split architecture)
// This prevents BullMQ's constant polling from exhausting the Upstash free tier.
const rateLimitRedisUrl = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;

if (!rateLimitRedisUrl) {
  console.warn(
    'RATE_LIMIT_REDIS_URL and REDIS_URL missing, defaulting rate limiter to redis://localhost:6379'
  );
}

const redis = new Redis(rateLimitRedisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3, // Rate limiter doesn't need infinite retries like BullMQ
  connectTimeout: 5000,
});

/**
 * Rate Limiter Interface
 * This abstraction allows us to easily swap out the underlying storage mechanism
 * (e.g., switching from In-Memory to Redis for distributed environments)
 * without changing the application logic.
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  /**
   * Checks if a request is allowed based on the given identifier.
   * @param identifier - A unique string representing the client (e.g., IP address + project ID).
   * @returns An object containing whether the request is successful and the remaining limit.
   */
  limit(identifier: string): Promise<RateLimitResult>;
}

/**
 * Redis Rate Limiter Implementation
 * Uses Upstash/Redis atomic INCR for precise throttling across serverless instances.
 * Implements a fail-open design to ensure legitimate traffic passes if Redis drops.
 */
export class RedisRateLimiter implements RateLimiter {
  private maxRequests: number;
  private windowSeconds: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    
    try {
      const currentCount = await redis.incr(key);

      if (currentCount === 1) {
        await redis.expire(key, this.windowSeconds);
      }

      const remaining = Math.max(0, this.maxRequests - currentCount);
      const success = currentCount <= this.maxRequests;
      const reset = Date.now() + (this.windowSeconds * 1000);

      return { success, limit: this.maxRequests, remaining, reset };
    } catch (error) {
      console.error('Redis Rate Limiting Error:', error);
      return {
        // Fail-open: allow request if rate limiter is down
        success: true,
        limit: this.maxRequests,
        remaining: 1,
        reset: Date.now() + (this.windowSeconds * 1000),
      };
    }
  }
}

// Configured for 5 requests per 60 seconds
export const widgetRateLimiter = new RedisRateLimiter(5, 60);

// Configured for 3 requests per 3600 seconds (1 hour)
export const accountRateLimiter = new RedisRateLimiter(3, 3600);
