import { renderQueue } from '../core/queue';
import { RenderJob } from '../core/types';

/**
 * ==================================================================================
 * QUEUE SERVICE
 * ==================================================================================
 * This service provides a simple, centralized interface for adding jobs to the
 * render queue. It abstracts the BullMQ-specific logic away from the main
 * application flow (e.g., from the API layer that receives the initial request).
 *
 * It also defines the job-level retry strategy.
 * ==================================================================================
 */

export class QueueService {
  /**
   * Enqueues a new video render job.
   *
   * @param jobData - The data required for the render job.
   * @returns The newly created job instance.
   */
  public async enqueue(jobData: RenderJob) {
    console.log(`Enqueueing render job for video ID: ${jobData.videoId}`);
    
    const job = await renderQueue.add(`render-video-${jobData.videoId}`, jobData, {
      attempts: 3, // Maximum of 3 retries
      backoff: {
        type: 'exponential',
        delay: 5000, // Initial delay of 5 seconds
      },
    });

    console.log(`Job ${job.id} enqueued successfully.`);
    return job;
  }
}
