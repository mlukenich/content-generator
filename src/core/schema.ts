import { z } from 'zod';

/**
 * Zod schema for validating NicheConfig objects at runtime.
 */
export const NicheConfigSchema = z.object({
  name: z.string().min(1),
  tone: z.string().min(1),
  targetAudience: z.string().min(1),
  visualStyle: z.string().min(1),
  promptTemplate: z.string().min(1),
});

/**
 * Defines the schema for a single scene in the video.
 * Each scene has dialogue, a visual description for an asset generation model,
 * and a specific duration.
 */
export const SceneSchema = z.object({
  text: z.string().describe("The spoken text or voiceover for this scene."),
  visualPrompt: z.string().describe("A detailed prompt for an image/video generation model to create the visual for this scene."),
  durationInSeconds: z.number().positive().describe("The duration of this scene in seconds.").optional().default(5),
});

/**
 * Defines the strict schema for the entire video script output from Gemini.
 * Enforcing this schema ensures that the AI's output is always structured
 * and ready for the video rendering engine.
 */
export const VideoScriptSchema = z.object({
  title: z.string().describe("A catchy, viral-style title for the video."),
  hook: z.string().describe("A short, engaging hook to capture the viewer's attention in the first 3 seconds."),
  body: z.string().describe("The main content of the video script, delivered after the hook."),
  callToAction: z.string().describe("A call to action at the end of the video (e.g., 'Follow for more!')."),
  scenes: z.array(SceneSchema).min(1).describe("An array of scenes that make up the video."),
});

// Infer the TypeScript type from the Zod schema
export type VideoScript = z.infer<typeof VideoScriptSchema>;
