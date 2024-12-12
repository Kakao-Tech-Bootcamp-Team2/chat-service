class TypingHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
  }

  startTyping(roomId) {
    this.io.to(roomId).emit("user_typing", {
      userId: this.userId,
      roomId,
      timestamp: new Date(),
    });
  }

  stopTyping(roomId) {
    this.io.to(roomId).emit("user_stop_typing", {
      userId: this.userId,
      roomId,
      timestamp: new Date(),
    });
  }
}

module.exports = TypingHandler;
