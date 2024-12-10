const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

class MongoDB {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('MongoDB is already connected');
        return;
      }

      // Mongoose 디버그 모드 설정
      mongoose.set('debug', config.env === 'development');

      // 연결 설정
      this.connection = await mongoose.connect(config.mongodb.uri, {
        ...config.mongodb.options,
        autoIndex: config.env === 'development', // 개발 환경에서만 자동 인덱스 생성
      });

      this.isConnected = true;
      logger.info('MongoDB connected successfully');

      // 연결 이벤트 핸들러 설정
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      // 프로세스 종료 시 연결 해제
      process.on('SIGINT', this.closeConnection.bind(this));
      process.on('SIGTERM', this.closeConnection.bind(this));

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async closeConnection() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  // 헬스 체크
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'error',
          message: 'MongoDB is not connected'
        };
      }

      await mongoose.connection.db.admin().ping();
      return {
        status: 'ok',
        message: 'MongoDB is healthy'
      };
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return {
        status: 'error',
        message: 'MongoDB health check failed'
      };
    }
  }
}

module.exports = new MongoDB();