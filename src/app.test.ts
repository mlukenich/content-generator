import { afterAll, describe, expect, mock, test } from 'bun:test';
import type { Server } from 'http';
import { createApp } from './app';
import { VideoOrchestrator } from './services/VideoOrchestrator';

async function startTestServer(triggerGenerationImpl: (params: any) => Promise<any>) {
  const orchestratorMock = {
    triggerGeneration: mock(triggerGenerationImpl),
  } as unknown as VideoOrchestrator;

  const app = createApp({
    orchestrator: orchestratorMock,
  });

  const server = await new Promise<Server>((resolve) => {
    const startedServer = app.listen(0, () => resolve(startedServer));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine server port for test.');
  }

  return {
    orchestratorMock,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

const serversToClose: Server[] = [];

afterAll(async () => {
  await Promise.all(
    serversToClose.map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe('createApp routes', () => {
  test('returns 200 on /health', async () => {
    const { server, baseUrl } = await startTestServer(async () => ({ id: 'unused' }));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  test('returns 202 and enqueues a job for niche=science alias', async () => {
    const { orchestratorMock, server, baseUrl } = await startTestServer(async () => ({
      success: true,
      jobId: 'job-123',
      videoId: 999,
      logicalRequestId: 'crazy-animal-facts-daily-2026-03-10',
      isDuplicate: false,
    }));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger?niche=science`, {
      headers: { 'x-request-id': 'req-abc' },
    });
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.success).toBe(true);
    expect(body.data.jobId).toBe('job-123');
    expect(body.data.requestId).toBe('req-abc');
    expect(body.data.resolvedNiche).toBe('crazy-animal-facts');
    expect(body.data.logicalRequestId).toContain('crazy-animal-facts');

    expect(orchestratorMock.triggerGeneration).toHaveBeenCalledTimes(1);
    const [params] = (orchestratorMock.triggerGeneration as any).mock.calls[0] as [
      {
        requestId: string;
        nicheConfig: { name: string };
        topic?: string;
      },
    ];

    expect(params.requestId).toBe('req-abc');
    expect(params.nicheConfig.name).toBe('Crazy Animal Facts');
  });

  test('returns 400 when niche query is missing', async () => {
    const { orchestratorMock, server, baseUrl } = await startTestServer(async () => ({}));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger`, { headers: { 'x-request-id': 'req-missing' } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_NICHE');
    expect(body.error.requestId).toBe('req-missing');
    expect(body.error.details.allowedNiches).toContain('crazy-animal-facts');
    expect(orchestratorMock.triggerGeneration).not.toHaveBeenCalled();
  });

  test('returns 400 for unsupported niche', async () => {
    const { orchestratorMock, server, baseUrl } = await startTestServer(async () => ({}));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger?niche=invalid`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNSUPPORTED_NICHE');
    expect(body.error.requestId).toBeString();
    expect(orchestratorMock.triggerGeneration).not.toHaveBeenCalled();
  });

  test('returns 500 when queue enqueue throws', async () => {
    const { orchestratorMock, server, baseUrl } = await startTestServer(async () => {
      throw new Error('Queue offline');
    });
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger?niche=science`);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ORCHESTRATION_FAILED');
    expect(body.error.message).toContain('Queue offline');
    expect(orchestratorMock.triggerGeneration).toHaveBeenCalledTimes(1);
  });
});
