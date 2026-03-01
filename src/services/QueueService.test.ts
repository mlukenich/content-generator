import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { CRAZY_ANIMAL_FACTS } from '../config/NicheDefinitions';

const mockGetJob = mock(async (_jobId: string) => null as any);
const mockAdd = mock(async (_name: string, _data: any, _opts: any) => ({ id: 'job-1' } as any));

mock.module('../core/queue', () => ({
  renderQueue: {
    getJob: mockGetJob,
    add: mockAdd,
  },
}));

const { QueueService } = await import('./QueueService');

describe('QueueService', () => {
  let service: InstanceType<typeof QueueService>;

  beforeEach(() => {
    service = new QueueService();
    mockGetJob.mockClear();
    mockAdd.mockClear();
  });

  test('enqueues new job when no duplicate logical request exists', async () => {
    const result = await service.enqueue({
      videoId: 101,
      requestId: 'req-1',
      nicheSlug: 'crazy-animal-facts',
      logicalRequestId: 'crazy-animal-facts:2026-01-01',
      nicheConfig: CRAZY_ANIMAL_FACTS,
      outputDestination: 'output/crazy-animal-facts-101.mp4',
    });

    expect(mockGetJob).toHaveBeenCalledWith('crazy-animal-facts:2026-01-01');
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect((result as any).id).toBe('job-1');
  });

  test('returns existing job when duplicate logical request is found', async () => {
    mockGetJob.mockResolvedValueOnce({ id: 'existing-job' } as any);

    const result = await service.enqueue({
      videoId: 202,
      requestId: 'req-2',
      nicheSlug: 'crazy-animal-facts',
      logicalRequestId: 'crazy-animal-facts:2026-01-01',
      nicheConfig: CRAZY_ANIMAL_FACTS,
      outputDestination: 'output/crazy-animal-facts-202.mp4',
    });

    expect(mockGetJob).toHaveBeenCalledWith('crazy-animal-facts:2026-01-01');
    expect(mockAdd).not.toHaveBeenCalled();
    expect((result as any).id).toBe('existing-job');
  });
});
