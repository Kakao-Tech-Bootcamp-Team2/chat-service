const amqp = require('amqplib');
const config = require('./index');
const logger = require('../utils/logger');

class RabbitMQ {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchanges = config.rabbitmq.exchanges;
    this.queues = config.rabbitmq.queues;
  }

  async connect() {
    try {
      // 연결 생성
      this.connection = await amqp.connect(config.rabbitmq.url);
      logger.info('RabbitMQ connected successfully');

      // 채널 생성
      this.channel = await this.connection.createChannel();
      logger.info('RabbitMQ channel created');

      // Exchange 설정
      await this.setupExchanges();
      
      // Queue 설정
      await this.setupQueues();

      // 연결 에러 핸들링
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.reconnect();
      });

      return this.channel;
    } catch (error) {
      logger.error('RabbitMQ setup error:', error);
      throw error;
    }
  }

  async setupExchanges() {
    try {
      // Dead Letter Exchange 설정
      await this.channel.assertExchange('dlx', 'fanout', {
        durable: true,
        autoDelete: false
      });

      // 채팅 Exchange 설정
      await this.channel.assertExchange(
        this.exchanges.chat,
        'topic',
        {
          durable: true,
          autoDelete: false,
          alternateExchange: 'dlx',
          arguments: {
            'x-delayed-type': 'topic'
          }
        }
      );

      // 알림 Exchange 설정
      await this.channel.assertExchange(
        this.exchanges.notification,
        'fanout',
        {
          durable: true,
          autoDelete: false,
          alternateExchange: 'dlx'
        }
      );

      // Dead Letter Queue 설정
      await this.channel.assertQueue('dead-letter-queue', {
        durable: true,
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24시간
          'x-max-length': 10000
        }
      });

      // Dead Letter Queue를 Dead Letter Exchange에 바인딩
      await this.channel.bindQueue(
        'dead-letter-queue',
        'dlx',
        ''
      );

      logger.info('RabbitMQ exchanges setup completed');
    } catch (error) {
      logger.error('RabbitMQ exchanges setup error:', error);
      throw error;
    }
  }

  async setupQueues() {
    try {
      // 메시지 큐 설정
      await this.channel.assertQueue(this.queues.message, {
        durable: true,
        deadLetterExchange: 'dlx',
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24시간
          'x-max-length': 10000,
          'x-overflow': 'reject-publish'
        }
      });

      // 알림 큐 설정
      await this.channel.assertQueue(this.queues.notification, {
        durable: true,
        deadLetterExchange: 'dlx',
        arguments: {
          'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // 7일
          'x-max-length': 50000,
          'x-overflow': 'reject-publish'
        }
      });

      // 바인딩 설정
      await this.channel.bindQueue(
        this.queues.message,
        this.exchanges.chat,
        'message.*'
      );

      await this.channel.bindQueue(
        this.queues.notification,
        this.exchanges.notification,
        ''
      );

      logger.info('RabbitMQ queues setup completed');
    } catch (error) {
      logger.error('RabbitMQ queues setup error:', error);
      throw error;
    }
  }

  async reconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }

      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          logger.error('RabbitMQ reconnection error:', error);
        }
      }, 5000); // 5초 후 재연결 시도
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
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel.ack(msg);
        } catch (error) {
          logger.error('Message consumption error:', error);
          // 메시지 처리 실패 시 dead letter queue로 이동
          this.channel.nack(msg, false, false);
        }
      });

      logger.info(`Consumer started for queue: ${queue}`);
    } catch (error) {
      logger.error('Message consumer setup error:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('RabbitMQ closing error:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQ();