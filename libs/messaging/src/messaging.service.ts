import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { connect, Channel, Connection } from 'amqplib';
import {
  PAYMENT_EXCHANGE,
  PAYMENT_QUEUE,
  PAYMENT_ROUTING_KEYS,
  PaymentJobDto,
} from '@app/common';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private connection?: Connection;
  private channel?: Channel;

  async onModuleInit(): Promise<void> {
    this.connection = await connect(
      process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
    );
    this.channel = await this.connection.createChannel();
    await this.setupTopology();
    this.logger.log('RabbitMQ connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publishPaymentJob(job: PaymentJobDto): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const published = this.channel.publish(
      PAYMENT_EXCHANGE,
      PAYMENT_ROUTING_KEYS.process,
      Buffer.from(JSON.stringify(job)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        persistent: true,
        messageId: job.paymentId,
      },
    );

    if (!published) {
      await new Promise<void>((resolve) => {
        this.channel?.once('drain', resolve);
      });
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    await this.channel.assertExchange(PAYMENT_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(PAYMENT_QUEUE, {
      durable: true,
    });
    await this.channel.bindQueue(
      PAYMENT_QUEUE,
      PAYMENT_EXCHANGE,
      PAYMENT_ROUTING_KEYS.process,
    );
  }
}
