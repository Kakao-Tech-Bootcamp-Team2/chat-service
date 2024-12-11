const { chatService } = require('../services');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class ChatController {
  async sendMessage(req, res, next) {
    try {
      const { roomId } = req.params;
      const { content, type = 'text', mentions = [] } = req.body;
      const userId = req.user.id;

      // 입력 검증
      if (!content && type === 'text') {
        throw new ValidationError('메시지 내용은 필수입니다.');
      }

      // Room Service에 채팅방 존재 여부와 사용자 권한 확인 요청
      await chatService.validateRoomAccess(roomId, userId);

      const message = await chatService.sendMessage({
        roomId,
        userId,
        content,
        type,
        mentions
      });

      res.status(201).json({
        success: true,
        data: {
          id: message._id,
          content: message.content,
          type: message.type,
          sender: message.sender,
          createdAt: message.createdAt,
          metadata: message.metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req, res, next) {
    try {
      const { messageId } = req.params;
      const { reaction } = req.body;
      const userId = req.user.id;

      const updatedMessage = await chatService.addReaction({
        messageId,
        userId,
        reaction
      });

      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req, res, next) {
    try {
      const { messageId, reaction } = req.params;
      const userId = req.user.id;

      const updatedMessage = await chatService.removeReaction({
        messageId,
        userId,
        reaction
      });

      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { roomId } = req.params;
      const { messageIds } = req.body;
      const userId = req.user.id;

      await chatService.markMessagesAsRead({
        roomId,
        userId,
        messageIds
      });

      res.json({
        success: true,
        message: '메시지를 읽음 처리했습니다.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();