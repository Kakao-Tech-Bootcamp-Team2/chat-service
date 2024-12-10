const { Message, MessageMention } = require('../models');
const socketService = require('../services/socketService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');

class MessageHandler {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // 메시지 관련 이벤트 구독
    eventBus.subscribe('message.created', this.handleMessageCreated.bind(this));
    eventBus.subscribe('message.updated', this.handleMessageUpdated.bind(this));
    eventBus.subscribe('message.deleted', this.handleMessageDeleted.bind(this));
    eventBus.subscribe('message.reaction_added', this.handleReactionAdded.bind(this));
    
    // 멘션 관련 이벤트 구독
    eventBus.subscribe('mention.created', this.handleMentionCreated.bind(this));
    eventBus.subscribe('mention.read', this.handleMentionRead.bind(this));
  }

  async handleMessageCreated(data) {
    try {
      const { messageId, roomId, sender } = data;
      
      // 캐시 무효화
      await cacheService.invalidateRoomMessages(roomId);

      // 실시간 알림
      await socketService.emitToRoomExcept(roomId, sender, 'new_message', {
        messageId,
        sender
      });

      // 알림 서비스에 이벤트 발행
      await eventBus.publish('notification.message', {
        type: 'new_message',
        messageId,
        roomId,
        sender
      });
    } catch (error) {
      logger.error('Handle message created error:', error);
    }
  }

  async handleMessageUpdated(data) {
    try {
      const { messageId, roomId, content } = data;
      
      // 캐시 무효화
      await cacheService.invalidateRoomMessages(roomId);

      // 실시간 업데이트
      await socketService.emitToRoom(roomId, 'message_updated', {
        messageId,
        content
      });
    } catch (error) {
      logger.error('Handle message updated error:', error);
    }
  }

  async handleMessageDeleted(data) {
    try {
      const { messageId, roomId } = data;
      
      // 캐시 무효화
      await cacheService.invalidateRoomMessages(roomId);

      // 실시간 업데이트
      await socketService.emitToRoom(roomId, 'message_deleted', {
        messageId
      });
    } catch (error) {
      logger.error('Handle message deleted error:', error);
    }
  }

  async handleReactionAdded(data) {
    try {
      const { messageId, roomId, userId, reaction } = data;
      
      // 실시간 업데이트
      await socketService.emitToRoom(roomId, 'reaction_added', {
        messageId,
        userId,
        reaction
      });

      // 메시지 작성자에게 알림
      const message = await Message.findById(messageId);
      if (message && message.sender.id !== userId) {
        await eventBus.publish('notification.reaction', {
          messageId,
          userId,
          reaction,
          sender: message.sender.id
        });
      }
    } catch (error) {
      logger.error('Handle reaction added error:', error);
    }
  }

  async handleMentionCreated(data) {
    try {
      const { mentionId, messageId, userId } = data;
      
      // 실시간 알림
      await socketService.emitToUser(userId, 'new_mention', {
        mentionId,
        messageId
      });

      // 알림 서비스에 이벤트 발행
      await eventBus.publish('notification.mention', {
        mentionId,
        messageId,
        userId
      });
    } catch (error) {
      logger.error('Handle mention created error:', error);
    }
  }

  async handleMentionRead(data) {
    try {
      const { mentionId, userId } = data;
      
      // 멘션 읽음 상태 업데이트
      await MessageMention.findByIdAndUpdate(mentionId, {
        isRead: true,
        readAt: new Date()
      });

      // 메시지 작성자에게 알림
      const mention = await MessageMention.findById(mentionId);
      if (mention) {
        await socketService.emitToUser(mention.mentionedBy.userId, 'mention_read', {
          mentionId,
          userId
        });
      }
    } catch (error) {
      logger.error('Handle mention read error:', error);
    }
  }
}

module.exports = new MessageHandler();