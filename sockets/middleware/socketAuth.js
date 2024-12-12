const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../../config/keys");
const User = require("../../models/User");

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

    await User.findOneAndUpdate(
      { _id: userId },
      {
        name,
        email,
      },
      { upsert: true, new: true }
    );

    socket.userId = userId;

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
