
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

export type ReviewStatus = 'review' | 'approved';

export interface EditLock {
  userId: string;
  timestamp: number;
  expiresAt: number;
}

export interface HistoryItem {
  id?: number | string;
  timestamp: number;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult;
  status: ReviewStatus;
  editLock?: EditLock;
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
