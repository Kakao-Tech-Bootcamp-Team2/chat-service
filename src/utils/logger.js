const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'chat-service' },
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: `${config.logging.dir}/error.log`,
      level: 'error',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles
    }),
    // 전체 로그 파일
    new winston.transports.File({
      filename: `${config.logging.dir}/combined.log`,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles
    })
  ]
});

// 개발 환경에서는 콘솔 출력 추가
if (config.env === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;