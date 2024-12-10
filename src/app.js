const express = require('express');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const config = require('./config');
const routes = require('./routes');
const socketService = require('./services/socketService');
const eventBus = require('./utils/eventBus');
const logger = require('./utils/logger');
const { 
  error, 
  cors, 
  logger: httpLogger,
  rateLimit 
} = require('./middlewares');
const redis = require('./config/redis');

class Application {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandler();
  }

  setupMiddlewares() {
    // 보안 미들웨어
    this.app.use(helmet());

    // CORS
    this.app.use(cors);

    // 요청 본문 파싱
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 응답 압축
    this.app.use(compression());

    // HTTP 로깅
    this.app.use(httpLogger);
  }

  setupRoutes() {
    // API 라우트
    this.app.use('/api/v1', routes);

    // 404 처리
    this.app.use((req, res, next) => {
      res.status(404).json({
        status: 'error',
        message: '요청한 리소스를 찾을 수 없습니다.'
      });
    });
  }

  setupErrorHandler() {
    this.app.use(error);
  }

  async connectDB() {
    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async initializeServices() {
    try {
      // 이벤트 버스 초기화
      await eventBus.initialize();
      logger.info('EventBus initialized successfully');

      // 소켓 서비스 초기화
      socketService.initialize(this.server);
      logger.info('SocketService initialized successfully');

      // 이벤트 핸들러 등록
      const { chatHandler, messageHandler } = require('./events');
      logger.info('Event handlers registered successfully');

    } catch (error) {
      logger.error('Service initialization error:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      // HTTP 서버 종료
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // 소켓 연결 종료
      socketService.io?.close(() => {
        logger.info('Socket.IO server closed');
      });

      try {
        // 데이터베이스 연결 종료
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        // 이벤트 버스 연결 종료
        await eventBus.close();
        logger.info('EventBus connection closed');

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // SIGTERM 시그널 처리
    process.on('SIGTERM', shutdown);
    // SIGINT 시그널 처리
    process.on('SIGINT', shutdown);
  }

  setupUncaughtExceptionHandlers() {
    // 처리되지 않은 예외 처리
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // 처리되지 않은 Promise 거부 처리
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  async start() {
    try {
      // Redis 연결 확인 추가
      const redisClient = redis.getClient();
      await redisClient.ping();
      logger.info('Redis connected successfully');

      // 데이터베이스 연결
      await this.connectDB();

      // 서비스 초기화
      await this.initializeServices();

      // 종료 핸들러 설정
      this.setupGracefulShutdown();

      // 예외 핸들러 설정
      this.setupUncaughtExceptionHandlers();

      // 서버 시작
      const port = config.server.port;
      this.server.listen(port, () => {
        logger.info(`Chat service listening on port ${port}`);
        logger.info(`Environment: ${config.env}`);
      });
    } catch (error) {
      logger.error('Application startup error:', error);
      process.exit(1);
    }
  }
}

// 애플리케이션 인스턴스 생성 및 시작
const app = new Application();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

module.exports = app;