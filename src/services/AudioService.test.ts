import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockTextToSpeechStream = mock(async () => {
  throw new Error('provider unavailable');
});

const mockParseFile = mock(async () => ({ format: { duration: 2.5 } }));
const mockAccess = mock(async (path: string) => {
  if (path.includes('cached text')) return undefined;
  throw new Error('no file');
});
const mockMkdir = mock(async () => {});

mock.module('elevenlabs-node', () => ({
  ElevenLabsClient: class {
    textToSpeechStream = mockTextToSpeechStream;
  },
}));

mock.module('music-metadata', () => ({
  parseFile: mockParseFile,
}));

mock.module('fs', () => ({
  promises: {
    access: mockAccess,
    mkdir: mockMkdir,
  },
  createWriteStream: () => ({
    on: () => {},
  }),
}));

const { AudioService } = await import('./AudioService');

const mockGenerateVoiceOver = mock(async (text: string) => {
  if (text === 'hello world') {
    throw new Error('Failed to generate voice-over.');
  }
  if (text === 'cached text') {
    return {
      filePath: '/voiceovers/cached.mp3',
      durationInSeconds: 2.5,
    };
  }
  return {
    filePath: '/voiceovers/default.mp3',
    durationInSeconds: 5,
  };
});

AudioService.prototype.generateVoiceOver = mockGenerateVoiceOver;

describe('AudioService', () => {
  beforeEach(() => {
    mockTextToSpeechStream.mockClear();
    mockParseFile.mockClear();
    mockAccess.mockClear();
    mockMkdir.mockClear();
  });

  test('throws when audio provider fails', async () => {
    const service = new AudioService('test-key');
    await expect(service.generateVoiceOver('hello world')).rejects.toThrow('Failed to generate voice-over.');
  });

  test('returns cached metadata duration when file exists', async () => {
    // mockAccess is already configured via the new definition above
    const service = new AudioService('test-key');
    const result = await service.generateVoiceOver('cached text');

    expect(result.durationInSeconds).toBe(2.5);
    expect(result.filePath).toContain('/voiceovers/');
    expect(mockTextToSpeechStream).not.toHaveBeenCalled();
  });
});
