require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  
  // 서버 설정
  server: {
    port: parseInt(process.env.PORT, 10) || 5002,
    host: process.env.HOST || '0.0.0.0',
  },

  // MongoDB 설정
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_service',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 100,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Redis 설정
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: 'chat:',
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },

  // RabbitMQ 설정
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchanges: {
      chat: 'chat_exchange',
      notification: 'notification_exchange',
    },
    queues: {
      message: 'chat_message_queue',
      notification: 'notification_queue',
    },
  },

  // CORS 설정
  cors: {
    origins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:5002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-auth-token',
      'x-session-id',
    ],
    credentials: true,
  },

  // 캐시 설정
  cache: {
    message: {
      ttl: parseInt(process.env.MESSAGE_CACHE_TTL, 10) || 3600, // 1시간
      maxItems: parseInt(process.env.MESSAGE_CACHE_MAX_ITEMS, 10) || 1000,
    },
    room: {
      ttl: parseInt(process.env.ROOM_CACHE_TTL, 10) || 7200, // 2시간
    },
  },

  // 소켓 설정
  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
    parser: process.env.SOCKET_PARSER || 'default',
    upgradeTimeout: 30000,
    cleanupEmptyChildNamespaces: true,
    connectionTimeout: 20000,
    joinTimeout: 10000,
    reconnection: {
      attempts: 5,
      delay: 1000,
      maxDelay: 5000
    }
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: '10m',
    maxFiles: '7d',
  },

  // 메시지 설정
  message: {
    maxLength: 10000,
    rateLimit: {
      windowMs: 60 * 1000,
      max: 60
    },
    typing: {
      debounce: 1000,
      timeout: 5000
    }
  },

  // 파일 업로드 설정 추가
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['image/*', 'application/pdf', 'application/msword'],
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'local',
      bucket: process.env.STORAGE_BUCKET || 'uploads',
      region: process.env.STORAGE_REGION || 'ap-northeast-2'
    }
  },
};

module.exports = config;