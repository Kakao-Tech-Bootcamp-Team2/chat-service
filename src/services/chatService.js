const { Message, MessageReaction } = require('../models');
const cacheService = require('./cacheService');
const socketService = require('./socketService');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ChatService {
  async sendMessage({ roomId, userId, content, type = 'text', mentions = [] }) {
    try {
      await this.validateRoomAccess(roomId, userId);

      const message = await Message.create({
        roomId,
        sender: { id: userId },
        content,
        type,
        metadata: {
          clientMessageId: Date.now().toString()
        }
      });

      if (mentions.length > 0) {
        await this.processMentions(message, mentions);
      }

      await socketService.emitToRoom(roomId, 'new_message', {
        message: {
          id: message._id,
          content: message.content,
          type: message.type,
          sender: message.sender,
          createdAt: message.createdAt,
          metadata: message.metadata
        }
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

      await socketService.emitToRoom(message.roomId, 'reaction_updated', {
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