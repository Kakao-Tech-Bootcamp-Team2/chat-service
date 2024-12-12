const express = require("express");
const router = express.Router();
const v1Routes = require("./v1");

// API 버전 라우트 마운트
router.use("/v1", v1Routes);

// API 문서화 라우트
router.get("/", (req, res) => {
  res.json({
    name: "Chat Service API",
    currentVersion: "v1",
    versions: {
      v1: {
        status: "active",
        endpoint: "/api/v1",
      },
    },
    documentation: {
      swagger: "/api/docs",
      github: "https://github.com/your-repo/chat-service",
    },
    timestamp: new Date().toISOString(),
  });
});

// API 버전 없는 요청 처리
router.use((req, res, next) => {
  if (!req.path.startsWith("/v1/")) {
    return res.status(400).json({
      success: false,
      message: "API 버전을 지정해주세요. (예: /api/v1/...)",
    });
  }
  next();
});

module.exports = router;
