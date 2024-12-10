const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = new Redis(config.redis);
    
    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.client.setex(
        key,
        ttl,
        JSON.stringify(value)
      );
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async invalidateRoomMessages(roomId) {
    try {
      const pattern = `room:${roomId}:messages:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }
}

module.exports = new CacheService();