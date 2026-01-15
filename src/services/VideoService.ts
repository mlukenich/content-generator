import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RenderManifest } from '../core/types';
import { VideoScript } from '../core/schema';
import { AudioService } from './AudioService';

/**
 * VideoService is responsible for transforming the AI-generated script into a
 * render-ready manifest. It orchestrates asset generation (visuals and audio)
 * and persists the final manifest to the database for the rendering workers.
 */
export class VideoService {
  private readonly audioService: AudioService;

  constructor(audioService: AudioService) {
    this.audioService = audioService;
    console.log('VideoService initialized with AudioService.');
  }

  private getPlaceholderAsset(prompt: string): string {
    const query = encodeURIComponent(prompt.split(' ').slice(0, 5).join(' '));
    return `https://placehold.co/1080x1920/000000/FFFFFF/png?text=${query}`;
  }

  /**
   * Prepares a render manifest from a video script.
   * This version generates voice-overs for each scene and uses their actual
   * duration to define the video timeline.
   */
  public async prepareRender(script: VideoScript, videoId: number): Promise<RenderManifest> {
    console.log(`Preparing render manifest for video ID: ${videoId}...`);

    try {
      // 1. Generate all assets in parallel (visual placeholders and audio)
      const processedScenes = await Promise.all(
        script.scenes.map(async (scene) => {
          const [audioResult, visualUrl] = await Promise.all([
            this.audioService.generateVoiceOver(scene.text),
            this.getPlaceholderAsset(scene.visualPrompt),
          ]);

          return {
            text: scene.text,
            assetUrl: visualUrl,
            audioUrl: audioResult.filePath,
            durationInSeconds: audioResult.durationInSeconds,
          };
        })
      );

      const manifest: RenderManifest = {
        title: script.title,
        scenes: processedScenes,
      };

      // 2. Save the manifest and update the video status
      await db.update(videos)
        .set({
          renderManifestJson: manifest,
          status: 'rendering',
        })
        .where(eq(videos.id, videoId));

      console.log(`Render manifest for video ID ${videoId} saved to database.`);
      
      return manifest;

    } catch (error) {
      console.error(`Error preparing render for video ID ${videoId}:`, error);
      await db.update(videos)
        .set({ status: 'error' })
        .where(eq(videos.id, videoId));
      throw new Error('Failed to prepare render manifest.');
    }
  }
}
