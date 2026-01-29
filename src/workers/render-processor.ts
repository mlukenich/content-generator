import { Job } from 'bullmq';
import { RenderJob } from '../core/types';
import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * ==================================================================================
 * RENDER PROCESSOR (Sandboxed)
 * ==================================================================================
 * This is the core logic for the render worker. It runs in a separate, sandboxed
 * process for each job, ensuring isolation and preventing CPU-intensive render
 * tasks from blocking the main application event loop.
 *
 * It simulates a full render pipeline:
 * 1. Fetches render data from the database.
 * 2. Updates progress.
 * 3. Invokes the Remotion CLI to render the video.
 * 4. Returns the path to the final rendered video.
 * ==================================================================================
 */
export default async function (job: Job<RenderJob>) {
  const { videoId, outputDestination } = job.data;
  console.log(`[JOB ${job.id}] Starting render for video ID: ${videoId}`);

  // 1. Fetch the RenderManifest from the database
  await job.updateProgress(10);
  console.log(`[JOB ${job.id}] Fetching render manifest...`);

  const videoRecord = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
  });

  if (!videoRecord || !videoRecord.renderManifestJson) {
    throw new Error(`[JOB ${job.id}] No video record or render manifest found for ID: ${videoId}`);
  }

  // The manifest is stored as a JSON object, so we cast it.
  // In a real app, you might use Zod to validate this.
  const renderManifest = videoRecord.renderManifestJson as any;

  // 2. Simulate asset fetching (e.g., downloading from a remote URL)
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  await job.updateProgress(30);
  console.log(`[JOB ${job.id}] All assets fetched.`);

  // 3. Trigger Remotion render using the CLI
  // In a real-world scenario, you would use @remotion/lambda for cloud rendering
  // or a more robust local rendering setup.
  console.log(`[JOB ${job.id}] Invoking Remotion CLI...`);
  await job.updateProgress(50);

  const compositionId = 'NovaVideo';
  // NOTE: The Remotion entry point could be made configurable.
  const remotionEntry = 'src/remotion/Root.tsx';
  
  // Write props to a temporary file to avoid command-line length limits and escaping issues
  const propsFilePath = path.join(os.tmpdir(), `render-props-${job.id}.json`);
  await writeFile(propsFilePath, JSON.stringify(renderManifest));

  const command = `npx remotion render ${remotionEntry} ${compositionId} ${outputDestination} --props="${propsFilePath.replace(/\\/g, '/')}"`;

  try {
    // This command can take a long time.
    const { stdout, stderr } = await execAsync(command);
    console.log(`[JOB ${job.id}] Remotion render stdout:`, stdout);
    if (stderr) {
      console.error(`[JOB ${job.id}] Remotion render stderr:`, stderr);
    }
  } catch (error) {
    console.error(`[JOB ${job.id}] Failed to execute Remotion CLI:`, error);
    throw new Error('Remotion render failed.');
  } finally {
      // Clean up the temporary props file
      try {
          await unlink(propsFilePath);
      } catch (cleanupError) {
          console.warn(`[JOB ${job.id}] Failed to delete temp props file:`, cleanupError);
      }
  }

  await job.updateProgress(100);
  console.log(`[JOB ${job.id}] Render completed successfully.`);

  // Return the path to the rendered video
  return outputDestination;
};
