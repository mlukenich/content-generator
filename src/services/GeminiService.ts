import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { NicheConfig } from '../core/types';
import { VideoScript, VideoScriptSchema } from '../core/schema';
import { QuotaService } from './QuotaService';
import { PromptTemplateService } from './PromptTemplateService';
import { logError, logInfo, logWarn } from '../core/logging';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;
const DUMMY_TOPIC = 'a surprising fact';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Gemini request timeout after ${timeoutMs}ms.`)), timeoutMs);
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

function sanitizeJsonResponse(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly quotaService: QuotaService;
  private readonly promptService: PromptTemplateService;

  constructor(
    apiKey: string, 
    quotaService: QuotaService, 
    promptService: PromptTemplateService = new PromptTemplateService()
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.quotaService = quotaService;
    this.promptService = promptService;
    logInfo('GeminiService initialized.', { phase: 'gemini_init' });
  }

  public async generateContent(niche: NicheConfig, topic?: string): Promise<VideoScript> {
    if (process.env.SKIP_AI === 'true') {
        logInfo('SKIP_AI is true, using mock content.', { phase: 'gemini_mock', niche: niche.name });
        return {
            title: `Mock Video for ${niche.name}`,
            scenes: [
                { text: "This is a mock scene 1", visualPrompt: "Cinematic shot of a lion" },
                { text: "This is a mock scene 2", visualPrompt: "Golden eagle flying over mountains" }
            ]
        };
    }
    return this.generateContentWithRetry(niche, topic);
  }

  private async generateContentWithRetry(niche: NicheConfig, topic?: string): Promise<VideoScript> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const startedAt = Date.now();
      try {
        if (!(await this.quotaService.canMakeRequest())) {
          throw new Error('Daily API quota exceeded.');
        }

        logInfo('Generating script via Gemini.', {
          phase: 'script_generation',
          niche: niche.name,
          attempt,
        });

        const systemInstruction = this.promptService.getSystemInstruction(niche);

        const generationConfig: GenerationConfig = {
          responseMimeType: 'application/json',
          temperature: 1.0,
        };

        const model = this.genAI.getGenerativeModel({
          model: 'gemini-2.0-flash', // Updated to 2.0 Flash for cost/speed
          systemInstruction,
          generationConfig,
        });

        const prompt = this.promptService.getUserPrompt(topic || DUMMY_TOPIC);
        const result = await withTimeout(model.generateContent(prompt), REQUEST_TIMEOUT_MS);
        const response = await result.response;
        const responseText = sanitizeJsonResponse(response.text());

        const parsedScript = VideoScriptSchema.parse(JSON.parse(responseText));
        await this.quotaService.incrementUsage();

        logInfo('Script generated and validated.', {
          phase: 'script_generation_success',
          niche: niche.name,
          attempt,
          durationMs: Date.now() - startedAt,
        });

        return parsedScript;
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimit = error?.status === 429;

        if (isRateLimit && attempt < MAX_RETRIES) {
          logWarn('Gemini rate limited; retrying.', {
            phase: 'script_generation_retry',
            niche: niche.name,
            attempt,
            errorType: 'RateLimit',
            errorMessage,
            durationMs: Date.now() - startedAt,
          });
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }

        logError('Error generating script from Gemini.', {
          phase: 'script_generation_error',
          niche: niche.name,
          attempt,
          errorType: error?.name || 'GeminiError',
          errorMessage,
          stack: error?.stack,
          durationMs: Date.now() - startedAt,
        });
        throw new Error(`Failed to generate script after ${attempt} attempts.`);
      }
    }

    throw new Error('Exited retry loop without success or error.');
  }
}
