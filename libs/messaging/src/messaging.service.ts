import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, ChannelModel, ConfirmChannel } from 'amqplib';
import {
  PAYMENT_EXCHANGE,
  PAYMENT_QUEUE,
  PAYMENT_ROUTING_KEYS,
  QUEUE_PREFETCH_COUNT,
  PaymentJobDto,
} from '@app/common';
import { EnvironmentVariables } from '@app/config';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connected = false;

  constructor(private readonly config: ConfigService<EnvironmentVariables>) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect(
      this.config.getOrThrow('rabbitmq.url', { infer: true }),
    );
    this.channel = await this.connection.createConfirmChannel();
    await this.setupTopology();
    this.connected = true;
    this.logger.log('RabbitMQ connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.connected = false;
  }

  isHealthy(): boolean {
    return this.connected;
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
      await new Promise<void>((resolve) => this.channel?.once('drain', resolve));
    }

    await this.channel.waitForConfirms();
  }

  async consumePaymentJobs(
    handler: (job: PaymentJobDto) => Promise<'ack' | 'requeue' | 'reject'>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    await this.channel.prefetch(QUEUE_PREFETCH_COUNT);
    await this.channel.consume(PAYMENT_QUEUE, async (message) => {
      if (!message) {
        return;
      }

      try {
        const job = JSON.parse(message.content.toString()) as PaymentJobDto;
        const outcome = await handler(job);

        if (outcome === 'ack') {
          this.channel?.ack(message);
        } else if (outcome === 'requeue') {
          this.channel?.nack(message, false, true);
        } else {
          this.channel?.nack(message, false, false);
        }
      } catch (error) {
        this.logger.error(`Payment message failed: ${String(error)}`);
        this.channel?.nack(message, false, true);
      }
    });
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
