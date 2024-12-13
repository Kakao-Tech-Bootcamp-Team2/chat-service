const express = require("express");
const connectDB = require("./config/database");
const { initializeRabbitMQ } = require("./config/rabbitmq");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const mongoose = require("mongoose");

// 설정 및 유틸리티
const { mongoURI } = require("./config/keys");
const logger = require("./utils/logger");
const redisClient = require("./utils/redisClient");

// 미들웨어
const errorHandler = require("./middleware/errorHandler");

// 라우터
const routes = require("./routes");

// 소켓 및 이벤트
const initializeSocket = require("./sockets");
const { messageEvents, notificationEvents } = require("./events");

// 모델 초기화 - User 모델을 먼저 로드
require("./models/User");
require("./models/Message");

class Server {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = null;
  }

  async initialize() {
    try {
      // MongoDB 연결
      await connectDB();
      logger.info("MongoDB Connected");

      // Redis 연결
      await redisClient.connect();
      logger.info("Redis Connected");

      await initializeRabbitMQ();
      logger.info("RabbitMQ Connected");

      // 미들웨어 설정
      this.setupMiddleware();

      // 라우트 설정
      this.setupRoutes();

      // 소켓 초기화
      this.io = initializeSocket(this.server);
      logger.info("Socket.IO initialized");

      // 에러 핸들링
      this.setupErrorHandling();

      return this;
    } catch (error) {
      logger.error("Server initialization error:", error);
      throw error;
    }
  }

  setupMiddleware() {
    // 보안 설정
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS 설정
    this.app.use(
      cors({
        origin: [
          "https://bootcampchat-fe.run.goorm.site",
          "http://localhost:3000",
          "https://localhost:3000",
          "http://0.0.0.0:3000",
          "https://0.0.0.0:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "x-auth-token",
          "x-session-id",
        ],
      })
    );

    // 기본 미들웨어
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 요청 로깅
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      next();
    });
  }

  setupRoutes() {
    // 헬스 체크
    this.app.get("/health", (req, res) => {
      res.json({
        service: "Chat Service",
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    });

    // API 라우트
    this.app.use("/", routes);
  }

  setupErrorHandling() {
    // 404 처리
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "요청하신 경로를 찾을 수 없습니다.",
      });
    });

    // 에러 핸들러
    this.app.use(errorHandler);

    // 예상치 못한 에러 처리
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (error) => {
      logger.error("Unhandled Rejection:", error);
      process.exit(1);
    });
  }

  async start(port = process.env.PORT || 4000) {
    try {
      await this.server.listen(port);
      logger.info(`Server running on port ${port}`);
    } catch (error) {
      logger.error("Server start error:", error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      await connectDB.disconnect();
      await redisClient.disconnect();
      await this.server.close();
      logger.info("Server stopped");
    } catch (error) {
      logger.error("Server stop error:", error);
      process.exit(1);
    }
  }
}

// 서버 인스턴스 생성 및 시작
if (require.main === module) {
  const server = new Server();
  server
    .initialize()
    .then(() => {
      server.start();
    })
    .catch((error) => {
      logger.error("Server startup error:", error);
      process.exit(1);
    });
}

module.exports = Server;
