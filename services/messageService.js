const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const File = require("../models/File");

class MessageService {
  async createMessage(data) {
    try {
      // User 존재 여부 확인
      let user = await User.findById(data.sender);

      if (!user) {
        // socket.name과 socket.email을 사용하여 User 생성
        user = await User.create({
          _id: data.sender,
          name: data.senderName, // socket에서 전달받은 name
        });
        console.log("[MessageService] Created new user:", user);
      }
      console.log(data.file);
      const message = new Message({
        room: data.room,
        content: data.content,
        sender: data.sender,
        type: data.type,
        mentions: data.mentions,
        file: JSON.parse(data.file),
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate({
          path: "sender",
          select: "name email profileImage",
        })
        .populate({
          path: "file",
          select: "filename originalname mimetype size url",
        });

      return populatedMessage;
    } catch (error) {
      console.error("[MessageService] Error creating message:", error);
      throw error;
    }
  }

  async loadMessages(roomId, before, limit = messageConfig.BATCH_SIZE) {
    try {
      const query = { room: roomId };
      if (before) {
        query.timestamp = { $lt: new Date(before) };
      }

      const messages = await Message.find(query)
        .populate("sender", "name email profileImage")
        .populate({
          path: "file",
          select: "filename originalname mimetype size",
        })
        .sort({ timestamp: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = messages.length > limit;
      return {
        messages: messages.slice(0, limit),
        hasMore,
      };
    } catch (error) {
      console.error("Message loading error:", error);
      throw error;
    }
  }

  async markAsRead(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) throw new Error("Message not found");

      const readEntry = message.readBy.find(
        (entry) => entry.user.toString() === userId.toString()
      );

      if (!readEntry) {
        message.readBy.push({ user: userId });
        await message.save();
      }

      return message;
    } catch (error) {
      console.error("Mark as read error:", error);
      throw error;
    }
  }

  async handleReaction(data) {
    try {
      const { messageId, userId, reaction, type } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Message not found");
      }

      // reactions 필드가 없으면 초기화
      if (!message.reactions) {
        message.reactions = {};
      }

      // 해당 리액션의 사용자 배열이 없으면 초기화
      if (!message.reactions[reaction]) {
        message.reactions[reaction] = [];
      }

      if (type === "add") {
        // 중복 추가 방지
        if (!message.reactions[reaction].includes(userId)) {
          message.reactions[reaction].push(userId);
        }
      } else if (type === "remove") {
        message.reactions[reaction] = message.reactions[reaction].filter(
          (id) => id !== userId
        );
        // 빈 리액션 배열 제거
        if (message.reactions[reaction].length === 0) {
          delete message.reactions[reaction];
        }
      }

      await message.save();
      return message;
    } catch (error) {
      console.error("[MessageService] Reaction error:", error);
      throw error;
    }
  }
}

module.exports = new MessageService();
