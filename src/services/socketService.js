const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const config = require('../config');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map();
  }

  initialize(server) {
    if (this.io) {
      logger.warn('Socket.IO already initialized');
      return;
    }

    const redisClient = require('../config/redis').getClient('socket');
    const pubClient = redisClient.duplicate();

    this.io = socketIO(server, {
      cors: config.cors,
      pingTimeout: config.socket.pingTimeout,
      pingInterval: config.socket.pingInterval
    });

    this.io.adapter(createAdapter(redisClient, pubClient));

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('Socket.IO initialized');

    // 서버 종료 시 리소스 정리
    server.on('close', () => {
      redisClient.quit();
      pubClient.quit();
      this.io.close();
    });
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        // Auth Service에 토큰 검증 요청
        const response = await eventBus.request('auth.validate_token', { token });
        
        if (!response.success) {
          return next(new Error('Invalid token'));
        }

        socket.user = response.user;
        next();
      } catch (error) {
        logger.error('Socket middleware error:', error);
        next(error);
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.user.id;
      
      // 사용자 소켓 관리
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      // 연결 해제 처리
      socket.on('disconnect', () => {
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // 채팅방 참여
      socket.on('join_room', (roomId) => {
        socket.join(roomId);
      });

      // 채팅방 나가기
      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
      });
    });
  }

  async emitToUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  async emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  async emitToRoomExcept(roomId, exceptUserId, event, data) {
    const userSockets = this.userSockets.get(exceptUserId);
    if (userSockets) {
      this.io.to(roomId).except([...userSockets]).emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }
}

module.exports = new SocketService();