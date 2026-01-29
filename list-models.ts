import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // The SDK might not expose listModels directly on the main class in older versions,
    // but let's try to access the model manager if available, or just use a raw fetch.
    // Actually, usually it's a separate manager.
    // Let's try raw fetch to be safe and version-agnostic.
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
        console.log("Available Models:");
        data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods?.includes('generateContent')) {
                console.log(`- ${m.name} (${m.version})`);
            }
        });
    } else {
        console.log("No models found or error:", data);
    }

  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
