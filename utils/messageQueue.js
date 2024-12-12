const logger = require("../utils/logger");
const Message = require("../models/Message");
const notificationService = require("../services/notificationService");

class MessageQueue {
  constructor() {
    this.queues = new Map();
    this.processing = new Set();
  }

  async enqueue(roomId, message) {
    if (!this.queues.has(roomId)) {
      this.queues.set(roomId, []);
    }

    const queue = this.queues.get(roomId);
    queue.push(message);

    if (!this.processing.has(roomId)) {
      this.processQueue(roomId);
    }
  }

  async processQueue(roomId) {
    if (!this.queues.has(roomId) || this.processing.has(roomId)) {
      return;
    }

    this.processing.add(roomId);
    const queue = this.queues.get(roomId);

    while (queue.length > 0) {
      const message = queue[0];
      try {
        await this.processMessage(roomId, message);
        queue.shift();
      } catch (error) {
        console.error("Message processing error:", error);
        // 에러 발생 시 재시도 로직 추가 가능
        break;
      }
    }

    if (queue.length === 0) {
      this.queues.delete(roomId);
    }
    this.processing.delete(roomId);
  }

  async processMessage(queueId, message) {
    try {
      const { data } = message;

      // 1. DB에 메시지 저장
      const newMessage = new Message({
        room: data.room,
        content: data.content,
        sender: data.sender,
        type: data.type,
        mentions: data.mentions,
        file: data.file,
        aiType: data.aiType,
      });

      await newMessage.save();
      await newMessage.populate("sender", "name email profileImage");

      if (data.type === "file") {
        await newMessage.populate(
          "file",
          "filename originalname mimetype size"
        );
      }

      // 멘션이 있는 경우 알림 생성
      if (data.mentions?.length > 0) {
        await notificationService.createMentionNotifications(newMessage);
      }

      logger.info(`Processing message in queue ${queueId}:`, message);
      logger.info("Message processed successfully", {
        messageId: newMessage._id,
        roomId: data.room,
        type: data.type,
      });

      return newMessage;
    } catch (error) {
      logger.error(`Message processing error in queue ${queueId}:`, error);
      throw error;
    }
  }
}

module.exports = new MessageQueue();
