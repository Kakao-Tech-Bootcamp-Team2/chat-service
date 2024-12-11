const Joi = require('joi');

const schemas = {
  message: Joi.object({
    content: Joi.string()
      .max(10000)
      .required()
      .when('type', {
        is: 'text',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    type: Joi.string()
      .valid('text', 'image', 'file', 'system')
      .default('text'),
    mentions: Joi.array()
      .items(Joi.string())
      .max(50),
    file: Joi.object({
      name: Joi.string().required(),
      type: Joi.string().required(),
      size: Joi.number().max(10 * 1024 * 1024) // 10MB
    }).when('type', {
      is: Joi.valid('image', 'file'),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    roomId: Joi.string().required()
  }),

  reaction: Joi.object({
    reaction: Joi.string()
      .required()
      .max(10)
  }),

  messageUpdate: Joi.object({
    content: Joi.string()
      .required()
      .max(10000)
  }),

  messageQuery: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50),
    before: Joi.date(),
    after: Joi.date()
  }),

  messageRead: Joi.object({
    messageIds: Joi.array().items(Joi.string()).required()
  })
};

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError('Validation failed', errors);
  }

  return value;
};

module.exports = {
  schemas,
  validate
};