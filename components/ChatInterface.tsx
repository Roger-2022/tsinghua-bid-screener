
import React, { useEffect, useRef, useState } from 'react';
import { Message, QuestionTemplate, QuestionOption, Language, ObjectiveResponse, AdaptiveQuestionStateSerialized } from '../types';
import { translations } from '../i18n';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onFinish: () => void;
  currentQuestion?: QuestionTemplate;
  onOptionSelect?: (opt: QuestionOption) => void;
  isProbing?: boolean;
  onProbingSubmit?: (answers: { cost: string, assumption: string, evidence: string }) => void;
  probingActions?: ('cost' | 'assumption' | 'evidence')[];
  questionIndex?: number;
  totalQuestions?: number;
  lang: Language;
  objectiveResponses?: ObjectiveResponse[];
  interviewQuestions?: QuestionTemplate[];
  adaptiveState?: AdaptiveQuestionStateSerialized | null;
}

const DIM_COLORS: Record<string, string> = {
  '真实动机': 'bg-rose-400',
  '逻辑闭环': 'bg-blue-400',
  '反思与韧性': 'bg-amber-400',
  '创新潜质': 'bg-emerald-400',
  '投入度': 'bg-tsinghua-400',
};

const ChatInterface: React.FC<Props> = ({
  messages,
  onSendMessage,
  isLoading,
  onFinish,
  currentQuestion,
  onOptionSelect,
  isProbing = false,
  onProbingSubmit,
  probingActions = [],
  questionIndex = 0,
  totalQuestions = 0,
  lang,
  objectiveResponses = [],
  interviewQuestions = [],
  adaptiveState,
}) => {
  const t = translations[lang];
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  const [probingAnswers, setProbingAnswers] = useState({ cost: '', assumption: '', evidence: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentQuestion, isProbing]);

  useEffect(() => {
    if (currentQuestion && currentQuestion.options) {
      const options = [...currentQuestion.options];
      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      setShuffledOptions(options);
    } else {
      setShuffledOptions([]);
    }
  }, [currentQuestion?.id]);

  const handleProbingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only validate fields that are shown
    const visibleFields = (['cost', 'assumption', 'evidence'] as const).filter(
      key => !probingActions.length || probingActions.includes(key)
    );
    const anyEmpty = visibleFields.some(key => !(probingAnswers as any)[key].trim());
    if (anyEmpty) {
      alert(t.probingRequired);
      return;
    }
    onProbingSubmit?.(probingAnswers);
    setProbingAnswers({ cost: '', assumption: '', evidence: '' });
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200 mt-4 animate-fade-in">
      {/* Header */}
      <div className="bg-tsinghua-900 text-white shadow-lg z-10">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
              {t.interviewing}
            </h2>
            <p className="text-[10px] text-tsinghua-200 font-bold uppercase tracking-widest mt-1">
              {adaptiveState
                ? ((t as any).adaptive_progress || '').replace('{answered}', String(objectiveResponses.length)).replace('{total}', String(adaptiveState.totalTarget))
                : `${t.interviewPhase} (${questionIndex + 1}/${totalQuestions})`}
            </p>
          </div>
          <button
            onClick={onFinish}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-[10px] font-black rounded-xl border border-white/20 transition-all backdrop-blur-md uppercase tracking-widest"
          >
            {t.manualFinish}
          </button>
        </div>
        {/* Real-time progress bar */}
        <div className="px-6 pb-4">
          {/* Overall progress */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full transition-all duration-500"
              style={{ width: `${totalQuestions > 0 ? (objectiveResponses.length / totalQuestions) * 100 : 0}%` }}
            />
          </div>
          {/* Per-dimension mini progress with confidence indicators */}
          <div className="flex gap-2">
            {(() => {
              const dims = adaptiveState
                ? adaptiveState.dimensionConfidences.map(dc => dc.dimension)
                : [...new Set(interviewQuestions.map(q => q.dimension))];
              return dims.map(dim => {
                const done = objectiveResponses.filter(r => r.dimension === dim).length;
                const color = DIM_COLORS[dim] || 'bg-gray-400';
                // AI Native: Get confidence from adaptive state
                const dimConf = adaptiveState?.dimensionConfidences.find(dc => dc.dimension === dim);
                const confidence = dimConf?.confidence || 0;
                const isSkipped = adaptiveState?.skippedDimensions.includes(dim);
                const confColor = isSkipped ? 'bg-green-400' : confidence >= 0.65 ? 'bg-green-400' : confidence >= 0.4 ? 'bg-amber-400' : 'bg-red-400';
                const progressWidth = adaptiveState
                  ? Math.min(confidence * 100, 100)
                  : (done / Math.max(interviewQuestions.filter(q => q.dimension === dim).length, 1)) * 100;
                return (
                  <div key={dim} className="flex-1 group relative">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0`} />
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${progressWidth}%` }} />
                      </div>
                      {adaptiveState && <div className={`w-1.5 h-1.5 rounded-full ${confColor} flex-shrink-0`} />}
                      <span className="text-[8px] font-black text-white/40 tabular-nums">{done}</span>
                    </div>
                    {/* Tooltip with confidence */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-[9px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {dim}{dimConf ? ` (${Math.round(confidence * 100)}%)` : ''}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50 scroll-smooth">
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[24px] px-6 py-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-tsinghua-500 text-white rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none font-medium'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Current Question Display — always visible when question exists */}
        {currentQuestion && (
          <div className="flex justify-start animate-fade-in-up">
            <div className={`max-w-[90%] bg-white rounded-[32px] rounded-bl-none border shadow-xl overflow-hidden ${isProbing ? 'border-amber-200 opacity-80' : 'border-tsinghua-100'}`}>
               <div className="p-8 space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="px-3 py-1 bg-tsinghua-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest flex-shrink-0">
                      {currentQuestion.dimension}
                    </div>
                    <p className="text-base text-gray-800 font-bold leading-relaxed">{currentQuestion.scenario}</p>
                  </div>

                  {/* Options only when NOT probing */}
                  {!isProbing && (
                    <div className="grid grid-cols-1 gap-3">
                      {shuffledOptions.map((opt, idx) => {
                        const displayLabel = String.fromCharCode(65 + idx); // A, B, C, D, E
                        return (
                          <button
                            key={opt.label + idx}
                            onClick={() => !isLoading && onOptionSelect?.(opt)}
                            disabled={isLoading}
                            className="flex items-center justify-between group p-4 bg-gray-50 hover:bg-tsinghua-50 border border-gray-100 hover:border-tsinghua-200 rounded-2xl transition-all text-left active:scale-[0.98] disabled:opacity-50"
                          >
                            <div className="flex items-center gap-4">
                              <span className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:bg-tsinghua-500 group-hover:text-white group-hover:border-tsinghua-400 flex items-center justify-center text-xs font-black transition-colors">
                                 {displayLabel}
                              </span>
                              <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-900">{opt.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {/* Probing Form — appears below the question */}
        {isProbing && currentQuestion && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="max-w-[90%] bg-tsinghua-900 rounded-[32px] rounded-bl-none shadow-2xl overflow-hidden border border-tsinghua-700">
               <div className="p-10 space-y-8">
                  <div className="flex items-center gap-4 border-b border-tsinghua-800 pb-6">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center animate-pulse">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white">{t.probingTitle}</h4>
                    </div>
                  </div>

                  <form onSubmit={handleProbingSubmit} className="space-y-8">
                    {[
                      { key: 'cost', label: t.probingCost, q: currentQuestion.probing_logic?.cost },
                      { key: 'assumption', label: t.probingAssumption, q: currentQuestion.probing_logic?.assumption },
                      { key: 'evidence', label: t.probingEvidence, q: currentQuestion.probing_logic?.evidence }
                    ].filter(p => !probingActions.length || probingActions.includes(p.key as any))
                    .map(p => (
                      <div key={p.key} className="space-y-3">
                        <label className="text-[11px] font-black text-tsinghua-400 uppercase tracking-widest block">{p.label}</label>
                        <p className="text-white font-bold leading-relaxed mb-4 italic">"{p.q || (lang === 'CN' ? '请详细说明该决策背后的逻辑代价' : 'Please explain the logical cost behind this decision')}"</p>
                        <textarea
                          required
                          maxLength={150}
                          value={(probingAnswers as any)[p.key]}
                          onChange={e => setProbingAnswers({...probingAnswers, [p.key]: e.target.value})}
                          placeholder={t.probingPlaceholder}
                          className="w-full bg-tsinghua-800/50 border border-tsinghua-700 rounded-2xl p-5 text-sm text-tsinghua-50 outline-none focus:ring-4 focus:ring-tsinghua-500/30 transition-all h-24 resize-none"
                        />
                        <div className="text-right text-[10px] font-bold text-tsinghua-600">
                          {(probingAnswers as any)[p.key].length} / 150
                        </div>
                      </div>
                    ))}
                    <button type="submit" className="w-full py-5 bg-tsinghua-500 text-white font-black rounded-2xl shadow-xl hover:bg-tsinghua-600 transition active:scale-[0.98] uppercase tracking-widest text-xs">
                       {t.probingSubmit}
                    </button>
                  </form>
               </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-6 py-4 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center space-x-2">
              <div className="w-2 h-2 bg-tsinghua-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-tsinghua-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-tsinghua-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer when no current question */}
      {!currentQuestion && (
        <div className="p-6 bg-white border-t border-gray-100">
          <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
             {t.assessmentEnding}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
