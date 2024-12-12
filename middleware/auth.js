const jwt = require("jsonwebtoken");
const axios = require("axios");
const { jwtSecret, apiGatewayUrl } = require("../config/keys");

const auth = async (req, res, next) => {
  try {
    // 토큰 확인
    const token = req.header("x-auth-token");
    const sessionId = req.header("x-session-id");

    if (!token || !sessionId) {
      return res.status(401).json({
        success: false,
        message: "인증 토큰이 없습니다.",
      });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, jwtSecret);

    // API Gateway를 통해 Auth Service의 세션 검증 요청
    try {
      const response = await axios.post(
        `${apiGatewayUrl}/auth/validate-session`,
        {
          userId: decoded.userId,
          sessionId: sessionId,
        },
        {
          headers: {
            "x-auth-token": token,
            "x-session-id": sessionId,
          },
        }
      );

      if (!response.data.isValid) {
        return res.status(401).json({
          success: false,
          message: response.data.message || "유효하지 않은 세션입니다.",
        });
      }
    } catch (error) {
      console.error("Session validation error:", error);
      return res.status(401).json({
        success: false,
        message: "세션 검증에 실패했습니다.",
      });
    }

    req.user = decoded;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "유효하지 않은 토큰입니다.",
    });
  }
};

module.exports = auth;
