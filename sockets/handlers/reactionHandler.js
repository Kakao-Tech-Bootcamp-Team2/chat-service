const messageService = require("../../services/messageService");

class ReactionHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
  }

  async handleMessageReaction(data) {
    try {
      const { messageId, reaction, type } = data;

      // 리액션 처리
      const updatedMessage = await messageService.handleReaction({
        messageId,
        userId: this.userId,
        reaction,
        type, // 'add' 또는 'remove'
      });

      // 방의 모든 사용자에게 업데이트된 리액션 정보 전송
      this.io.to(updatedMessage.room).emit("messageReactionUpdate", {
        messageId,
        reactions: updatedMessage.reactions,
      });
    } catch (error) {
      console.error("[ReactionHandler] Reaction error:", error);
      this.socket.emit("error", {
        type: "REACTION_ERROR",
        message: "리액션 처리 중 오류가 발생했습니다.",
      });
    }
  }
}

module.exports = ReactionHandler;
