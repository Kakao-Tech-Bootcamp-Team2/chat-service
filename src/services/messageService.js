const { Message, MessageMention } = require('../models');
const cacheService = require('./cacheService');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

class MessageService {
  async getMessage({ messageId, userId }) {
    try {
      const message = await Message.findById(messageId)
        .populate('mentions')
        .populate('reactions');

      if (!message) {
        throw new NotFoundError('메시지를 찾을 수 없습니다.');
      }

      // Room Service에 사용자 권한 확인
      await this.validateRoomAccess(message.roomId, userId);

      return message;
    } catch (error) {
      logger.error('Get message error:', error);
      throw error;
    }
  }

  async getMessages({ roomId, page = 1, limit = 50, before, after }) {
    try {
      // 캐시 확인
      const cacheKey = `room:${roomId}:messages:${page}`;
      const cachedMessages = await cacheService.get(cacheKey);
      
      if (cachedMessages) {
        return cachedMessages;
      }

      // DB에서 조회
      const messages = await Message.findByRoom(roomId, {
        limit,
        before,
        after
      });

      // 캐시 저장
      await cacheService.set(cacheKey, messages, 300); // 5분

      return messages;
    } catch (error) {
      logger.error('Get messages error:', error);
      throw error;
    }
  }

  async updateMessage({ messageId, userId, content }) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new NotFoundError('메시지를 찾을 수 없습니다.');
      }

      if (message.sender.id !== userId) {
        throw new ValidationError('메시지를 수정할 권한이 없습니다.');
      }

      await message.edit(content);

      // 캐시 무효화
      await cacheService.invalidateRoomMessages(message.roomId);

      // 실시간 업데이트 이벤트 발행
      await eventBus.publish('message.updated', {
        messageId,
        roomId: message.roomId,
        content
      });

      return message;
    } catch (error) {
      logger.error('Update message error:', error);
      throw error;
    }
  }

  async deleteMessage({ messageId, userId }) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new NotFoundError('메시지를 찾을 수 없습니다.');
      }

      if (message.sender.id !== userId) {
        throw new ValidationError('메시지를 삭제할 권한이 없습니다.');
      }

      message.isDeleted = true;
      await message.save();

      // 캐시 무효화
      await cacheService.invalidateRoomMessages(message.roomId);

      // 실시간 업데이트 이벤트 발행
      await eventBus.publish('message.deleted', {
        messageId,
        roomId: message.roomId
      });

      return true;
    } catch (error) {
      logger.error('Delete message error:', error);
      throw error;
    }
  }

  async searchMessages({ roomId, query, type, page = 1, limit = 20 }) {
    try {
      const searchQuery = {
        roomId,
        isDeleted: false
      };

      if (query) {
        searchQuery.$text = { $search: query };
      }

      if (type) {
        searchQuery.type = type;
      }

      const messages = await Message.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('mentions')
        .populate('reactions');

      return messages;
    } catch (error) {
      logger.error('Search messages error:', error);
      throw error;
    }
  }

  async getUserMentions({ userId, page = 1, limit = 20 }) {
    try {
      return await MessageMention.getUserMentions(userId, { page, limit });
    } catch (error) {
      logger.error('Get user mentions error:', error);
      throw error;
    }
  }
}

module.exports = new MessageService();