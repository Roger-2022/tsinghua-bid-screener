import React, { useState } from 'react';
import { CandidateRecord, CandidateBasicInfo, Language } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { translations } from '../i18n';

interface Props {
  record: CandidateRecord;
  isAdmin?: boolean;
  lang: Language;
  isEditing?: boolean;
  onEditChange?: (data: CandidateRecord) => void;
  onBackHome?: () => void;
  candidateInfo?: CandidateBasicInfo;
  onUpdateCandidateInfo?: (info: CandidateBasicInfo) => void;
}

const ResultView: React.FC<Props> = ({ record, isAdmin = false, lang, isEditing = false, onEditChange, onBackHome, candidateInfo, onUpdateCandidateInfo }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';

  const content = isCN ? record.decision_card.zh : record.decision_card.en;
  const decisionColor = record.status === 'pass' ? '#10b981' : record.status === 'reject' ? '#ef4444' : '#fbbf24';

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
            <p className="text-[10px] text-gray-400 italic text-center">{(t as any).openEndedScoreNote || '注：开放题评分已计入综合得分'}</p>
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

  // --- Candidate-facing: Two-step flow (info verification → completion) ---
  const [step, setStep] = useState<'verify' | 'done'>('verify');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<CandidateBasicInfo | null>(candidateInfo || null);

  const handleEditField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editData) return;
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as any).checked : value;
    setEditData(prev => prev ? { ...prev, [name]: val } : null);
  };

  const handleSaveEdit = () => {
    if (editData && onUpdateCandidateInfo) {
      onUpdateCandidateInfo(editData);
    }
    setEditMode(false);
  };

  const handleConfirmSubmit = () => {
    setStep('done');
  };

  const d = editData || candidateInfo;
  const infoFields: { label: string; value: string; wide?: boolean }[] = d ? [
    { label: isCN ? '姓名' : 'Name', value: d.name },
    { label: isCN ? '性别' : 'Gender', value: d.gender === 'male' ? (isCN ? '男' : 'Male') : (isCN ? '女' : 'Female') },
    { label: isCN ? '微信号' : 'WeChat', value: d.wechat },
    { label: isCN ? '学校' : 'School', value: d.school },
    { label: isCN ? '院系' : 'Department', value: d.department },
    { label: isCN ? '专业' : 'Major', value: d.major },
    { label: isCN ? '年级' : 'Grade', value: ((t as any).gradeOptions as any)?.[d.gradeOrLevel] || d.gradeOrLevel },
    { label: isCN ? '电话' : 'Phone', value: d.phone },
    { label: isCN ? '邮箱' : 'Email', value: d.email },
    { label: isCN ? '三词自述' : 'Self Description', value: d.selfDescription },
    { label: isCN ? '是否阅读招生推送' : 'Read Recruit Post', value: d.hasReadRecruitPost === 'yes' ? (isCN ? '是' : 'Yes') : (isCN ? '已了解，无需看推送' : 'Familiar, no need') },
    { label: isCN ? '职业规划' : 'Career Plan', value: d.careerPlan, wide: true },
    { label: isCN ? '从何得知' : 'Referral', value: ((t as any).referralOptions as any)?.[d.referralSource] || d.referralSource },
    { label: isCN ? '前8周投入(h/周)' : 'Hours/wk (Wk1-8)', value: String(d.timeCommitmentWeeks1to8 || '-') },
    { label: isCN ? '后8周投入(h/周)' : 'Hours/wk (Wk9-16)', value: String(d.timeCommitmentWeeks9to16 || '-') },
    { label: isCN ? '过往经历亮点' : 'Past Experience', value: d.projects, wide: true },
    ...(d.resumeFileName ? [{ label: isCN ? '简历' : 'Resume', value: d.resumeFileName }] : []),
  ] : [];

  // Step 2 — Assessment Complete
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg bg-emerald-500">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">{(t as any).resultInterviewDone}</h1>
            <p className="text-gray-600 leading-relaxed text-sm">
              {(t as any).resultInterviewDoneDesc}
            </p>
          </div>

          <button
            onClick={onBackHome}
            className="px-12 py-3 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-all shadow-lg active:scale-95"
          >
            {t.backHome}
          </button>
        </div>
      </div>
    );
  }

  // Step 1 — Info Verification
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-tsinghua-100">
              <svg className="w-8 h-8 text-tsinghua-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">{(t as any).resultCheckInfo}</h2>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1.5 w-full bg-tsinghua-500"></div>
          <div className="p-8">
            {!editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {infoFields.map((field, idx) => (
                    <div key={idx} className={`py-2 ${field.wide ? 'md:col-span-2' : ''}`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{field.label}</p>
                      <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{field.value || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-6 py-2 text-sm font-bold text-tsinghua-600 border border-tsinghua-200 rounded-full hover:bg-tsinghua-50 transition"
                  >
                    {(t as any).resultEditInfo}
                  </button>
                </div>
              </>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                {editData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '姓名' : 'Name'}</label>
                      <input type="text" name="name" value={editData.name} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '微信号' : 'WeChat'}</label>
                      <input type="text" name="wechat" value={editData.wechat} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '学校' : 'School'}</label>
                      <input type="text" name="school" value={editData.school} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '院系' : 'Department'}</label>
                      <input type="text" name="department" value={editData.department} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '专业' : 'Major'}</label>
                      <input type="text" name="major" value={editData.major} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '电话' : 'Phone'}</label>
                      <input type="tel" name="phone" value={editData.phone} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '邮箱' : 'Email'}</label>
                      <input type="email" name="email" value={editData.email} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isCN ? '三词自述' : 'Self Description'}</label>
                      <input type="text" name="selfDescription" value={editData.selfDescription} onChange={handleEditField} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200" />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => { setEditMode(false); setEditData(candidateInfo || null); }}
                    className="px-5 py-2 text-sm font-bold text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-5 py-2 text-sm font-bold text-white bg-tsinghua-600 rounded-full hover:bg-tsinghua-700 transition"
                  >
                    {(t as any).resultSaveInfo}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Course Activity Description + Checkboxes */}
        {!editMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-tsinghua-500"></div>
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-3">
                  {isCN ? '课后活动介绍' : 'After-Class Activities'}
                </h3>
                <div className="text-sm text-gray-600 leading-relaxed space-y-2 bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <p>{isCN
                    ? '入选后，你将以小组形式参与课后研讨，合作完成一个与 AI 与商业模式相关的课题。整个过程中：'
                    : 'After selection, you will participate in group research on AI and business models:'}</p>
                  <ul className="space-y-1.5 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-tsinghua-600 mt-0.5 flex-shrink-0">•</span>
                      <span>{isCN ? '政委辅导员将全程指导各小组的课题研讨与产出' : 'Political commissar mentors will guide each group throughout'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tsinghua-600 mt-0.5 flex-shrink-0">•</span>
                      <span>{isCN ? '期间会有 2-3 次汇报（中期、结课等），展示课题进展' : '2-3 presentations (midterm, final) to showcase project progress'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-0.5 flex-shrink-0">★</span>
                      <span className="font-bold text-gray-800">{isCN
                        ? '担任小组长，你将获得更多与商业大佬交流的机会，锻炼领导和组织能力，并有机会获得荣誉证书和奖项'
                        : 'As group leader, you gain more networking with business leaders, develop leadership skills, and earn certificates & awards'}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Three checkboxes */}
              <div className="space-y-4">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="offlineInterview"
                    checked={(editData || candidateInfo)?.offlineInterview || false}
                    onChange={handleEditField}
                    className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
                  />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                    {t.offlineInterview}
                  </span>
                </label>
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="homeworkWillingness"
                    checked={(editData || candidateInfo)?.homeworkWillingness || false}
                    onChange={handleEditField}
                    className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
                  />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                    {t.willingness}
                  </span>
                </label>
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="leaderWillingness"
                    checked={(editData || candidateInfo)?.leaderWillingness || false}
                    onChange={handleEditField}
                    className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
                  />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                    {t.leader}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {!editMode && (
          <div className="text-center">
            <button
              onClick={() => {
                // Save checkbox state before confirming
                if (editData && onUpdateCandidateInfo) {
                  onUpdateCandidateInfo(editData);
                }
                handleConfirmSubmit();
              }}
              className="px-16 py-4 bg-gray-900 text-white font-black rounded-full hover:bg-black transition-all shadow-2xl active:scale-[0.98] tracking-widest uppercase text-sm"
            >
              {(t as any).resultConfirmSubmit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultView;
