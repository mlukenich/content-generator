import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { QuotaService } from './QuotaService';

describe('QuotaService', () => {
  const mockFindFirst = mock(async () => null);
  const mockOnConflictDoUpdate = mock(() => ({}));
  const mockValues = mock(() => ({
    onConflictDoUpdate: mockOnConflictDoUpdate,
  }));
  const mockDbInsert = mock(() => ({
    values: mockValues,
  }));

  const mockDb = {
    query: {
      geminiApiUsage: {
        findFirst: mockFindFirst,
      },
    },
    insert: mockDbInsert,
  } as any;

  beforeEach(() => {
    mockFindFirst.mockClear();
    mockDbInsert.mockClear();
    mockValues.mockClear();
    mockOnConflictDoUpdate.mockClear();
  });

  test('should allow a request when the quota is not reached', async () => {
    mockFindFirst.mockResolvedValueOnce({ requestCount: 1499 });
    const service = new QuotaService(mockDb);
    const canRequest = await service.canMakeRequest();
    expect(canRequest).toBe(true);
    expect(mockFindFirst).toHaveBeenCalled();
  });

  test('should block a request when the daily limit of 1500 is reached', async () => {
    mockFindFirst.mockResolvedValueOnce({ requestCount: 1500 });
    const service = new QuotaService(mockDb);
    const canRequest = await service.canMakeRequest();
    expect(canRequest).toBe(false);
    expect(mockFindFirst).toHaveBeenCalled();
  });

  test('should allow a request if no record exists for the day', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const service = new QuotaService(mockDb);
    const canRequest = await service.canMakeRequest();
    expect(canRequest).toBe(true);
    expect(mockFindFirst).toHaveBeenCalled();
  });

  test('incrementUsage should call the db.insert method correctly', async () => {
    const service = new QuotaService(mockDb);
    await service.incrementUsage();
    expect(mockDbInsert).toHaveBeenCalled();
  });
});
