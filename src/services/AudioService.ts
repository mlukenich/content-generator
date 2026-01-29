import { ElevenLabsClient } from "elevenlabs";
import * as mm from 'music-metadata';
import { promises as fsPromises, createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';

const VOICE_CACHE_DIR = path.join(process.cwd(), 'public', 'voiceovers');
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Example voice ID

// Helper to write a stream to a file
const streamToFile = async (stream: any, filePath: string): Promise<void> => {
    const fileStream = createWriteStream(filePath);
    
    try {
        if (typeof stream.pipe === 'function') {
             // Node.js Readable stream
            return new Promise((resolve, reject) => {
                stream.pipe(fileStream);
                stream.on('end', resolve);
                stream.on('error', reject);
            });
        } else {
             // Web Stream / Async Iterable
            for await (const chunk of stream) {
                fileStream.write(chunk);
            }
            fileStream.end();
        }
    } catch (error) {
        fileStream.destroy();
        throw error;
    }
};

/**
 * AudioService handles text-to-speech generation using the ElevenLabs API.
 */
export class AudioService {
  private readonly elevenlabs: ElevenLabsClient;

  constructor(apiKey: string) {
    this.elevenlabs = new ElevenLabsClient({ apiKey });
    console.log('AudioService initialized.');
  }

  public async generateVoiceOver(
    text: string,
    voiceId: string = ELEVENLABS_VOICE_ID
  ): Promise<{ filePath: string; durationInSeconds: number }> {
    
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(VOICE_CACHE_DIR, fileName);

    try {
      await fsPromises.access(filePath);
      console.log(`Cache hit for voice-over: ${fileName}`);
    } catch {
      console.log(`Cache miss. Generating new voice-over for: "${text.substring(0, 30)}..."`);
      
      const MAX_RETRIES = 5;
      const BASE_DELAY_MS = 2000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const audioStream = await this.elevenlabs.textToSpeech.convert(voiceId, {
              text,
              model_id: 'eleven_multilingual_v2',
          });

          // The SDK returns a Node.js Readable stream
          await streamToFile(audioStream as Readable, filePath);

          console.log(`Successfully generated and cached voice-over: ${fileName}`);
          break; // Success, exit retry loop

        } catch (error: any) {
           const statusCode = error?.statusCode || error?.status;
           // Handle Rate Limit (429) or other transient errors if needed
           if ((statusCode === 429 || statusCode === 401) && attempt < MAX_RETRIES) {
             const delay = BASE_DELAY_MS * attempt + Math.random() * 1000; // Exponential backoff + jitter
             console.warn(`ElevenLabs API error ${statusCode}. Retrying in ${Math.round(delay)}ms...`);
             await new Promise(resolve => setTimeout(resolve, delay));
           } else {
             console.error('Error generating audio from ElevenLabs:', error);
             throw new Error(`Failed to generate voice-over after ${attempt} attempts.`);
           }
        }
      }
    }

    try {
      const metadata = await mm.parseFile(filePath);
      if (metadata.format.duration) {
        return {
          filePath: `/voiceovers/${fileName}`,
          durationInSeconds: metadata.format.duration,
        };
      }
    } catch (error) {
      console.error('Error reading audio file metadata:', error);
    }

    throw new Error('Could not determine audio duration.');
  }
}
