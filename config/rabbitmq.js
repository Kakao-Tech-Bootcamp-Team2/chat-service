// config/rabbitmq.js
const amqp = require("amqplib");

const RABBITMQ_CONFIG = {
  protocol: process.env.RABBITMQ_PROTOCOL || "amqp",
  hostname: process.env.RABBITMQ_HOST || "localhost",
  port: process.env.RABBITMQ_PORT || 5672,
  username: process.env.RABBITMQ_USERNAME || "chat_user",
  password: process.env.RABBITMQ_PASSWORD || "chat_pass",
  vhost: process.env.RABBITMQ_VHOST || "chat",
};

let channel = null;

async function initializeRabbitMQ() {
  try {
    // URL 형식으로 연결 설정
    const connectionURL = `${RABBITMQ_CONFIG.protocol}://${RABBITMQ_CONFIG.username}:${RABBITMQ_CONFIG.password}@${RABBITMQ_CONFIG.hostname}:${RABBITMQ_CONFIG.port}/${RABBITMQ_CONFIG.vhost}`;

    const connection = await amqp.connect(connectionURL);
    channel = await connection.createChannel();

    // 연결 에러 핸들링
    connection.on("error", (err) => {
      console.error("RabbitMQ 연결 에러:", err);
    });

    connection.on("close", () => {
      console.log("RabbitMQ 연결이 닫혔습니다. 재연결 시도...");
      setTimeout(initializeRabbitMQ, 5000);
    });

    await channel.assertExchange("chat_messages", "fanout", { durable: true });
    console.log("RabbitMQ 연결 성공");

    return channel;
  } catch (error) {
    console.error("RabbitMQ 초기화 에러:", error);
    console.log("5초 후 재연결 시도...");
    setTimeout(initializeRabbitMQ, 5000);
  }
}

function getChannel() {
  return channel;
}

module.exports = { initializeRabbitMQ, getChannel };
