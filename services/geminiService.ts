
import { Language, TranslationResult } from "../types";

const API_URL = "https://script.google.com/macros/s/AKfycbyLc-WBmyCcUOZWSzmWD44Lp37eHveV_8wLGUGtqhTj4mDXg4BZlkasgGbF72lP9qi4/exec";

export const translateAndAnalyze = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResult> => {
  
  // Get reference translation from custom translation API
  let referenceTranslation = "";
  if (targetLang === "Dzongkha") {
    try {
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbyLc-WBmyCcUOZWSzmWD44Lp37eHveV_8wLGUGtqhTj4mDXg4BZlkasgGbF72lP9qi4/exec?action=translate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: text
          }),
          mode: 'cors',
          credentials: 'omit'
        }
      );
      const data = await res.json();
      if (data.status === "success") {
        referenceTranslation = data.text;
      }
    } catch (error) {
      console.error("Failed to fetch reference translation (CORS issue?):", error);
      console.log("Continuing without reference translation...");
    }
  }
  
  const message = `
Role: Translator.
Task: Translate "${text}" from ${sourceLang} to ${targetLang}.
${referenceTranslation ? `Reference Translation: "${referenceTranslation}"` : ""}

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

  const response = await fetch(API_URL + "?action=chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message
    })
  });

  const result = await response.json();
  const data = JSON.parse(result.reply || '{}');
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
