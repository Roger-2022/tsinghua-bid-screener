import React, { useState } from 'react';
import {
  Language, CandidateBasicInfo, CandidateRecord, QuestionTemplate,
  OpenEndedQuestion, OpenEndedResponse, ObjectiveResponse, Message,
  DimensionWeight, NumericDecisionThresholds, PromptConfig, ApiConfig,
} from '../types';
import { translations } from '../i18n';
import { generateFinalAssessment } from '../services/geminiService';
import {
  generateMockCandidateInfo, generateMockObjectiveResponses,
  generateMockOpenEndedResponse, generateMockMessages,
} from '../services/quickPreviewService';
import ResultView from './ResultView';

interface Props {
  lang: Language;
  questions: QuestionTemplate[];
  openEndedQuestions: OpenEndedQuestion[];
  dimensionWeights: DimensionWeight[];
  decisionThresholds: NumericDecisionThresholds;
  promptConfig: PromptConfig;
  apiConfig: ApiConfig;
  onCandidateCreated: (record: CandidateRecord) => void;
}

const AdminQuickPreview: React.FC<Props> = ({
  lang, questions, openEndedQuestions, dimensionWeights, decisionThresholds, promptConfig, apiConfig, onCandidateCreated,
}) => {
  const t = translations[lang] as any;
  const isCN = lang === 'CN';

  // --- State ---
  const [candidateInfo, setCandidateInfo] = useState<CandidateBasicInfo | null>(null);
  const [objectiveResponses, setObjectiveResponses] = useState<ObjectiveResponse[]>([]);
  const [oeResponse, setOeResponse] = useState<OpenEndedResponse | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CandidateRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState('');

  // --- Generators ---
  const handleAutoFillAll = () => {
    const info = generateMockCandidateInfo();
    setCandidateInfo(info);
    setObjectiveResponses(generateMockObjectiveResponses(questions, questionCount));
    setOeResponse(generateMockOpenEndedResponse(openEndedQuestions));
    setResult(null);
    setError(null);
  };

  const handleRegenerateInfo = () => {
    setCandidateInfo(generateMockCandidateInfo());
  };

  const handleRegenerateResponses = () => {
    setObjectiveResponses(generateMockObjectiveResponses(questions, questionCount));
  };

  const handleRegenerateOE = () => {
    setOeResponse(generateMockOpenEndedResponse(openEndedQuestions));
  };

  // --- Field editors ---
  const updateInfo = (field: keyof CandidateBasicInfo, value: any) => {
    if (!candidateInfo) return;
    setCandidateInfo({ ...candidateInfo, [field]: value });
  };

  const updateOEAnswer = (answer: string) => {
    if (!oeResponse) return;
    setOeResponse({ ...oeResponse, answer });
  };

  const updateOEQuestion = (qId: string) => {
    const q = openEndedQuestions.find(oq => oq.id === qId);
    if (!q) return;
    setOeResponse(prev => prev ? { ...prev, questionId: q.id, question: q } : null);
  };

  // --- Run AI Assessment ---
  const handleRunAssessment = async () => {
    if (!candidateInfo || objectiveResponses.length === 0) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      setProgressStep(isCN ? '生成模拟消息历史...' : 'Generating mock messages...');
      const mockMessages: Message[] = generateMockMessages(candidateInfo, objectiveResponses);

      setProgressStep(isCN ? '运行 AI 评分管线 (4-5 步)...' : 'Running AI pipeline (4-5 steps)...');
      const aiResult = await generateFinalAssessment(
        apiConfig, mockMessages, candidateInfo,
        dimensionWeights, decisionThresholds,
        objectiveResponses, promptConfig.stagePrompts,
        oeResponse || undefined,
      );

      const newRecord: CandidateRecord = {
        candidate_id: `test_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
        display_name: candidateInfo.name,
        status: aiResult.status || 'hold',
        status_badge_text_zh: aiResult.status_badge_text_zh || '待定',
        profile: {
          name: candidateInfo.name,
          identity: candidateInfo.identity === 'Employee' ? '在职' : candidateInfo.identity,
          school_org: candidateInfo.schoolOrUnit,
          major_title: candidateInfo.major,
          grade_level: candidateInfo.gradeOrLevel,
          entry_year_or_work_years: candidateInfo.yearOrExperience,
          weekly_commit_h1: candidateInfo.timeCommitmentWeeks1to8,
          weekly_commit_h2: candidateInfo.timeCommitmentWeeks9to16,
          offline_interview: candidateInfo.offlineInterview,
          wechat_id: candidateInfo.wechat,
          phone: candidateInfo.phone,
          email: candidateInfo.email,
          past_projects: candidateInfo.projects,
          homework_willingness: candidateInfo.homeworkWillingness,
          leader_willingness: candidateInfo.leaderWillingness,
          self_description: candidateInfo.selfDescription,
        },
        scores: aiResult.scores as any,
        evidence: { ...(aiResult.evidence as any), objective_responses: objectiveResponses },
        decision_card: aiResult.decision_card as any,
        admin_record: aiResult.admin_record as any,
        messages: mockMessages,
        timestamp: Date.now(),
        explainability: aiResult.explainability,
        openEndedResponse: oeResponse || undefined,
      };

      setResult(newRecord);
      onCandidateCreated(newRecord);
      setProgressStep('');
    } catch (e) {
      console.error('Quick preview assessment failed:', e);
      setError((e as Error)?.message || 'Unknown error');
      setProgressStep('');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCandidateInfo(null);
    setObjectiveResponses([]);
    setOeResponse(null);
    setResult(null);
    setError(null);
  };

  // --- Dimension label map ---
  const dimLabels: Record<string, string> = {
    '真实动机': isCN ? '真实动机' : 'Motivation',
    '逻辑闭环': isCN ? '逻辑闭环' : 'Logic',
    '反思与韧性': isCN ? '反思与韧性' : 'Resilience',
    '创新潜质': isCN ? '创新潜质' : 'Innovation',
    '投入度': isCN ? '投入度' : 'Commitment',
  };

  const hasData = candidateInfo && objectiveResponses.length > 0;
  const hasApiKey = !!apiConfig.apiKey;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            {isCN ? '快速预览' : 'Quick Preview'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCN ? '一键生成模拟候选人数据，测试完整 AI 评估流程' : 'Generate mock candidate data and test the full AI pipeline'}
          </p>
        </div>
        <button
          onClick={handleAutoFillAll}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-tsinghua-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {isCN ? '一键生成全部' : 'Auto-Generate All'}
        </button>
      </div>

      {/* Section 1: Basic Info */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
            {isCN ? '候选人基本信息' : 'Candidate Basic Info'}
          </h2>
          <button onClick={handleRegenerateInfo} disabled={isRunning} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider disabled:opacity-50">
            🔄 {isCN ? '重新生成' : 'Regenerate'}
          </button>
        </div>
        {candidateInfo ? (
          <div className="p-6 grid grid-cols-3 gap-4">
            {([
              { key: 'name', label: isCN ? '姓名' : 'Name' },
              { key: 'identity', label: isCN ? '身份' : 'Identity', type: 'select', options: ['Undergraduate', 'Master', 'MBA', 'PhD', 'Employee'] },
              { key: 'schoolOrUnit', label: isCN ? '学校/单位' : 'School/Org' },
              { key: 'major', label: isCN ? '专业' : 'Major' },
              { key: 'gradeOrLevel', label: isCN ? '年级/级别' : 'Grade' },
              { key: 'wechat', label: isCN ? '微信' : 'WeChat' },
              { key: 'phone', label: isCN ? '手机' : 'Phone' },
              { key: 'email', label: isCN ? '邮箱' : 'Email' },
              { key: 'timeCommitmentWeeks1to8', label: isCN ? '周投入(1-8周)' : 'Hours/wk (1-8)', type: 'number' },
              { key: 'timeCommitmentWeeks9to16', label: isCN ? '周投入(9-16周)' : 'Hours/wk (9-16)', type: 'number' },
            ] as { key: keyof CandidateBasicInfo; label: string; type?: string; options?: string[] }[]).map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={String(candidateInfo[f.key])}
                    onChange={e => updateInfo(f.key, e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                  >
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={String(candidateInfo[f.key])}
                    onChange={e => updateInfo(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                )}
              </div>
            ))}
            <div className="col-span-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isCN ? '自我描述' : 'Self Description'}</label>
              <input
                value={candidateInfo.selfDescription}
                onChange={e => updateInfo('selfDescription', e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isCN ? '项目经历' : 'Projects'}</label>
              <textarea
                value={candidateInfo.projects}
                onChange={e => updateInfo('projects', e.target.value)}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">{isCN ? '点击 "一键生成全部" 或 "重新生成" 填充数据' : 'Click "Auto-Generate All" or "Regenerate" to populate'}</p>
          </div>
        )}
      </section>

      {/* Section 2: Objective Responses */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-tsinghua-50 to-purple-50 border-b">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-tsinghua-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
            {isCN ? `客观题回答 (${objectiveResponses.length}题)` : `Objective Responses (${objectiveResponses.length})`}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span>{isCN ? '题数:' : 'Count:'}</span>
              <input
                type="number" min={5} max={20} value={questionCount}
                onChange={e => setQuestionCount(Math.max(5, Math.min(20, Number(e.target.value))))}
                className="w-12 px-1 py-0.5 text-center border rounded text-[10px]"
              />
            </div>
            <button onClick={handleRegenerateResponses} disabled={isRunning} className="text-[10px] font-bold text-tsinghua-600 hover:text-tsinghua-800 uppercase tracking-wider disabled:opacity-50">
              🔄 {isCN ? '全部重新生成' : 'Regenerate All'}
            </button>
          </div>
        </div>
        {objectiveResponses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase w-10">#</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase">{isCN ? '维度' : 'Dimension'}</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase">{isCN ? '题目' : 'Question'}</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase w-16">{isCN ? '选项' : 'Opt'}</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase w-16">{isCN ? '分数' : 'Score'}</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase w-16">{isCN ? '追问' : 'Probe'}</th>
                </tr>
              </thead>
              <tbody>
                {objectiveResponses.map((r, i) => {
                  const scoreColor = r.score >= 7 ? 'text-green-600 bg-green-50' : r.score >= 4 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                  return (
                    <tr key={i} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {dimLabels[r.dimension] || r.dimension}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">{r.q_id}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="font-black text-tsinghua-600">{r.label}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${scoreColor}`}>{r.score}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.probingAnswers ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">{isCN ? '点击 "一键生成全部" 或 "全部重新生成" 填充数据' : 'Click "Auto-Generate All" or "Regenerate All" to populate'}</p>
          </div>
        )}
      </section>

      {/* Section 3: Open-Ended Response */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">3</span>
            {isCN ? '开放题回答' : 'Open-Ended Response'}
          </h2>
          <button onClick={handleRegenerateOE} disabled={isRunning} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider disabled:opacity-50">
            🔄 {isCN ? '重新生成' : 'Regenerate'}
          </button>
        </div>
        {oeResponse ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isCN ? '选择题目' : 'Select Question'}</label>
              <select
                value={oeResponse.questionId}
                onChange={e => updateOEQuestion(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-emerald-200 outline-none"
              >
                {openEndedQuestions.map(q => (
                  <option key={q.id} value={q.id}>{isCN ? q.topic_zh : q.topic_en} ({q.category})</option>
                ))}
              </select>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">{isCN ? '题目背景' : 'Context'}</p>
              <p className="text-xs text-gray-600">{isCN ? oeResponse.question.context_zh : oeResponse.question.context_en}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase mt-3 mb-1">{isCN ? '分析问题' : 'Question'}</p>
              <p className="text-xs text-gray-700 font-medium">{isCN ? oeResponse.question.question_zh : oeResponse.question.question_en}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isCN ? '模拟回答' : 'Mock Answer'}</label>
              <textarea
                value={oeResponse.answer}
                onChange={e => updateOEAnswer(e.target.value)}
                rows={5}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">{oeResponse.answer.length} {isCN ? '字' : 'chars'}</p>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">{isCN ? '点击 "一键生成全部" 或 "重新生成" 填充数据' : 'Click "Auto-Generate All" or "Regenerate" to populate'}</p>
          </div>
        )}
      </section>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        {!hasApiKey && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">
            ⚠️ {isCN ? '请先在右上角设置 API Key' : 'Please set your API Key first (top-right settings)'}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            <span className="font-bold">❌ {isCN ? '评估失败:' : 'Assessment failed:'}</span> {error}
          </div>
        )}

        {isRunning ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-tsinghua-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-tsinghua-600 animate-spin"></div>
            </div>
            <p className="text-sm font-bold text-tsinghua-600">{isCN ? 'AI 评估中...' : 'Running AI Assessment...'}</p>
            <p className="text-[10px] text-gray-400">{progressStep}</p>
          </div>
        ) : result ? (
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
              <span className="text-green-600 font-bold text-sm">✅ {isCN ? '已保存至人才库（测试标签）' : 'Saved to library (TEST tag)'}</span>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {isCN ? '重新测试' : 'New Test'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleRunAssessment}
              disabled={!hasData || !hasApiKey}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-tsinghua-600 to-purple-600 text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {isCN ? '运行 AI 评估' : 'Run AI Assessment'}
            </button>
            <p className="text-[10px] text-gray-400">
              {isCN ? '⚠ 将消耗 4-5 次 API 调用' : '⚠ Will use 4-5 API calls'}
            </p>
          </div>
        )}
      </div>

      {/* Section 4: Result */}
      {result && (
        <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">4</span>
              {isCN ? '评估结果' : 'Assessment Result'}
              <span className="text-[8px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold ml-2">
                {isCN ? '测试' : 'TEST'}
              </span>
            </h2>
          </div>
          <div className="p-6">
            <ResultView record={result} isAdmin={true} lang={lang} />
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminQuickPreview;
