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
  PAYMENT_DEAD_LETTER_EXCHANGE,
  PAYMENT_DEAD_LETTER_QUEUE,
  PAYMENT_QUEUE,
  PAYMENT_RETRY_EXCHANGE,
  PAYMENT_RETRY_QUEUES,
  PAYMENT_ROUTING_KEYS,
  QUEUE_PREFETCH_COUNT,
  PaymentJobDto,
} from '@app/common';
import { ErrorCode } from '@app/common';
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
      throw new Error(ErrorCode.RABBITMQ_CHANNEL_NOT_INITIALIZED);
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

  async publishPaymentRetry(
    job: PaymentJobDto,
    delayMs: number,
    headers: Record<string, unknown>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error(ErrorCode.RABBITMQ_CHANNEL_NOT_INITIALIZED);
    }

    const retryQueue =
      PAYMENT_RETRY_QUEUES.find((queue) => queue.delayMs >= delayMs) ??
      PAYMENT_RETRY_QUEUES[PAYMENT_RETRY_QUEUES.length - 1];
    if (!retryQueue) {
      throw new Error(ErrorCode.RABBITMQ_RETRY_TOPOLOGY_NOT_CONFIGURED);
    }
    const published = this.channel.publish(
      PAYMENT_RETRY_EXCHANGE,
      retryQueue.name,
      Buffer.from(JSON.stringify(job)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        persistent: true,
        messageId: job.paymentId,
        headers,
      },
    );

    if (!published) {
      await new Promise<void>((resolve) => this.channel?.once('drain', resolve));
    }
    await this.channel.waitForConfirms();
  }

  async publishPaymentDeadLetter(
    job: PaymentJobDto,
    headers: Record<string, unknown>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error(ErrorCode.RABBITMQ_CHANNEL_NOT_INITIALIZED);
    }

    const published = this.channel.publish(
      PAYMENT_DEAD_LETTER_EXCHANGE,
      PAYMENT_ROUTING_KEYS.deadLetter,
      Buffer.from(JSON.stringify(job)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        persistent: true,
        messageId: job.paymentId,
        headers,
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
      throw new Error(ErrorCode.RABBITMQ_CHANNEL_NOT_INITIALIZED);
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
      throw new Error(ErrorCode.RABBITMQ_CHANNEL_NOT_INITIALIZED);
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

    await this.channel.assertExchange(PAYMENT_RETRY_EXCHANGE, 'direct', {
      durable: true,
    });
    for (const retryQueue of PAYMENT_RETRY_QUEUES) {
      await this.channel.assertQueue(retryQueue.name, {
        durable: true,
        arguments: {
          'x-message-ttl': retryQueue.delayMs,
          'x-dead-letter-exchange': PAYMENT_EXCHANGE,
          'x-dead-letter-routing-key': PAYMENT_ROUTING_KEYS.process,
        },
      });
      await this.channel.bindQueue(
        retryQueue.name,
        PAYMENT_RETRY_EXCHANGE,
        retryQueue.name,
      );
    }

    await this.channel.assertExchange(PAYMENT_DEAD_LETTER_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(PAYMENT_DEAD_LETTER_QUEUE, {
      durable: true,
    });
    await this.channel.bindQueue(
      PAYMENT_DEAD_LETTER_QUEUE,
      PAYMENT_DEAD_LETTER_EXCHANGE,
      PAYMENT_ROUTING_KEYS.deadLetter,
    );
  }
}
