const EventEmitter = require("events");
const messageQueue = require("../utils/messageQueue");
const logger = require("../utils/logger");
const socketService = require("../services/socketService");

class MessageEvents extends EventEmitter {
  constructor() {
    super();
    this.initializeListeners();
  }

  initializeListeners() {
    // 새 메시지 이벤트
    this.on("message:created", async (message) => {
      try {
        await messageQueue.enqueue(message.room, {
          type: "new_message",
          data: message,
        });

        socketService.emitToRoom(message.room, "message", message);
      } catch (error) {
        logger.error("Message queue error:", {
          error: error.message,
          messageId: message._id,
        });
      }
    });

    // 메시지 읽음 처리 이벤트
    this.on("message:read", async ({ messageId, userId, timestamp }) => {
      try {
        await messageQueue.enqueue("read_status", {
          type: "read_status",
          messageId,
          userId,
          timestamp,
        });
      } catch (error) {
        logger.error("Read status update error:", {
          error: error.message,
          messageId,
          userId,
        });
      }
    });

    // AI 메시지 처리 이벤트
    this.on("message:ai", async (data) => {
      try {
        await messageQueue.enqueue(data.room, {
          ...data,
          type: "ai",
        });
      } catch (error) {
        logger.error("AI message processing error:", {
          error: error.message,
          room: data.room,
        });
      }
    });

    // 메시지 삭제 이벤트
    this.on("message:deleted", async ({ messageId, roomId, userId }) => {
      try {
        await messageQueue.enqueue(roomId, {
          type: "delete",
          messageId,
          userId,
        });
      } catch (error) {
        logger.error("Message deletion error:", {
          error: error.message,
          messageId,
        });
      }
    });
  }
}

module.exports = new MessageEvents();
