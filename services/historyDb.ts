
import { HistoryItem, TranslationResult, Language } from '../types';

const DB_NAME = 'LingoBridgeDB';
const HISTORY_STORE = 'history';
const TRANSLATION_STORE = 'translations';
const DB_VERSION = 4;

interface CachedTranslation {
  id?: number;
  sourceText: string;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // History Store (User Timeline)
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
      }

      // Translation Cache Store (Unique Translations)
      // Clear old translations if version is older than 4 to support simplified schema
      if (oldVersion < 4 && db.objectStoreNames.contains(TRANSLATION_STORE)) {
         db.deleteObjectStore(TRANSLATION_STORE);
      }

      if (!db.objectStoreNames.contains(TRANSLATION_STORE)) {
        const tStore = db.createObjectStore(TRANSLATION_STORE, { keyPath: 'id', autoIncrement: true });
        // Create compound index for searching: sourceText + sourceLang + targetLang
        tStore.createIndex('search_idx', ['sourceText', 'sourceLang', 'targetLang'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveHistoryItem = async (item: Omit<HistoryItem, 'id'>): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getHistoryItems = async (): Promise<HistoryItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readonly');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result as HistoryItem[];
      resolve(items.reverse());
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Cache / Translation Database Methods ---

export const findCachedTranslation = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResult | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSLATION_STORE, 'readonly');
    const store = transaction.objectStore(TRANSLATION_STORE);
    const index = store.index('search_idx');
    
    // Normalize text for search (trim whitespace)
    const normalizedText = text.trim();
    const query = [normalizedText, sourceLang, targetLang];
    
    const request = index.get(query);

    request.onsuccess = () => {
      if (request.result) {
        const cachedItem = request.result as CachedTranslation;
        // Mark as coming from cache, even if stored as AI originally
        resolve({ ...cachedItem.result, source: 'CACHE' });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveCachedTranslation = async (
  text: string,
  sourceLang: Language,
  targetLang: Language,
  result: TranslationResult
): Promise<void> => {
  const db = await openDB();
  const normalizedText = text.trim();

  // First check if it already exists to avoid duplicates
  const exists = await new Promise<boolean>((resolve, reject) => {
    const transaction = db.transaction(TRANSLATION_STORE, 'readonly');
    const store = transaction.objectStore(TRANSLATION_STORE);
    const index = store.index('search_idx');
    const query = [normalizedText, sourceLang, targetLang];
    const request = index.getKey(query);

    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });

  if (exists) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSLATION_STORE, 'readwrite');
    const store = transaction.objectStore(TRANSLATION_STORE);
    
    const item: Omit<CachedTranslation, 'id'> = {
      sourceText: normalizedText,
      sourceLang,
      targetLang,
      result,
      timestamp: Date.now()
    };

    const request = store.add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearHistory = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
