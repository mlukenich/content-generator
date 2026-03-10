import { test, expect, describe, mock, afterEach, beforeAll } from 'bun:test';
import { GeminiService } from './GeminiService';
import { QuotaService } from './QuotaService';
import { CRAZY_ANIMAL_FACTS } from '../config/NicheDefinitions';
import { VideoScriptSchema } from '../core/schema';

/**
 * ==================================================================================
 * TESTS FOR: GeminiService
 * ==================================================================================
 * This suite tests the GeminiService, focusing on its ability to correctly
 * format prompts, handle API responses, and interact with the QuotaService.
 *
 * Mocks are used for:
 * - `QuotaService`: To isolate the GeminiService from actual database calls.
 * - `@google/generative-ai`: To simulate API responses from Gemini without
 *   making real, costly network requests.
 * ==================================================================================
 */

const mockCanMakeRequest = mock(async () => true);
const mockIncrementUsage = mock(async () => {});

// Mock the QuotaService
mock.module('./QuotaService', () => {
  return {
    QuotaService: class {
      canMakeRequest = mockCanMakeRequest;
      incrementUsage = mockIncrementUsage;
    },
  };
});

// Mock the Google Generative AI client
const mockGenerateContent = mock(async () => {});
mock.module('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = () => ({
        generateContent: mockGenerateContent,
      });
    },
  };
});


describe('GeminiService', () => {
  let quotaService: QuotaService;
  let geminiService: GeminiService;

  const MOCK_API_KEY = 'test-api-key';

  // Initialize services once for all tests
  beforeAll(() => {
    quotaService = new QuotaService();
    geminiService = new GeminiService(MOCK_API_KEY, quotaService);
  });

  afterEach(() => {
    mockGenerateContent.mockClear();
    mockCanMakeRequest.mockClear();
    mockIncrementUsage.mockClear();
  });

  test('should check quota before making a request', async () => {
    // Arrange
    const mockResponse = {
      title: 'Test',
      hook: 'Hook',
      body: 'Body',
      callToAction: 'CTA',
      scenes: [{ text: 'Scene 1', visualPrompt: 'Prompt 1', durationInSeconds: 5 }],
    };
    mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
    });

    // Act
    await geminiService.generateContent(CRAZY_ANIMAL_FACTS);

    // Assert
    expect(mockCanMakeRequest).toHaveBeenCalledTimes(1);
  });

  test('should throw an error if quota is exceeded', async () => {
    // Arrange
    mockCanMakeRequest.mockResolvedValueOnce(false);

    // Act & Assert
    await expect(geminiService.generateContent(CRAZY_ANIMAL_FACTS)).rejects.toThrow('Failed to generate script after 1 attempts.');
    
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('should correctly parse a valid JSON response from Gemini', async () => {
    // Arrange
    const mockScript = {
      title: 'Amazing Mantis Shrimp!',
      hook: "Did you know there's a shrimp that can punch through glass?",
      body: "It's the mantis shrimp, and its claws accelerate faster than a .22 caliber bullet.",
      callToAction: "Follow for more insane facts!",
      scenes: [
        {
          text: "A colorful mantis shrimp in its natural habitat.",
          visualPrompt: "A hyper-realistic, vibrant mantis shrimp in a coral reef, 4k, National Geographic style.",
          durationInSeconds: 5,
        },
      ],
    };
    mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockScript) }
    });

    // Act
    const result = await geminiService.generateContent(CRAZY_ANIMAL_FACTS);
    
    // Assert
    expect(() => VideoScriptSchema.parse(result)).not.toThrow();
    expect(result.title).toBe(mockScript.title);
    expect(mockIncrementUsage).toHaveBeenCalledTimes(1);
  });

  test('should throw an error for an invalid JSON response', async () => {
    // Arrange
    const invalidResponse = { title: 'Incomplete' }; // Missing required fields
    mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(invalidResponse) }
    });

    // Act & Assert
    await expect(geminiService.generateContent(CRAZY_ANIMAL_FACTS)).rejects.toThrow();
      
    // Should not increment usage if parsing fails
    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });
});
