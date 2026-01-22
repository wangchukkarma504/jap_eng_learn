
import { Language, TranslationResult } from "../types";

const API_URL = "https://script.google.com/macros/s/AKfycbzlnBpSkj5YT8PP_h2GzuoEwBMxubMvenUPCK7DIgT0b1dQuXnxkb0GPlDZYvOWjA/exec";

export const translateAndAnalyze = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResult> => {
  
  // Get reference translation from custom translation API
  let referenceTranslation = "";
  if (targetLang === "Dzongkha") {
    try {
      const res = await fetch(API_URL + "?action=translate", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          text: text
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.status === "success") {
        referenceTranslation = data.text;
      } else if (data.error) {
        console.error("Translate API error:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch reference translation:", error);
      console.error("Error details:", error.message);
    }
  }
  
  const message = `
Generate pronunciation guide in XML format.

Source: "${text}" (Japanese)
Translation: "${referenceTranslation}" (Dzongkha)

CRITICAL RULES:
- Japanese source: Convert to Hiragana reading (e.g., お元気 → おげんき)
- Dzongkha translation: Convert to Katakana pronunciation (e.g., བཀྲ་ཤིས་ → タシ)
- NO romanization (no Latin letters)
- NO placeholder text - use actual transliterations
- Output XML only, NO markdown blocks.

Example format:
<response>
  <sourceTransliteration>おげんきですか</sourceTransliteration>
  <targetText>ཁྱོད་ག་དེ་སྦེ་འདུག།</targetText>
  <targetTransliteration>キョー ガデベ ドゥッ</targetTransliteration>
  <breakdown>
    <word>
      <original>ཁྱོད་</original>
      <sourceTerm>あなた</sourceTerm>
      <translated>あなた</translated>
      <transliteration>キョー</transliteration>
    </word>
  </breakdown>
</response>
  `;

  const messages = [{ role: "user", content: message }];

  const response = await fetch(API_URL + "?action=chat", {
    method: "POST",
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      provider: "gemini",
      messages: messages
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`API error: ${result.error}`);
  }
  
  // Extract XML from the reply
  let data;
  try {
    // Remove markdown code block markers if present
    let cleanedReply = result.reply
      .replace(/```xml\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log("Cleaned reply:", cleanedReply);
    
    const xmlMatch = cleanedReply.match(/<response>[\s\S]*?<\/response>/);
    const xmlString = xmlMatch ? xmlMatch[0] : cleanedReply;
    
    console.log("XML String:", xmlString);
    
    // Parse XML manually (simple parser for our specific structure)
    const getTagContent = (tag: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const match = xmlString.match(regex);
      const content = match ? match[1].trim() : '';
      console.log(`Tag ${tag}:`, content, 'Match:', match);
      return content;
    };
    
    const breakdownMatch = xmlString.match(/<breakdown>([\s\S]*?)<\/breakdown>/);
    const breakdown = [];
    if (breakdownMatch) {
      const wordMatches = breakdownMatch[1].matchAll(/<word>([\s\S]*?)<\/word>/g);
      for (const wordMatch of wordMatches) {
        const wordXml = wordMatch[1];
        breakdown.push({
          original: wordXml.match(/<original>([\s\S]*?)<\/original>/)?.[1].trim() || '',
          sourceTerm: wordXml.match(/<sourceTerm>([\s\S]*?)<\/sourceTerm>/)?.[1].trim() || '',
          translated: wordXml.match(/<translated>([\s\S]*?)<\/translated>/)?.[1].trim() || '',
          transliteration: wordXml.match(/<transliteration>([\s\S]*?)<\/transliteration>/)?.[1].trim() || ''
        });
      }
    }
    
    data = {
      sourceTransliteration: getTagContent('sourceTransliteration'),
      targetText: getTagContent('targetText'),
      targetTransliteration: getTagContent('targetTransliteration'),
      breakdown
    };
    
    console.log("Parsed data:", data);
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.log("Raw reply:", result.reply);
    throw new Error("Failed to parse translation response");
  }
  
  const finalResult = {
    sourceText: text,
    sourceTransliteration: data.sourceTransliteration,
    targetText: data.targetText,
    targetTransliteration: data.targetTransliteration,
    breakdown: data.breakdown,
    language: targetLang,
    source: 'AI' as const
  };
  
  console.log("Final result being returned:", finalResult);
  
  return finalResult;
};
