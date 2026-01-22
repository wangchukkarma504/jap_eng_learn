
import React, { useState, useEffect } from 'react';
import { TranslationResult, Language, ReviewStatus } from '../types';
import WordBreakdown from './WordBreakdown';
import { translations, UILanguage } from '../lang';
import { updateCachedTranslation, acquireEditLock, releaseEditLock, isItemLocked } from '../services/historyDb';

interface Props {
  result: TranslationResult;
  sourceLang: Language;
  targetLang: Language;
  onPlaySource: () => void;
  onPlayTarget: () => void;
  isSpeakingSource: boolean;
  isSpeakingTarget: boolean;
  uiLang: UILanguage;
  onUpdate?: (updatedResult: TranslationResult) => void;
  status?: ReviewStatus;
  itemId?: string;
  onApprove?: (itemId: string) => Promise<void>;
  editLock?: any;
}

const TranslationCard: React.FC<Props> = ({
  result,
  sourceLang,
  targetLang,
  onPlaySource,
  onPlayTarget,
  isSpeakingSource,
  isSpeakingTarget,
  uiLang,
  onUpdate,
  status = 'approved',
  itemId,
  onApprove,
  editLock
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSourceTranslit, setEditedSourceTranslit] = useState(result.sourceTransliteration);
  const [editedTargetTranslit, setEditedTargetTranslit] = useState(result.targetTransliteration);
  const [editedBreakdown, setEditedBreakdown] = useState(result.breakdown);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const t = translations[uiLang];

  // Auto-update breakdown when targetTransliteration changes
  useEffect(() => {
    if (isEditing && editedTargetTranslit) {
      const translitParts = editedTargetTranslit.trim().split(/\s+/);
      const updatedBreakdown = result.breakdown.map((word, index) => ({
        ...word,
        transliteration: translitParts[index] || word.transliteration
      }));
      setEditedBreakdown(updatedBreakdown);
    }
  }, [editedTargetTranslit, isEditing, result.breakdown]);

  // Update local edit state when result prop changes
  useEffect(() => {
    setEditedSourceTranslit(result.sourceTransliteration);
    setEditedTargetTranslit(result.targetTransliteration);
    setEditedBreakdown(result.breakdown);
  }, [result.sourceTransliteration, result.targetTransliteration, result.breakdown]);

  // Release lock when unmounting or when edit mode is cancelled
  useEffect(() => {
    return () => {
      if (hasLock && itemId) {
        const collection = status === 'review' ? 'review' : 'library';
        releaseEditLock(itemId, collection);
      }
    };
  }, [hasLock, itemId, status]);

  const isLockedByAnother = editLock && !hasLock && editLock.expiresAt > Date.now();

  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case Language.JAPANESE: return t.langNameJa;
      case Language.DZONGKHA: return t.langNameDz;
      default: return lang;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<TranslationResult> = {
        sourceTransliteration: editedSourceTranslit,
        targetTransliteration: editedTargetTranslit,
        breakdown: editedBreakdown
      };
      
      console.log("Saving updates:", updates);
      
      await updateCachedTranslation(result.sourceText, sourceLang, targetLang, updates);
      
      const updatedResult = { ...result, ...updates };
      console.log("Updated result:", updatedResult);
      
      setIsEditing(false);
      
      // Release lock
      if (hasLock && itemId) {
        const collection = status === 'review' ? 'review' : 'library';
        await releaseEditLock(itemId, collection);
        setHasLock(false);
      }
      
      // Notify parent to reload data from Firebase
      if (onUpdate) {
        onUpdate(updatedResult);
      }
    } catch (error) {
      console.error("Failed to save edits:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    setEditedSourceTranslit(result.sourceTransliteration);
    setEditedTargetTranslit(result.targetTransliteration);
    setEditedBreakdown(result.breakdown);
    setIsEditing(false);
    
    // Release lock
    if (hasLock && itemId) {
      const collection = status === 'review' ? 'review' : 'library';
      await releaseEditLock(itemId, collection);
      setHasLock(false);
    }
  };

  const handleStartEdit = async () => {
    if (!itemId) {
      setIsEditing(true);
      return;
    }
    
    const collection = status === 'review' ? 'review' : 'library';
    
    try {
      const acquired = await acquireEditLock(itemId, collection);
      
      if (acquired) {
        setHasLock(true);
        setIsEditing(true);
      } else {
        alert("Someone else is currently editing this item. Please try again later.");
      }
    } catch (error) {
      console.error("Error acquiring lock:", error);
      alert("Failed to start editing. Please try again.");
    }
  };

  const handleApprove = async () => {
    if (!itemId || !onApprove) return;
    
    setIsApproving(true);
    try {
      await onApprove(itemId);
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden" style={{ pointerEvents: 'auto' }}>
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/40 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>

      {/* Top badges container - mobile responsive */}
      <div className="flex flex-wrap gap-2 p-3 pb-0">
        {/* Source Badge */}
        {result.source && (
          <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm ${
            result.source === 'AI' 
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' 
              : 'bg-slate-100 text-slate-500'
          }`}>
            <i className={`fas ${result.source === 'AI' ? 'fa-bolt' : 'fa-database'} mr-1.5 text-[8px]`}></i>
            {result.source}
          </div>
        )}

        {/* Review Status Badge */}
        {status === 'review' && (
          <div className="px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-amber-500 text-white animate-pulse">
            <i className="fas fa-clock mr-1.5 text-[8px]"></i>
            REVIEW
          </div>
        )}

        {/* Lock Status Badge */}
        {isLockedByAnother && (
          <div className="px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-rose-500 text-white">
            <i className="fas fa-lock mr-1.5 text-[8px]"></i>
            LOCKED
          </div>
        )}
      </div>

      {/* Edit/Approve Buttons - mobile responsive */}
      <div className="relative flex gap-2 px-3 pt-2 pb-3 flex-wrap justify-end z-40">
        {status === 'review' && !isEditing && !isLockedByAnother && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="relative z-50 px-4 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 active:scale-95"
          >
            <i className={`fas ${isApproving ? 'fa-spinner fa-spin' : 'fa-check-circle'} mr-1.5`}></i>
            {isApproving ? 'APPROVING' : 'APPROVE'}
          </button>
        )}
        {!isEditing && !isLockedByAnother ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStartEdit();
            }}
            className="relative z-50 px-4 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
          >
            <i className="fas fa-edit mr-1.5"></i>
            EDIT
          </button>
        ) : isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 active:scale-95"
            >
              <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'} mr-1.5`}></i>
              {isSaving ? 'SAVING' : 'SAVE'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase shadow-sm bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all disabled:opacity-50 active:scale-95"
            >
              <i className="fas fa-times mr-1.5"></i>
              CANCEL
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-6 px-4 pb-6 sm:px-8 sm:pb-8 relative">
        {/* Source Display */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div className="flex-1 pr-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              {t.labelOriginal} ({getLanguageLabel(sourceLang)})
            </span>
            <h2 className={`text-xl sm:text-2xl font-bold text-slate-800 leading-snug ${sourceLang === Language.JAPANESE ? 'font-jp' : 'font-dz'}`}>
              {result.sourceText}
            </h2>
            {isEditing ? (
              <input
                type="text"
                value={editedSourceTranslit}
                onChange={(e) => setEditedSourceTranslit(e.target.value)}
                className="w-full text-sm text-slate-600 font-medium italic font-jp mt-3 px-3 py-2.5 border-2 border-indigo-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-indigo-50/50"
                placeholder="Source transliteration"
              />
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 font-medium italic font-jp mt-3">
                {result.sourceTransliteration}
              </p>
            )}
          </div>
          <button
            onClick={onPlaySource}
            disabled={isSpeakingSource}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              isSpeakingSource 
                ? 'bg-indigo-100 text-indigo-600 scale-110' 
                : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'
            }`}
          >
            <i className={`fas ${isSpeakingSource ? 'fa-waveform fa-beat-fade' : 'fa-volume-high'} text-base sm:text-lg`}></i>
          </button>
        </div>

        {/* Target Display */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block">
                {t.labelResult} ({getLanguageLabel(targetLang)})
              </span>
              <button 
                onClick={handleCopy}
                className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {copied ? <><i className="fas fa-check mr-1"></i>COPIED</> : <><i className="far fa-copy mr-1"></i>COPY</>}
              </button>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black text-slate-900 leading-tight ${targetLang === Language.JAPANESE ? 'font-jp' : 'font-dz'}`}>
              {result.targetText}
            </h2>
            {isEditing ? (
              <input
                type="text"
                value={editedTargetTranslit}
                onChange={(e) => setEditedTargetTranslit(e.target.value)}
                className="w-full text-base sm:text-lg text-indigo-600 font-bold italic font-jp mt-4 px-3 py-2.5 border-2 border-indigo-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-indigo-50/50"
                placeholder="Target transliteration"
              />
            ) : (
              <p className="text-base sm:text-lg text-indigo-600 font-bold italic font-jp mt-4">
                {result.targetTransliteration}
              </p>
            )}
          </div>
          
          <button
            onClick={onPlayTarget}
            disabled={isSpeakingTarget}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              isSpeakingTarget 
                ? 'bg-indigo-100 text-indigo-600 scale-110' 
                : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:scale-105 shadow-xl shadow-indigo-200 active:scale-95'
            }`}
          >
            {isSpeakingTarget ? (
              <i className="fas fa-waveform fa-beat-fade text-xl sm:text-2xl"></i>
            ) : (
              <i className="fas fa-volume-high text-xl sm:text-2xl"></i>
            )}
          </button>
        </div>

        <WordBreakdown 
          breakdown={isEditing ? editedBreakdown : result.breakdown} 
          language={targetLang} 
          uiLang={uiLang}
        />
      </div>
    </section>
  );
};

export default TranslationCard;
