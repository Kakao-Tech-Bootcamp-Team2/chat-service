const { Message, MessageReaction } = require('../models');
const cacheService = require('./cacheService');
const socketService = require('./socketService');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ChatService {
  async sendMessage({ roomId, userId, content, type = 'text', mentions = [] }) {
    try {
      // Room Service에 사용자 권한 확인
      await this.validateRoomAccess(roomId, userId);

      // 메시지 생성
      const message = await Message.create({
        roomId,
        sender: { id: userId },
        content,
        type,
        metadata: {
          clientMessageId: Date.now().toString()
        }
      });

      // 멘션 처리
      if (mentions.length > 0) {
        await this.processMentions(message, mentions);
      }

      // 캐시 무효화
      await cacheService.invalidateRoomMessages(roomId);

      // 실시간 전송
      await socketService.emitToRoom(roomId, 'new_message', {
        message,
        sender: userId
      });

      // 이벤트 발행
      await eventBus.publish('message.created', {
        messageId: message._id,
        roomId,
        sender: userId,
        type,
        mentions
      });

      return message;
    } catch (error) {
      logger.error('Send message error:', error);
      throw error;
    }
  }

  async validateRoomAccess(roomId, userId) {
    try {
      const response = await eventBus.request('room.validate_access', {
        roomId,
        userId
      });

      if (!response.success) {
        throw new ValidationError('채팅방 접근 권한이 없습니다.');
      }
    } catch (error) {
      logger.error('Room access validation error:', error);
      throw error;
    }
  }

  async processMentions(message, mentions) {
    try {
      const mentionPromises = mentions.map(async (userId) => {
        const mention = await message.mentions.create({
          messageId: message._id,
          mentionedUserId: userId,
          mentionedBy: {
            userId: message.sender.id
          },
          roomId: message.roomId
        });

        // 알림 이벤트 발행
        await eventBus.publish('notification.mention', {
          userId,
          messageId: message._id,
          roomId: message.roomId,
          mentionId: mention._id
        });

        return mention;
      });

      await Promise.all(mentionPromises);
    } catch (error) {
      logger.error('Process mentions error:', error);
      throw error;
    }
  }

  async addReaction({ messageId, userId, reaction }) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new NotFoundError('메시지를 찾을 수 없습니다.');
      }

      const updatedReaction = await MessageReaction.toggleReaction(
        messageId,
        userId,
        reaction
      );

      // 실시간 업데이트
      await socketService.emitToRoom(message.roomId, 'message_reaction', {
        messageId,
        userId,
        reaction,
        type: updatedReaction ? 'add' : 'remove'
      });

      return message;
    } catch (error) {
      logger.error('Add reaction error:', error);
      throw error;
    }
  }

  async markMessagesAsRead({ roomId, userId, messageIds }) {
    try {
      const updateResult = await Message.updateMany(
        {
          _id: { $in: messageIds },
          roomId,
          'readBy.userId': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          }
        }
      );

      // 실시간 업데이트
      await socketService.emitToRoom(roomId, 'messages_read', {
        userId,
        messageIds
      });

      return updateResult.modifiedCount;
    } catch (error) {
      logger.error('Mark messages as read error:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();