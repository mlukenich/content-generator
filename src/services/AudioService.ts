import { ElevenLabsClient } from 'elevenlabs-node';
import * as mm from 'music-metadata';
import { promises as fsPromises, createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { logError, logInfo } from '../core/logging';

const VOICE_CACHE_DIR = path.join(process.cwd(), 'public', 'voiceovers');
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const AUDIO_TIMEOUT_MS = 30_000;

const streamToFile = (stream: Readable, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fileStream = createWriteStream(filePath);
    stream.pipe(fileStream);
    stream.on('end', resolve);
    stream.on('error', reject);
  });
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Audio generation timeout after ${timeoutMs}ms.`)), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export class AudioService {
  private readonly elevenlabs: ElevenLabsClient;

  constructor(apiKey: string) {
    this.elevenlabs = new ElevenLabsClient({ apiKey });
    logInfo('AudioService initialized.', { phase: 'audio_init' });
  }

  public async generateVoiceOver(
    text: string,
    voiceId: string = ELEVENLABS_VOICE_ID
  ): Promise<{ filePath: string; durationInSeconds: number }> {
    const startedAt = Date.now();
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(VOICE_CACHE_DIR, fileName);

    await fsPromises.mkdir(VOICE_CACHE_DIR, { recursive: true });

    try {
      await fsPromises.access(filePath);
      logInfo('Audio cache hit.', { phase: 'audio_cache_hit', fileName });
    } catch {
      logInfo('Audio cache miss; generating.', { phase: 'audio_cache_miss', fileName });
      try {
        const audioStream = await withTimeout(
          this.elevenlabs.textToSpeechStream({
            text,
            voiceId,
            modelId: 'eleven_multilingual_v2',
          }),
          AUDIO_TIMEOUT_MS
        );

        await withTimeout(streamToFile(audioStream, filePath), AUDIO_TIMEOUT_MS);
        logInfo('Audio generated and cached.', { phase: 'audio_generated', fileName });
      } catch (error) {
        const audioError = error as Error;
        logError('Error generating audio from ElevenLabs.', {
          phase: 'audio_generation_error',
          errorType: audioError.name,
          errorMessage: audioError.message,
          stack: audioError.stack,
          durationMs: Date.now() - startedAt,
        });
        throw new Error('Failed to generate voice-over.');
      }
    }

    try {
      const metadata = await mm.parseFile(filePath);
      if (metadata.format.duration && metadata.format.duration > 0) {
        return {
          filePath: `/voiceovers/${fileName}`,
          durationInSeconds: metadata.format.duration,
        };
      }
    } catch (error) {
      const metadataError = error as Error;
      logError('Error reading audio metadata.', {
        phase: 'audio_metadata_error',
        errorType: metadataError.name,
        errorMessage: metadataError.message,
        stack: metadataError.stack,
      });
    }

    throw new Error('Could not determine audio duration.');
  }
}
