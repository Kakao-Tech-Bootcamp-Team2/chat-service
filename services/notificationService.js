const redisClient = require("../utils/redisClient");
const socketService = require("./socketService");

class NotificationService {
  async createMentionNotifications(message) {
    try {
      const mentions = message.mentions || [];

      for (const userId of mentions) {
        const notification = {
          type: "mention",
          messageId: message._id,
          roomId: message.room,
          senderId: message.sender,
          content: message.content,
          timestamp: new Date(),
        };

        // Redis에 알림 저장
        await redisClient.setEx(
          `notification:${userId}:${message._id}`,
          86400, // 24시간 유지
          JSON.stringify(notification)
        );

        // 실시간 알림 전송
        socketService.emitToUser(userId, "new_notification", notification);
      }
    } catch (error) {
      console.error("Mention notification error:", error);
      throw error;
    }
  }

  async createRoomInviteNotification(roomId, inviterId, inviteeId) {
    try {
      const notification = {
        type: "room_invite",
        roomId,
        inviterId,
        timestamp: new Date(),
      };

      // Redis에 알림 저장
      await redisClient.setEx(
        `notification:${inviteeId}:${roomId}`,
        86400, // 24시간 유지
        JSON.stringify(notification)
      );

      // 실시간 알림 전송
      socketService.emitToUser(inviteeId, "new_notification", notification);
    } catch (error) {
      console.error("Room invite notification error:", error);
      throw error;
    }
  }

  async createSystemNotification(userId, message) {
    try {
      const notification = {
        type: "system",
        message,
        timestamp: new Date(),
      };

      // Redis에 알림 저장
      await redisClient.setEx(
        `notification:${userId}:system`,
        86400, // 24시간 유지
        JSON.stringify(notification)
      );

      // 실시간 알림 전송
      socketService.emitToUser(userId, "new_notification", notification);
    } catch (error) {
      console.error("System notification error:", error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
