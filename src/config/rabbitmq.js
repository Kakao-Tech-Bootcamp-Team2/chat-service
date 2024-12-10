const amqp = require('amqplib');
const config = require('./index');
const logger = require('../utils/logger');

class RabbitMQ {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchanges = config.rabbitmq.exchanges;
    this.queues = config.rabbitmq.queues;
    this.isInitialized = false;
  }

  async connect() {
    try {
      if (this.isInitialized) {
        logger.warn('RabbitMQ is already initialized');
        return this.channel;
      }

      // 기본 vhost를 사용하도록 URL 수정
      const connectionUrl = config.rabbitmq.url.replace('vhost=chat', 'vhost=/');
      
      // 연결 생성
      this.connection = await amqp.connect(connectionUrl);
      logger.info('RabbitMQ connected successfully');

      // 채널 생성
      this.channel = await this.connection.createChannel();
      logger.info('RabbitMQ channel created');

      // Exchange와 Queue 설정
      await this.initializeInfrastructure();

      // 연결 에러 핸들링
      this.setupErrorHandlers();

      this.isInitialized = true;
      return this.channel;
    } catch (error) {
      logger.error('RabbitMQ setup error:', error);
      throw error;
    }
  }

  async initializeInfrastructure() {
    try {
      // 1. DLX (Dead Letter Exchange) 설정
      await this.channel.assertExchange('dlx', 'fanout', {
        durable: true
      });
      logger.info('Dead Letter Exchange created');

      // 2. Dead Letter Queue 설정
      await this.channel.assertQueue('dead-letter-queue', {
        durable: true,
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24시간
          'x-max-length': 10000
        }
      });
      logger.info('Dead Letter Queue created');

      // 3. DLX와 Dead Letter Queue 바인딩
      await this.channel.bindQueue('dead-letter-queue', 'dlx', '');
      logger.info('Dead Letter binding completed');

      // 4. 채팅 Exchange 설정
      await this.channel.assertExchange(this.exchanges.chat, 'topic', {
        durable: true,
        alternateExchange: 'dlx'
      });
      logger.info('Chat Exchange created');

      // 5. 알림 Exchange 설정
      await this.channel.assertExchange(this.exchanges.notification, 'fanout', {
        durable: true,
        alternateExchange: 'dlx'
      });
      logger.info('Notification Exchange created');

      // 6. 메시지 큐 설정
      await this.channel.assertQueue(this.queues.message, {
        durable: true,
        deadLetterExchange: 'dlx',
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000,
          'x-max-length': 10000
        }
      });
      logger.info('Message Queue created');

      // 7. 알림 큐 설정
      await this.channel.assertQueue(this.queues.notification, {
        durable: true,
        deadLetterExchange: 'dlx',
        arguments: {
          'x-message-ttl': 7 * 24 * 60 * 60 * 1000,
          'x-max-length': 50000
        }
      });
      logger.info('Notification Queue created');

      // 8. 큐 바인딩
      await this.channel.bindQueue(this.queues.message, this.exchanges.chat, 'message.*');
      await this.channel.bindQueue(this.queues.notification, this.exchanges.notification, '');
      logger.info('Queue bindings completed');

    } catch (error) {
      logger.error('Failed to initialize RabbitMQ infrastructure:', error);
      throw error;
    }
  }

  setupErrorHandlers() {
    this.connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      this.reconnect();
    });

    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      this.reconnect();
    });

    this.channel.on('error', (err) => {
      logger.error('RabbitMQ channel error:', err);
    });

    this.channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
    });
  }

  async reconnect() {
    try {
      this.isInitialized = false;
      await this.close();
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          logger.error('RabbitMQ reconnection failed:', error);
        }
      }, 5000);
    } catch (error) {
      logger.error('RabbitMQ reconnection error:', error);
    }
  }

  async publishMessage(exchange, routingKey, message) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          timestamp: Date.now(),
          contentType: 'application/json',
        }
      );
      logger.debug('Message published:', { exchange, routingKey });
    } catch (error) {
      logger.error('Message publishing error:', error);
      throw error;
    }
  }

  async consumeMessages(queue, handler) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.consume(queue, async (msg) => {
        if (msg === null) {
          logger.warn('Consumer cancelled by server');
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel.ack(msg);
        } catch (error) {
          logger.error('Message consumption error:', error);
          this.channel.nack(msg, false, false);
        }
      });
      logger.info(`Consumer started for queue: ${queue}`);
    } catch (error) {
      logger.error('Consumer setup error:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('RabbitMQ closing error:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQ();