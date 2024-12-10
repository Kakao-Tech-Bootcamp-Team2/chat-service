const auth = require('./auth');
const error = require('./error');
const validator = require('./validator');
const logger = require('./logger');
const cors = require('./cors');

module.exports = {
  auth,
  error,
  validator,
  logger,
  cors
};