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
          logger.error('Socket authentication failed: No token provided');
          return next(new Error('Authentication required'));
        }

        try {
          const authResponse = await new Promise((resolve, reject) => {
            logger.debug('Sending auth request:', {
              socketId: socket.id,
              hasToken: !!token
            });

            const timeout = setTimeout(() => {
              reject(new Error('Auth request timeout'));
            }, 5000);

            eventBus.request('auth.validate_token', { 
              token,
              socketId: socket.id 
            }, (error, response) => {
              clearTimeout(timeout);

              logger.debug('Raw auth response:', {
                socketId: socket.id,
                error: error?.message,
                hasResponse: !!response,
                responseType: typeof response
              });

              if (error) {
                reject(error);
                return;
              }

              try {
                const parsedResponse = typeof response === 'string' 
                  ? JSON.parse(response) 
                  : response;

                if (!parsedResponse || !parsedResponse.user) {
                  reject(new Error('Invalid response format'));
                  return;
                }

                resolve(parsedResponse);
              } catch (parseError) {
                reject(new Error('Response parsing failed'));
              }
            });
          });

          if (!authResponse?.user?.id) {
            logger.error('Invalid user data in response:', {
              socketId: socket.id,
              response: authResponse
            });
            return next(new Error('Invalid user data'));
          }

          socket.user = {
            id: authResponse.user.id,
            _id: authResponse.user.id,
            name: authResponse.user.name || 'Unknown User',
            email: authResponse.user.email || '',
            avatar: authResponse.user.avatar || null
          };

          if (!this.userSockets.has(socket.user.id)) {
            this.userSockets.set(socket.user.id, new Set());
          }
          this.userSockets.get(socket.user.id).add(socket.id);

          logger.info('Socket authenticated successfully:', {
            socketId: socket.id,
            userId: socket.user.id,
            userEmail: socket.user.email
          });

          next();
        } catch (error) {
          logger.error('Auth validation error:', {
            socketId: socket.id,
            error: error.message,
            stack: error.stack
          });
          return next(new Error('Authentication failed'));
        }
      } catch (error) {
        logger.error('Socket middleware error:', {
          socketId: socket.id,
          error: error.message,
          stack: error.stack
        });
        next(new Error('Internal server error'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('Client connected:', {
        socketId: socket.id,
        userId: socket.user?.id,
        user: socket.user
      });

      if (!socket.user?.id) {
        logger.error('Connected socket missing user data:', {
          socketId: socket.id
        });
        socket.disconnect(true);
        return;
      }

      socket.on('disconnect', () => {
        if (socket.user?.id) {
          const userSockets = this.userSockets.get(socket.user.id);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              this.userSockets.delete(socket.user.id);
            }
          }
        }
        logger.info('Client disconnected:', { 
          socketId: socket.id,
          userId: socket.user?.id
        });
      });
    });

    this.setupEventHandlers();
    logger.info('Socket.IO initialized');

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

  handleReconnect(socket) {
    const reconnectAttempts = config.socket.reconnection.attempts;
    let attempts = 0;

    const tryReconnect = async () => {
      try {
        if (attempts >= reconnectAttempts) {
          logger.error('Max reconnection attempts reached');
          socket.disconnect(true);
          return;
        }

        attempts++;
        await this.reconnectSocket(socket);
        logger.info(`Socket ${socket.id} reconnected successfully`);
      } catch (error) {
        logger.error(`Reconnection attempt ${attempts} failed:`, error);
        setTimeout(tryReconnect, this.getReconnectDelay(attempts));
      }
    };

    return tryReconnect();
  }

  getReconnectDelay(attempt) {
    const { delay, maxDelay } = config.socket.reconnection;
    return Math.min(delay * Math.pow(2, attempt), maxDelay);
  }

  async reconnectSocket(socket) {
    if (!socket.auth || !socket.roomId) {
      throw new Error('Invalid socket state for reconnection');
    }

    await socket.join(socket.roomId);
    await this.restoreSocketState(socket);
  }

  async restoreSocketState(socket) {
    // 소켓의 이전 상태 복구 로직
    // 예: 메시지 히스토리, 읽음 상태 등
  }
}

module.exports = new SocketService();