
import { GoogleGenAI, Type } from "@google/genai";
import { Language, TranslationResult } from "../types";

export const translateAndAnalyze = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResult> => {
  const ai = new GoogleGenAI({ apiKey: "AIzaSyA-BrGa0sACnNYKcCPTBw0_3Ec7FpNM6eA"});
  
  const prompt = `
    Role: Translator.
    Task: Translate "${text}" from ${sourceLang} to ${targetLang}.

    STRICT OUTPUT RULES:
    1. Output MUST be valid JSON.
    2. NO ROMAJI (Latin Characters). Use ONLY Japanese scripts (Hiragana/Katakana) for readings.
    3. NO EXPLANATIONS. NO PART OF SPEECH. Keep it simple.
    4. Reading for DZONGKHA MUST be in KATAKANA.
    5. Reading for JAPANESE MUST be in HIRAGANA.

    JSON Structure:
    {
      "sourceTransliteration": "Reading of source in Japanese script",
      "targetText": "Translation",
      "targetTransliteration": "Reading of target in Japanese script",
      "breakdown": [
        {
          "original": "Target word",
          "sourceTerm": "Exact corresponding Source word",
          "translated": "Simple Meaning (in Japanese)",
          "transliteration": "Reading of Target word (in Japanese script)"
        }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.1, 
      topP: 0.95,
      topK: 40,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sourceTransliteration: { type: Type.STRING },
          targetText: { type: Type.STRING },
          targetTransliteration: { type: Type.STRING },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                sourceTerm: { type: Type.STRING },
                translated: { type: Type.STRING },
                transliteration: { type: Type.STRING }
              },
              required: ["original", "sourceTerm", "translated"]
            }
          }
        },
        required: ["sourceTransliteration", "targetText", "targetTransliteration", "breakdown"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return {
    sourceText: text,
    sourceTransliteration: data.sourceTransliteration,
    targetText: data.targetText,
    targetTransliteration: data.targetTransliteration,
    breakdown: data.breakdown,
    language: targetLang,
    source: 'AI'
  };
};
