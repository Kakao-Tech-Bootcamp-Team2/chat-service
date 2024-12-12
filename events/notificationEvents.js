const EventEmitter = require("events");
const redisClient = require("../utils/redisClient");
const socketService = require("../services/socketService");
const logger = require("../utils/logger");

class NotificationEvents extends EventEmitter {
  constructor() {
    super();
    this.initializeListeners();
  }

  initializeListeners() {
    // 멘션 알림 이벤트
    this.on("notification:mention", async ({ message, mentionedUsers }) => {
      try {
        for (const userId of mentionedUsers) {
          const notification = {
            type: "mention",
            messageId: message._id,
            roomId: message.room,
            senderId: message.sender,
            content: message.content,
            timestamp: new Date(),
          };

          // Redis에 알림 저장
          await redisClient.set(
            `notification:${userId}:${message._id}`,
            JSON.stringify(notification),
            86400 // 24시간 유지
          );

          // 실시간 알림 전송
          socketService.emitToUser(userId, "new_notification", notification);
        }
      } catch (error) {
        logger.error("Mention notification error:", {
          error: error.message,
          messageId: message._id,
        });
      }
    });

    // 시스템 알림 이벤트
    this.on("notification:system", async ({ userId, message, type }) => {
      try {
        const notification = {
          type: "system",
          subType: type,
          message,
          timestamp: new Date(),
        };

        // Redis에 알림 저장
        await redisClient.set(
          `notification:${userId}:system:${Date.now()}`,
          JSON.stringify(notification),
          86400 // 24시간 유지
        );

        // 실시간 알림 전송
        socketService.emitToUser(userId, "new_notification", notification);
      } catch (error) {
        logger.error("System notification error:", {
          error: error.message,
          userId,
        });
      }
    });

    // 읽지 않은 알림 카운트 업데이트 이벤트
    this.on("notification:count_update", async (userId) => {
      try {
        const pattern = `notification:${userId}:*`;
        const keys = await redisClient.keys(pattern);
        const unreadCount = keys.length;

        socketService.emitToUser(userId, "notification_count", {
          count: unreadCount,
        });
      } catch (error) {
        logger.error("Notification count update error:", {
          error: error.message,
          userId,
        });
      }
    });
  }
}

module.exports = new NotificationEvents();
