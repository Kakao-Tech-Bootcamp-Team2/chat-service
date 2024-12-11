const socketService = require('../services/socketService');
const { Message } = require('../models');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');

class ChatHandler {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Room Service 이벤트 구독
    eventBus.subscribe('room.user_removed', this.handleUserRemoved.bind(this));
    eventBus.subscribe('room.deleted', this.handleRoomDeleted.bind(this));

    // Auth Service 이벤트 구독
    eventBus.subscribe('user.status_changed', this.handleUserStatusChanged.bind(this));
    eventBus.subscribe('user.offline', this.handleUserOffline.bind(this));

    // Notification Service 이벤트 구독
    eventBus.subscribe('notification.delivered', this.handleNotificationDelivered.bind(this));
  }

  // Room Service 이벤트 핸들러
  async handleUserRemoved(data) {
    try {
      const { roomId, userId } = data;
      
      // 사용자를 채팅방에서 제거
      await socketService.emitToUser(userId, 'room_left', { roomId });
      
      // 시스템 메시지 생성
      await Message.create({
        roomId,
        type: 'system',
        content: `사용자가 채팅방에서 제거되었습니다.`,
        metadata: {
          event: 'user_removed',
          userId
        }
      });
    } catch (error) {
      logger.error('Handle user removed error:', error);
    }
  }

  async handleRoomDeleted(data) {
    try {
      const { roomId, participants } = data;
      
      // 모든 참여자에게 채팅방 삭제 알림
      for (const userId of participants) {
        await socketService.emitToUser(userId, 'room_deleted', { roomId });
      }
    } catch (error) {
      logger.error('Handle room deleted error:', error);
    }
  }

  // Auth Service 이벤트 핸들러
  async handleUserStatusChanged(data) {
    try {
      const { userId, status, rooms } = data;
      
      // 사용자가 참여한 모든 채팅방에 상태 변경 알림
      for (const roomId of rooms) {
        await socketService.emitToRoom(roomId, 'user_status_changed', {
          userId,
          status
        });
      }
    } catch (error) {
      logger.error('Handle user status changed error:', error);
    }
  }

  async handleUserOffline(data) {
    try {
      const { userId, rooms, lastSeen } = data;
      
      // 사용자가 참여한 모든 채팅방에 오프라인 상태 알림
      for (const roomId of rooms) {
        await socketService.emitToRoom(roomId, 'user_offline', {
          userId,
          lastSeen
        });
      }
    } catch (error) {
      logger.error('Handle user offline error:', error);
    }
  }

  // Notification Service 이벤트 핸들러
  async handleNotificationDelivered(data) {
    try {
      const { userId, messageId } = data;
      
      // 메시지 발신자에게 알림 전달 상태 업데이트
      const message = await Message.findById(messageId);
      if (message) {
        await socketService.emitToUser(message.sender.id, 'notification_delivered', {
          messageId,
          userId
        });
      }
    } catch (error) {
      logger.error('Handle notification delivered error:', error);
    }
  }

  // 메시지 전송 상태 업데이트 핸들러 추가
  async handleMessageStatus(data) {
    try {
      const { messageId, status, userId } = data;
      
      const message = await Message.findById(messageId);
      if (!message) return;

      message.status = status;
      if (status === 'read') {
        message.readBy.push({
          userId,
          readAt: new Date()
        });
      }
      
      await message.save();
      
      // 메시지 작성자에게 상태 업데이트 알림
      await socketService.emitToUser(message.sender.id, 'message_status_update', {
        messageId,
        status,
        userId
      });
    } catch (error) {
      logger.error('Handle message status error:', error);
    }
  }

  // 파일 업로드 진행상황 핸들러 추가
  async handleFileUploadProgress(data) {
    try {
      const { messageId, progress } = data;
      await socketService.emitToRoom(data.roomId, 'file_upload_progress', {
        messageId,
        progress
      });
    } catch (error) {
      logger.error('Handle file upload progress error:', error);
    }
  }
}

module.exports = new ChatHandler();