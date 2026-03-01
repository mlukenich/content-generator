import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockTextToSpeechStream = mock(async () => {
  throw new Error('provider unavailable');
});

const mockParseFile = mock(async () => ({ format: { duration: 2.5 } }));
const mockAccess = mock(async () => {
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
    mockAccess.mockResolvedValueOnce(undefined);
    const service = new AudioService('test-key');
    const result = await service.generateVoiceOver('cached text');

    expect(result.durationInSeconds).toBe(2.5);
    expect(result.filePath).toContain('/voiceovers/');
    expect(mockTextToSpeechStream).not.toHaveBeenCalled();
  });
});
