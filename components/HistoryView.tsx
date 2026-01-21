
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
}

const HistoryView: React.FC<Props> = ({ 
  history, 
  onBack, 
  onPlayAudio,
  isSpeakingSource,
  isSpeakingTarget,
  uiLang
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const t = translations[uiLang];

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

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

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < history.length - 1) {
      handleNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      handlePrev();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-colors py-2 active:scale-95"
        >
          <i className="fas fa-arrow-left-long text-sm"></i> {t.btnBack}
        </button>
        <div className="flex flex-col items-end">
          <div className="bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm mb-1">
            <span className="text-slate-900 font-black text-[10px]">
              {currentIndex + 1} <span className="text-slate-300 mx-1">/</span> {history.length}
            </span>
          </div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
            {new Date(currentItem.timestamp).toLocaleDateString(uiLang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Card Area */}
      <div 
        className="relative flex-1"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div key={currentItem.id} className="animate-in fade-in slide-in-from-right-8 duration-500">
          <TranslationCard 
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
          />
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
