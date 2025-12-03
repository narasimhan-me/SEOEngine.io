// apps/api/src/infra/redis/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisClient } from './redis.provider';
import { RedisHealthService } from './redis.health';

@Module({
  providers: [RedisClient, RedisHealthService],
  exports: [RedisClient, RedisHealthService],
})
export class RedisModule {}
