const morgan = require('morgan');
const logger = require('../utils/logger');

// 커스텀 토큰 정의
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
morgan.token('body', (req) => JSON.stringify(req.body));

const format = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// 개발 환경용 로거
const developmentLogger = morgan(format, {
  stream: {
    write: (message) => logger.debug(message.trim())
  },
  skip: (req, res) => req.path === '/health'
});

// 운영 환경용 로거
const productionLogger = morgan(format, {
  stream: {
    write: (message) => logger.info(message.trim())
  },
  skip: (req, res) => {
    return req.path === '/health' || res.statusCode < 400;
  }
});

module.exports = process.env.NODE_ENV === 'production' 
  ? productionLogger 
  : developmentLogger;