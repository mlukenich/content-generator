import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bullmq';
import { availableNiches } from './config/NicheDefinitions';
import { QueueService } from './services/QueueService';
import { RenderJob } from './core/types';
import { logError, logInfo } from './core/logging';

interface AppDependencies {
  queueService?: Pick<QueueService, 'enqueue'>;
  queueForBoard?: Queue<RenderJob>;
}

const nicheAliases: Record<string, string> = {
  science: 'crazy-animal-facts',
};

function toSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getRequestId(req: Request): string {
  const headerValue = req.header('x-request-id');
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue;
  }
  return crypto.randomUUID();
}

function buildLogicalRequestId(nicheSlug: string): string {
  const dayPartition = new Date().toISOString().slice(0, 10);
  return `${nicheSlug}:${dayPartition}`;
}

function findNicheByInput(inputNiche: string) {
  const normalized = toSlug(inputNiche);
  const resolvedSlug = nicheAliases[normalized] ?? normalized;

  const matchedNiche = availableNiches.find((niche) => toSlug(niche.name) === resolvedSlug);
  return { normalized, resolvedSlug, matchedNiche };
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      details,
    },
  });
}

export function createApp({ queueService = new QueueService(), queueForBoard }: AppDependencies = {}) {
  const app = express();

  if (queueForBoard) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(queueForBoard)],
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
  }

  app.get('/', (_req: Request, res: Response) => {
    res.send('NovaContent API is running. Visit /admin/queues to monitor render jobs.');
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      if (queueForBoard) {
        await queueForBoard.client.ping();
      }
      res.status(200).json({ success: true, status: 'ready' });
    } catch (error) {
      const readinessError = error as Error;
      logError('Readiness check failed.', {
        phase: 'readiness',
        errorType: readinessError.name,
        errorMessage: readinessError.message,
      });
      sendError(res, 503, 'NOT_READY', 'Service is not ready.', 'system');
    }
  });

  app.get('/trigger', async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const start = Date.now();
    const niche = req.query.niche;

    if (typeof niche !== 'string' || niche.trim().length === 0) {
      return sendError(
        res,
        400,
        'INVALID_NICHE',
        'Query parameter "niche" is required.',
        requestId,
        {
          allowedNiches: availableNiches.map((item) => toSlug(item.name)),
          aliases: nicheAliases,
        }
      );
    }

    const resolved = findNicheByInput(niche);

    if (!resolved.matchedNiche) {
      return sendError(
        res,
        400,
        'UNSUPPORTED_NICHE',
        `Unsupported niche "${niche}".`,
        requestId,
        {
          allowedNiches: availableNiches.map((item) => toSlug(item.name)),
          aliases: nicheAliases,
        }
      );
    }

    const videoId = Date.now();
    const logicalRequestId = buildLogicalRequestId(resolved.resolvedSlug);
    const outputDestination = `output/${resolved.resolvedSlug}-${videoId}.mp4`;

    logInfo('Trigger accepted for enqueue.', {
      phase: 'trigger_received',
      requestId,
      correlationId: requestId,
      niche: resolved.resolvedSlug,
      logicalRequestId,
    });

    try {
      const job = await queueService.enqueue({
        requestId,
        logicalRequestId,
        videoId,
        nicheSlug: resolved.resolvedSlug,
        nicheConfig: resolved.matchedNiche,
        outputDestination,
      });

      return res.status(202).json({
        success: true,
        message: 'Render job enqueued.',
        data: {
          requestId,
          jobId: String(job.id),
          videoId,
          requestedNiche: niche,
          resolvedNiche: resolved.resolvedSlug,
          logicalRequestId,
          outputDestination,
          durationMs: Date.now() - start,
        },
      });
    } catch (error) {
      const queueError = error as Error;
      logError('Trigger enqueue failed.', {
        phase: 'trigger_enqueue_error',
        requestId,
        correlationId: requestId,
        niche: resolved.resolvedSlug,
        durationMs: Date.now() - start,
        errorType: queueError.name,
        errorMessage: queueError.message,
      });
      return sendError(res, 500, 'QUEUE_ENQUEUE_FAILED', queueError.message || 'Unknown queue error.', requestId);
    }
  });

  return app;
}
