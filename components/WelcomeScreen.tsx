
import React, { useEffect, useState } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';

interface Props {
  onStart: () => void;
  lang: Language;
}

const WelcomeScreen: React.FC<Props> = ({ onStart, lang }) => {
  const t = translations[lang];
  const [count, setCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('tsinghua_candidates');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        setCount(Array.isArray(list) ? list.length : 0);
      } catch (e) {}
    }
  }, []);

  const steps = [
    {
      num: '01',
      title: t.welcomeStep1,
      desc: t.welcomeStep1Desc,
    },
    {
      num: '02',
      title: t.welcomeStep2,
      desc: t.welcomeStep2Desc,
    },
    {
      num: '03',
      title: t.welcomeStep3,
      desc: t.welcomeStep3Desc,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-2xl w-full border border-tsinghua-100 animate-scale-in">
        {/* Logo */}
        <div className="w-20 h-20 bg-tsinghua-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white text-3xl font-black shadow-xl shadow-tsinghua-200">
          BM
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
          {t.welcomeTitle}
        </h1>
        <p className="text-tsinghua-600 font-semibold text-sm uppercase tracking-widest mb-6">
          {t.welcomeSubtitle}
        </p>

        {/* Description */}
        <p className="text-gray-500 mb-4 text-base leading-relaxed font-medium max-w-lg mx-auto">
          {t.welcomeDesc}
        </p>

        {/* Applicant Count */}
        {count > 0 && (
          <p className="text-sm text-gray-400 mb-10 font-medium">
            {t.welcomeApplicants.replace('{count}', String(count))}
          </p>
        )}

        {/* Steps */}
        <div className="mb-10 text-left bg-gray-50 p-8 rounded-3xl border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            {t.welcomeSteps}
          </p>
          <div className="space-y-5">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-tsinghua-100 text-tsinghua-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{step.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-400 mb-8 font-medium">
          {t.welcomeNote}
        </p>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="px-12 py-4 bg-tsinghua-500 hover:bg-tsinghua-600 text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
        >
          {t.start}
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
