import { NicheConfig } from '../core/types';

/**
 * ==================================================================================
 * NICHE DEFINITIONS
 * ==================================================================================
 * This file contains the concrete definitions for various content niches.
 * To create a new content vertical, simply add a new NicheConfig object to this
 * array. The rest of the system will dynamically adapt to the new configuration.
 * ==================================================================================
 */

export const CRAZY_ANIMAL_FACTS: NicheConfig = {
  name: 'Crazy Animal Facts',
  tone: 'Excited, sensational, and slightly humorous.',
  targetAudience: 'Teens and young adults on TikTok and YouTube Shorts.',
  visualStyle: 'Fast-paced cuts, stock footage of animals, bold text overlays, and an energetic background track.',
  promptTemplate: `
    Generate a 30-second video script about a crazy animal fact.
    The script should have two parts: a spoken script for a voiceover, and a list of visual cues for the video editor.
    - The tone must be: {tone}
    - The target audience is: {targetAudience}
    - The visual style should be: {visualStyle}

    Here is the topic for today: {topic}

    Output the result as a JSON object with two keys: "script" and "visuals".
    The "script" should be a single string.
    The "visuals" should be an array of strings, describing each scene.
  `,
};

export const ANCIENT_HISTORY_SECRETS: NicheConfig = {
  name: 'Ancient History Secrets',
  tone: 'Mysterious, intriguing, and educational.',
  targetAudience: 'History enthusiasts and curious minds on YouTube and Instagram Reels.',
  visualStyle: 'Cinematic shots of historical sites, ancient artifacts, and map animations. A deep, narrative voiceover with orchestral background music.',
  promptTemplate: `
    Create a 45-second video script revealing a secret or a lesser-known fact about ancient history.
    The script needs a voiceover narrative and a corresponding list of detailed visual prompts.
    - The tone must be: {tone}
    - The target audience is: {targetAudience}
    - The visual style is: {visualStyle}

    Today's historical topic is: {topic}

    Return the output as a JSON object with "script" and "visuals" keys.
    The "script" should be a compelling narrative.
    The "visuals" should be an array of strings describing scenes that match the narrative.
  `,
};

// Array of all available niches
export const availableNiches: NicheConfig[] = [
  CRAZY_ANIMAL_FACTS,
  ANCIENT_HISTORY_SECRETS,
];
