import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bullmq';
import { availableNiches } from './config/NicheDefinitions';
import { QueueService } from './services/QueueService';
import { VideoOrchestrator } from './services/VideoOrchestrator';
import { PlatformAuthService, SupportedPlatform } from './services/PlatformAuthService';
import { DashboardService } from './services/DashboardService';
import { renderDashboard } from './services/DashboardUI';
import { SchedulerService } from './services/SchedulerService';
import { RenderJob } from './core/types';
import { logError, logInfo } from './core/logging';

interface AppDependencies {
  orchestrator?: VideoOrchestrator;
  authService?: PlatformAuthService;
  dashboardService?: DashboardService;
  schedulerService?: SchedulerService;
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

function buildLogicalRequestId(nicheSlug: string, videoId: number): string {
  const dayPartition = new Date().toISOString().slice(0, 10);
  return `${nicheSlug}-${dayPartition}-${videoId}`;
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

export function createApp({ 
  orchestrator = new VideoOrchestrator(), 
  authService = new PlatformAuthService(),
  dashboardService = new DashboardService(),
  schedulerService = new SchedulerService(),
  queueForBoard 
}: AppDependencies = {}) {
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
        const client = await queueForBoard.client;
        await client.ping();
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
    const niche = req.query.niche as string;
    const topic = req.query.topic as string;
    const platform = req.query.publish as any;

    if (!niche || niche.trim().length === 0) {
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

    try {
      const result = await orchestrator.triggerGeneration({
        requestId,
        nicheConfig: resolved.matchedNiche,
        topic,
        publishPlatform: platform,
      });

      return res.status(202).json({
        success: true,
        message: result.isDuplicate ? 'Duplicate request found. Returning existing job.' : 'Render job enqueued.',
        data: {
          requestId,
          jobId: String(result.jobId),
          videoId: result.videoId,
          requestedNiche: niche,
          resolvedNiche: resolved.resolvedSlug,
          logicalRequestId: result.logicalRequestId,
          isDuplicate: result.isDuplicate,
          durationMs: Date.now() - start,
        },
      });
    } catch (error: any) {
      logError('Trigger orchestration failed.', {
        phase: 'trigger_orchestration_error',
        requestId,
        niche: resolved.resolvedSlug,
        durationMs: Date.now() - start,
        errorType: error.name || 'OrchestrationError',
        errorMessage: error.message,
      });
      return sendError(res, 500, 'ORCHESTRATION_FAILED', error.message || 'Unknown orchestration error.', requestId);
    }
  });

  // --- NEW: Platform Auth Routes ---

  /**
   * GET /auth/connect?platform=youtube
   * Redirects the user to the platform's OAuth2 consent screen.
   */
  app.get('/auth/connect', (req: Request, res: Response) => {
    const platform = req.query.platform as SupportedPlatform;
    if (!platform) return res.status(400).send('Platform required.');

    try {
      const url = authService.getAuthUrl(platform);
      res.redirect(url);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  /**
   * GET /auth/callback?platform=youtube&code=...
   * Handles the redirect from the social platform after login.
   */
  app.get('/auth/callback', async (req: Request, res: Response) => {
    const platform = req.query.platform as SupportedPlatform;
    const code = req.query.code as string;

    if (!platform || !code) return res.status(400).send('Platform and code required.');

    try {
      await authService.handleCallback(platform, code);
      res.send(`Successfully connected ${platform}! You can now close this window.`);
    } catch (error: any) {
      res.status(500).send(`Failed to connect: ${error.message}`);
    }
  });

  /**
   * GET /admin/dashboard
   * Serves the Factory Monitor UI.
   */
  app.get('/admin/dashboard', async (req: Request, res: Response) => {
    try {
      const stats = await dashboardService.getStats();
      const html = renderDashboard(stats);
      res.send(html);
    } catch (error: any) {
      res.status(500).send(`Dashboard Error: ${error.message}`);
    }
  });

  /**
   * POST /admin/schedule
   * Schedules a daily trigger for a niche.
   */
  app.post('/admin/schedule', express.json(), async (req: Request, res: Response) => {
    const { nicheSlug, hour } = req.body;
    if (!nicheSlug) return res.status(400).send('nicheSlug required.');

    try {
      await schedulerService.scheduleDaily(nicheSlug, hour || 18);
      res.status(201).json({ success: true, message: `Scheduled ${nicheSlug} for daily production.` });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  return app;
}
