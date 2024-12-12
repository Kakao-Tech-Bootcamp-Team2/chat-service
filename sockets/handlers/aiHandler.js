const aiService = require("../../services/aiService");

class AIHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
  }

  async handleAIMessage(data) {
    const { roomId, content, aiType } = data;

    try {
      await aiService.generateResponse(content, aiType, {
        onStart: () => {
          this.io.to(roomId).emit("aiMessageStart", {
            userId: this.userId,
            aiType,
          });
        },
        onChunk: (chunk) => {
          this.io.to(roomId).emit("aiMessageChunk", {
            userId: this.userId,
            chunk,
            aiType,
          });
        },
        onComplete: (finalContent) => {
          this.io.to(roomId).emit("aiMessageComplete", {
            userId: this.userId,
            content: finalContent,
            aiType,
          });
        },
        onError: (error) => {
          this.io.to(roomId).emit("aiMessageError", {
            userId: this.userId,
            error: error.message,
            aiType,
          });
        },
      });
    } catch (error) {
      console.error("AI message handling error:", error);
      this.socket.emit("error", {
        type: "AI_MESSAGE_ERROR",
        message: "AI 메시지 처리 중 오류가 발생했습니다.",
      });
    }
  }
}

module.exports = AIHandler;
