const logger = require('../utils/logger');
const { BaseError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors || []
    });
  }

  return res.status(500).json({
    message: '서버 내부 오류가 발생했습니다'
  });
};

module.exports = errorHandler;