const express = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');

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
      await eventBus.checkConnection();
      rabbitmqStatus = 'ok';
    } catch (error) {
      logger.error('RabbitMQ health check failed:', error);
    }

    // 모든 서비스가 정상인지 확인
    const allServicesOk = mongoStatus === 'ok' && 
                         redisStatus === 'ok' && 
                         rabbitmqStatus === 'ok';

    const details = {
      service: 'chat-service',
      timestamp: new Date().toISOString(),
      mongodb: mongoStatus,
      redis: redisStatus,
      rabbitmq: rabbitmqStatus
    };

    res.status(allServicesOk ? 200 : 503).json({
      status: allServicesOk ? 'ok' : 'error',
      details
    });

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      details: {
        service: 'chat-service',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

module.exports = router;