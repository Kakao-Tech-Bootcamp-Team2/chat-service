const express = require("express");
const router = express.Router();
const apiRoutes = require("./api");

// API 라우트 마운트
router.use("/api", apiRoutes);

// 서비스 상태 확인 라우트
router.get("/", (req, res) => {
  res.json({
    service: "Chat Service",
    status: "active",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      api: "/api",
    },
  });
});

// 404 처리
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "요청하신 경로를 찾을 수 없습니다.",
  });
});

module.exports = router;
