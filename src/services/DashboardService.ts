import { db } from '../db/connection';
import { videos, platformAccounts, geminiApiUsage } from '../db/schema';
import { desc, sql, count, sum } from 'drizzle-orm';
import { SchedulerService } from './SchedulerService';

export interface DashboardStats {
  totalVideos: number;
  totalCostCents: number;
  successRate: number;
  activePlatforms: string[];
  activeSchedules: any[];
  recentVideos: any[];
}

export class DashboardService {
  constructor(private schedulerService = new SchedulerService()) {}

  /**
   * Aggregates production metrics from the database.
   */
  public async getStats(): Promise<DashboardStats> {
    // 1. Basic Counts
    const [videoCount] = await db.select({ value: count() }).from(videos);
    const [costSum] = await db.select({ value: sum(videos.estimatedCostCents) }).from(videos);
    const [successCount] = await db.select({ value: count() }).from(videos).where(sql`${videos.status} = 'published' OR ${videos.status} = 'completed'`);

    // 2. Active Platforms
    const accounts = await db.select({ platform: platformAccounts.platform }).from(platformAccounts);
    const activePlatforms = Array.from(new Set(accounts.map(a => a.platform)));

    // 3. Active Schedules
    const activeSchedules = await this.schedulerService.getSchedules();

    // 4. Recent Videos
    const recentVideos = await db.query.videos.findMany({
      limit: 10,
      orderBy: [desc(videos.createdAt)],
      with: {
        niche: true,
      }
    });

    const total = videoCount?.value || 0;
    const successes = successCount?.value || 0;

    return {
      totalVideos: total,
      totalCostCents: Number(costSum?.value || 0),
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
      activePlatforms,
      activeSchedules,
      recentVideos,
    };
  }
}
