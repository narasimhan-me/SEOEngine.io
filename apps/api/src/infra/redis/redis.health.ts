// apps/api/src/infra/redis/redis.health.ts
import { Injectable } from '@nestjs/common';
import { RedisClient } from './redis.provider';

@Injectable()
export class RedisHealthService {
  constructor(private readonly redisClient: RedisClient) {}

  /**
   * Simple Redis ping check.
   * Returns true if PING returns "PONG", false otherwise.
   */
  async ping(): Promise<boolean> {
    const client = this.redisClient.getClient();
    if (!client) return false;

    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
