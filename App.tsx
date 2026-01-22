
import React, { useState, useEffect } from 'react';
import { Language, AppState } from './types';
import { translateAndAnalyze } from './services/geminiService';
import { saveHistoryItem, getHistoryItems, getReviewItems, findCachedTranslation, saveCachedTranslation, approveReviewItem, subscribeToReviewItems, subscribeToLibraryItems } from './services/historyDb';
import TranslationCard from './components/TranslationCard';
import HistoryView from './components/HistoryView';
import { translations, UILanguage } from './lang';

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState<UILanguage>('ja');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [state, setState] = useState<AppState>({
    inputText: '',
    sourceLang: Language.JAPANESE,
    targetLang: Language.DZONGKHA,
    result: null,
    isLoading: false,
    isSpeaking: false,
    isSpeakingSource: false,
    error: null,
    viewMode: 'translate',
    history: []
  });
  const [reviewItems, setReviewItems] = useState<AppState['history']>([]);

  const t = translations[uiLang];

  useEffect(() => {
    loadHistory();
    window.speechSynthesis.cancel();

    // Setup realtime listeners
    const unsubscribeReview = subscribeToReviewItems((items) => {
      console.log("Review items updated:", items);
      setReviewItems(items);
    });

    const unsubscribeLibrary = subscribeToLibraryItems((items) => {
      console.log("Library items updated:", items);
      setState(prev => ({ ...prev, history: items }));
    });

    // Logic to detect if it's iOS and not already installed
    const isIos = /iPhone|iPad|iPod/.test(window.navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    if (isIos && !isStandalone) {
      const promptCount = localStorage.getItem('installPromptCount') || '0';
      if (parseInt(promptCount) < 3) {
        setShowInstallPrompt(true);
      }
    }

    // Cleanup listeners on unmount
    return () => {
      unsubscribeReview();
      unsubscribeLibrary();
    };
  }, []);

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    const count = parseInt(localStorage.getItem('installPromptCount') || '0');
    localStorage.setItem('installPromptCount', (count + 1).toString());
  };

  const loadHistory = async () => {
    try {
      const [history, review] = await Promise.all([getHistoryItems(), getReviewItems()]);
      setState(prev => ({ ...prev, history }));
      setReviewItems(review);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleTranslate = async () => {
    if (!state.inputText.trim()) return;
    if (state.sourceLang === state.targetLang) {
      setState(prev => ({ ...prev, error: t.errorDiffLang }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const normalizedText = state.inputText.trim();

    try {
      let result = null;
      
      // Check if translation already exists in library
      try {
        const existingResult = await findCachedTranslation(normalizedText, state.sourceLang, state.targetLang);
        if (existingResult) {
          result = existingResult;
          console.log("Result from library:", result);
        }
      } catch (dbError) {
        console.warn("Library lookup failed", dbError);
      }

      // If not found, translate and save to review
      if (!result) {
        result = await translateAndAnalyze(state.inputText, state.sourceLang, state.targetLang);
        console.log("Result from translateAndAnalyze:", result);
        
        const historyItem = {
          timestamp: Date.now(),
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          result: result,
          status: 'review' as const
        };
        
        const savedItemId = await saveHistoryItem(historyItem, 'review');
        console.log("Saved to review with ID:", savedItemId);
        
        // Wait a bit for Firebase to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const updatedHistory = await getHistoryItems();
      const updatedReview = await getReviewItems();
      console.log("Setting state with result:", result);
      setState(prev => ({ 
        ...prev, 
        result, 
        history: updatedHistory,
        isLoading: false
      }));
      setReviewItems(updatedReview);

    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: t.errorFailed, isLoading: false }));
    }
  };

  const handleSwap = () => {
    setState(prev => ({
      ...prev,
      sourceLang: prev.targetLang,
      targetLang: prev.sourceLang,
      inputText: prev.result?.targetText || '',
      result: null,
      error: null
    }));
  };

  const playSpeech = (text: string, lang: Language, isSource: boolean) => {
    window.speechSynthesis.cancel();
    setState(prev => ({ ...prev, isSpeaking: false, isSpeakingSource: false }));
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    
    // Use Japanese voice for all (since Dzongkha uses Katakana transliteration)
    utterance.lang = 'ja-JP';
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find(voice => 
      voice.lang === 'ja-JP' && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang === 'ja-JP');
    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
    }
    
    utterance.onstart = () => {
      setState(prev => ({ ...prev, [isSource ? 'isSpeakingSource' : 'isSpeaking']: true }));
    };
    utterance.onend = () => {
      setState(prev => ({ ...prev, [isSource ? 'isSpeakingSource' : 'isSpeaking']: false }));
    };
    utterance.onerror = () => {
      setState(prev => ({ ...prev, [isSource ? 'isSpeakingSource' : 'isSpeaking']: false }));
    };
    window.speechSynthesis.speak(utterance);
  };

  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case Language.JAPANESE: return t.langNameJa;
      case Language.DZONGKHA: return t.langNameDz;
      default: return lang;
    }
  };

  const toggleView = (mode: 'translate' | 'history') => {
    setState(prev => ({ ...prev, viewMode: mode }));
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] flex flex-col items-center py-6 sm:py-12 px-4 text-slate-900 font-jp overflow-x-hidden select-none">

      {/* iOS PWA Install Hint */}
      {showInstallPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-indigo-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-xl">
              <i className="fas fa-plus"></i>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PWA Install</p>
              <p className="text-xs font-bold text-slate-700">Tap <i className="fa-solid fa-arrow-up-from-bracket text-indigo-500"></i> then <span className="text-indigo-600">"Add to Home Screen"</span> to install.</p>
            </div>
            <button onClick={dismissInstallPrompt} className="text-slate-300 hover:text-slate-400 p-2">
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
          <div className="w-6 h-6 bg-white border-r border-b border-indigo-100 rotate-45 absolute -bottom-3 left-1/2 -translate-x-1/2"></div>
        </div>
      )}

      <header className="max-w-2xl w-full mb-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100/50">
            <i className="fas fa-language text-2xl"></i>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{t.appTitle}</h1>
            <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase mt-1">{t.appSubtitle}</p>
          </div>
          <button 
            onClick={() => setUiLang(prev => prev === 'ja' ? 'en' : 'ja')}
            className="sm:hidden w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs"
          >
            {uiLang.toUpperCase()}
          </button>
          
          {/* Bell Notification - Mobile */}
          {reviewItems.length > 0 && (
            <button
              onClick={() => toggleView('history')}
              className="sm:hidden relative w-10 h-10 rounded-xl bg-white border border-amber-200 shadow-sm flex items-center justify-center text-amber-600 transition-all active:scale-95"
            >
              <i className="fas fa-bell text-base animate-pulse"></i>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">
                {reviewItems.length}
              </span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Bell Notification - Desktop */}
          {reviewItems.length > 0 && (
            <button
              onClick={() => toggleView('history')}
              className="hidden sm:flex relative w-10 h-10 rounded-xl bg-white border border-amber-200 shadow-sm items-center justify-center text-amber-600 hover:bg-amber-50 transition-all active:scale-95"
            >
              <i className="fas fa-bell text-base animate-pulse"></i>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">
                {reviewItems.length}
              </span>
            </button>
          )}
          
          <button 
            onClick={() => setUiLang(prev => prev === 'ja' ? 'en' : 'ja')}
            className="hidden sm:flex px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm items-center justify-center text-indigo-600 font-black text-xs hover:border-indigo-100 transition-all"
          >
            {uiLang === 'ja' ? 'ENGLISH' : '日本語'}
          </button>
          
          <nav className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => toggleView('translate')}
              className={`flex-1 sm:px-5 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                state.viewMode === 'translate' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.tabTranslate}
            </button>
            <button
              onClick={() => toggleView('history')}
              className={`flex-1 sm:px-5 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                state.viewMode === 'history' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.tabHistory}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl w-full space-y-6 flex-1 pb-16">
        {state.viewMode === 'translate' ? (
          <>
            <section className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/20 border border-slate-50 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-8 bg-slate-50/80 p-3 rounded-[1.5rem] border border-slate-100">
                <div className="flex-1 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.labelSource}</span>
                  <div className="text-sm font-black text-indigo-900 py-1">
                    {getLanguageLabel(state.sourceLang)}
                  </div>
                </div>
                
                <button 
                  onClick={handleSwap}
                  className="group w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 transition-all shadow-md hover:shadow-xl hover:scale-110 active:scale-95 border border-slate-50"
                >
                  <i className="fas fa-right-left text-xs transition-transform group-hover:rotate-180"></i>
                </button>

                <div className="flex-1 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.labelTarget}</span>
                  <div className="text-sm font-black text-indigo-900 py-1">
                    {getLanguageLabel(state.targetLang)}
                  </div>
                </div>
              </div>

              <div className="relative">
                <textarea
                  className={`w-full h-36 sm:h-44 p-6 rounded-[2rem] bg-slate-50/50 border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-[6px] focus:ring-indigo-500/5 text-xl text-slate-800 placeholder:text-slate-300 transition-all duration-300 resize-none outline-none ${state.sourceLang === Language.JAPANESE ? 'font-jp' : 'font-dz'}`}
                  placeholder={uiLang === 'ja' ? `${getLanguageLabel(state.sourceLang)}${t.placeholderPrefix}` : `${t.placeholderPrefix} ${getLanguageLabel(state.sourceLang)}`}
                  value={state.inputText}
                  onChange={(e) => setState(prev => ({ ...prev, inputText: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleTranslate())}
                />
                
                <div className="absolute bottom-5 right-5 flex items-center gap-3">
                   {state.inputText.length > 0 && (
                     <button 
                       onClick={() => setState(prev => ({...prev, inputText: '', result: null}))}
                       className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-400 transition-colors"
                     >
                       <i className="fas fa-circle-xmark text-lg"></i>
                     </button>
                   )}
                   <button
                    onClick={handleTranslate}
                    disabled={state.isLoading || !state.inputText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white px-8 py-3.5 rounded-[1.25rem] font-black shadow-2xl shadow-indigo-200/50 transition-all flex items-center gap-2.5 text-sm uppercase tracking-wider active:scale-95"
                  >
                    {state.isLoading ? (
                      <i className="fas fa-circle-notch fa-spin"></i>
                    ) : (
                      <i className="fas fa-bolt-lightning"></i>
                    )}
                    {state.isLoading ? t.btnTranslating : t.btnTranslate}
                  </button>
                </div>
              </div>
            </section>

            {state.error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-500 px-6 py-4 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <i className="fas fa-triangle-exclamation text-lg"></i>
                <span className="text-xs font-black uppercase tracking-wide">{state.error}</span>
              </div>
            )}

            {state.result && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <TranslationCard
                  result={state.result}
                  sourceLang={state.sourceLang}
                  targetLang={state.targetLang}
                  onPlaySource={() => {
                    const text = state.sourceLang === Language.DZONGKHA 
                      ? state.result!.sourceTransliteration 
                      : state.result!.sourceText;
                    playSpeech(text, state.sourceLang, true);
                  }}
                  onPlayTarget={() => {
                    const text = state.targetLang === Language.DZONGKHA 
                      ? state.result!.targetTransliteration 
                      : state.result!.targetText;
                    playSpeech(text, state.targetLang, false);
                  }}
                  isSpeakingSource={state.isSpeakingSource}
                  isSpeakingTarget={state.isSpeaking}
                  uiLang={uiLang}
                  onUpdate={async (updatedResult) => {
                    console.log("onUpdate called with:", updatedResult);
                    // Update current result immediately for instant feedback
                    setState(prev => ({ ...prev, result: updatedResult }));
                    // Reload history from Firebase to ensure consistency
                    await loadHistory();
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <HistoryView 
              history={[...reviewItems, ...state.history]} 
              onBack={() => toggleView('translate')}
              onPlayAudio={playSpeech}
              isSpeakingSource={state.isSpeakingSource}
              isSpeakingTarget={state.isSpeaking}
              uiLang={uiLang}
              onHistoryUpdate={async () => {
                console.log("Reloading history after edit...");
                await loadHistory();
              }}
              onApprove={async (itemId) => {
                console.log("Approving item:", itemId);
                await approveReviewItem(itemId);
                await loadHistory();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
