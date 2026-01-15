import { ElevenLabsClient } from "elevenlabs-node";
import * as mm from 'music-metadata';
import { promises as fsPromises, createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';

const VOICE_CACHE_DIR = path.join(process.cwd(), 'public', 'voiceovers');
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Example voice ID

// Helper to write a stream to a file
const streamToFile = (stream: Readable, path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const fileStream = createWriteStream(path);
        stream.pipe(fileStream);
        stream.on('end', resolve);
        stream.on('error', reject);
    });
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
      try {
        const audioStream = await this.elevenlabs.textToSpeechStream({
            text,
            voiceId,
            modelId: 'eleven_multilingual_v2',
        });

        await streamToFile(audioStream, filePath);

        console.log(`Successfully generated and cached voice-over: ${fileName}`);
      } catch (error) {
        console.error('Error generating audio from ElevenLabs:', error);
        throw new Error('Failed to generate voice-over.');
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
