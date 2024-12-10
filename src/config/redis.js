const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.clients = new Map();
    this.defaultClient = null;  // 기본 클라이언트 추가
  }

  createClient(purpose = 'default') {
    try {
      const client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        password: config.redis.password,
        keyPrefix: `${config.redis.keyPrefix}${purpose}:`,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.debug(`Redis retry attempt ${times} with delay ${delay}ms`);
          return delay;
        },
        
        // 연결 타임아웃 설정 추가
        connectTimeout: 10000,
        
        // 명시적인 명령어 응답 처리
        enableOfflineQueue: true,
        showFriendlyErrorStack: true
      });

      // 이벤트 리스너 설정
      client.on('connect', () => {
        logger.info(`Redis client connected (${purpose})`);
      });

      client.on('error', (err) => {
        logger.error(`Redis client error (${purpose}):`, err);
      });

      client.on('close', () => {
        logger.warn(`Redis client closed (${purpose})`);
      });

      if (purpose === 'default') {
        this.defaultClient = client;  // 기본 클라이언트 저장
      }
      
      this.clients.set(purpose, client);
      return client;
    } catch (error) {
      logger.error(`Failed to create Redis client (${purpose}):`, error);
      throw error;
    }
  }

  getClient(purpose = 'default') {
    if (purpose === 'default' && this.defaultClient) {
      return this.defaultClient;
    }
    
    if (!this.clients.has(purpose)) {
      return this.createClient(purpose);
    }
    return this.clients.get(purpose);
  }

  // 연결 테스트를 위한 메서드 추가
  async testConnection() {
    const client = this.getClient();
    try {
      await client.ping();
      logger.info('Redis connection test successful');
      return true;
    } catch (error) {
      logger.error('Redis connection test failed:', error);
      return false;
    }
  }

  async closeAll() {
    const closePromises = [];
    for (const [purpose, client] of this.clients.entries()) {
      logger.info(`Closing Redis client (${purpose})`);
      closePromises.push(client.quit());
    }
    await Promise.all(closePromises);
    this.clients.clear();
    this.defaultClient = null;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const redisClient = new RedisClient();

// 애플리케이션 시작 시 기본 클라이언트 생성
redisClient.createClient('default');

module.exports = redisClient;