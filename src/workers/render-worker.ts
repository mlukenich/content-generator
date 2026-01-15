import { Worker, Job } from 'bullmq';
import path from 'path';
import os from 'os';
import { connection } from '../core/queue';
import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RenderJob } from '../core/types';

/**
 * ==================================================================================
 * RENDER WORKER INITIALIZATION
 * ==================================================================================
 * This file initializes the BullMQ Worker, which is responsible for processing
 * jobs from the 'RenderQueue'.
 *
 * - Sandboxed Process: It points to the 'render-processor.ts' file, which will
 *   be executed in a separate, sandboxed process for each job.
 * - Concurrency: The number of concurrent jobs is set to the number of available
 *   CPU cores, optimizing resource usage.
 * - Event Listeners: It listens for 'completed' and 'failed' events to update
 *   the video's status in the PostgreSQL database.
 * ==================================================================================
 */

const QUEUE_NAME = 'RenderQueue';
const processorPath = path.join(__dirname, 'render-processor.ts');

export const renderWorker = new Worker<RenderJob>(QUEUE_NAME, processorPath, {
  connection,
  concurrency: os.cpus().length, // Process one job per core
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  runInBand: process.env.NODE_ENV === "test", // Run jobs in-process for testing
});

console.log(`Render worker started. Concurrency: ${os.cpus().length}`);

// --- EVENT LISTENERS ---

renderWorker.on('completed', async (job: Job<RenderJob>, result: string) => {
  console.log(`[JOB ${job.id}] COMPLETED. Result: ${result}`);
  // Update the video record in the database with the final video URL and 'published' status
  try {
    await db
      .update(videos)
      .set({
        status: 'published', // Or 'ready_to_publish'
        videoUrl: result, // The return value from the processor is the file path
        publishedAt: new Date(),
      })
      .where(eq(videos.id, job.data.videoId));
    console.log(`[JOB ${job.id}] Database updated to 'published' for video ID: ${job.data.videoId}`);
  } catch (error) {
    console.error(`[JOB ${job.id}] FAILED to update database on completion:`, error);
  }
});

renderWorker.on('failed', async (job, error) => {
  console.error(`[JOB ${job?.id}] FAILED. Error: ${error.message}`);
  if (job) {
    // If the job has failed all its attempts, mark it as 'error' in the database
    if (job.attemptsMade >= job.opts.attempts!) {
        try {
            await db
              .update(videos)
              .set({ status: 'error' })
              .where(eq(videos.id, job.data.videoId));
            console.log(`[JOB ${job.id}] Database updated to 'error' for video ID: ${job.data.videoId}`);
        } catch (dbError) {
            console.error(`[JOB ${job.id}] FAILED to update database on final failure:`, dbError);
        }
    }
  }
});
