const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const auth = {
  // 기본 인증 미들웨어
  requireAuth: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new AuthenticationError('인증 토큰이 필요합니다.');
      }

      // Auth Service에 토큰 검증 요청
      const response = await eventBus.request('auth.validate_token', { token });

      if (!response.success) {
        throw new AuthenticationError('유효하지 않은 토큰입니다.');
      }

      req.user = response.user;
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      next(error);
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

      const response = await eventBus.request('auth.validate_token', { token });

      if (!response.success) {
        throw new AuthenticationError('유효하지 않은 토큰입니다.');
      }

      socket.user = response.user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(error);
    }
  }
};

module.exports = auth;