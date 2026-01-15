import {
  GoogleGenerativeAI,
  GenerationConfig,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { NicheConfig } from '../core/types';
import { VideoScript, VideoScriptSchema } from '../core/schema';
import { QuotaService } from './QuotaService';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const DUMMY_TOPIC = "a surprising fact"; // Generic topic if none is provided

/**
 * GeminiService interacts with the Google Generative AI to generate video
 * scripts. It enforces a strict JSON output, manages API quotas, and includes
 * retry logic for rate limit errors.
 */
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly quotaService: QuotaService;

  constructor(apiKey: string, quotaService: QuotaService) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.quotaService = quotaService;
    console.log('GeminiService initialized with Quota Management.');
  }

  /**
   * Public method to generate content. It wraps the core logic with a retry mechanism.
   */
  public async generateContent(niche: NicheConfig, topic?: string): Promise<VideoScript> {
    return this.generateContentWithRetry(niche, topic);
  }

  /**
   * Generates a video script with a retry mechanism for handling rate limits.
   */
  private async generateContentWithRetry(niche: NicheConfig, topic?: string): Promise<VideoScript> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 1. Check Quota
        if (!(await this.quotaService.canMakeRequest())) {
          throw new Error('Daily API quota exceeded.');
        }

        console.log(`Generating script for niche "${niche.name}" (Attempt ${attempt})...`);

        // 2. Configure Model
        const systemInstruction = `You are a viral video scriptwriter. Your task is to generate a complete script for a short-form video.
        - Your persona and tone must be: ${niche.tone}
        - The target audience is: ${niche.targetAudience}
        - The visual style is: ${niche.visualStyle}
        - You must strictly follow the JSON schema provided.
        - The 'visualPrompt' in each scene should be a detailed instruction for an AI image generator.`;
        
        const generationConfig: GenerationConfig = {
            responseMimeType: 'application/json',
            temperature: 1.0,
        };

        const model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-pro',
          systemInstruction,
          generationConfig
        });

        // 3. Generate Content
        const prompt = `Generate a viral video script about ${topic || DUMMY_TOPIC}.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // 4. Validate and Increment Quota
        const parsedScript = VideoScriptSchema.parse(JSON.parse(responseText));
        await this.quotaService.incrementUsage();
        
        console.log('Script generated and validated successfully.');
        return parsedScript;

      } catch (error: any) {
        // 5. Handle Errors and Retry
        if (error.status === 429 && attempt < MAX_RETRIES) {
          console.warn(`Rate limit exceeded. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        } else {
          console.error('Error generating script from Gemini:', error);
          throw new Error(`Failed to generate script after ${attempt} attempts.`);
        }
      }
    }
    // This line should theoretically be unreachable
    throw new Error('Exited retry loop without success or error.');
  }
}
