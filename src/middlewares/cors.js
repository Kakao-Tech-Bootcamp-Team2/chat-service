const cors = require('cors');
const config = require('../config');

module.exports = cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.origins;
    
    // 개발 환경이거나 허용된 도메인인 경우
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400 // 24시간
});