import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RenderJob } from './types';
import { logInfo } from './logging';

/**
 * ==================================================================================
 * QUEUE CONFIGURATION (BullMQ)
 * ==================================================================================
 */

const QUEUE_NAME = 'RenderQueue';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const renderQueue = new Queue<RenderJob>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

logInfo('Render queue initialized.', { phase: 'queue_init', queueName: QUEUE_NAME, redisUrl });
