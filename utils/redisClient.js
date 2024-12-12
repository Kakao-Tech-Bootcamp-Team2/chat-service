const Redis = require("redis");
const { redisHost, redisPort } = require("../config/keys");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      console.log("Connecting to Redis...");

      this.client = Redis.createClient({
        url: `redis://${redisHost}:${redisPort}`,
        retryStrategy: (times) => {
          if (times > this.maxRetries) {
            return null;
          }
          return this.retryDelay;
        },
      });

      await this.client.connect();
      this.isConnected = true;
      console.log("Redis connected successfully");
      return this.client;
    } catch (error) {
      console.error("Redis connection error:", error);
      throw error;
    }
  }

  async get(key) {
    try {
      await this.connect();
      return await this.client.get(key);
    } catch (error) {
      console.error("Redis get error:", error);
      throw error;
    }
  }

  async set(key, value, expireTime = null) {
    try {
      await this.connect();
      if (expireTime) {
        await this.client.setEx(key, expireTime, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error("Redis set error:", error);
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.connect();
      await this.client.del(key);
    } catch (error) {
      console.error("Redis delete error:", error);
      throw error;
    }
  }
}

module.exports = new RedisClient();
