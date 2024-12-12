const aiService = require("../services/aiService");
const socketService = require("../services/socketService");
const Message = require("../models/Message");

const chatController = {
  async processAIMessage(req, res) {
    try {
      const { roomId, content, aiType } = req.body;
      const userId = req.user.id;

      // 초기 메시지 생성
      const message = new Message({
        room: roomId,
        content: "",
        sender: userId,
        type: "ai",
        aiType,
      });

      await message.save();

      // 스트리밍 응답 시작
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      await aiService.generateResponse(content, aiType, {
        onStart: () => {
          socketService.emitToRoom(roomId, "aiMessageStart", {
            messageId: message._id,
            aiType,
          });
        },
        onChunk: (chunk) => {
          socketService.emitToRoom(roomId, "aiMessageChunk", {
            messageId: message._id,
            chunk,
            aiType,
          });
        },
        onComplete: async (finalContent) => {
          message.content = finalContent;
          await message.save();

          socketService.emitToRoom(roomId, "aiMessageComplete", {
            messageId: message._id,
            content: finalContent,
            aiType,
          });
        },
        onError: (error) => {
          socketService.emitToRoom(roomId, "aiMessageError", {
            messageId: message._id,
            error: error.message,
            aiType,
          });
        },
      });
    } catch (error) {
      console.error("AI message processing error:", error);
      res.status(500).json({
        success: false,
        message: "AI 메시지 처리 중 오류가 발생했습니다.",
      });
    }
  },
};

module.exports = chatController;
