import { Worker, Job } from 'bullmq';
import path from 'path';
import os from 'os';
import { connection } from '../core/queue';
import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RenderJob } from '../core/types';
import { logError, logInfo } from '../core/logging';
import { validateRuntimeEnv } from '../config/env';

validateRuntimeEnv('worker');

const QUEUE_NAME = 'RenderQueue';
const processorPath = path.join(__dirname, 'render-processor.ts');

export const renderWorker = new Worker<RenderJob>(QUEUE_NAME, processorPath, {
  connection,
  concurrency: os.cpus().length,
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  runInBand: process.env.NODE_ENV === 'test',
});

logInfo('Render worker started.', { phase: 'worker_startup', concurrency: os.cpus().length });

renderWorker.on('active', (job) => {
  logInfo('Job dequeued and active.', {
    phase: 'dequeue',
    jobId: job.id,
    requestId: job.data.requestId,
    correlationId: job.data.requestId,
    niche: job.data.nicheSlug,
  });
});

renderWorker.on('completed', async (job: Job<RenderJob>, result: string) => {
  logInfo('Job completed.', {
    phase: 'job_completed',
    jobId: job.id,
    requestId: job.data.requestId,
    correlationId: job.data.requestId,
    niche: job.data.nicheSlug,
    result,
  });

  try {
    if (process.env.SKIP_DB !== 'true') {
      await db
        .update(videos)
        .set({
          status: 'published',
          videoUrl: result,
          publishedAt: new Date(),
        })
        .where(eq(videos.id, job.data.videoId));

      logInfo('Database updated to published.', {
        phase: 'db_update',
        jobId: job.id,
        requestId: job.data.requestId,
        correlationId: job.data.requestId,
        niche: job.data.nicheSlug,
      });
    } else {
      logInfo('SKIP_DB is true, skipping DB update to published.', { phase: 'db_update_skipped', jobId: job.id });
    }
  } catch (error) {
    const dbError = error as Error;
    logError('Failed to update DB on completion.', {
      phase: 'db_update_error',
      jobId: job.id,
      requestId: job.data.requestId,
      correlationId: job.data.requestId,
      niche: job.data.nicheSlug,
      errorType: dbError.name,
      errorMessage: dbError.message,
      stack: dbError.stack,
    });
  }
});

renderWorker.on('failed', async (job, error) => {
  const attemptsAllowed = job?.opts.attempts ?? 1;
  const attemptsMade = job?.attemptsMade ?? 0;

  logError('Job failed.', {
    phase: 'job_failed',
    jobId: job?.id,
    requestId: job?.data.requestId,
    correlationId: job?.data.requestId,
    niche: job?.data.nicheSlug,
    errorType: error.name,
    errorMessage: error.message,
    stack: error.stack,
    attemptsMade,
    attemptsAllowed,
  });

  if (job && attemptsMade >= attemptsAllowed) {
    try {
      if (process.env.SKIP_DB !== 'true') {
        await db.update(videos).set({ status: 'error' }).where(eq(videos.id, job.data.videoId));
        logInfo('Database updated to error after terminal failure.', {
          phase: 'db_update_terminal_error',
          jobId: job.id,
          requestId: job.data.requestId,
          correlationId: job.data.requestId,
          niche: job.data.nicheSlug,
        });
      } else {
        logInfo('SKIP_DB is true, skipping DB update to error.', { phase: 'db_update_terminal_error_skipped', jobId: job.id });
      }
    } catch (dbError) {
      const terminalDbError = dbError as Error;
      logError('Failed to update DB after terminal failure.', {
        phase: 'db_update_terminal_error_failed',
        jobId: job.id,
        requestId: job.data.requestId,
        correlationId: job.data.requestId,
        niche: job.data.nicheSlug,
        errorType: terminalDbError.name,
        errorMessage: terminalDbError.message,
        stack: terminalDbError.stack,
      });
    }
  }
});
