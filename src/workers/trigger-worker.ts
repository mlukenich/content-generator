import { Worker, Job } from 'bullmq';
import { connection } from '../core/queue';
import { VideoOrchestrator } from '../services/VideoOrchestrator';
import { availableNiches, findNicheByInput } from '../config/NicheDefinitions';
import { logInfo, logError } from '../core/logging';

const QUEUE_NAME = 'RenderQueue';
const orchestrator = new VideoOrchestrator();

/**
 * TriggerWorker handles 'automated-trigger' jobs.
 * These are scheduled repeatable jobs that fire once a day per niche.
 */
export const triggerWorker = new Worker(QUEUE_NAME, async (job: Job) => {
  if (job.name !== 'automated-trigger') return;

  const { nicheSlug } = job.data;
  const requestId = `auto-${Date.now()}`;

  logInfo('Automated trigger worker activated.', { 
    phase: 'auto_trigger_start', 
    niche: nicheSlug 
  });

  const { matchedNiche } = findNicheByInput(nicheSlug);

  if (!matchedNiche) {
    throw new Error(`Automated trigger failed: Niche '${nicheSlug}' not found.`);
  }

  await orchestrator.triggerGeneration({
    requestId,
    nicheConfig: matchedNiche,
    topic: 'daily viral update', // Default daily topic
    publishPlatform: 'youtube', // Default to YouTube for automation
  });

  logInfo('Automated trigger successful.', { 
    phase: 'auto_trigger_success', 
    niche: nicheSlug 
  });
}, {
  connection,
});

logInfo('Trigger worker started.', { phase: 'trigger_worker_startup' });
