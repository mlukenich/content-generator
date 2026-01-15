import { VideoMetadata } from '../core/types';

/**
 * ==================================================================================
 * SOCIAL CLIENT INTERFACE (Strategy Pattern)
 * ==================================================================================
 * This interface defines the contract for any social media client.
 * The `publish` method is the core function that all concrete platform
 * clients must implement. This allows the application to seamlessly switch
*  between or add new platforms without changing the core publishing logic.
 * ==================================================================================
 */
export interface SocialClient {
  /**
   * Publishes a video to the specific social media platform.
   *
   * @param videoData - The metadata of the video to be published, including
   *                    its title, description, and path to the rendered file.
   * @returns A promise that resolves to the URL of the published post.
   */
  publish(videoData: VideoMetadata): Promise<string>;
}
