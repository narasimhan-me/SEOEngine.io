// apps/api/src/queues/queues.ts
import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config';

// Only create the queues if Redis is configured
export const deoScoreQueue: Queue | null =
  redisConfig.isEnabled && redisConfig.connection
    ? new Queue('deo_score_queue', {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      })
    : null;

export const crawlQueue: Queue | null =
  redisConfig.isEnabled && redisConfig.connection
    ? new Queue('crawl_queue', {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      })
    : null;

export const answerBlockAutomationQueue: Queue | null =
  redisConfig.isEnabled && redisConfig.connection
    ? new Queue('answer_block_automation_queue', {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      })
    : null;

export const playbookRunQueue: Queue | null =
  redisConfig.isEnabled && redisConfig.connection
    ? new Queue('automation_playbook_run_queue', {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      })
    : null;

if (!redisConfig.isEnabled) {
  console.warn('[Queues] Redis not configured - queue functionality disabled');
} else {
  console.log(
    '[Queues] Redis queues initialized with host:',
    redisConfig.connection?.host
  );
}
