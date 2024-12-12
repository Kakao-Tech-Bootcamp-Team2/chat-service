const messageService = require("../../services/messageService");
const aiService = require("../../services/aiService");

class AIHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
    this.name = socket.name;
  }

  // @ 문자열에서 멘션된 사용자 ID 추출
  extractMentions(content) {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const aiUser = aiService.getAIUser(match[1]);
      if (aiUser) {
        mentions.push(aiUser._id);
      }
    }

    return mentions;
  }

  async handleAIMessage(data) {
    const { roomId, content, aiType } = data;

    try {
      // 멘션 추출
      const mentions = this.extractMentions(content);

      // 시스템 메시지 생성 - AI 응답 시작
      await messageService.createMessage({
        room: roomId,
        content: `${aiType} 응답을 생성하고 있습니다...`,
        sender: this.userId,
        senderName: this.name,
        type: "system",
        mentions,
      });

      // AI 응답 생성 시작
      const response = await aiService.generateResponse(content, aiType, {
        onStart: () => {
          this.io.to(roomId).emit("aiMessageStart", {
            userId: this.userId,
            aiType,
            timestamp: new Date(),
            aiUser: aiService.getAIUser(aiType), // AI 사용자 정보 추가
          });
        },
        onChunk: (chunk) => {
          this.io.to(roomId).emit("aiMessageChunk", {
            userId: this.userId,
            chunk,
            aiType,
            isCodeBlock: chunk.includes("```"),
            aiUser: aiService.getAIUser(aiType), // AI 사용자 정보 추가
          });
        },
        onComplete: async (finalContent) => {
          // AI 응답 메시지 저장
          const message = await messageService.createMessage({
            room: roomId,
            content: finalContent,
            sender: aiService.getAIUser(aiType)._id, // AI를 발신자로 설정
            senderName: aiService.getAIUser(aiType).name,
            type: "ai",
            aiType,
            mentions,
          });

          this.io.to(roomId).emit("aiMessageComplete", {
            userId: this.userId,
            messageId: message._id,
            content: finalContent,
            aiType,
            timestamp: message.timestamp,
            mentions,
            aiUser: aiService.getAIUser(aiType), // AI 사용자 정보 추가
          });
        },
        onError: (error) => {
          this.io.to(roomId).emit("aiMessageError", {
            userId: this.userId,
            error: error.message,
            aiType,
            aiUser: aiService.getAIUser(aiType), // AI 사용자 정보 추가
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
