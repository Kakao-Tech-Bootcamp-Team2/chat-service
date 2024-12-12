const validation = {
  isValidMessageContent(content) {
    return (
      content &&
      typeof content === "string" &&
      content.trim().length > 0 &&
      content.length <= 10000
    );
  },

  isValidMessageType(type) {
    return ["text", "system", "ai", "file"].includes(type);
  },

  isValidReaction(emoji) {
    return (
      emoji &&
      typeof emoji === "string" &&
      emoji.trim().length > 0 &&
      emoji.length <= 10
    );
  },

  isValidAIType(type) {
    return ["wayneAI", "consultingAI"].includes(type);
  },

  sanitizeMessage(content) {
    if (!content) return "";
    return content
      .trim()
      .replace(/[<>]/g, "") // XSS 방지를 위한 기본적인 태그 제거
      .slice(0, 10000); // 최대 길이 제한
  },

  validateRoomId(roomId) {
    return (
      roomId && typeof roomId === "string" && roomId.match(/^[0-9a-fA-F]{24}$/)
    );
  },

  validateUserId(userId) {
    return (
      userId && typeof userId === "string" && userId.match(/^[0-9a-fA-F]{24}$/)
    );
  },
};

module.exports = validation;
