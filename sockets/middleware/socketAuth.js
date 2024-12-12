const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../../config/keys");
const User = require("../../models/User");
const messageService = require("../../services/messageService");
const { userRooms } = require("../../services/socketService");

const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    const decoded = jwt.verify(token, jwtSecret);
    console.log("[SocketAuth] Decoded token:", decoded);

    const { userId, name, email } = decoded;
    socket.userId = userId;
    socket.name = name;

    // 연결이 끊어질 때 처리
    socket.on("disconnect", async () => {
      try {
        // 사용자가 참여중이던 모든 방에 시스템 메시지 전송
        const rooms = userRooms.get(userId);
        if (rooms) {
          for (const roomId of rooms) {
            // 연결 끊김 시스템 메시지 생성
            await messageService.createMessage({
              room: roomId,
              senderName: name,
              content: `${name}님의 연결이 끊어졌습니다.`,
              sender: userId,
              type: "system",
            });
          }
        }
      } catch (error) {
        console.error("[SocketAuth] Disconnect message error:", error);
      }
    });

    console.log("[SocketAuth] User authenticated:", {
      userId: socket.userId,
      socketId: socket.id,
      decodedToken: decoded,
    });

    next();
  } catch (error) {
    console.error("[SocketAuth] Authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
};

module.exports = socketAuth;
