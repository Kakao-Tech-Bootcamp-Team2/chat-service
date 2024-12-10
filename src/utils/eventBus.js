const amqp = require('amqplib');
const config = require('../config');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.responseEmitter = new Map();
    this.correlationId = 0;
  }

  async initialize() {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();
      
      // 응답을 받기 위한 전용 큐 생성
      const { queue: replyQueue } = await this.channel.assertQueue('', { 
        exclusive: true 
      });
      
      // 응답 처리
      this.channel.consume(replyQueue, (msg) => {
        const correlationId = msg.properties.correlationId;
        const handler = this.responseEmitter.get(correlationId);
        
        if (handler) {
          handler.resolve(JSON.parse(msg.content.toString()));
          this.responseEmitter.delete(correlationId);
        }
      }, { noAck: true });

      this.replyQueue = replyQueue;
      logger.info('EventBus initialized successfully');
    } catch (error) {
      logger.error('EventBus initialization error:', error);
      throw error;
    }
  }

  async publish(event, data) {
    try {
      if (!this.channel) {
        throw new Error('EventBus not initialized');
      }

      await this.channel.publish(
        config.rabbitmq.exchanges.chat,
        event,
        Buffer.from(JSON.stringify(data)),
        {
          persistent: true,
          timestamp: Date.now(),
          headers: {
            service: 'chat-service',
            event
          }
        }
      );

      logger.debug(`Event published: ${event}`, { data });
    } catch (error) {
      logger.error(`Event publish error: ${event}`, error);
      throw error;
    }
  }

  async subscribe(event, handler) {
    try {
      if (!this.channel) {
        throw new Error('EventBus not initialized');
      }

      const { queue } = await this.channel.assertQueue(
        `chat_service_${event}`,
        { durable: true }
      );

      await this.channel.bindQueue(
        queue,
        config.rabbitmq.exchanges.chat,
        event
      );

      await this.channel.consume(queue, async (msg) => {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel.ack(msg);
        } catch (error) {
          logger.error(`Event handling error: ${event}`, error);
          this.channel.nack(msg, false, false);
        }
      });

      logger.debug(`Subscribed to event: ${event}`);
    } catch (error) {
      logger.error(`Event subscribe error: ${event}`, error);
      throw error;
    }
  }

  async request(event, data) {
    try {
      const correlationId = (this.correlationId++).toString();
      
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.responseEmitter.delete(correlationId);
          reject(new Error('Request timeout'));
        }, 5000);

        this.responseEmitter.set(correlationId, { resolve, timeout });
      });

      await this.channel.publish(
        config.rabbitmq.exchanges.chat,
        event,
        Buffer.from(JSON.stringify(data)),
        {
          correlationId,
          replyTo: this.replyQueue,
          timestamp: Date.now(),
          headers: {
            service: 'chat-service',
            event
          }
        }
      );

      return promise;
    } catch (error) {
      logger.error(`Request error: ${event}`, error);
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
      logger.info('EventBus closed successfully');
    } catch (error) {
      logger.error('EventBus close error:', error);
      throw error;
    }
  }
}

module.exports = new EventBus();