/**
 * Simple In-Memory Cache
 * For production, consider Redis or node-cache for distributed caching
 */

const { createLogger } = require('./logger');

const log = createLogger('cache');

class SimpleCache {
  constructor(defaultTTL = 300000) {
    // Default TTL: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a cached value
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      log.debug({ key }, 'Cache entry expired');
      return null;
    }

    log.debug({ key }, 'Cache hit');
    return entry.value;
  }

  /**
   * Set a cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
    log.debug({ key, ttl }, 'Cache set');
  }

  /**
   * Delete a cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    log.debug({ key }, 'Cache deleted');
  }

  /**
   * Delete all entries matching a pattern
   * @param {string} pattern - Pattern to match (uses startsWith)
   */
  invalidatePattern(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    log.debug({ pattern, count }, 'Cache pattern invalidated');
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.cache.clear();
    log.info('Cache cleared');
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug({ cleaned }, 'Cleaned expired cache entries');
    }
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Destroy the cache (stop cleanup interval)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    log.info('Cache destroyed');
  }
}

// Create a singleton instance
const cache = new SimpleCache();

// Cache TTL constants (in milliseconds)
const TTL = {
  PRODUCTS: 5 * 60 * 1000, // 5 minutes
  PROMOTIONS: 2 * 60 * 1000, // 2 minutes (shorter because promotions are time-sensitive)
  CUSTOMER: 1 * 60 * 1000, // 1 minute
};

/**
 * Cache middleware factory
 * @param {string} keyPrefix - Prefix for cache key
 * @param {number} ttl - Time to live in milliseconds
 */
function cacheMiddleware(keyPrefix, ttl) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  cache,
  TTL,
  cacheMiddleware,
};
