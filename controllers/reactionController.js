const Message = require("../models/Message");
const socketService = require("../services/socketService");

const reactionController = {
  async addReaction(req, res) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "메시지를 찾을 수 없습니다.",
        });
      }

      // reactions Map이 없으면 생성
      if (!message.reactions) {
        message.reactions = new Map();
      }

      // 해당 이모지에 대한 반응 배열이 없으면 생성
      if (!message.reactions.has(emoji)) {
        message.reactions.set(emoji, []);
      }

      const reactions = message.reactions.get(emoji);
      const existingReaction = reactions.find(
        (r) => r.user.toString() === userId
      );

      if (!existingReaction) {
        reactions.push({
          user: userId,
          timestamp: new Date(),
        });
        message.markModified("reactions");
        await message.save();

        socketService.emitToRoom(message.room, "reactionAdded", {
          messageId,
          emoji,
          userId,
          timestamp: new Date(),
        });
      }

      res.json({
        success: true,
        reactions: Object.fromEntries(message.reactions),
      });
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({
        success: false,
        message: "리액션 추가 중 오류가 발생했습니다.",
      });
    }
  },

  async removeReaction(req, res) {
    try {
      const { messageId, emoji } = req.params;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message || !message.reactions || !message.reactions.has(emoji)) {
        return res.status(404).json({
          success: false,
          message: "리액션을 찾을 수 없습니다.",
        });
      }

      const reactions = message.reactions.get(emoji);
      const reactionIndex = reactions.findIndex(
        (r) => r.user.toString() === userId
      );

      if (reactionIndex !== -1) {
        reactions.splice(reactionIndex, 1);
        if (reactions.length === 0) {
          message.reactions.delete(emoji);
        }
        message.markModified("reactions");
        await message.save();

        socketService.emitToRoom(message.room, "reactionRemoved", {
          messageId,
          emoji,
          userId,
        });
      }

      res.json({
        success: true,
        reactions: Object.fromEntries(message.reactions),
      });
    } catch (error) {
      console.error("Remove reaction error:", error);
      res.status(500).json({
        success: false,
        message: "리액션 제거 중 오류가 발생했습니다.",
      });
    }
  },
};

module.exports = reactionController;
