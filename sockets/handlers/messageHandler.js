const Message = require("../../models/Message");
const messageService = require("../../services/messageService");
const messageEvents = require("../../events/messageEvents");
const amqp = require("amqplib");
const { getChannel } = require("../../config/rabbitmq");
class MessageHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
    this.channel = getChannel();
  }

  async loadMessages(roomId, before, limit = messageConfig.BATCH_SIZE) {
    try {
      const result = await messageService.loadMessages(roomId, before, limit);

      this.socket.emit("messages_loaded", {
        success: true,
        messages: result.messages,
        hasMore: result.hasMore,
      });
    } catch (error) {
      console.error("Socket message loading error:", error);
      this.socket.emit("error", {
        type: "LOAD_MESSAGES_ERROR",
        message: "메시지 로드 중 오류가 발생했습니다.",
      });
    }
  }

  async markAsRead(messageId) {
    try {
      const message = await messageService.markAsRead(messageId, this.userId);

      this.io.to(message.room).emit("message_read", {
        messageId,
        userId: this.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Socket mark as read error:", error);
      this.socket.emit("error", {
        type: "MARK_AS_READ_ERROR",
        message: "읽음 처리 중 오류가 발생했습니다.",
      });
    }
  }

  async fetchPreviousMessages(data) {
    try {
      const { roomId, limit = messageConfig.BATCH_SIZE, before } = data;

      const result = await messageService.loadMessages(roomId, before, limit);

      this.socket.emit("previousMessagesLoaded", {
        messages: result.messages,
        hasMore: result.hasMore,
      });
    } catch (error) {
      console.error("Previous messages loading error:", error);
      this.socket.emit("error", {
        type: "LOAD_MESSAGES_ERROR",
        message: "이전 메시지 로드 중 오류가 발생했습니다.",
      });
    }
  }

  async handleChatMessage(messageData) {
    try {
      console.log("[MessageHandler] Handling chat message:", {
        userId: this.userId,
        socketId: this.socket.id,
        messageData,
        socketUserId: this.socket.userId,
      });

      if (!this.userId) {
        console.error("[MessageHandler] User not authenticated:", {
          socketId: this.socket.id,
          handshake: this.socket.handshake,
        });
        throw new Error("User not authenticated");
      }

      const message = await messageService.createMessage({
        room: messageData.room,
        content: messageData.content,
        sender: this.userId,
        senderName: this.socket.name,
        senderEmail: this.socket.email,
        type: messageData.type,
        file: messageData.fileData,
      });

      // RabbitMQ를 통해 모든 서버에 메시지 발행
      if (this.channel) {
        await this.channel.publish(
          "chat_messages",
          "",
          Buffer.from(
            JSON.stringify({
              ...message.toJSON(),
              room: messageData.room,
            })
          )
        );
      } else {
        console.warn("RabbitMQ channel not initialized");
      }

      console.log("[MessageHandler] Message published to all servers:", {
        messageId: message._id,
        room: messageData.room,
      });

      console.log("[MessageHandler] Message created with sender:", {
        messageId: message._id,
        senderId: this.userId,
        resultSender: message.sender,
      });

      this.io.to(messageData.room).emit("message", {
        ...message.toJSON(),
        room: messageData.room,
      });

      console.log("[MessageHandler] Message emitted to room:", {
        messageId: message._id,
        room: messageData.room,
        event: "message",
      });
    } catch (error) {
      console.error("[MessageHandler] Error:", error);
      this.socket.emit("error", {
        type: "MESSAGE_ERROR",
        message: "메시지 전송 중 오류가 발생했습니다.",
      });
    }
  }
}

module.exports = MessageHandler;
