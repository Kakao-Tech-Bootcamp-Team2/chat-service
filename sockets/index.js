const socketIO = require("socket.io");
const socketAuth = require("./middleware/socketAuth");
const MessageHandler = require("./handlers/messageHandler");
const RoomHandler = require("./handlers/roomHandler");
const TypingHandler = require("./handlers/typingHandler");
const AIHandler = require("./handlers/aiHandler");
const { connectionConfig } = require("../config/socket.config");
const socketService = require("../services/socketService");

function initializeSocket(server) {
  const io = socketIO(server, connectionConfig);

  socketService.io = io;

  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.userId);

    const messageHandler = new MessageHandler(io, socket);
    const roomHandler = new RoomHandler(io, socket);
    const typingHandler = new TypingHandler(io, socket);
    const aiHandler = new AIHandler(io, socket);

    // 메시지 관련 이벤트
    socket.on(
      "chatMessage",
      messageHandler.handleChatMessage.bind(messageHandler)
    );
    socket.on(
      "fetchPreviousMessages",
      messageHandler.fetchPreviousMessages.bind(messageHandler)
    );
    socket.on("mark_as_read", messageHandler.markAsRead.bind(messageHandler));

    // 채팅방 관련 이벤트
    socket.on("joinRoom", roomHandler.joinRoom.bind(roomHandler));
    socket.on("leaveRoom", roomHandler.leaveRoom.bind(roomHandler));

    // 타이핑 관련 이벤트
    socket.on("typing_start", typingHandler.startTyping.bind(typingHandler));
    socket.on("typing_stop", typingHandler.stopTyping.bind(typingHandler));

    // AI 관련 이벤트
    socket.on("ai_message", aiHandler.handleAIMessage.bind(aiHandler));

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.userId);
      // 연결 종료 시 정리 작업
      if (socket.userId) {
        const userRooms = socketService.userRooms.get(socket.userId);
        if (userRooms) {
          userRooms.forEach((roomId) => {
            socket.leave(roomId);
            io.to(roomId).emit("user_left", {
              userId: socket.userId,
              timestamp: new Date(),
            });
          });
          socketService.userRooms.delete(socket.userId);
        }
      }
    });
  });

  return io;
}

module.exports = initializeSocket;
