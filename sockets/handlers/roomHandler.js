const { userRooms } = require("../../services/socketService");

class RoomHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
  }

  async joinRoom(roomId) {
    try {
      if (!roomId) {
        throw new Error("Invalid room ID");
      }

      await this.socket.join(roomId);

      if (this.userId) {
        const userRoomSet = userRooms.get(this.userId) || new Set();
        userRoomSet.add(roomId);
        userRooms.set(this.userId, userRoomSet);
      }

      this.socket.emit("joinRoomSuccess", {
        roomId,
        userId: this.userId,
        timestamp: new Date(),
      });

      this.io.to(roomId).emit("user_joined", {
        userId: this.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Join room error:", error);
      this.socket.emit("joinRoomError", {
        error: error.message || "채팅방 입장 중 오류가 발생했습니다.",
      });
    }
  }

  async leaveRoom(roomId) {
    try {
      if (!roomId) {
        throw new Error("Invalid room ID");
      }

      await this.socket.leave(roomId);

      if (this.userId) {
        const userRoomSet = userRooms.get(this.userId);
        if (userRoomSet) {
          userRoomSet.delete(roomId);
        }
      }

      this.io.to(roomId).emit("user_left", {
        userId: this.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Leave room error:", error);
      this.socket.emit("error", {
        type: "LEAVE_ROOM_ERROR",
        message: error.message || "채팅방 퇴장 중 오류가 발생했습니다.",
      });
    }
  }
}

module.exports = RoomHandler;
