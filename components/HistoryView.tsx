
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
      <div className="relative flex-1">
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

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4 py-4">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex-1 py-4 rounded-[1.5rem] flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 border border-slate-50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            currentIndex === 0 ? 'opacity-30' : 'hover:text-indigo-600 hover:border-indigo-100'
          }`}
        >
          <i className="fas fa-chevron-left mr-3"></i> {t.btnPrev}
        </button>

        <button 
          onClick={handleNext}
          disabled={currentIndex === history.length - 1}
          className={`flex-1 py-4 rounded-[1.5rem] flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 border border-slate-50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            currentIndex === history.length - 1 ? 'opacity-30' : 'hover:text-indigo-600 hover:border-indigo-100'
          }`}
        >
          {t.btnNext} <i className="fas fa-chevron-right ml-3"></i>
        </button>
      </div>
    </div>
  );
};

export default HistoryView;
