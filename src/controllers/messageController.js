const { messageService } = require('../services');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class MessageController {
  async getMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await messageService.getMessage({
        messageId,
        userId
      });

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { roomId } = req.params;
      const { 
        page = 1, 
        limit = 50,
        before,
        after 
      } = req.query;
      const userId = req.user.id;

      // Room Service에 사용자 접근 권한 확인
      await messageService.validateRoomAccess(roomId, userId);

      const messages = await messageService.getMessages({
        roomId,
        page: parseInt(page),
        limit: parseInt(limit),
        before: before ? new Date(before) : undefined,
        after: after ? new Date(after) : undefined
      });

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const updatedMessage = await messageService.updateMessage({
        messageId,
        userId,
        content
      });

      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      await messageService.deleteMessage({
        messageId,
        userId
      });

      res.json({
        success: true,
        message: '메시지가 삭제되었습니다.'
      });
    } catch (error) {
      next(error);
    }
  }

  async searchMessages(req, res, next) {
    try {
      const { roomId } = req.params;
      const { 
        query,
        type,
        page = 1,
        limit = 20
      } = req.query;
      const userId = req.user.id;

      // Room Service에 사용자 접근 권한 확인
      await messageService.validateRoomAccess(roomId, userId);

      const searchResults = await messageService.searchMessages({
        roomId,
        query,
        type,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      next(error);
    }
  }

  async getMentions(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const mentions = await messageService.getUserMentions({
        userId,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: mentions
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Room Service에 사용자 접근 권한 확인
      await messageService.validateRoomAccess(roomId, userId);

      const unreadCount = await messageService.getUnreadMessageCount({
        roomId,
        userId
      });

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();