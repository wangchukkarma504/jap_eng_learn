
import React, { useState } from 'react';
import { HistoryItem, Language } from '../types';
import TranslationCard from './TranslationCard';
import { translations, UILanguage } from '../lang';

interface Props {
  history: HistoryItem[];
  onBack: () => void;
  onPlayAudio: (text: string, lang: Language, isSource: boolean) => void;
  isSpeakingSource: boolean;
  isSpeakingTarget: boolean;
  uiLang: UILanguage;
  onHistoryUpdate?: () => Promise<void>;
  onApprove?: (itemId: string) => Promise<void>;
}

const HistoryView: React.FC<Props> = ({ 
  history, 
  onBack, 
  onPlayAudio,
  isSpeakingSource,
  isSpeakingTarget,
  uiLang,
  onHistoryUpdate,
  onApprove
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = translations[uiLang];

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] shadow-xl shadow-slate-100 border border-slate-50 px-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
          <i className="fas fa-clock-rotate-left text-4xl text-slate-200"></i>
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">{t.noHistoryTitle}</h3>
        <p className="text-slate-400 text-sm font-medium mb-10 max-w-[240px]">{t.noHistoryDesc}</p>
        <button 
          onClick={onBack}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          {t.btnStart}
        </button>
      </div>
    );
  }

  const currentItem = history[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < history.length - 1 ? prev + 1 : prev));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors active:scale-95"
          >
            <i className="fas fa-arrow-left text-sm"></i> {t.btnBack}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              {new Date(currentItem.timestamp).toLocaleDateString(uiLang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
              <span className="text-indigo-700 font-black text-xs">
                {currentIndex + 1}<span className="text-indigo-300 mx-1">/</span>{history.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Area */}
      <div className="relative flex-1 pb-6">
        {/* Navigation Arrows - Fixed to screen */}
        {history.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/90 disabled:hover:border-slate-200 disabled:hover:text-slate-600 active:scale-90"
            >
              <i className="fas fa-chevron-left text-sm"></i>
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === history.length - 1}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/90 disabled:hover:border-slate-200 disabled:hover:text-slate-600 active:scale-90"
            >
              <i className="fas fa-chevron-right text-sm"></i>
            </button>
          </>
        )}
        
        <div className="animate-in fade-in duration-300">
          <TranslationCard 
            key={currentItem.id}
            result={currentItem.result}
            sourceLang={currentItem.sourceLang}
            targetLang={currentItem.targetLang}
            onPlaySource={() => {
              const text = currentItem.sourceLang === Language.DZONGKHA 
                ? currentItem.result.sourceTransliteration 
                : currentItem.result.sourceText;
              onPlayAudio(text, currentItem.sourceLang, true);
            }}
            onPlayTarget={() => {
              const text = currentItem.targetLang === Language.DZONGKHA 
                ? currentItem.result.targetTransliteration 
                : currentItem.result.targetText;
              onPlayAudio(text, currentItem.targetLang, false);
            }}
            isSpeakingSource={isSpeakingSource}
            isSpeakingTarget={isSpeakingTarget}
            uiLang={uiLang}
            onUpdate={async (updatedResult) => {
              console.log("History card updated:", updatedResult);
              if (onHistoryUpdate) {
                await onHistoryUpdate();
              }
            }}
            status={currentItem.status}
            itemId={currentItem.id as string}
            onApprove={onApprove}
            editLock={currentItem.editLock}
          />
        </div>
        
        {/* Navigation Dots */}
        {history.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {history.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all ${
                  idx === currentIndex
                    ? 'w-8 h-2 bg-indigo-600 rounded-full'
                    : 'w-2 h-2 bg-slate-300 rounded-full hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
