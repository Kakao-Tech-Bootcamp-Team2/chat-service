const express = require('express');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const config = require('./config');
const routes = require('./routes');
const socketService = require('./services/socketService');
const logger = require('./utils/logger');
const { 
  error, 
  cors, 
  logger: httpLogger,
  rateLimit 
} = require('./middlewares');
const redis = require('./config/redis');
const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

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
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // 요청 본문 파싱
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 응답 압축
    this.app.use(compression());

    // HTTP 로깅
    this.app.use(httpLogger);
  }

  setupRoutes() {
    // Health check 엔드포인트를 가장 먼저 설정
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'chat-service'
      });
    });

    // API 라우트를 /api로 변경 (v1 제거)
    this.app.use('/api', routes);

    // 404 처리
    this.app.use((req, res, next) => {
      res.status(404).json({
        status: 'error',
        message: '요청 리소스를 찾을 수 없습니다.'
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
      // Socket.IO 초기화 설정
      this.io = socketIO(this.server, {
        path: '/socket.io',
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        cors: {
          origin: function(origin, callback) {
            if (!origin || config.cors.origins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
          methods: config.cors.methods,
          allowedHeaders: config.cors.allowedHeaders,
          credentials: true
        },
        allowEIO3: true,
        maxHttpBufferSize: 1e8,
        connectTimeout: 45000,
        serveClient: false,
        cookie: false
      });

      // MessagePack 파서 설정
      if (config.socket.parser === 'msgpack') {
        try {
          const msgPackParser = require('socket.io-msgpack-parser');
          this.io.parser = msgPackParser;
          logger.info('Socket.IO MessagePack parser enabled');
        } catch (error) {
          logger.warn('MessagePack parser not available, using default parser');
        }
      }

      // Socket.IO Redis 어댑터 설정
      try {
        const pubClient = redis.getClient('socket-pub');
        const subClient = redis.getClient('socket-sub');

        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter initialized');
      } catch (error) {
        logger.error('Redis adapter initialization error:', error);
      }

      // Socket.IO 서비스 초기화
      socketService.initialize(this.io);
      logger.info('Socket service initialized');

      // 이벤트 핸들러 등록
      const events = require('./events');
      if (typeof events.initialize === 'function') {
        events.initialize(this.io);
        logger.info('Event handlers registered successfully');
      } else {
        logger.warn('No event handlers to register');
      }

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
      // 심각한 에러의 경우 프로세스 종료
      if (error.fatal) {
        process.exit(1);
      }
    });

    // 처리되지 않은 Promise 거부 처리
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason?.message || reason,
        stack: reason?.stack
      });
      // Promise 거부를 uncaughtException으로 변환
      throw reason;
    });

    // SIGTERM 시그널 처리
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.cleanup();
    });

    // SIGINT 시그널 처리
    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.cleanup();
    });
  }

  // 정리 작업을 위한 메서드 추가
  async cleanup() {
    try {
      logger.info('Starting cleanup...');
      
      // Socket.IO 연결 종료
      if (this.io) {
        const sockets = await this.io.fetchSockets();
        for (const socket of sockets) {
          socket.disconnect(true);
        }
        this.io.close();
      }

      // HTTP 서버 종료
      if (this.server) {
        this.server.close();
      }

      // 데이터베이스 연결 종료
      await mongoose.connection.close();
      
      logger.info('Cleanup completed');
      process.exit(0);
    } catch (error) {
      logger.error('Cleanup error:', error);
      process.exit(1);
    }
  }

  async start() {
    try {
      logger.info('Starting application...');

      // Redis 연결 확인 추가
      const redisClient = redis.getClient();
      await redisClient.ping();
      logger.info('Redis connected successfully');

      // 데이터베이스 연결
      await this.connectDB();
      logger.info('Database connection established');

      // 서비스 초기화
      await this.initializeServices();
      logger.info('Services initialized');

      // 종료 핸들러 설정
      this.setupGracefulShutdown();
      logger.info('Shutdown handlers setup complete');

      // 예외 핸들러 설정
      this.setupUncaughtExceptionHandlers();
      logger.info('Exception handlers setup complete');

      // 서버 시작
      const port = config.server.port;
      this.server.listen(port, () => {
        logger.info(`Chat service listening on port ${port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info('Server startup complete');
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