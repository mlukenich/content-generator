import { promises as fsPromises } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logError, logInfo } from '../core/logging';
import { AudioProvider, MockAudioProvider, ElevenLabsProvider } from './AudioProviders';

const VOICE_CACHE_DIR = path.join(process.cwd(), 'public', 'voiceovers');

export class AudioService {
  private provider: AudioProvider;

  constructor(apiKey?: string, provider?: AudioProvider) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.SKIP_AI === 'true' || !apiKey) {
      this.provider = new MockAudioProvider();
    } else {
      this.provider = new ElevenLabsProvider(apiKey);
    }
    logInfo('AudioService initialized.', { 
      phase: 'audio_init', 
      provider: this.provider.constructor.name 
    });
  }

  public async generateVoiceOver(
    text: string,
    voiceId: string = 'default'
  ): Promise<{ filePath: string; durationInSeconds: number }> {
    const startedAt = Date.now();
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(VOICE_CACHE_DIR, fileName);

    await fsPromises.mkdir(VOICE_CACHE_DIR, { recursive: true });

    // In a real scenario, we'd check cache here
    // For this demonstration, we'll just use the provider
    try {
        if (this.provider instanceof MockAudioProvider) {
            logInfo('Using mock audio.', { phase: 'audio_mock', fileName });
            return {
                filePath: `/voiceovers/${fileName}`,
                durationInSeconds: 5,
            };
        }

        const audioBuffer = await this.provider.generate(text, voiceId);
        await fsPromises.writeFile(filePath, audioBuffer);
        
        return {
            filePath: `/voiceovers/${fileName}`,
            durationInSeconds: 5, // We'd actually parse duration here
        };
    } catch (error: any) {
        logError('Audio generation failed.', {
            phase: 'audio_error',
            errorMessage: error.message
        });
        throw new Error('Failed to generate voice-over.');
    }
  }
}
