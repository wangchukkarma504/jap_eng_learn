import { HistoryItem, TranslationResult, Language, ReviewStatus, EditLock } from '../types';
import { database } from './firebase';
import { ref, push, set, get, query, orderByChild, equalTo, limitToLast, remove, update, onValue, off } from 'firebase/database';

interface CachedTranslation {
  sourceText: string;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult;
  timestamp: number;
}

// Generate a unique user ID or use existing one from localStorage
const getUserId = (): string => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
};

const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

export const saveHistoryItem = async (item: Omit<HistoryItem, 'id'>, status: ReviewStatus = 'review'): Promise<string> => {
  const collectionName = status === 'review' ? 'review' : 'library';
  const collectionRef = ref(database, collectionName);
  const newItemRef = push(collectionRef);
  await set(newItemRef, {
    ...item,
    id: newItemRef.key,
    status
  });
  return newItemRef.key!;
};

export const getHistoryItems = async (): Promise<HistoryItem[]> => {
  const libraryRef = ref(database, 'library');
  const snapshot = await get(libraryRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.val();
  const items: HistoryItem[] = Object.values(data);
  
  // Sort by timestamp descending (newest first)
  return items.sort((a, b) => b.timestamp - a.timestamp);
};

export const getReviewItems = async (): Promise<HistoryItem[]> => {
  const reviewRef = ref(database, 'review');
  const snapshot = await get(reviewRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.val();
  const items: HistoryItem[] = Object.values(data);
  
  // Sort by timestamp descending (newest first)
  return items.sort((a, b) => b.timestamp - a.timestamp);
};

// Real-time listener for review items
export const subscribeToReviewItems = (callback: (items: HistoryItem[]) => void) => {
  const reviewRef = ref(database, 'review');
  
  const unsubscribe = onValue(reviewRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const data = snapshot.val();
    const items: HistoryItem[] = Object.values(data);
    const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp);
    callback(sortedItems);
  });
  
  return unsubscribe;
};

// Real-time listener for library items
export const subscribeToLibraryItems = (callback: (items: HistoryItem[]) => void) => {
  const libraryRef = ref(database, 'library');
  
  const unsubscribe = onValue(libraryRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const data = snapshot.val();
    const items: HistoryItem[] = Object.values(data);
    const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp);
    callback(sortedItems);
  });
  
  return unsubscribe;
};

// Acquire edit lock
export const acquireEditLock = async (itemId: string, collection: 'review' | 'library'): Promise<boolean> => {
  const userId = getUserId();
  const itemRef = ref(database, `${collection}/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (!snapshot.exists()) {
    return false;
  }
  
  const item = snapshot.val() as HistoryItem;
  const now = Date.now();
  
  // Check if already locked
  if (item.editLock) {
    // Check if lock expired
    if (item.editLock.expiresAt > now) {
      // Lock still valid
      if (item.editLock.userId === userId) {
        // User already has the lock, extend it
        const newLock: EditLock = {
          userId,
          timestamp: now,
          expiresAt: now + LOCK_DURATION
        };
        await update(itemRef, { editLock: newLock });
        return true;
      }
      return false; // Someone else has the lock
    }
  }
  
  // Acquire lock
  const newLock: EditLock = {
    userId,
    timestamp: now,
    expiresAt: now + LOCK_DURATION
  };
  
  await update(itemRef, { editLock: newLock });
  return true;
};

// Release edit lock
export const releaseEditLock = async (itemId: string, collection: 'review' | 'library'): Promise<void> => {
  const userId = getUserId();
  const itemRef = ref(database, `${collection}/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (!snapshot.exists()) {
    return;
  }
  
  const item = snapshot.val() as HistoryItem;
  
  // Only release if this user owns the lock
  if (item.editLock?.userId === userId) {
    await update(itemRef, { editLock: null });
  }
};

// Check if item is locked by another user
export const isItemLocked = (item: HistoryItem): boolean => {
  if (!item.editLock) return false;
  
  const userId = getUserId();
  const now = Date.now();
  
  // Check if lock expired
  if (item.editLock.expiresAt <= now) {
    return false;
  }
  
  // Check if locked by another user
  return item.editLock.userId !== userId;
};

// Find existing translation in library or review (replaces cache lookup)
export const findCachedTranslation = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResult | null> => {
  const normalizedText = text.trim();
  
  // Check library first
  const libraryRef = ref(database, 'library');
  const librarySnapshot = await get(libraryRef);
  
  if (librarySnapshot.exists()) {
    const data = librarySnapshot.val();
    const items: HistoryItem[] = Object.values(data);
    
    const match = items.find(item => 
      item.result.sourceText.trim() === normalizedText &&
      item.sourceLang === sourceLang &&
      item.targetLang === targetLang
    );
    
    if (match) {
      console.log("Found in library:", match);
      return { ...match.result, source: 'CACHE' };
    }
  }
  
  // Check review next
  const reviewRef = ref(database, 'review');
  const reviewSnapshot = await get(reviewRef);
  
  if (reviewSnapshot.exists()) {
    const data = reviewSnapshot.val();
    const items: HistoryItem[] = Object.values(data);
    
    const match = items.find(item => 
      item.result.sourceText.trim() === normalizedText &&
      item.sourceLang === sourceLang &&
      item.targetLang === targetLang
    );
    
    if (match) {
      console.log("Found in review:", match);
      return { ...match.result, source: 'CACHE' };
    }
  }
  
  return null;
};

// Save to library (replaces cache save)
export const saveCachedTranslation = async (
  text: string,
  sourceLang: Language,
  targetLang: Language,
  result: TranslationResult
): Promise<void> => {
  // No need to save separately - already saved in library via saveHistoryItem
  console.log("Translation already in library");
};

export const clearHistory = async (): Promise<void> => {
  const libraryRef = ref(database, 'library');
  await remove(libraryRef);
};

export const updateLibraryItem = async (itemId: string, updates: Partial<HistoryItem>): Promise<void> => {
  const itemRef = ref(database, `library/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (snapshot.exists()) {
    const currentData = snapshot.val();
    await set(itemRef, {
      ...currentData,
      ...updates,
      lastModified: Date.now()
    });
  }
};

export const approveReviewItem = async (itemId: string): Promise<void> => {
  console.log("Approving item:", itemId);
  
  // Get the item from review
  const reviewItemRef = ref(database, `review/${itemId}`);
  const snapshot = await get(reviewItemRef);
  
  if (!snapshot.exists()) {
    console.log("Review item not found");
    return;
  }
  
  const reviewItem = snapshot.val() as HistoryItem;
  console.log("Moving to library:", reviewItem);
  
  // Add to library with approved status
  const libraryRef = ref(database, 'library');
  const newLibraryRef = push(libraryRef);
  await set(newLibraryRef, {
    ...reviewItem,
    id: newLibraryRef.key,
    status: 'approved',
    approvedAt: Date.now()
  });
  
  // Remove from review
  await remove(reviewItemRef);
  console.log("Item approved and moved to library");
};

export const updateCachedTranslation = async (
  text: string,
  sourceLang: Language,
  targetLang: Language,
  updates: Partial<TranslationResult>
): Promise<void> => {
  const normalizedText = text.trim();
  
  console.log("updateCachedTranslation called with:", { text: normalizedText, sourceLang, targetLang, updates });
  
  // Check both library and review
  for (const collection of ['library', 'review']) {
    const collectionRef = ref(database, collection);
    const snapshot = await get(collectionRef);
    
    if (!snapshot.exists()) {
      continue;
    }
    
    const data = snapshot.val();
    const entries = Object.entries(data) as [string, HistoryItem][];
    
    console.log(`Searching in ${collection}:`, entries.length, "items");
    
    // Find matching translation
    const match = entries.find(([_, item]) => 
      item.result.sourceText.trim() === normalizedText &&
      item.sourceLang === sourceLang &&
      item.targetLang === targetLang
    );
    
    if (match) {
      const [itemId, currentData] = match;
      console.log("Found match in", collection, ":", itemId, currentData);
      
      const itemRef = ref(database, `${collection}/${itemId}`);
      const updatedData = {
        ...currentData,
        result: {
          ...currentData.result,
          ...updates
        },
        lastModified: Date.now()
      };
      
      console.log("Updating Firebase with:", updatedData);
      await set(itemRef, updatedData);
      console.log("Firebase update successful");
      return;
    }
  }
  
  console.log("No matching translation found");
};
