import React, { useState } from 'react';
import { OpenEndedQuestion, Language } from '../types';
import { translations } from '../i18n';

interface Props {
  question: OpenEndedQuestion;
  lang: Language;
  onSubmit: (answer: string) => void;
}

const OpenEndedAnalysis: React.FC<Props> = ({ question, lang, onSubmit }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const topic = isCN ? question.topic_zh : question.topic_en;
  const context = isCN ? question.context_zh : question.context_en;
  const questionText = isCN ? question.question_zh : question.question_en;

  const charCount = answer.length;
  const canSubmit = charCount >= 100 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onSubmit(answer.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold tracking-wider uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            {(t as any).openEndedTitle}
          </div>
          <p className="text-sm text-gray-500">{(t as any).openEndedSubtitle}</p>
        </div>

        {/* Topic Badge */}
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-full tracking-wide">
            {topic}
          </span>
        </div>

        {/* Event Background Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <div className="p-6">
            <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              {(t as any).openEndedContext}
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">{context}</p>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-purple-50/50 rounded-2xl border border-purple-100 p-6">
          <p className="text-gray-900 font-medium leading-relaxed">{questionText}</p>
        </div>

        {/* Answer Textarea */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
            placeholder={(t as any).openEndedPlaceholder}
            className="w-full p-6 text-sm text-gray-800 leading-relaxed resize-none outline-none min-h-[220px] placeholder-gray-400"
            disabled={submitting}
          />
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100">
            <span className={`text-xs font-mono ${charCount < 100 ? 'text-red-400' : charCount >= 450 ? 'text-amber-500' : 'text-gray-400'}`}>
              {(t as any).openEndedCharCount.replace('{count}', String(charCount))}
            </span>
            {charCount < 100 && charCount > 0 && (
              <span className="text-xs text-red-400">{(t as any).openEndedMinChars}</span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-10 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-lg ${
              canSubmit
                ? 'bg-purple-700 text-white hover:bg-purple-800 active:scale-95 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {(t as any).analyzing}
              </span>
            ) : (
              (t as any).openEndedSubmit
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenEndedAnalysis;
