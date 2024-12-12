const validateRequest = {
  message(req, res, next) {
    const { content, type } = req.body;
    const errors = [];

    // 메시지 내용 검증
    if (type === "text" && (!content || content.trim().length === 0)) {
      errors.push("메시지 내용은 필수입니다.");
    }

    // 메시지 길이 검증
    if (content && content.length > 10000) {
      errors.push("메시지는 10000자를 초과할 수 없습니다.");
    }

    // 메시지 타입 검증
    if (!["text", "system", "ai", "file"].includes(type)) {
      errors.push("유효하지 않은 메시지 타입입니다.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "입력값이 유효하지 않습니다.",
        errors,
      });
    }

    next();
  },

  reaction(req, res, next) {
    const { emoji } = req.body;
    const errors = [];

    // 이모지 검증
    if (!emoji || emoji.trim().length === 0) {
      errors.push("이모지는 필수입니다.");
    }

    // 이모지 길이 검증
    if (emoji && emoji.length > 10) {
      errors.push("유효하지 않은 이모지입니다.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "입력값이 유효하지 않습니다.",
        errors,
      });
    }

    next();
  },

  aiMessage(req, res, next) {
    const { content, aiType } = req.body;
    const errors = [];

    // 내용 검증
    if (!content || content.trim().length === 0) {
      errors.push("메시지 내용은 필수입니다.");
    }

    // AI 타입 검증
    if (!["wayneAI", "consultingAI"].includes(aiType)) {
      errors.push("유효하지 않은 AI 타입입니다.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "입력값이 유효하지 않습니다.",
        errors,
      });
    }

    next();
  },
};

module.exports = validateRequest;
