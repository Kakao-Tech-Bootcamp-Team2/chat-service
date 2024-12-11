const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.clients = new Map();
    this.defaultConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
  }

  getClient(name = 'default') {
    if (!this.clients.has(name)) {
      const client = new Redis({
        ...this.defaultConfig,
        db: name === 'default' ? 0 : this.clients.size + 1
      });

      client.on('error', (err) => {
        logger.error(`Redis Client (${name}) Error:`, err);
      });

      client.on('connect', () => {
        logger.info(`Redis Client (${name}) Connected`);
      });

      this.clients.set(name, client);
    }

    return this.clients.get(name);
  }

  async closeAll() {
    for (const [name, client] of this.clients) {
      try {
        await client.quit();
        logger.info(`Redis Client (${name}) Closed`);
      } catch (error) {
        logger.error(`Error closing Redis Client (${name}):`, error);
      }
    }
    this.clients.clear();
  }
}

module.exports = new RedisClient();