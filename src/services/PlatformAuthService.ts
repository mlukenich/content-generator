import { db } from '../db/connection';
import { platformAccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logInfo, logError } from '../core/logging';
import { env } from '../config/env-config';

export type SupportedPlatform = 'youtube' | 'tiktok';

export class PlatformAuthService {
  /**
   * Generates the Authorization URL for the user to visit.
   */
  public getAuthUrl(platform: SupportedPlatform): string {
    switch (platform) {
      case 'youtube':
        const ytScopes = [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly'
        ].join(' ');
        
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${env.YOUTUBE_CLIENT_ID}&` +
          `redirect_uri=${env.YOUTUBE_REDIRECT_URI}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(ytScopes)}&` +
          `access_type=offline&` +
          `prompt=consent`;

      case 'tiktok':
        return `https://www.tiktok.com/v2/auth/authorize/?` +
          `client_key=${env.TIKTOK_CLIENT_KEY}&` +
          `scope=video.upload,user.info.basic&` +
          `response_type=code&` +
          `redirect_uri=${env.YOUTUBE_REDIRECT_URI}`; // Reusing for now

      default:
        throw new Error(`Unsupported platform for auth: ${platform}`);
    }
  }

  /**
   * Exchanges an authorization code for access/refresh tokens.
   */
  public async handleCallback(platform: SupportedPlatform, code: string): Promise<void> {
    logInfo('Handling OAuth2 callback.', { phase: 'auth_callback', platform });

    try {
      // 1. Mock the Token Exchange (In real life, use fetch to Google/TikTok token endpoints)
      const mockAccessToken = `access_${Math.random().toString(36).substring(7)}`;
      const mockRefreshToken = `refresh_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

      // 2. Persist to DB (Upsert)
      await db.insert(platformAccounts)
        .values({
          platform,
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
          expiresAt,
          externalAccountId: 'primary-account', // In real life, fetch profile info first
          accountName: `Main ${platform} Account`,
        })
        .onConflictDoUpdate({
          target: [platformAccounts.platform, platformAccounts.externalAccountId],
          set: {
            accessToken: mockAccessToken,
            refreshToken: mockRefreshToken,
            expiresAt,
            updatedAt: new Date(),
          }
        });

      logInfo('Platform account linked successfully.', { 
        phase: 'auth_success', 
        platform 
      });
    } catch (error: any) {
      logError('Failed to exchange auth code.', {
        phase: 'auth_error',
        platform,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Retrieves a valid access token for a platform, refreshing if necessary.
   */
  public async getValidToken(platform: SupportedPlatform): Promise<string> {
    const account = await db.query.platformAccounts.findFirst({
      where: eq(platformAccounts.platform, platform),
    });

    if (!account) {
      throw new Error(`No account linked for platform: ${platform}`);
    }

    // Check if expired
    const isExpired = account.expiresAt && account.expiresAt < new Date();
    
    if (isExpired && account.refreshToken) {
      logInfo('Token expired, refreshing...', { phase: 'auth_refresh', platform });
      // In real life, perform refresh flow here
      return account.accessToken; // Mock
    }

    return account.accessToken;
  }
}
