import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { renderQueue } from './core/queue';
import { db } from './db/connection';
import { videos, niches } from './db/schema';
import { eq } from 'drizzle-orm';
import { GeminiService } from './services/GeminiService';
import { VideoService } from './services/VideoService';
import { AudioService } from './services/AudioService';
import { QueueService } from './services/QueueService';
import { QuotaService } from './services/QuotaService';
import path from 'path';

/**
 * ==================================================================================
 * APPLICATION ENTRY POINT (src/index.ts)
 * ==================================================================================
 * This file initializes the main Express application and integrates the
 * Bull-Board UI for queue monitoring.
 *
 * The server exposes the Bull-Board dashboard at the '/admin/queues' endpoint,
 * allowing developers to inspect jobs, queues, and worker status in real-time.
 * ==================================================================================
 */

const app = express();
const port = process.env.PORT || 3000;

console.log(`[DEBUG] GEMINI_API_KEY length: ${process.env.GEMINI_API_KEY?.length || 0}`);
console.log(`[DEBUG] ELEVENLABS_API_KEY length: ${process.env.ELEVENLABS_API_KEY?.length || 0}`);

app.use(express.json());

// --- Service Initialization ---
const quotaService = new QuotaService();
const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '', quotaService);
// Check if AudioService constructor signature matches (apiKey)
const audioService = new AudioService(process.env.ELEVENLABS_API_KEY || '');
const videoService = new VideoService(audioService);
const queueService = new QueueService();

// --- Bull-Board UI Setup ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(renderQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// --- Application Routes ---
app.get('/', (req, res) => {
  res.send(
    'NovaContent API is running. Visit /admin/queues to monitor render jobs.'
  );
});

app.post('/trigger', async (req, res) => {
  try {
    const { topic, nicheId } = req.body;

    if (!topic || !nicheId) {
      return res.status(400).json({ error: 'Missing "topic" or "nicheId" in body.' });
    }

    // 1. Fetch Niche
    const niche = await db.query.niches.findFirst({
      where: eq(niches.id, nicheId),
    });

    if (!niche) {
      return res.status(404).json({ error: `Niche with ID ${nicheId} not found.` });
    }

    // 2. Create Video Record
    const [video] = await db.insert(videos).values({
      nicheId: niche.id,
      title: `Video about ${topic}`,
      status: 'scripting',
    }).returning();

    console.log(`[Video ${video.id}] Started. Topic: "${topic}"`);

    // 3. Generate Script (Async background process or awaited?)
    // For simplicity, we'll await the script generation here, but in a real app,
    // this might be better offloaded to a background job if it takes too long.
    // However, Gemini is usually fast enough for a request (5-10s).
    
    let script;
    try {
      script = await geminiService.generateContent({
        name: niche.name,
        tone: niche.tone,
        targetAudience: niche.targetAudience,
        visualStyle: niche.visualStyle,
        promptTemplate: niche.promptTemplate,
      }, topic);
      
      await db.update(videos)
        .set({ scriptJson: script, title: script.title, description: script.description })
        .where(eq(videos.id, video.id));

    } catch (err: any) {
        await db.update(videos).set({ status: 'error' }).where(eq(videos.id, video.id));
        return res.status(500).json({ error: 'Script generation failed', details: err.message });
    }

    // 4. Prepare Render Manifest (Generate Assets)
    try {
      await videoService.prepareRender(script, video.id);
    } catch (err: any) {
      // videoService handles DB error update
      return res.status(500).json({ error: 'Asset generation failed', details: err.message });
    }

    // 5. Enqueue Render Job
    const outputFileName = `video-${video.id}.mp4`;
    const outputDestination = path.join(process.cwd(), 'output', outputFileName);
    
    await queueService.enqueue({
      videoId: video.id,
      nicheConfig: {
          name: niche.name,
          tone: niche.tone,
          targetAudience: niche.targetAudience,
          visualStyle: niche.visualStyle,
          promptTemplate: niche.promptTemplate,
      },
      outputDestination,
    });

    res.json({
      message: 'Video generation started successfully.',
      videoId: video.id,
      status: 'rendering_queued',
      outputFile: outputFileName
    });

  } catch (error: any) {
    console.error('Trigger error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Bull-Board UI available at http://localhost:${port}/admin/queues`);
});
