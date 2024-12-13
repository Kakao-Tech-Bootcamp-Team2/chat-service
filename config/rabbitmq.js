// config/rabbitmq.js
const amqp = require("amqplib");

const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL,
};

let channel = null;

async function initializeRabbitMQ() {
  try {
    // URL 형식으로 연결 설정
    const connectionURL = `${RABBITMQ_CONFIG.url}`;

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
