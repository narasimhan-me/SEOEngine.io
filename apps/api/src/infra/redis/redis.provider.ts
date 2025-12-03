// apps/api/src/infra/redis/redis.provider.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { redisConfig } from '../../config/redis.config';

@Injectable()
export class RedisClient implements OnModuleDestroy {
  private readonly logger = new Logger(RedisClient.name);
  private client: Redis | null = null;

  /**
   * Lazily create and return the shared Redis client.
   * Uses REDIS_URL (Upstash TLS URL in production; localhost in dev).
   */
  getClient(): Redis | null {
    if (!redisConfig.isEnabled || !redisConfig.url) {
      this.logger.warn('[RedisClient] Redis not configured - client disabled');
      return null;
    }

    if (!this.client) {
      this.client = new Redis(redisConfig.url);
      this.logger.log('[RedisClient] Redis client initialized');
    }

    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('[RedisClient] Redis client connection closed');
      } catch (err) {
        this.logger.error('[RedisClient] Error while closing Redis client', err as Error);
      } finally {
        this.client = null;
      }
    }
  }
}
