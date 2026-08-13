/**
 * Rate Limiter Interface
 * This abstraction allows us to easily swap out the underlying storage mechanism
 * (e.g., switching from In-Memory to Redis for distributed environments)
 * without changing the application logic.
 */
export interface RateLimiter {
  /**
   * Checks if a request is allowed based on the given identifier.
   * @param identifier - A unique string representing the client (e.g., IP address + project ID).
   * @returns An object containing whether the request is successful and the remaining limit.
   */
  limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
}

/**
 * In-Memory Rate Limiter Implementation
 * Simple token bucket style rate limiter stored in a Map.
 * WARNING: This is only suitable for single-instance deployments or environments
 * where memory is not cleared on every request. It will lose state if the serverless
 * function cold-starts, but it is sufficient for basic spam protection.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private store: Map<string, { count: number; resetAt: number }>;

  constructor(windowMs: number = 60000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.store = new Map();
  }

  async limit(identifier: string) {
    const now = Date.now();
    const record = this.store.get(identifier);

    // Clean up expired records occasionally to prevent memory leaks
    if (this.store.size > 1000) {
      for (const [key, val] of this.store.entries()) {
        if (now > val.resetAt) {
          this.store.delete(key);
        }
      }
    }

    if (!record || now > record.resetAt) {
      // Create new record
      const resetAt = now + this.windowMs;
      this.store.set(identifier, { count: 1, resetAt });
      return { success: true, limit: this.maxRequests, remaining: this.maxRequests - 1, reset: resetAt };
    }

    // Existing record
    if (record.count >= this.maxRequests) {
      return { success: false, limit: this.maxRequests, remaining: 0, reset: record.resetAt };
    }

    // Increment count
    record.count += 1;
    this.store.set(identifier, record);
    return { success: true, limit: this.maxRequests, remaining: this.maxRequests - record.count, reset: record.resetAt };
  }
}

// Export a singleton instance by default, configured for 5 requests per minute
export const defaultRateLimiter = new InMemoryRateLimiter(60 * 1000, 5);
