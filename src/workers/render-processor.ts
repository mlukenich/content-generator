import { Job } from 'bullmq';
import { RenderJob } from '../core/types';
import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RenderManifestSchema } from '../core/schema';
import { logError, logInfo } from '../core/logging';
import { GeminiService } from '../services/GeminiService';
import { QuotaService } from '../services/QuotaService';
import { AudioService } from '../services/AudioService';
import { VideoService } from '../services/VideoService';
import { PlatformFactory } from '../platforms/PlatformFactory';

const execAsync = promisify(exec);

export default async function (job: Job<RenderJob>) {
  const startedAt = Date.now();
  const { videoId, outputDestination, requestId, nicheSlug, nicheConfig } = job.data;

  logInfo('Render processor started.', {
    phase: 'processor_start',
    jobId: job.id,
    requestId,
    correlationId: requestId,
    niche: nicheSlug,
  });

  await job.updateProgress(10);
  logInfo('Fetching render manifest.', { phase: 'fetch_manifest', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });

  let renderManifest;

  if (process.env.SKIP_DB === 'true') {
    logInfo('SKIP_DB is true, generating manifest on the fly.', { phase: 'skip_db_manifest_gen', jobId: job.id });
    const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '', new QuotaService());
    const audioService = new AudioService(process.env.ELEVENLABS_API_KEY || '');
    const videoService = new VideoService(audioService);

    const script = await geminiService.generateContent(nicheConfig);
    renderManifest = await videoService.prepareRender(script, videoId);
  } else {
    const videoRecord = await db.query.videos.findFirst({ where: eq(videos.id, videoId) });

    if (!videoRecord || !videoRecord.renderManifestJson) {
      throw new Error(`No video record or render manifest found for ID: ${videoId}`);
    }
    renderManifest = RenderManifestSchema.parse(videoRecord.renderManifestJson);
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await job.updateProgress(30);
  logInfo('Assets fetched.', { phase: 'assets_fetched', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });

  logInfo('Invoking Remotion CLI.', { phase: 'invoke_remotion', jobId: job.id, requestId, correlationId: requestId, niche: nicheSlug });
  await job.updateProgress(50);

  const compositionId = 'NovaVideo';
  const remotionEntry = 'src/remotion/Root.tsx';
  // Use json stringify for props to avoid shell escaping issues
  const command = `bun x remotion render ${remotionEntry} ${compositionId} ${outputDestination} --props='${JSON.stringify(renderManifest)}'`;

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

  // --- NEW: Publishing Phase ---
  if (job.data.publishPlatform) {
    try {
      logInfo('Starting publishing phase.', { 
        phase: 'publish_start', 
        platform: job.data.publishPlatform 
      });
      
      const client = PlatformFactory.createClient(job.data.publishPlatform);
      
      const publishResult = await client.publish({
        title: renderManifest.title,
        description: `Daily ${nicheConfig.name} content. #shorts #${nicheSlug}`,
        hashtags: [nicheSlug, 'ai', 'content'],
        videoFilePath: outputDestination,
      });

      // Update DB with publish result
      if (process.env.SKIP_DB !== 'true') {
        await db.update(videos)
          .set({ 
            status: 'published',
            videoUrl: publishResult,
            publishedAt: new Date()
          })
          .where(eq(videos.id, videoId));
      }

      logInfo('Publishing completed.', { 
        phase: 'publish_success', 
        url: publishResult 
      });
    } catch (error: any) {
      logError('Publishing failed.', {
        phase: 'publish_error',
        errorMessage: error.message
      });
      // We don't throw here to avoid failing the whole job if render was successful
    }
  }

  return outputDestination;
}
