import { db } from '../db/connection';
import { videos, niches } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { QueueService } from './QueueService';
import { NicheConfig } from '../core/types';
import { logInfo, logError } from '../core/logging';

export class VideoOrchestrator {
  constructor(private queueService: QueueService = new QueueService()) {}

  /**
   * Orchestrates the video generation trigger.
   * Ensures DB persistence and idempotency BEFORE enqueuing.
   */
  public async triggerGeneration(params: {
    requestId: string;
    nicheConfig: NicheConfig;
    topic?: string;
    publishPlatform?: 'youtube' | 'tiktok' | 'outstand';
  }) {
    const { requestId, nicheConfig, topic, publishPlatform } = params;
    const nicheSlug = nicheConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // 1. Build Logical Request ID (Refined for idempotency)
    // Format: niche-topic(hashed)-date
    const datePartition = new Date().toISOString().slice(0, 10);
    const topicSegment = topic ? Buffer.from(topic).toString('hex').slice(0, 8) : 'daily';
    const logicalRequestId = `${nicheSlug}:${topicSegment}:${datePartition}`;

    try {
      // 2. Idempotency Check (Database-first)
      const existingVideo = await db.query.videos.findFirst({
        where: eq(videos.logicalRequestId, logicalRequestId),
      });

      if (existingVideo) {
        logInfo('Idempotency hit: existing video found.', {
          phase: 'orchestration_dedup',
          requestId,
          logicalRequestId,
          videoId: existingVideo.id,
        });
        
        // Even if it exists, we might want to return the job ID if it's still in queue
        // For now, let's just return the existing record info
        return {
          success: true,
          isDuplicate: true,
          videoId: existingVideo.id,
          status: existingVideo.status,
          logicalRequestId,
        };
      }

      // 3. Resolve or Create Niche in DB
      let dbNiche = await db.query.niches.findFirst({
        where: eq(niches.name, nicheConfig.name),
      });

      if (!dbNiche) {
        const [newNiche] = await db.insert(niches).values({
          name: nicheConfig.name,
          tone: nicheConfig.tone,
          targetAudience: nicheConfig.targetAudience,
          visualStyle: nicheConfig.visualStyle,
          promptTemplate: 'default', // Placeholder
        }).returning();
        dbNiche = newNiche;
      }

      // 4. Create Video Record (State: IDLE/ACCEPTED)
      const [newVideo] = await db.insert(videos).values({
        requestId,
        logicalRequestId,
        nicheId: dbNiche.id,
        nicheSlug,
        title: `Video for ${nicheConfig.name} - ${datePartition}`,
        status: 'idle',
      }).returning();

      // 5. Enqueue to BullMQ
      const job = await this.queueService.enqueue({
        videoId: newVideo.id,
        nicheSlug,
        requestId,
        logicalRequestId,
        nicheConfig,
        outputDestination: `output/${nicheSlug}-${datePartition}-${newVideo.id}.mp4`,
        publishPlatform,
      });

      logInfo('Video generation orchestrated successfully.', {
        phase: 'orchestration_success',
        requestId,
        videoId: newVideo.id,
        jobId: job.id,
      });

      return {
        success: true,
        isDuplicate: false,
        videoId: newVideo.id,
        jobId: job.id,
        logicalRequestId,
      };
    } catch (error: any) {
      logError('Orchestration failed.', {
        phase: 'orchestration_error',
        requestId,
        errorMessage: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
