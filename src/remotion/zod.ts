import { z } from 'zod';

/**
 * Zod schema for a single scene's data structure within Remotion.
 * This ensures the props passed to each scene component are valid.
 */
export const ZodScene = z.object({
	text: z.string(),
	assetUrl: z.string(),
  audioUrl: z.string(),
	durationInSeconds: z.number().positive(),
});

/**
 * Zod schema for the entire RenderManifest object passed as props
 * to the root Remotion composition.
 */
export const ZodRenderManifest = z.object({
	title: z.string(),
	scenes: z.array(ZodScene),
});
