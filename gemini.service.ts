
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

export interface GenerationOptions {
  prompt: string;
  language: string;
  type: string;
  tone: string;
  length: string;
  useSearch: boolean;
  useThinking: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async generateText(options: GenerationOptions): Promise<GenerateContentResponse> {
    const { prompt, language, type, tone, length, useSearch, useThinking } = options;

    // Construct the System Instruction / Persona based on "OmniWriter" spec
    const systemInstruction = `
      Identity: You are "OmniWriter" (نووسەری زیرەک), an advanced AI writing assistant and "Maestro of Words".
      Role: Expert writer capable of adapting style, tone, and format to any request.
      Goal: Provide effective, error-free, creative, and engaging writing.
      
      Capabilities:
      - Types: Essay, Story, Script, Academic Report, Email, Social Media Post, Poetry, Copywriting, Summarization.
      - Fields: Literary, Scientific, Business, Technology, History, Psychology, and more.
      - Languages: Expert in Kurdish (Sorani & Badini), Arabic, English, and others.
      - Tones: Formal, Humorous, Emotional, Motivational, Scientific.

      Operational Rules:
      - Quality: Avoid repetition and meaningless words.
      - Formatting: Use Bolding, Bullet points, and Headings to organize text.
      - Language Accuracy: 
        - For Kurdish (Sorani): Use standard Central Kurdish orthography.
        - For Kurdish (Badini): Use standard Northern Kurdish grammar.
        - Ensure proper RTL handling for Kurdish and Arabic.

      Current Request Constraints:
      - Language: ${language}
      - Type: ${type}
      - Tone: ${tone}
      - Length: ${length}

      Instructions:
      - Generate ONLY the content requested.
      - Do not include markdown code fences (like \`\`\`) unless specifically asked for code.
    `;

    const userPrompt = `Subject/Topic: ${prompt}`;

    // Always use gemini-2.5-flash as per current SDK guidelines
    const modelId = 'gemini-2.5-flash';
    
    let config: any = {
      systemInstruction: systemInstruction,
    };

    if (useThinking) {
      // Thinking Config for Gemini 2.5 Flash
      config = {
        ...config,
        thinkingConfig: { thinkingBudget: 2048 } // Reasonable budget for creative writing
      };
    } else if (useSearch) {
      // Search Tool
      config = {
        ...config,
        tools: [{ googleSearch: {} }]
      };
    }

    try {
      const response = await this.genAI.models.generateContent({
        model: modelId,
        contents: userPrompt,
        config: config
      });
      return response;
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      throw error;
    }
  }
}
