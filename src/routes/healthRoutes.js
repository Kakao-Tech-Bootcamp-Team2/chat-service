const express = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');
const { auth } = require('../middlewares');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // MongoDB 상태 확인
    const mongoStatus = mongoose.connection.readyState === 1 ? 'ok' : 'error';

    // Redis 상태 확인
    let redisStatus = 'error';
    try {
      await redis.getClient().ping();
      redisStatus = 'ok';
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    // RabbitMQ 상태 확인
    let rabbitmqStatus = 'error';
    try {
      if (rabbitmq.connection && rabbitmq.channel) {
        rabbitmqStatus = 'ok';
      }
    } catch (error) {
      logger.error('RabbitMQ health check failed:', error);
    }

    const status = {
      service: 'chat-service',
      timestamp: new Date().toISOString(),
      mongodb: mongoStatus,
      redis: redisStatus,
      rabbitmq: rabbitmqStatus
    };

    // 모든 의존성이 정상인지 확인
    const isHealthy = Object.values(status).every(s => s === 'ok');

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'error',
      details: status
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// 상세 상태 확인 (관리자용)
router.get('/details', auth.requireAdmin, async (req, res) => {
  try {
    const details = {
      service: {
        name: 'chat-service',
        version: process.env.npm_package_version,
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'ok' : 'error',
        collections: Object.keys(mongoose.connection.collections).length,
        connectionString: config.mongodb.uri.replace(/\/\/.*@/, '//***:***@')
      },
      redis: {
        status: await redis.getClient().ping() === 'PONG' ? 'ok' : 'error',
        connectedClients: await redis.getClient().info('clients')
      },
      rabbitmq: {
        status: rabbitmq.connection && rabbitmq.channel ? 'ok' : 'error',
        exchanges: Object.keys(config.rabbitmq.exchanges).length,
        queues: Object.keys(config.rabbitmq.queues).length
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch
      }
    };

    res.json(details);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed'
    });
  }
});

module.exports = router;