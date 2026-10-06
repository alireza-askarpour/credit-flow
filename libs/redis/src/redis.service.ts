import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EnvironmentVariables } from '@app/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService<EnvironmentVariables>) {
    this.client = new Redis(config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<'OK' | null> {
    return this.client.set(key, value, 'EX', ttlSeconds, 'NX');
  }

  delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<'OK'> {
    return this.client.set(key, value, 'EX', ttlSeconds) as Promise<'OK'>;
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
