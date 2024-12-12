const express = require("express");
const router = express.Router();
const messageController = require("../../../controllers/messageController");
const auth = require("../../../middleware/auth");
const { rateLimit } = require("express-rate-limit");

// 속도 제한 설정
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60, // IP당 최대 요청 수
  message: {
    success: false,
    message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
  },
});

// 채팅방의 메시지 목록 조회
router.get("/rooms/:roomId/messages", auth, messageController.loadMessages);

// 메시지 전송
router.post(
  "/rooms/:roomId/messages",
  auth,
  messageLimiter,
  messageController.sendMessage
);

// 메시지 읽음 처리
router.post("/messages/:messageId/read", auth, messageController.markAsRead);

module.exports = router;
