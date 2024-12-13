const amqp = require("amqplib");

let channel = null;

async function initializeRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
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
