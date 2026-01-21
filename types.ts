
export enum Language {
  JAPANESE = 'Japanese',
  DZONGKHA = 'Dzongkha'
}

export interface WordBreakdown {
  original: string;
  sourceTerm: string;
  translated: string;
  transliteration?: string;
}

export interface TranslationResult {
  sourceText: string;
  sourceTransliteration: string;
  targetText: string;
  targetTransliteration: string;
  breakdown: WordBreakdown[];
  language: Language;
  source?: 'AI' | 'CACHE';
}

export interface HistoryItem {
  id?: number;
  timestamp: number;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult;
}

export interface AppState {
  inputText: string;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult | null;
  isLoading: boolean;
  isSpeaking: boolean;
  isSpeakingSource: boolean;
  error: string | null;
  viewMode: 'translate' | 'history';
  history: HistoryItem[];
}
