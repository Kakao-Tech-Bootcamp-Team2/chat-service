const logger = require('../utils/logger');
const { BaseError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id
  });

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      errors: err.errors
    });
  }

  // 몽구스 검증 에러
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: '입력값 검증 실패',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // 몽구스 중복 키 에러
  if (err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      message: '중복된 데이터가 존재합니다',
      errors: [{
        field: Object.keys(err.keyPattern)[0],
        message: '이미 존재하는 값입니다'
      }]
    });
  }

  // 기타 에러
  return res.status(500).json({
    status: 'error',
    message: '서버 내부 오류가 발생했습니다'
  });
};

module.exports = errorHandler;