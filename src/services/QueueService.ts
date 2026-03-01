import { JobsOptions } from 'bullmq';
import { renderQueue } from '../core/queue';
import { RenderJob } from '../core/types';
import { logError, logInfo } from '../core/logging';

/**
 * Queue service for enqueue boundaries and idempotent trigger behavior.
 */
export class QueueService {
  public async enqueue(jobData: RenderJob) {
    const start = Date.now();
    const jobId = jobData.logicalRequestId;

    logInfo('Attempting queue enqueue.', {
      phase: 'enqueue_start',
      requestId: jobData.requestId,
      correlationId: jobData.requestId,
      niche: jobData.nicheSlug,
      logicalRequestId: jobData.logicalRequestId,
    });

    const existingJob = await renderQueue.getJob(jobId);
    if (existingJob) {
      logInfo('Existing job found for logical request; reusing.', {
        phase: 'enqueue_dedup_hit',
        requestId: jobData.requestId,
        correlationId: jobData.requestId,
        jobId: existingJob.id,
        niche: jobData.nicheSlug,
        durationMs: Date.now() - start,
      });
      return existingJob;
    }

    const options: JobsOptions = {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    };

    try {
      const job = await renderQueue.add(`render-video-${jobData.videoId}`, jobData, options);
      logInfo('Job enqueued.', {
        phase: 'enqueue_success',
        requestId: jobData.requestId,
        correlationId: jobData.requestId,
        jobId: job.id,
        niche: jobData.nicheSlug,
        durationMs: Date.now() - start,
      });
      return job;
    } catch (error) {
      const queueError = error as Error;
      logError('Queue enqueue failed.', {
        phase: 'enqueue_error',
        requestId: jobData.requestId,
        correlationId: jobData.requestId,
        niche: jobData.nicheSlug,
        durationMs: Date.now() - start,
        errorType: queueError.name,
        errorMessage: queueError.message,
      });
      throw error;
    }
  }
}
