import { Queue } from 'bullmq';
import { renderQueue } from '../core/queue';
import { logInfo, logError } from '../core/logging';
import { availableNiches } from '../config/NicheDefinitions';

/**
 * SchedulerService manages automated, recurring video production tasks.
 * It leverages BullMQ's repeatable jobs feature.
 */
export class SchedulerService {
  constructor(private queue: Queue = renderQueue) {}

  /**
   * Schedules a niche for daily production.
   * @param nicheSlug - The slug of the niche to automate.
   * @param hour - The hour of the day (0-23) to trigger.
   */
  public async scheduleDaily(nicheSlug: string, hour: number = 18): Promise<void> {
    const cron = `0 ${hour} * * *`; // Every day at the specified hour
    const jobId = `schedule:${nicheSlug}`;

    logInfo(`Scheduling daily production for niche: ${nicheSlug}`, {
      phase: 'scheduler_setup',
      niche: nicheSlug,
      cron,
    });

    try {
      await this.queue.add(
        'automated-trigger',
        { nicheSlug, isAutomated: true },
        {
          repeat: { pattern: cron },
          jobId,
        }
      );
    } catch (error: any) {
      logError('Failed to schedule niche.', { nicheSlug, errorMessage: error.message });
      throw error;
    }
  }

  /**
   * Lists all currently active automated schedules.
   */
  public async getSchedules() {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    return repeatableJobs.map(job => ({
      id: job.id,
      key: job.key,
      niche: job.name,
      cron: job.pattern,
      nextRun: new Date(job.next).toLocaleString(),
    }));
  }

  /**
   * Removes an automated schedule.
   */
  public async removeSchedule(jobKey: string): Promise<void> {
    await this.queue.removeRepeatableByKey(jobKey);
    logInfo('Schedule removed.', { phase: 'scheduler_remove', jobKey });
  }
}
