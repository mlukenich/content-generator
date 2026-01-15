import { db } from '../db/connection';
import { geminiApiUsage } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const DAILY_QUOTA_LIMIT = 1500;

/**
 * QuotaService is responsible for tracking and enforcing the daily API
 * usage limit for the Gemini API. It interacts with the database to persist
 * the daily request count.
 */
export class QuotaService {
  private getToday(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * Checks if a new API request is allowed by comparing the current usage
   * against the daily limit.
   *
   * @returns A promise that resolves to a boolean indicating if the request is permitted.
   */
  public async canMakeRequest(): Promise<boolean> {
    const today = this.getToday();
    
    const record = await db.query.geminiApiUsage.findFirst({
      where: eq(geminiApiUsage.date, today),
    });

    const currentCount = record ? record.requestCount : 0;
    
    if (currentCount < DAILY_QUOTA_LIMIT) {
      console.log(`Quota check passed: ${currentCount} / ${DAILY_QUOTA_LIMIT}`);
      return true;
    } else {
      console.warn(`Quota check failed: Daily limit of ${DAILY_QUOTA_LIMIT} reached.`);
      return false;
    }
  }

  /**
   * Increments the API request count for the current day.
   * It uses an 'upsert' operation to either create a new record for the day
   * or increment the count on the existing record.
   */
  public async incrementUsage(): Promise<void> {
    const today = this.getToday();

    await db.insert(geminiApiUsage)
      .values({ date: today, requestCount: 1 })
      .onConflictDoUpdate({
        target: geminiApiUsage.date,
        set: {
          requestCount: sql`${geminiApiUsage.requestCount} + 1`,
        },
      });

    console.log('Gemini API usage incremented for today.');
  }
}
