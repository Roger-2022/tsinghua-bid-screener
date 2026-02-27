import React from 'react';
import { CandidateRecord, Language } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { translations } from '../i18n';

interface Props {
  record: CandidateRecord;
  isAdmin?: boolean;
  lang: Language;
  isEditing?: boolean;
  onEditChange?: (data: CandidateRecord) => void;
  onBackHome?: () => void;
}

const ResultView: React.FC<Props> = ({ record, isAdmin = false, lang, isEditing = false, onEditChange, onBackHome }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';

  const content = isCN ? record.decision_card.zh : record.decision_card.en;
  const decisionColor = record.status === 'pass' ? '#10b981' : record.status === 'reject' ? '#ef4444' : '#fbbf24';
  const decisionBg = record.status === 'pass' ? 'bg-emerald-50' : record.status === 'reject' ? 'bg-red-50' : 'bg-amber-50';
  const decisionBorder = record.status === 'pass' ? 'border-emerald-200' : record.status === 'reject' ? 'border-red-200' : 'border-amber-200';

  const statusText = record.status === 'pass'
    ? (t as any).resultStatusPass
    : record.status === 'reject'
      ? (t as any).resultStatusReject
      : (t as any).resultStatusHold;

  // --- Admin full view (in talent pool) ---
  if (isAdmin) {
    const radarData = [
      { subject: t.radar_motiv, value: record.scores.motivation || 0, key: 'motivation' },
      { subject: t.radar_logic, value: record.scores.logic || 0, key: 'logic' },
      { subject: t.radar_resil, value: record.scores.reflection_resilience || 0, key: 'reflection_resilience' },
      { subject: t.radar_innov, value: record.scores.innovation || 0, key: 'innovation' },
      { subject: t.radar_commit, value: record.scores.commitment || 0, key: 'commitment' },
      { subject: (t as any).radar_thinking_depth || '思维深度', value: record.scores.thinking_depth || 0, key: 'thinking_depth' },
      { subject: (t as any).radar_multidim || '多维思考', value: record.scores.multidimensional_thinking || 0, key: 'multidimensional_thinking' },
    ];

    const updateScore = (key: string, val: string) => {
      if (!onEditChange) return;
      const num = parseInt(val) || 0;
      const clamped = Math.min(Math.max(num, 0), 10);
      onEditChange({
        ...record,
        scores: { ...record.scores, [key]: clamped }
      });
    };

    const updateSummary = (val: string) => {
      if (!onEditChange) return;
      onEditChange({
        ...record,
        decision_card: {
          ...record.decision_card,
          [isCN ? 'zh' : 'en']: { ...content, summary: val }
        }
      });
    };

    return (
      <div className="space-y-8 pb-10 max-w-4xl mx-auto mt-8">
        {/* Summary Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: decisionColor }}></div>
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{record.display_name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {record.admin_record.search_keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-tsinghua-50 text-tsinghua-600 rounded text-[10px] font-bold uppercase tracking-wider">#{kw}</span>
                  ))}
                </div>
              </div>
              <div className="px-6 py-2 rounded-full text-white font-black text-sm tracking-widest uppercase shadow-sm" style={{ backgroundColor: decisionColor }}>
                {record.status_badge_text_zh}
              </div>
            </div>

            {/* Decision Card Summary */}
            {isEditing ? (
              <textarea
                value={content.summary}
                onChange={(e) => updateSummary(e.target.value)}
                className="w-full text-gray-700 text-lg leading-relaxed bg-white p-6 rounded-xl border border-tsinghua-200 outline-none h-40"
              />
            ) : (
              <p className="text-gray-700 text-lg leading-relaxed bg-gray-50/50 p-6 rounded-xl italic border border-gray-100">
                "{content.summary || t.noSummary}"
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Radar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 border-b pb-2">{t.radarTitle}</h3>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name={record.display_name} dataKey="value" stroke="#8f00ff" strokeWidth={2} fill="#8f00ff" fillOpacity={0.2} />
                  <Tooltip formatter={(val: number) => [`${val} / 10`, isCN ? '得分' : 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Score editing inputs */}
            {isEditing && (
              <div className="grid grid-cols-7 gap-2 mt-4">
                {radarData.map(item => (
                  <div key={item.key} className="text-center">
                     <p className="text-[9px] text-gray-400 font-bold truncate">{item.subject}</p>
                     <input
                      type="number" min="0" max="10" value={item.value}
                      onChange={(e) => updateScore(item.key, e.target.value)}
                      className="w-full text-center text-sm font-bold border rounded p-1"
                     />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Evidence Points */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-4 border-b border-blue-50 pb-2">{t.evidenceTitle}</h3>
              <ul className="space-y-3">
                {(record.evidence.core_evidence_points && record.evidence.core_evidence_points.length > 0 ? record.evidence.core_evidence_points : [t.noEvidence]).map((point, idx) => (
                  <li key={idx} className="flex items-start text-xs text-gray-600 leading-relaxed">
                    <span className="w-1.5 h-1.5 mt-1.5 bg-blue-400 rounded-full mr-3 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Flags */}
            <div className="bg-orange-50/50 p-6 rounded-2xl shadow-sm border border-orange-100">
              <h3 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4 border-b border-orange-100 pb-2">{t.riskTitle}</h3>
              <ul className="space-y-2">
                {(record.evidence.risk_flags && record.evidence.risk_flags.length > 0 ? record.evidence.risk_flags : [t.lowRisk]).map((risk, idx) => (
                  <li key={idx} className="text-xs text-orange-800 italic flex gap-2"><span>&#8226;</span> {risk}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Open-Ended Scores Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">
              {(t as any).openEndedScoresTitle || '开放题评分'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 rounded-xl p-5 text-center border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">{(t as any).radar_thinking_depth || '思维深度'}</p>
                {record.scores.thinking_depth ? (
                  <div>
                    <span className="text-3xl font-black text-indigo-700">{record.scores.thinking_depth}</span>
                    <span className="text-sm font-bold text-indigo-300 ml-1">/ 10</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-gray-300">{isCN ? '无' : 'N/A'}</span>
                )}
              </div>
              <div className="bg-purple-50/50 rounded-xl p-5 text-center border border-purple-100">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">{(t as any).radar_multidim || '多维思考'}</p>
                {record.scores.multidimensional_thinking ? (
                  <div>
                    <span className="text-3xl font-black text-purple-700">{record.scores.multidimensional_thinking}</span>
                    <span className="text-sm font-bold text-purple-300 ml-1">/ 10</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-gray-300">{isCN ? '无' : 'N/A'}</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 italic text-center">{(t as any).openEndedScoreNote || '注：开放题评分不计入综合得分'}</p>
          </div>
        </div>

        {/* Open-Ended Analysis Response (admin view) — always rendered */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-2">
              {(t as any).openEndedTitle || '深度分析题'}
            </h3>
            {record.openEndedResponse ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).openEndedTopic || '主题'}</p>
                  <p className="text-sm font-bold text-gray-800">{isCN ? record.openEndedResponse.question.topic_zh : record.openEndedResponse.question.topic_en}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).openEndedContextLabel || '事件背景'}</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">{isCN ? record.openEndedResponse.question.context_zh : record.openEndedResponse.question.context_en}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).openEndedQuestionLabel || '分析问题'}</p>
                  <p className="text-xs text-gray-700 font-medium">{isCN ? record.openEndedResponse.question.question_zh : record.openEndedResponse.question.question_en}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">{(t as any).openEndedAnswerLabel || '候选人回答'}</p>
                  <div className="text-xs text-gray-700 bg-purple-50/50 p-4 rounded-lg border border-purple-100 leading-relaxed whitespace-pre-wrap">
                    {record.openEndedResponse.answer}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 font-bold">{(t as any).noOpenEndedResponse || '无开放题回答'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Candidate-facing simplified view: only status + brief summary ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Status Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: decisionColor }}>
            {record.status === 'pass' && (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            )}
            {record.status === 'hold' && (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" /></svg>
            )}
            {record.status === 'reject' && (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
        </div>

        {/* Status Text */}
        <div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">{(t as any).resultStatusLabel}</p>
          <h1 className="text-4xl font-black" style={{ color: decisionColor }}>{statusText}</h1>
        </div>

        {/* Brief Summary Card */}
        <div className={`${decisionBg} ${decisionBorder} border rounded-2xl p-6`}>
          <p className="text-gray-700 leading-relaxed text-sm">
            {content.summary || t.noSummary}
          </p>
        </div>

        {/* AI Native: Personalized Explainability */}
        {record.explainability && (record.explainability.strengths.length > 0 || record.explainability.growth_areas.length > 0) && (
          <div className={`${decisionBg} ${decisionBorder} border rounded-2xl p-6 text-left space-y-5`}>
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{(t as any).explainability_title || (isCN ? '个性化反馈' : 'Personalized Feedback')}</h3>
            {record.explainability.strengths.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-emerald-600 mb-2">{(t as any).explainability_strengths || (isCN ? '你的亮点' : 'Your Strengths')}</h4>
                <ul className="space-y-1.5">
                  {record.explainability.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {record.explainability.growth_areas.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-600 mb-2">{(t as any).explainability_growth || (isCN ? '成长方向' : 'Growth Areas')}</h4>
                <ul className="space-y-1.5">
                  {record.explainability.growth_areas.map((g, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2"><span className="text-amber-500 mt-0.5">&#9679;</span> {g}</li>
                  ))}
                </ul>
              </div>
            )}
            {record.explainability.development_suggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-blue-600 mb-2">{(t as any).explainability_suggestions || (isCN ? '发展建议' : 'Development Suggestions')}</h4>
                <ul className="space-y-1.5">
                  {record.explainability.development_suggestions.map((d, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#10148;</span> {d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Thank You & Notice */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">{(t as any).resultThankYou}</h3>
          {record.status !== 'reject' && (
            <p className="text-sm text-gray-500">{t.resultNotice}</p>
          )}
        </div>

        {/* Back Home Button */}
        <button
          onClick={onBackHome}
          className="px-12 py-3 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-all shadow-lg active:scale-95"
        >
          {t.backHome}
        </button>
      </div>
    </div>
  );
};

export default ResultView;
