const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const config = require('../config');
const logger = require('../utils/logger');
const chatService = require('../services/chatService');
const messageService = require('../services/messageService');

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
      transports: ['websocket'],
      cors: config.cors,
      pingTimeout: 5000,
    });

    this.io.adapter(createAdapter(redisClient, pubClient));

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const response = await eventBus.request('auth.validate_token', { token });
        if (!response.success) {
          return next(new Error('Invalid token'));
        }

        socket.user = response.user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(error);
      }
    });

    this.setupEventHandlers();

    logger.info('Socket.IO initialized');

    // 서버 종료 시 리소스 정리
    server.on('close', () => {
      redisClient.quit();
      pubClient.quit();
      this.io.close();
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

      // 메시지 이벤트
      socket.on('message', async (data) => {
        try {
          const message = await chatService.sendMessage({
            roomId: data.roomId,
            userId: socket.user.id,
            content: data.content,
            type: data.type,
            mentions: data.mentions
          });

          this.io.to(data.roomId).emit('new_message', message);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // 리액션 이벤트
      socket.on('messageReaction', async (data) => {
        try {
          await chatService.toggleReaction({
            messageId: data.messageId,
            userId: socket.user.id,
            reaction: data.reaction
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // 읽음 상태 이벤트
      socket.on('markAsRead', async (data) => {
        try {
          await messageService.markMessagesAsRead({
            roomId: data.roomId,
            userId: socket.user.id,
            messageIds: data.messageIds
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // 연결 해제 처리
      socket.on('disconnect', () => {
        if (this.userSockets.has(userId)) {
          this.userSockets.get(userId).delete(socket.id);
          if (this.userSockets.get(userId).size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
    });
  }

  // 룸에 이벤트 전송
  async emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // 특정 사용자에게 이벤트 전송
  async emitToUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }
}

module.exports = new SocketService();