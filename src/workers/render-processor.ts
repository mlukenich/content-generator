import { Job } from 'bullmq';
import { RenderJob } from '../core/types';
import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RenderManifestSchema } from '../core/schema';
import { logError, logInfo } from '../core/logging';

const execAsync = promisify(exec);

export default async function (job: Job<RenderJob>) {
  const startedAt = Date.now();
  const { videoId, outputDestination, requestId, nicheSlug } = job.data;

  logInfo('Render processor started.', {
    phase: 'processor_start',
    jobId: job.id,
    requestId,
    correlationId: requestId,
    niche: nicheSlug,
  });

  await job.updateProgress(10);
  logInfo('Fetching render manifest.', { phase: 'fetch_manifest', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });

  const videoRecord = await db.query.videos.findFirst({ where: eq(videos.id, videoId) });

  if (!videoRecord || !videoRecord.renderManifestJson) {
    throw new Error(`No video record or render manifest found for ID: ${videoId}`);
  }

  const renderManifest = RenderManifestSchema.parse(videoRecord.renderManifestJson);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await job.updateProgress(30);
  logInfo('Assets fetched.', { phase: 'assets_fetched', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });

  logInfo('Invoking Remotion CLI.', { phase: 'invoke_remotion', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });
  await job.updateProgress(50);

  const compositionId = 'NovaVideo';
  const remotionEntry = 'src/remotion/Root.tsx';
  const command = `npx remotion render ${remotionEntry} ${compositionId} ${outputDestination} --props='${JSON.stringify(renderManifest)}'`;

  try {
    const { stdout, stderr } = await execAsync(command);
    logInfo('Remotion render stdout.', { phase: 'remotion_stdout', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug, stdout });
    if (stderr) {
      logError('Remotion render stderr.', {
        phase: 'remotion_stderr',
        jobId: job.id,
        requestId,
        correlationId: requestId,
        niche: nicheSlug,
        errorType: 'RemotionCLIStderr',
        errorMessage: stderr,
      });
    }
  } catch (error) {
    const renderError = error as Error;
    logError('Failed to execute Remotion CLI.', {
      phase: 'remotion_error',
      jobId: job.id,
      requestId,
      correlationId: requestId,
      niche: nicheSlug,
      errorType: renderError.name,
      errorMessage: renderError.message,
      stack: renderError.stack,
    });
    throw new Error('Remotion render failed.');
  }

  await job.updateProgress(100);
  logInfo('Render completed.', {
    phase: 'processor_completed',
    jobId: job.id,
    requestId,
    correlationId: requestId,
    niche: nicheSlug,
    durationMs: Date.now() - startedAt,
  });

  return outputDestination;
}
