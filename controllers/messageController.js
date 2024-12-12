const Message = require("../models/Message");
const messageService = require("../services/messageService");
const socketService = require("../services/socketService");

const messageController = {
  async loadMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { before, limit } = req.query;

      const result = await messageService.loadMessages(
        roomId,
        before,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.messages,
        hasMore: result.hasMore,
      });
    } catch (error) {
      console.error("Load messages error:", error);
      res.status(500).json({
        success: false,
        message: "메시지 로드 중 오류가 발생했습니다.",
      });
    }
  },

  async sendMessage(req, res) {
    try {
      const { roomId, content, type = "text", mentions } = req.body;
      const userId = req.user.id;

      const message = await messageService.createMessage({
        room: roomId,
        content,
        sender: userId,
        type,
        mentions,
      });

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        message: "메시지 전송 중 오류가 발생했습니다.",
      });
    }
  },

  async markAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await messageService.markAsRead(messageId, userId);

      res.json({
        success: true,
        message,
      });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({
        success: false,
        message: "읽음 처리 중 오류가 발생했습니다.",
      });
    }
  },
};

module.exports = messageController;
