const rateLimit = require("express-rate-limit");

const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // IP당 최대 요청 수
    message: {
      success: false,
      message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
  });
};

// 채팅 메시지 전송 제한
const messageLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60, // 분당 60개 메시지
});

// AI 메시지 요청 제한
const aiMessageLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분
  max: 10, // 분당 10개 AI 메시지
});

// 리액션 추가 제한
const reactionLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분
  max: 30, // 분당 30개 리액션
});

module.exports = {
  messageLimiter,
  aiMessageLimiter,
  reactionLimiter,
};
