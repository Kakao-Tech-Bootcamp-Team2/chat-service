const express = require("express");
const router = express.Router();

const messageRoutes = require("./messages");
const reactionRoutes = require("./reactions");
const chatRoutes = require("./chat");

// 라우트 마운트
router.use("/messages", messageRoutes);
router.use("/reactions", reactionRoutes);
router.use("/chat", chatRoutes);

// v1 API 문서화 라우트
router.get("/", (req, res) => {
  res.json({
    name: "Chat Service API v1",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      messages: {
        base: "/messages",
        routes: {
          getMessages: {
            method: "GET",
            path: "/rooms/:roomId/messages",
            description: "채팅방의 메시지 목록을 조회합니다.",
            auth: true,
          },
          sendMessage: {
            method: "POST",
            path: "/rooms/:roomId/messages",
            description: "새로운 메시지를 전송합니다.",
            auth: true,
          },
          markAsRead: {
            method: "POST",
            path: "/messages/:messageId/read",
            description: "메시지를 읽음 처리합니다.",
            auth: true,
          },
        },
      },
      reactions: {
        base: "/reactions",
        routes: {
          addReaction: {
            method: "POST",
            path: "/messages/:messageId/reactions",
            description: "메시지에 리액션을 추가합니다.",
            auth: true,
          },
          removeReaction: {
            method: "DELETE",
            path: "/messages/:messageId/reactions/:emoji",
            description: "메시지의 리액션을 제거합니다.",
            auth: true,
          },
        },
      },
      chat: {
        base: "/chat",
        routes: {
          aiMessage: {
            method: "POST",
            path: "/ai/message",
            description: "AI 메시지를 처리합니다.",
            auth: true,
          },
        },
      },
    },
  });
});

module.exports = router;
