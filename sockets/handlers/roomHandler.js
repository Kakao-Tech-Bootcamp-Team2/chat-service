const { userRooms } = require("../../services/socketService");
const messageService = require("../../services/messageService");

class RoomHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.userId;
    this.name = socket.name;
  }

  async joinRoom(roomId) {
    try {
      if (!roomId) {
        throw new Error("Invalid room ID");
      }

      await this.socket.join(roomId);

      // userRooms에 추가
      if (this.userId) {
        const userRoomSet = userRooms.get(this.userId) || new Set();
        userRoomSet.add(roomId);
        userRooms.set(this.userId, userRoomSet);
      }

      // 시스템 메시지 생성 및 전송
      const message = await messageService.createMessage({
        room: roomId,
        content: `${this.name}님이 입장하셨습니다.`,
        senderName: this.name,
        sender: this.userId,
        type: "system",
      });

      // 방에 있는 모든 사용자에게 메시지 전송
      this.io.to(roomId).emit("message", {
        ...message.toJSON(),
        room: roomId,
      });

      // 입장 성공 이벤트 전송
      this.socket.emit("joinRoomSuccess", {
        roomId,
        userId: this.userId,
        timestamp: new Date(),
        name: this.name,
      });
    } catch (error) {
      console.error("[RoomHandler] Join room error:", error);
      this.socket.emit("error", {
        type: "JOIN_ROOM_ERROR",
        message: "채팅방 입장 중 오류가 발생했습니다.",
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
