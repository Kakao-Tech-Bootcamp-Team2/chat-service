const logger = require('../utils/logger');

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // 채팅 메시지 처리
    socket.on('message', async (data) => {
      try {
        // 메시지 처리 로직
        io.to(data.roomId).emit('message', {
          ...data,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Message handling error:', error);
        socket.emit('error', { message: 'Message processing failed' });
      }
    });

    // 채팅방 참여
    socket.on('join', async (roomId) => {
      try {
        await socket.join(roomId);
        logger.info(`Client ${socket.id} joined room ${roomId}`);
      } catch (error) {
        logger.error('Room join error:', error);
        socket.emit('error', { message: 'Failed to join room' });
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