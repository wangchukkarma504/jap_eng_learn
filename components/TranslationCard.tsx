
import React from 'react';
import { TranslationResult, Language } from '../types';
import WordBreakdown from './WordBreakdown';
import { translations, UILanguage } from '../lang';

interface Props {
  result: TranslationResult;
  sourceLang: Language;
  targetLang: Language;
  onPlaySource: () => void;
  onPlayTarget: () => void;
  isSpeakingSource: boolean;
  isSpeakingTarget: boolean;
  uiLang: UILanguage;
}

const TranslationCard: React.FC<Props> = ({
  result,
  sourceLang,
  targetLang,
  onPlaySource,
  onPlayTarget,
  isSpeakingSource,
  isSpeakingTarget,
  uiLang
}) => {
  const t = translations[uiLang];

  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case Language.JAPANESE: return t.langNameJa;
      case Language.DZONGKHA: return t.langNameDz;
      default: return lang;
    }
  };

  return (
    <section className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] p-6 sm:p-10 border border-slate-50 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32"></div>

      {/* Source Badge */}
      {result.source && (
        <div className={`absolute -top-1 left-10 px-4 py-1.5 rounded-b-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-sm z-10 ${
          result.source === 'AI' 
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          <i className={`fas ${result.source === 'AI' ? 'fa-bolt' : 'fa-database'} mr-2`}></i>
          {result.source}
        </div>
      )}

      <div className="space-y-10 relative">
        {/* Source Display */}
        <div className="flex justify-between items-start border-b border-slate-100/60 pb-8">
          <div className="flex-1 pr-6">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-2">
              {t.labelOriginal} ({getLanguageLabel(sourceLang)})
            </span>
            <h2 className={`text-2xl font-bold text-slate-700 leading-tight ${sourceLang === Language.JAPANESE ? 'font-jp' : 'font-dz'}`}>
              {result.sourceText}
            </h2>
            <p className="text-sm text-slate-400 font-medium italic font-jp mt-2 opacity-70">
              {result.sourceTransliteration}
            </p>
          </div>
          <button
            onClick={onPlaySource}
            disabled={isSpeakingSource}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              isSpeakingSource 
                ? 'bg-indigo-50 text-indigo-400' 
                : 'bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-lg active:scale-95'
            }`}
          >
            <i className={`fas ${isSpeakingSource ? 'fa-waveform fa-beat-fade' : 'fa-volume-high'} text-lg`}></i>
          </button>
        </div>

        {/* Target Display */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-6">
            <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] block mb-2">
              {t.labelResult} ({getLanguageLabel(targetLang)})
            </span>
            <h2 className={`text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight ${targetLang === Language.JAPANESE ? 'font-jp' : 'font-dz'}`}>
              {result.targetText}
            </h2>
            <p className="text-lg text-indigo-600 font-bold italic font-jp mt-3">
              {result.targetTransliteration}
            </p>
          </div>
          
          <button
            onClick={onPlayTarget}
            disabled={isSpeakingTarget}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] flex items-center justify-center transition-all flex-shrink-0 ${
              isSpeakingTarget 
                ? 'bg-indigo-100 text-indigo-500' 
                : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:scale-105 shadow-xl shadow-indigo-100 active:scale-95'
            }`}
          >
            {isSpeakingTarget ? (
              <i className="fas fa-waveform fa-beat-fade text-2xl"></i>
            ) : (
              <i className="fas fa-volume-high text-2xl sm:text-3xl"></i>
            )}
          </button>
        </div>

        <WordBreakdown 
          breakdown={result.breakdown} 
          language={targetLang} 
          uiLang={uiLang}
        />
      </div>
    </section>
  );
};

export default TranslationCard;
