import { test, expect, describe, mock, afterEach } from 'bun:test';
import { QuotaService } from '../QuotaService';
import { db } from '../../db/connection';

/**
 * ==================================================================================
 * TESTS FOR: QuotaService
 * ==================================================================================
 * This test suite verifies the functionality of the QuotaService, which is
 * critical for managing API costs and preventing rate limit abuse.
 *
 * We are mocking the database dependency (`db.query.geminiApiUsage.findFirst`
 * and `db.insert`) to isolate the service's logic and test its behavior
 * under controlled conditions.
 * ==================================================================================
 */

// Mock the entire db query interface
const mockDbQuery = {
  geminiApiUsage: {
    findFirst: mock(() => {}),
  },
};
const mockDbInsert = mock(() => ({ onConflictDoUpdate: () => {} }));

// @ts-ignore
db.query = mockDbQuery;
// @ts-ignore
db.insert = mockDbInsert;


describe('QuotaService', () => {

  afterEach(() => {
    // Reset mocks after each test to ensure isolation
    mockDbQuery.geminiApiUsage.findFirst.mockClear();
    mockDbInsert.mockClear();
  });

  test('should allow a request when the quota is not reached', async () => {
    // Arrange
    mockDbQuery.geminiApiUsage.findFirst.mockResolvedValueOnce({ requestCount: 1499 });
    const quotaService = new QuotaService();

    // Act
    const canRequest = await quotaService.canMakeRequest();

    // Assert
    expect(canRequest).toBe(true);
    expect(mockDbQuery.geminiApiUsage.findFirst).toHaveBeenCalledTimes(1);
  });

  test('should block a request when the daily limit of 1500 is reached', async () => {
    // Arrange
    mockDbQuery.geminiApiUsage.findFirst.mockResolvedValueOnce({ requestCount: 1500 });
    const quotaService = new QuotaService();

    // Act
    const canRequest = await quotaService.canMakeRequest();

    // Assert
    expect(canRequest).toBe(false);
  });

  test('should allow a request if no record exists for the day', async () => {
    // Arrange
    mockDbQuery.geminiApiUsage.findFirst.mockResolvedValueOnce(undefined);
    const quotaService = new QuotaService();

    // Act
    const canRequest = await quotaService.canMakeRequest();

    // Assert
    expect(canRequest).toBe(true);
  });

  test('incrementUsage should call the db.insert method correctly', async () => {
    // Arrange
    const quotaService = new QuotaService();

    // Act
    await quotaService.incrementUsage();

    // Assert
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
  });
});
