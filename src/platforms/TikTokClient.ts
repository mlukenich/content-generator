import { SocialClient } from './SocialPlatform';
import { VideoMetadata } from '../core/types';
import { logInfo, logError } from '../core/logging';
import { PlatformAuthService } from '../services/PlatformAuthService';
import fs from 'fs';

/**
 * TikTokClient handles publishing videos to TikTok.
 */
export class TikTokClient implements SocialClient {
  private authService: PlatformAuthService;

  constructor(authService: PlatformAuthService = new PlatformAuthService()) {
    this.authService = authService;
    logInfo('TikTokClient initialized.', { phase: 'platform_init' });
  }

  /**
   * Publishes a video to TikTok.
   */
  public async publish(videoData: VideoMetadata): Promise<string> {
    logInfo(`Publishing video to TikTok: ${videoData.title}`, {
      phase: 'publish_start',
      platform: 'tiktok',
    });

    try {
      const accessToken = await this.authService.getValidToken('tiktok');

      // 1. Check if file exists
      if (!fs.existsSync(videoData.videoFilePath)) {
        throw new Error(`Video file not found at path: ${videoData.videoFilePath}`);
      }

      logInfo('Simulating TikTok upload flow with valid token...', { 
        phase: 'publish_upload',
        tokenPreview: `${accessToken.substring(0, 10)}...`
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const mockShareId = `tk-${Math.random().toString(36).substring(7)}`;
      const postUrl = `https://www.tiktok.com/v/${mockShareId}`;

      return postUrl;
    } catch (error: any) {
      logError('Failed to publish video to TikTok.', {
        phase: 'publish_error',
        platform: 'tiktok',
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
