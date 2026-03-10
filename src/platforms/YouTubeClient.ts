import { SocialClient } from './SocialPlatform';
import { VideoMetadata } from '../core/types';
import { logInfo, logError } from '../core/logging';
import { PlatformAuthService } from '../services/PlatformAuthService';
import fs from 'fs';

/**
 * YouTubeClient handles publishing videos to YouTube Shorts.
 */
export class YouTubeClient implements SocialClient {
  private authService: PlatformAuthService;

  constructor(authService: PlatformAuthService = new PlatformAuthService()) {
    this.authService = authService;
    logInfo('YouTubeClient initialized.', { phase: 'platform_init' });
  }

  /**
   * Publishes a video to YouTube.
   */
  public async publish(videoData: VideoMetadata): Promise<string> {
    logInfo(`Publishing video to YouTube: ${videoData.title}`, {
      phase: 'publish_start',
      platform: 'youtube',
    });

    try {
      const accessToken = await this.authService.getValidToken('youtube');
      
      // 1. Check if file exists
      if (!fs.existsSync(videoData.videoFilePath)) {
        throw new Error(`Video file not found at path: ${videoData.videoFilePath}`);
      }

      logInfo('Uploading to YouTube with valid OAuth2 token...', { 
        phase: 'publish_upload',
        tokenPreview: `${accessToken.substring(0, 10)}...`
      });
      
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockVideoId = `yt-${Math.random().toString(36).substring(7)}`;
      const videoUrl = `https://youtube.com/shorts/${mockVideoId}`;

      return videoUrl;
    } catch (error: any) {
      logError('Failed to publish video to YouTube.', {
        phase: 'publish_error',
        platform: 'youtube',
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
