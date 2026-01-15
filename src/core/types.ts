
/**
 * Defines the configuration for a content niche. This object drives the AI's content
 * generation process, ensuring that all output is tailored to a specific theme,
 * tone, and audience.
 */
export interface NicheConfig {
  name: string;
  tone: string;
  targetAudience: string;
  visualStyle: string;
  promptTemplate: string;
}

/**
 * Represents the essential metadata for a video to be published on a social platform.
 * This data is generated after the script is created and before publishing.
 */
export interface VideoMetadata {
  title: string;
  description: string;
  hashtags: string[];
  videoFilePath: string; // Path to the rendered video file
}

/**
 * Defines the final data structure that is passed to the Remotion rendering engine.
 * It contains all necessary information to construct the video, including text,
 * resolved asset URLs, and scene timings.
 */
export interface RenderManifest {
    title: string;
    scenes: {
        text: string;
        assetUrl: string;
        audioUrl: string;
        durationInSeconds: number;
    }[];
}

/**
 * Defines the data payload for a job that will be processed by the render worker.
 * This object contains all necessary information for a sandboxed process to
 * execute a video render.
 */
export interface RenderJob {
    videoId: number;
    // The nicheConfig is included to provide context, though the manifest
    // is the primary source of truth for the render itself.
    nicheConfig: NicheConfig;
    outputDestination: string;
}
