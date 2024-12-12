const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const notificationService = require("../services/notificationService");

class MessageService {
  async createMessage(data) {
    try {
      // User 존재 여부 확인
      const userExists = await User.findById(data.sender);
      console.log("[MessageService] User check:", {
        userId: data.sender,
        exists: !!userExists,
        userData: userExists,
      });

      if (!userExists) {
        // User가 없으면 생성
        const newUser = new User({
          _id: data.sender,
          name: "User " + data.sender.substring(0, 6), // 임시 이름
          email: `user-${data.sender.substring(0, 6)}@example.com`, // 임시 이메일
        });
        await newUser.save();
        console.log("[MessageService] Created new user:", newUser);
      }

      const message = new Message({
        room: data.room,
        content: data.content,
        sender: data.sender,
        type: data.type,
        mentions: data.mentions,
        file: data.file,
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id).populate({
        path: "sender",
        select: "name email profileImage",
      });

      console.log("[MessageService] Message after populate:", {
        messageId: message._id,
        sender: populatedMessage.sender,
        senderBeforePopulate: message.sender,
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
}

module.exports = new MessageService();
