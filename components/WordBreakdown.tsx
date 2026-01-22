
import React from 'react';
import { WordBreakdown as WordType, Language } from '../types';
import { translations, UILanguage } from '../lang';

interface Props {
  breakdown: WordType[];
  language: Language;
  uiLang: UILanguage;
}

const WordBreakdown: React.FC<Props> = ({ breakdown, language, uiLang }) => {
  const isJp = language === Language.JAPANESE;
  const isDz = language === Language.DZONGKHA;
  const t = translations[uiLang];

  if (!breakdown || breakdown.length === 0) {
    return null;
  }

  return (
    <div className="pt-10 border-t border-slate-100/60">
      <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6 flex items-center">
        <i className="fas fa-wand-magic-sparkles mr-3 text-indigo-400"></i>
        {t.labelAnalysis}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {breakdown.map((word, idx) => (
          <div 
            key={idx} 
            className="group bg-slate-50/40 p-5 rounded-[1.5rem] border border-slate-100/50 hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xl font-black text-slate-800 tracking-tight ${isJp ? 'font-jp' : isDz ? 'font-dz' : ''}`}>
                {word.original}
              </span>
              {word.transliteration && (
                <span className="text-[9px] text-indigo-500 font-black bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50 uppercase tracking-wider">
                  {word.transliteration}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-4 opacity-40 group-hover:opacity-80 transition-opacity">
               <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{t.labelSourceTerm}</span>
               <span className="text-[11px] text-slate-600 font-bold border-b border-slate-200">{word.sourceTerm || "---"}</span>
            </div>

            <p className="text-sm text-slate-900 font-black bg-white group-hover:bg-indigo-50/30 px-3 py-2 rounded-xl inline-block border border-slate-100 group-hover:border-indigo-100/50 transition-colors">
              {word.translated}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordBreakdown;
