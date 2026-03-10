export interface AudioProvider {
  generate(text: string, voiceId?: string): Promise<Buffer>;
}

export class ElevenLabsProvider implements AudioProvider {
  constructor(private apiKey: string) {}
  
  public async generate(text: string, voiceId?: string): Promise<Buffer> {
    // Real implementation would use the elevenlabs-node library here
    throw new Error('ElevenLabs implementation not yet complete.');
  }
}

export class MockAudioProvider implements AudioProvider {
  public async generate(text: string, voiceId?: string): Promise<Buffer> {
    return Buffer.from('mock audio content');
  }
}
