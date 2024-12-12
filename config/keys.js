// chat-service/config/keys.js
require("dotenv").config();

require("dotenv").config();

module.exports = {
  mongoURI: process.env.MONGO_URI,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  jwtSecret: process.env.JWT_SECRET,
  apiGatewayUrl: process.env.API_GATEWAY_URL,
};
