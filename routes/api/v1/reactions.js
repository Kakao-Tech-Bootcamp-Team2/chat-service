const express = require("express");
const router = express.Router();
const reactionController = require("../../../controllers/reactionController");
const auth = require("../../../middleware/auth");
const { rateLimit } = require("express-rate-limit");

// 속도 제한 설정
const reactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 30, // IP당 최대 요청 수
  message: {
    success: false,
    message: "너무 많은 리액션 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
  },
});

// 리액션 추가
router.post(
  "/messages/:messageId/reactions",
  auth,
  reactionLimiter,
  reactionController.addReaction
);

// 리액션 제거
router.delete(
  "/messages/:messageId/reactions/:emoji",
  auth,
  reactionController.removeReaction
);

module.exports = router;
