import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RenderJob } from './types';

/**
 * ==================================================================================
 * QUEUE CONFIGURATION (BullMQ)
 * ==================================================================================
 * This file configures the connection to Redis and initializes the main render
 * queue for processing video jobs.
 *
 * The Redis connection options include `maxRetriesPerRequest: null`, which is
 * recommended by BullMQ to handle Redis availability issues gracefully. BullMQ
.
 * itself will manage job-level retries.
 * ==================================================================================
 */

const QUEUE_NAME = 'RenderQueue';

// Ensure REDIS_URL is set in your environment variables
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// BullMQ recommends this setting for robust Redis connection handling.
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

/**
 * The main queue for processing video rendering jobs.
 * It's typed with the 'RenderJob' interface to ensure all jobs sent to this
 * queue have the correct data structure.
 */
export const renderQueue = new Queue<RenderJob>(QUEUE_NAME, { connection });

console.log(`Render queue "${QUEUE_NAME}" initialized.`);
