const logger = require('../helpers/logger');

/**
 * Simple in-memory cache service
 * Can be extended to use Redis in production
 */
class CacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get value from cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttlSeconds = 3600) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiresAt
    });
    logger.debug('Cache set', { key, ttl: ttlSeconds });
  }

  /**
   * Delete from cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache delete', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

module.exports = new CacheService();
