const socketIO = require("socket.io");
const { connectionConfig, events } = require("../config/socket.config");
const redisClient = require("../utils/redisClient");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.userRooms = new Map();
  }

  initialize(server) {
    this.io = socketIO(server, connectionConfig);

    this.io.on(events.CONNECTION, (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.handshake.auth.userId;
    if (userId) {
      this.connectedUsers.set(userId, socket.id);
      socket.userId = userId;
    }

    // 기존 이벤트 핸들러 연결
    socket.on(events.DISCONNECT, () => this.handleDisconnect(socket));
    socket.on(events.JOIN_ROOM, (roomId) =>
      this.handleJoinRoom(socket, roomId)
    );
    socket.on(events.LEAVE_ROOM, (roomId) =>
      this.handleLeaveRoom(socket, roomId)
    );
    socket.on(events.USER_TYPING, (data) =>
      this.handleUserTyping(socket, data)
    );
  }

  handleDisconnect(socket) {
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
      this.userRooms.delete(socket.userId);
    }
  }

  handleJoinRoom(socket, roomId) {
    socket.join(roomId);
    if (socket.userId) {
      const userRooms = this.userRooms.get(socket.userId) || new Set();
      userRooms.add(roomId);
      this.userRooms.set(socket.userId, userRooms);
    }
  }

  handleLeaveRoom(socket, roomId) {
    socket.leave(roomId);
    if (socket.userId) {
      const userRooms = this.userRooms.get(socket.userId);
      if (userRooms) {
        userRooms.delete(roomId);
      }
    }
  }

  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

module.exports = new SocketService();
