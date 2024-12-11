const { Message, MessageReaction } = require('../models');
const logger = require('../utils/logger');

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // 룸 조인 이벤트 핸들러
    socket.on('joinRoom', async (roomId, callback) => {
      try {
        logger.info(`Socket ${socket.id} attempting to join room ${roomId}`);
        
        // 룸 참여
        await socket.join(roomId);
        
        // 성공 이벤트 emit
        socket.emit('joinRoomSuccess', { roomId });
        
        if (typeof callback === 'function') {
          callback({ success: true });
        }

        logger.info(`Socket ${socket.id} successfully joined room ${roomId}`);
      } catch (error) {
        logger.error(`Join room error for socket ${socket.id}:`, error);
        
        // 에러 이벤트 emit
        socket.emit('joinRoomError', { 
          error: error.message || '채팅방 입장에 실패했습니다.' 
        });
        
        if (typeof callback === 'function') {
          callback({ error: error.message });
        }
      }
    });

    // 채팅 메시지 처리
    socket.on('chatMessage', async (data) => {
      try {
        if (!data.room || !data.content) {
          logger.error('Invalid message data received:', data);
          throw new Error('Invalid message data');
        }

        // 사용자 인증 상태 자세히 검사
        if (!socket.user || !socket.user.id) {
          logger.error('Unauthorized message attempt:', {
            socketId: socket.id,
            data: data
          });
          throw new Error('User not authenticated');
        }

        logger.info('Processing chat message:', {
          socketId: socket.id,
          userId: socket.user.id,
          roomId: data.room
        });

        const message = await Message.create({
          roomId: data.room,
          sender: {
            id: socket.user.id,
            _id: socket.user.id,
            name: socket.user.name || 'Unknown User',
            email: socket.user.email || '',
            avatar: socket.user.avatar
          },
          content: data.content,
          type: data.type || 'text',
          metadata: {
            replyTo: data.replyTo || {},
            ...(data.type === 'file' ? { fileData: data.fileData } : {})
          }
        });

        const messageResponse = {
          _id: message._id.toString(),
          roomId: message.roomId,
          sender: message.sender,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          timestamp: message.createdAt
        };

        io.to(data.room).emit('message', messageResponse);
        logger.info('Message sent successfully:', {
          messageId: message._id,
          roomId: data.room,
          senderId: socket.user.id
        });

      } catch (error) {
        logger.error('Message handling error:', {
          error: error.message,
          socketId: socket.id,
          userId: socket?.user?.id,
          stack: error.stack
        });
        socket.emit('error', { 
          message: error.message,
          type: 'MESSAGE_ERROR'
        });
      }
    });

    // 이전 메시지 조회 이벤트 핸들러
    socket.on('fetchPreviousMessages', async (data, callback) => {
      try {
        const { roomId, before, limit = 30 } = data;
        logger.info(`Fetching messages for room ${roomId}, before: ${before}, limit: ${limit}`);

        // Message 모델의 findByRoom 메서드 사용
        const messages = await Message.findByRoom(roomId, {
          before: before ? new Date(before) : undefined,
          limit
        });

        // 추가 메시지 존재 여부 확인
        const hasMore = messages.length === limit;

        socket.emit('previousMessagesLoaded', {
          messages,
          hasMore
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        logger.info(`Successfully fetched ${messages.length} messages for room ${roomId}`);
      } catch (error) {
        logger.error('Error fetching previous messages:', error);
        
        socket.emit('error', {
          event: 'fetchPreviousMessages',
          error: error.message || '메시지 조회에 실패했습니다.'
        });

        if (typeof callback === 'function') {
          callback({ error: error.message });
        }
      }
    });

    // 메시지 리액션 업데이트 핸들러
    socket.on('messageReactionUpdate', async (data) => {
      try {
        const { messageId, reaction, add, userId } = data;
        const message = await Message.findById(messageId);
        
        if (!message) {
          throw new Error('Message not found');
        }

        if (add) {
          await MessageReaction.create({
            messageId,
            userId,
            reaction
          });
        } else {
          await MessageReaction.deleteOne({
            messageId,
            userId,
            reaction
          });
        }

        // 룸의 모든 사용자에게 리액션 업데이트 브로드캐스트
        io.to(message.roomId).emit('messageReactionUpdate', {
          messageId,
          userId,
          reaction,
          type: add ? 'add' : 'remove'
        });

      } catch (error) {
        logger.error('Reaction update error:', error);
        socket.emit('error', {
          event: 'messageReactionUpdate',
          error: error.message || '리액션 업데이트에 실패했습니다.'
        });
      }
    });

    // AI 메시지 관련 핸들러
    socket.on('aiMessageStart', (data) => {
      try {
        const { roomId, messageId } = data;
        io.to(roomId).emit('aiMessageStart', { messageId });
      } catch (error) {
        logger.error('AI message start error:', error);
      }
    });

    socket.on('aiMessageChunk', (data) => {
      try {
        const { roomId, messageId, chunk } = data;
        io.to(roomId).emit('aiMessageChunk', { messageId, chunk });
      } catch (error) {
        logger.error('AI message chunk error:', error);
      }
    });

    socket.on('aiMessageComplete', async (data) => {
      try {
        const { roomId, messageId, fullContent } = data;
        
        // 완성된 AI 메시지를 DB에 저장
        await Message.findByIdAndUpdate(messageId, {
          content: fullContent,
          status: 'completed'
        });

        io.to(roomId).emit('aiMessageComplete', { 
          messageId, 
          content: fullContent 
        });
      } catch (error) {
        logger.error('AI message complete error:', error);
      }
    });

    // 세션 종료 핸들러
    socket.on('session_ended', async () => {
      try {
        // 사용자가 참여한 모든 룸에서 나가기
        const rooms = [...socket.rooms];
        for (const room of rooms) {
          if (room !== socket.id) {  // socket.id는 자동으로 생성되는 룸
            await socket.leave(room);
          }
        }
        
        socket.emit('session_ended', {
          message: '세션이 종료되었습니다.'
        });

        socket.disconnect(true);
      } catch (error) {
        logger.error('Session end error:', error);
      }
    });

    // 룸 나가기 이벤트 핸들러
    socket.on('leaveRoom', async (data, callback) => {
      try {
        const { roomId, userId } = data;
        logger.info(`Socket ${socket.id} leaving room ${roomId}`);
        
        await socket.leave(roomId);
        
        // 해당 룸의 이벤트 리스너 제거
        socket.removeAllListeners(`message:${roomId}`);
        socket.removeAllListeners(`messageReactionUpdate:${roomId}`);
        socket.removeAllListeners(`aiMessageStart:${roomId}`);
        socket.removeAllListeners(`aiMessageChunk:${roomId}`);
        socket.removeAllListeners(`aiMessageComplete:${roomId}`);

        // 룸의 다른 사용자들에게 알림
        socket.to(roomId).emit('userLeft', {
          userId,
          roomId
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        logger.info(`Socket ${socket.id} successfully left room ${roomId}`);
      } catch (error) {
        logger.error(`Leave room error for socket ${socket.id}:`, error);
        
        if (typeof callback === 'function') {
          callback({ error: error.message || '채팅방 나가기에 실패했습니다.' });
        }
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  initialize
};