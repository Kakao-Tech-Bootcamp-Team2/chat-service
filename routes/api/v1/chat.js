const express = require("express");
const router = express.Router();
const chatController = require("../../../controllers/chatController");
const auth = require("../../../middleware/auth");
const { rateLimit } = require("express-rate-limit");

// AI 메시지 요청 제한
const aiMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 10, // IP당 최대 요청 수
  message: {
    success: false,
    message: "AI 메시지 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  },
});

// AI 메시지 처리
router.post(
  "/ai/message",
  auth,
  aiMessageLimiter,
  chatController.processAIMessage
);

module.exports = router;
