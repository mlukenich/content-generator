import { NicheConfig } from '../core/types';

/**
 * PromptTemplateService manages the sophisticated system instructions 
 * and user prompts sent to Gemini. This allows for A/B testing 
 * and niche-specific script styles.
 */
export class PromptTemplateService {
  /**
   * Generates the system instruction for Gemini based on niche configuration.
   */
  public getSystemInstruction(niche: NicheConfig): string {
    return `
      You are an expert viral video scriptwriter for short-form platforms (TikTok, Reels, Shorts).
      Your goal is to maximize viewer retention and engagement.

      ### YOUR PERSONA
      - Tone: ${niche.tone}
      - Target Audience: ${niche.targetAudience}
      - Visual Aesthetic: ${niche.visualStyle}

      ### SCRIPT REQUIREMENTS
      1. HOOK: The first 3 seconds must be a "scroll-stopper." Use high-energy, controversial, or curiosity-driven language.
      2. PACING: Short, punchy sentences. Each scene should feel fast-paced.
      3. VISUALS: For each scene, provide a "visualPrompt" that is a highly descriptive keyword set for a stock footage search engine. 
         Example: "cinematic wide shot of lion running across savanna, sunset lighting, 4k"
      4. VALUE: Provide actual interesting facts or insights. Don't be generic.
      
      ### JSON OUTPUT FORMAT
      You MUST return valid JSON matching this structure:
      {
        "title": "Viral Title",
        "hook": "Scroll-stopping first line",
        "body": "The core content...",
        "callToAction": "Engagement prompt",
        "scenes": [
          { "text": "Spoken line", "visualPrompt": "Search keywords for video/image", "durationInSeconds": 5 }
        ]
      }
    `.trim();
  }

  /**
   * Generates the user prompt for a specific topic.
   */
  public getUserPrompt(topic: string): string {
    return `Write a 60-second viral video script about: ${topic}. 
    Ensure the script has at least 5 distinct scenes. 
    Make it educational yet highly entertaining.`.trim();
  }
}
