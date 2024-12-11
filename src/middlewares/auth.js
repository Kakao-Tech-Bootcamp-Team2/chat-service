const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/keys');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const auth = {
  // 기본 인증 미들웨어
  requireAuth: async (req, res, next) => {
    try {
      const token = req.header('x-auth-token');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: '인증 토큰이 없습니다.'
        });
      }
  
      try {
        const decoded = jwt.verify(token, jwtSecret);
        
        req.user = {
          id: decoded.id
        };
        
        next();
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다.'
        });
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  },

  // 관리자 권한 확인 미들웨어
  requireAdmin: async (req, res, next) => {
    try {
      await auth.requireAuth(req, res, async () => {
        if (!req.user.isAdmin) {
          throw new AuthorizationError('관리자 권한이 필요합니다.');
        }
        next();
      });
    } catch (error) {
      next(error);
    }
  },

  // 소켓 인증 미들웨어
  socketAuth: async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        throw new AuthenticationError('인증 토큰이 필요합니다.');
      }

      try {
        const decoded = jwt.verify(token, jwtSecret);
        
        socket.user = {
          id: decoded.id
        };
        
        next();
      } catch (err) {
        throw new AuthenticationError('유효하지 않은 토큰입니다.');
      }
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(error);
    }
  }
};

module.exports = auth;