import { afterAll, describe, expect, mock, test } from 'bun:test';
import type { Server } from 'http';
import { createApp } from './app';

async function startTestServer(queueEnqueueImpl: (jobData: any) => Promise<{ id: string }>) {
  const enqueueMock = mock(queueEnqueueImpl);
  const app = createApp({
    queueService: {
      enqueue: enqueueMock,
    },
  });

  const server = await new Promise<Server>((resolve) => {
    const startedServer = app.listen(0, () => resolve(startedServer));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine server port for test.');
  }

  return {
    enqueueMock,
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
    const { enqueueMock, server, baseUrl } = await startTestServer(async () => ({ id: 'job-123' }));
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
    expect(body.data.logicalRequestId).toContain('crazy-animal-facts:');
    expect(body.data.outputDestination).toStartWith('output/crazy-animal-facts-');

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const [jobData] = enqueueMock.mock.calls[0] as [
      {
        videoId: number;
        outputDestination: string;
        nicheSlug: string;
        requestId: string;
        logicalRequestId: string;
        nicheConfig: { name: string };
      },
    ];

    expect(jobData.videoId).toBeTypeOf('number');
    expect(jobData.requestId).toBe('req-abc');
    expect(jobData.nicheSlug).toBe('crazy-animal-facts');
    expect(jobData.nicheConfig.name).toBe('Crazy Animal Facts');
    expect(jobData.logicalRequestId).toContain('crazy-animal-facts:');
    expect(jobData.outputDestination).toStartWith('output/crazy-animal-facts-');
  });

  test('returns 400 when niche query is missing', async () => {
    const { enqueueMock, server, baseUrl } = await startTestServer(async () => ({ id: 'job-ignored' }));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger`, { headers: { 'x-request-id': 'req-missing' } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_NICHE');
    expect(body.error.requestId).toBe('req-missing');
    expect(body.error.details.allowedNiches).toContain('crazy-animal-facts');
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  test('returns 400 for unsupported niche', async () => {
    const { enqueueMock, server, baseUrl } = await startTestServer(async () => ({ id: 'job-ignored' }));
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger?niche=invalid`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNSUPPORTED_NICHE');
    expect(body.error.requestId).toBeString();
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  test('returns 500 when queue enqueue throws', async () => {
    const { enqueueMock, server, baseUrl } = await startTestServer(async () => {
      throw new Error('Queue offline');
    });
    serversToClose.push(server);

    const response = await fetch(`${baseUrl}/trigger?niche=science`);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('QUEUE_ENQUEUE_FAILED');
    expect(body.error.message).toContain('Queue offline');
    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });
});
