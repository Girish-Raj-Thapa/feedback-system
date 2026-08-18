import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL environment variable is missing');
  }
  console.warn(
    'REDIS_URL missing, defaulting to redis://localhost:6379 for local dev',
  );
}

// Shared global connection instance for Redis
export const redisConnection = new Redis(redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    // Reconnect after an exponential backoff, up to a max of 5 seconds
    return Math.min(times * 50, 5000);
  },
  connectTimeout: 10000,
});
