
import React, { useState } from 'react';
import { DimensionWeight, Language } from '../types';
import { translations } from '../i18n';

interface Props {
  dimensionWeights: DimensionWeight[];
  onUpdate: (newWeights: DimensionWeight[]) => void;
  lang: Language;
}

const DIMENSION_MAP = [
  { zh: '真实动机', en: 'Motivation', scoreKey: 'motivation', thresholdKey: 'motivation', exportKey: 's_motivation' },
  { zh: '逻辑闭环', en: 'Logic', scoreKey: 'logic', thresholdKey: 'logic', exportKey: 's_logic' },
  { zh: '反思与韧性', en: 'Resilience', scoreKey: 'reflection_resilience', thresholdKey: 'resilience', exportKey: 's_resilience' },
  { zh: '创新潜质', en: 'Innovation', scoreKey: 'innovation', thresholdKey: 'innovation', exportKey: 's_innovation' },
  { zh: '投入度', en: 'Commitment', scoreKey: 'commitment', thresholdKey: 'commitment', exportKey: 's_commitment' },
];

const AdminCriteria: React.FC<Props> = ({ dimensionWeights, onUpdate, lang }) => {
  const t = translations[lang];
  const [localWeights, setLocalWeights] = useState<DimensionWeight[]>(dimensionWeights);
  const [saved, setSaved] = useState(false);

  const totalWeight = localWeights.reduce((sum, w) => sum + w.weight, 0);
  const isValid = Math.abs(totalWeight - 1) < 0.005;

  const handleSliderChange = (idx: number, val: number) => {
    const updated = [...localWeights];
    updated[idx] = { ...updated[idx], weight: Math.round(val * 100) / 100 };
    setLocalWeights(updated);
  };

  const handleSave = () => {
    if (!isValid) return;
    onUpdate(localWeights);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-tsinghua-100 pb-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">{t.criteriaTitle}</h2>
          <p className="text-gray-500 mt-2 font-medium">{t.criteriaSubtitle}</p>
          <p className="text-gray-400 mt-1.5 text-xs italic flex items-center gap-1.5">
            <span>📖</span>
            <span>{(t as any).criteriaTheory}</span>
          </p>
        </div>
        <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-full">PRODUCTION V3.0</span>
      </div>

      {/* Weight Cards */}
      <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {localWeights.map((w, idx) => (
            <div key={idx} className="px-10 py-8 flex items-center gap-8 group hover:bg-gray-50/50 transition-colors">
              {/* Index Badge */}
              <div className="w-12 h-12 rounded-2xl bg-tsinghua-500 text-white flex items-center justify-center text-lg font-black shadow-lg shadow-tsinghua-200/50 flex-shrink-0">
                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
              </div>

              {/* Dimension Label */}
              <div className="w-48 flex-shrink-0">
                <p className="font-black text-gray-800 text-lg">{w.dimension}</p>
                <p className="text-xs text-gray-400 font-bold">{w.dimension_en}</p>
              </div>

              {/* Slider */}
              <div className="flex-1 flex items-center gap-6">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={w.weight}
                  onChange={e => handleSliderChange(idx, parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-tsinghua-500"
                />
                <div className="w-20 text-right">
                  <span className="text-2xl font-black text-tsinghua-600">{Math.round(w.weight * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-gray-50/80 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-gray-500">{t.totalWeight}:</span>
            <span className={`text-2xl font-black ${isValid ? 'text-green-600' : 'text-red-500'}`}>
              {Math.round(totalWeight * 100)}%
            </span>
            {isValid ? (
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-xs font-bold text-red-400">{t.weightWarning}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {saved && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black animate-pulse">
                {lang === 'CN' ? '已保存' : 'Saved'}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`px-10 py-4 font-black rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest ${
                isValid
                  ? 'bg-tsinghua-900 text-white hover:bg-black'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCriteria;
