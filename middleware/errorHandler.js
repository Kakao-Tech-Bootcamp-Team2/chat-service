const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // 커스텀 에러 처리
  if (err.isCustomError) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // JWT 에러 처리
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "유효하지 않은 토큰입니다.",
    });
  }

  // 몽구스 유효성 검사 에러
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "입력값이 유효하지 않습니다.",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // 기본 500 에러
  res.status(500).json({
    success: false,
    message: "서버 에러가 발생했습니다.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

module.exports = errorHandler;
