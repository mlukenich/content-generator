import { env } from '../config/env-config';
import { SocialClient } from './SocialPlatform';
import { YouTubeClient } from './YouTubeClient';
import { TikTokClient } from './TikTokClient';
import { OutstandClient } from './OutstandClient';
import { logError } from '../core/logging';

export type PlatformType = 'youtube' | 'tiktok' | 'outstand';

export class PlatformFactory {
  /**
   * Creates a social client based on the requested platform type.
   * Uses environment variables for credentials.
   */
  public static createClient(platform: PlatformType): SocialClient {
    switch (platform) {
      case 'youtube':
        return new YouTubeClient();

      case 'tiktok':
        return new TikTokClient();

      case 'outstand':
        // Outstand might use a different env var or a default
        return new OutstandClient('default-key');

      default:
        const exhaust: never = platform;
        throw new Error(`Unsupported platform: ${exhaust}`);
    }
  }
}
