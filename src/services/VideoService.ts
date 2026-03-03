import { db } from '../db/connection';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RenderManifest } from '../core/types';
import { VideoScript } from '../core/schema';
import { AudioService } from './AudioService';
import { logError, logInfo } from '../core/logging';

export class VideoService {
  private readonly audioService: AudioService;

  constructor(audioService: AudioService) {
    this.audioService = audioService;
    logInfo('VideoService initialized.', { phase: 'video_service_init' });
  }

  private getPlaceholderAsset(prompt: string): string {
    const query = encodeURIComponent(prompt.split(' ').slice(0, 5).join(' '));
    return `https://placehold.co/1080x1920/000000/FFFFFF/png?text=${query}`;
  }

  public async prepareRender(script: VideoScript, videoId: number): Promise<RenderManifest> {
    logInfo('Preparing render manifest.', { phase: 'prepare_render_start', videoId });

    try {
      const processedScenes = await Promise.all(
        script.scenes.map(async (scene, index) => {
          try {
            const [audioResult, visualUrl] = await Promise.all([
              this.audioService.generateVoiceOver(scene.text),
              Promise.resolve(this.getPlaceholderAsset(scene.visualPrompt)),
            ]);

            return {
              text: scene.text,
              assetUrl: visualUrl,
              audioUrl: audioResult.filePath,
              durationInSeconds: audioResult.durationInSeconds,
            };
          } catch (sceneError) {
            const error = sceneError as Error;
            throw new Error(`Scene ${index + 1} failed: ${error.message}`);
          }
        })
      );

      const manifest: RenderManifest = {
        title: script.title,
        scenes: processedScenes,
      };

      if (process.env.SKIP_DB !== 'true') {
        await db.update(videos).set({ renderManifestJson: manifest, status: 'rendering' }).where(eq(videos.id, videoId));
      }

      logInfo('Render manifest saved.', { phase: 'prepare_render_success', videoId, sceneCount: processedScenes.length });
      return manifest;
    } catch (error) {
      const renderError = error as Error;
      logError('Error preparing render.', {
        phase: 'prepare_render_error',
        videoId,
        errorType: renderError.name,
        errorMessage: renderError.message,
        stack: renderError.stack,
      });
      if (process.env.SKIP_DB !== 'true') {
        await db.update(videos).set({ status: 'error' }).where(eq(videos.id, videoId));
      }
      throw new Error('Failed to prepare render manifest.');
    }
  }
}
