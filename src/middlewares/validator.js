const { ValidationError } = require('../utils/errors');

const validator = {
  body: (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));
          throw new ValidationError('입력값 검증 실패', errors);
        }

        req.body = value;
        next();
      } catch (error) {
        next(error);
      }
    };
  },

  query: (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));
          throw new ValidationError('쿼리 파라미터 검증 실패', errors);
        }

        req.query = value;
        next();
      } catch (error) {
        next(error);
      }
    };
  },

  params: (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));
          throw new ValidationError('URL 파라미터 검증 실패', errors);
        }

        req.params = value;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
};

module.exports = validator;