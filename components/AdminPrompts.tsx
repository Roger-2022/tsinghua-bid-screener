
import React, { useState, useMemo } from 'react';
import { PromptConfig, StagePromptConfig, PipelineStage, Language, DimensionWeight, NumericDecisionThresholds, DecisionThresholdRow, DecisionTreeNode, ProbingStrategyConfig, WorkflowModuleConfig, ApiConfig, PromptVersion, EXPORT_COLUMNS, EXPORT_COLUMN_GROUPS, WORKFLOW_MODULE_DEMO_DATA, OpenEndedQuestion, DEFAULT_OPEN_ENDED_QUESTIONS, QuestionCountConfig, DEFAULT_QUESTION_COUNT_CONFIG } from '../types';
import { translations } from '../i18n';
import DecisionTreeViz from './DecisionTreeViz';
import { getProviderConfig } from '../services/llmService';
import { resolveModel } from '../services/aiService';
import { savePromptVersion, getVersionHistory } from '../services/promptVersionService';

interface Props {
  promptConfig: PromptConfig;
  onUpdate: (config: PromptConfig) => void;
  dimensionWeights: DimensionWeight[];
  decisionThresholds: NumericDecisionThresholds;
  onUpdateThresholds: (t: NumericDecisionThresholds) => void;
  lang: Language;
  decisionTree: DecisionTreeNode[];
  onUpdateDecisionTree: (tree: DecisionTreeNode[]) => void;
  probingStrategy: ProbingStrategyConfig;
  workflowModules: WorkflowModuleConfig[];
  onUpdateWorkflowModules: (m: WorkflowModuleConfig[]) => void;
  apiConfig: ApiConfig;
  onUpdateWeights?: (w: DimensionWeight[]) => void;
  questionCountConfig?: QuestionCountConfig;
  onUpdateQuestionCountConfig?: (cfg: QuestionCountConfig) => void;
}

const STAGE_ICONS: Record<PipelineStage, string> = {
  question_generation: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  probing_decision: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  score_calculation: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  open_ended_scoring: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  profile_generation: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  decision_making: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
};

const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string; light: string }> = {
  question_generation: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' },
  probing_decision: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50' },
  score_calculation: { bg: 'bg-tsinghua-500', text: 'text-tsinghua-600', border: 'border-tsinghua-200', light: 'bg-tsinghua-50' },
  open_ended_scoring: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
  profile_generation: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', light: 'bg-green-50' },
  decision_making: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200', light: 'bg-red-50' }
};

// Light-themed node card classes for minimal workflow (static strings for CDN Tailwind)
const STAGE_LIGHT_ACTIVE: Record<PipelineStage, string> = {
  question_generation: 'bg-white border-blue-300 shadow-lg shadow-blue-100/50 ring-2 ring-blue-100',
  probing_decision: 'bg-white border-amber-300 shadow-lg shadow-amber-100/50 ring-2 ring-amber-100',
  score_calculation: 'bg-white border-tsinghua-300 shadow-lg shadow-tsinghua-100/50 ring-2 ring-tsinghua-100',
  open_ended_scoring: 'bg-white border-purple-300 shadow-lg shadow-purple-100/50 ring-2 ring-purple-100',
  profile_generation: 'bg-white border-green-300 shadow-lg shadow-green-100/50 ring-2 ring-green-100',
  decision_making: 'bg-white border-red-300 shadow-lg shadow-red-100/50 ring-2 ring-red-100',
};

const STAGE_LIGHT_INACTIVE: Record<PipelineStage, string> = {
  question_generation: 'bg-white/80 border-gray-200 hover:border-blue-200 hover:shadow-md',
  probing_decision: 'bg-white/80 border-gray-200 hover:border-amber-200 hover:shadow-md',
  score_calculation: 'bg-white/80 border-gray-200 hover:border-tsinghua-200 hover:shadow-md',
  open_ended_scoring: 'bg-white/80 border-gray-200 hover:border-purple-200 hover:shadow-md',
  profile_generation: 'bg-white/80 border-gray-200 hover:border-green-200 hover:shadow-md',
  decision_making: 'bg-white/80 border-gray-200 hover:border-red-200 hover:shadow-md',
};

const DEFAULT_STAGE_ORDER: PipelineStage[] = ['question_generation', 'probing_decision', 'score_calculation', 'open_ended_scoring', 'profile_generation', 'decision_making'];

// Pipeline groups: 6 stages → 4 visual groups
interface StageGroup { id: string; label_zh: string; label_en: string; stages: PipelineStage[]; iconStage: PipelineStage; colorKey: string }
const PIPELINE_GROUPS: StageGroup[] = [
  { id: 'question_setup', label_zh: '问题设置', label_en: 'Question Setup', stages: ['question_generation', 'probing_decision', 'open_ended_scoring'], iconStage: 'question_generation', colorKey: 'blue' },
  { id: 'score_calc', label_zh: '分数计算', label_en: 'Score Calculation', stages: ['score_calculation'], iconStage: 'score_calculation', colorKey: 'tsinghua' },
  { id: 'profile_gen', label_zh: '画像生成', label_en: 'Profile Generation', stages: ['profile_generation'], iconStage: 'profile_generation', colorKey: 'green' },
  { id: 'decision', label_zh: '决策判定', label_en: 'Decision Making', stages: ['decision_making'], iconStage: 'decision_making', colorKey: 'red' },
];

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; light: string; activeBorder: string; ring: string }> = {
  blue: { bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-50', activeBorder: 'border-blue-300', ring: 'ring-blue-100' },
  tsinghua: { bg: 'bg-tsinghua-500', border: 'border-tsinghua-200', text: 'text-tsinghua-600', light: 'bg-tsinghua-50', activeBorder: 'border-tsinghua-300', ring: 'ring-tsinghua-100' },
  green: { bg: 'bg-green-500', border: 'border-green-200', text: 'text-green-600', light: 'bg-green-50', activeBorder: 'border-green-300', ring: 'ring-green-100' },
  red: { bg: 'bg-red-500', border: 'border-red-200', text: 'text-red-600', light: 'bg-red-50', activeBorder: 'border-red-300', ring: 'ring-red-100' },
};

const VARIABLE_LABELS: Record<string, { zh: string; en: string }> = {
  dimension: { zh: '维度', en: 'Dimension' },
  count: { zh: '数量', en: 'Count' },
  criteria: { zh: '评分标准', en: 'Criteria' },
  cases: { zh: '案例库', en: 'Cases' },
  responses: { zh: '回答序列', en: 'Responses' },
  current_question: { zh: '当前题目', en: 'Current Question' },
  dimension_scores: { zh: '各维度累计得分', en: 'Dimension Scores' },
  weights: { zh: '维度权重', en: 'Weights' },
  probing_answers: { zh: '追问回答', en: 'Probing Answers' },
  candidate_info: { zh: '候选人信息', en: 'Candidate Info' },
  scores: { zh: '评分结果', en: 'Scores' },
  evidence: { zh: '核心证据', en: 'Evidence' },
  weighted_avg: { zh: '加权均分', en: 'Weighted Avg' },
  risk_flags: { zh: '风险标记', en: 'Risk Flags' },
  thresholds: { zh: '决策阈值矩阵', en: 'Thresholds' },
  question_context: { zh: '题目背景', en: 'Question Context' },
  question_text: { zh: '分析问题', en: 'Question Text' },
  answer: { zh: '候选人回答', en: 'Candidate Answer' },
};

const DIM_KEYS: (keyof DecisionThresholdRow)[] = ['motivation', 'logic', 'resilience', 'innovation', 'commitment', 'thinking_depth', 'multidimensional_thinking', 'avg'];

const GROUP_ID_TO_I18N: Record<string, { cn: string; en: string }> = {
  basic: { cn: '基本信息', en: 'Basic' },
  contact: { cn: '联系方式', en: 'Contact' },
  availability: { cn: '参与意愿', en: 'Availability' },
  scores: { cn: '评分维度', en: 'Scores' },
  evaluation: { cn: '评估结果', en: 'Evaluation' },
  admin: { cn: '管理信息', en: 'Admin' },
};

// ========== Question Settings Sub-Panel ==========
const QuestionSettingsPanel: React.FC<{
  questionCountConfig: QuestionCountConfig;
  onUpdateQuestionCountConfig: (cfg: QuestionCountConfig) => void;
  dimensionWeights: DimensionWeight[];
  onUpdateWeights?: (w: DimensionWeight[]) => void;
  lang: Language;
}> = ({ questionCountConfig, onUpdateQuestionCountConfig, dimensionWeights, onUpdateWeights, lang }) => {
  const isCN = lang === 'CN';
  const [localConfig, setLocalConfig] = React.useState(questionCountConfig);
  const [localWeights, setLocalWeights] = React.useState(dimensionWeights);
  const [configSaved, setConfigSaved] = React.useState(false);
  const [weightsSaved, setWeightsSaved] = React.useState(false);

  React.useEffect(() => { setLocalConfig(questionCountConfig); }, [questionCountConfig]);
  React.useEffect(() => { setLocalWeights(dimensionWeights); }, [dimensionWeights]);

  const totalWeight = localWeights.reduce((sum, w) => sum + w.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1) < 0.005;

  const handleSaveConfig = () => {
    onUpdateQuestionCountConfig(localConfig);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleSaveWeights = () => {
    if (!isWeightValid || !onUpdateWeights) return;
    onUpdateWeights(localWeights);
    setWeightsSaved(true);
    setTimeout(() => setWeightsSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Question Count Config */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-500"></div>
        <div className="p-6 space-y-4">
          <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
            {isCN ? '问题数量设置' : 'Question Count Settings'}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-24 flex-shrink-0">{isCN ? '总题目范围' : 'Total Range'}:</span>
              <input
                type="number" min="5" max="30"
                value={localConfig.totalMin}
                onChange={e => setLocalConfig({...localConfig, totalMin: parseInt(e.target.value) || 8})}
                className="w-16 h-8 text-center rounded-lg border-2 border-blue-200 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 bg-white text-blue-700"
              />
              <span className="text-gray-400 font-bold">~</span>
              <input
                type="number" min="5" max="30"
                value={localConfig.totalMax}
                onChange={e => setLocalConfig({...localConfig, totalMax: parseInt(e.target.value) || 20})}
                className="w-16 h-8 text-center rounded-lg border-2 border-blue-200 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 bg-white text-blue-700"
              />
              <span className="text-xs text-gray-400 font-bold">{isCN ? '题' : 'Q'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-24 flex-shrink-0">{isCN ? '每维度范围' : 'Per Dimension'}:</span>
              <input
                type="number" min="1" max="10"
                value={localConfig.minPerDim}
                onChange={e => setLocalConfig({...localConfig, minPerDim: parseInt(e.target.value) || 1})}
                className="w-16 h-8 text-center rounded-lg border-2 border-tsinghua-200 font-black text-sm outline-none focus:ring-4 focus:ring-tsinghua-100 bg-white text-tsinghua-700"
              />
              <span className="text-gray-400 font-bold">~</span>
              <input
                type="number" min="1" max="10"
                value={localConfig.maxPerDim}
                onChange={e => setLocalConfig({...localConfig, maxPerDim: parseInt(e.target.value) || 4})}
                className="w-16 h-8 text-center rounded-lg border-2 border-tsinghua-200 font-black text-sm outline-none focus:ring-4 focus:ring-tsinghua-100 bg-white text-tsinghua-700"
              />
              <span className="text-xs text-gray-400 font-bold">{isCN ? '题' : 'Q'}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            {configSaved && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black animate-pulse">{isCN ? '已保存' : 'Saved'}</span>}
            <button onClick={handleSaveConfig} className="px-5 py-2 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition active:scale-95">
              {isCN ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Dimension Weights */}
      <div className="bg-white rounded-2xl border border-tsinghua-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-tsinghua-400 to-tsinghua-500"></div>
        <div className="p-6 space-y-3">
          <h4 className="text-sm font-black text-tsinghua-600 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
            {isCN ? '维度权重配置' : 'Dimension Weight Config'}
          </h4>
          <div className="space-y-2">
            {localWeights.map((w, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-tsinghua-500 text-white flex items-center justify-center text-[10px] font-black shadow flex-shrink-0">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </div>
                <span className="text-xs font-bold text-gray-700 w-16 flex-shrink-0">{w.dimension}</span>
                <input
                  type="range" min="0" max="0.5" step="0.05" value={w.weight}
                  onChange={e => {
                    const updated = [...localWeights];
                    updated[idx] = { ...updated[idx], weight: Math.round(parseFloat(e.target.value) * 100) / 100 };
                    setLocalWeights(updated);
                  }}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-tsinghua-500"
                />
                <span className="text-sm font-black text-tsinghua-600 w-10 text-right">{Math.round(w.weight * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">{isCN ? '总计' : 'Total'}:</span>
              <span className={`text-sm font-black ${isWeightValid ? 'text-green-600' : 'text-red-500'}`}>{Math.round(totalWeight * 100)}%</span>
              {isWeightValid ? (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              ) : (
                <span className="text-[10px] font-bold text-red-400">{isCN ? '须等于100%' : 'Must equal 100%'}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {weightsSaved && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black animate-pulse">{isCN ? '已保存' : 'Saved'}</span>}
              <button
                onClick={handleSaveWeights}
                disabled={!isWeightValid}
                className={`px-5 py-2 font-black rounded-xl text-[10px] uppercase tracking-widest transition active:scale-95 ${
                  isWeightValid ? 'bg-tsinghua-900 text-white hover:bg-black' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCN ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPrompts: React.FC<Props> = ({ promptConfig, onUpdate, dimensionWeights, onUpdateWeights, decisionThresholds, onUpdateThresholds, lang, decisionTree, onUpdateDecisionTree, probingStrategy, workflowModules, onUpdateWorkflowModules, apiConfig, questionCountConfig, onUpdateQuestionCountConfig }) => {
  const t = translations[lang] as any;
  const [activeStage, setActiveStage] = useState<PipelineStage>('question_generation');
  const [activeGroupId, setActiveGroupId] = useState<string>('question_setup');
  const [editingStage, setEditingStage] = useState<StagePromptConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [localThresholds, setLocalThresholds] = useState<NumericDecisionThresholds>(decisionThresholds);
  const [thresholdSaved, setThresholdSaved] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<PipelineStage[]>(DEFAULT_STAGE_ORDER);
  const [modulesSaved, setModulesSaved] = useState(false);
  const [editingTemp, setEditingTemp] = useState<string | null>(null);
  // Inline editing state (replaces modal for Part D)
  const [inlineEditStage, setInlineEditStage] = useState<PipelineStage | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<StagePromptConfig | null>(null);
  // AI Native: Prompt version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const providerConfig = getProviderConfig(apiConfig.provider);

  const resolveModelDisplay = (stage: PipelineStage, stageModel: string | undefined): string => {
    if (stage === 'probing_decision') return lang === 'CN' ? '本地逻辑' : 'Local Logic';
    const configModel = stage === 'profile_generation' ? apiConfig.deepModel : apiConfig.fastModel;
    return resolveModel(stageModel, configModel);
  };

  // Open-ended question pool management
  const [openEndedQuestions, setOpenEndedQuestions] = useState<OpenEndedQuestion[]>(() => {
    try { const s = localStorage.getItem('tsinghua_open_ended_questions'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_OPEN_ENDED_QUESTIONS;
  });
  const [editingOEQuestion, setEditingOEQuestion] = useState<OpenEndedQuestion | null>(null);
  const [isAddingOEQuestion, setIsAddingOEQuestion] = useState(false);

  const saveOEQuestions = (qs: OpenEndedQuestion[]) => {
    setOpenEndedQuestions(qs);
    localStorage.setItem('tsinghua_open_ended_questions', JSON.stringify(qs));
  };

  const stageNameMap: Record<PipelineStage, string> = {
    question_generation: t.stageQuestionGen,
    probing_decision: t.stageProbingDecision,
    score_calculation: t.stageScoreCalc,
    open_ended_scoring: (t as any).stageOpenEndedScoring || '开放题评分',
    profile_generation: t.stageProfileGen,
    decision_making: t.stageDecisionMaking
  };

  const currentStage = promptConfig.stagePrompts.find(s => s.stage === activeStage);

  // Get current stage's workflow module config
  const currentModuleConfig = useMemo(() => {
    return workflowModules.find(m => m.stageId === activeStage) || { stageId: activeStage, selectedInputKeys: [], selectedOutputKeys: [] };
  }, [workflowModules, activeStage]);

  const handleStartEdit = () => {
    if (currentStage) setEditingStage(JSON.parse(JSON.stringify(currentStage)));
  };

  const handleSave = () => {
    if (!editingStage) return;
    // AI Native: Save prompt version before updating
    savePromptVersion(editingStage.stage, editingStage.system_prompt, editingStage.inherited_context || '', lang === 'CN' ? '管理员编辑' : 'Admin edit', 'admin');
    const updated = promptConfig.stagePrompts.map(s => s.stage === editingStage.stage ? editingStage : s);
    onUpdate({ ...promptConfig, stagePrompts: updated });
    setEditingStage(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Inline edit handlers (Part D)
  const handleStartInlineEdit = (stage: PipelineStage) => {
    const stageCfg = promptConfig.stagePrompts.find(s => s.stage === stage);
    if (stageCfg) {
      setInlineEditStage(stage);
      setInlineEditDraft(JSON.parse(JSON.stringify(stageCfg)));
    }
  };

  const handleSaveInlineEdit = () => {
    if (!inlineEditDraft || !inlineEditStage) return;
    savePromptVersion(inlineEditDraft.stage, inlineEditDraft.system_prompt, inlineEditDraft.inherited_context || '', lang === 'CN' ? '管理员编辑' : 'Admin edit', 'admin');
    const updated = promptConfig.stagePrompts.map(s => s.stage === inlineEditDraft.stage ? inlineEditDraft : s);
    onUpdate({ ...promptConfig, stagePrompts: updated });
    setInlineEditStage(null);
    setInlineEditDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditStage(null);
    setInlineEditDraft(null);
  };

  // Get active group
  const activeGroup = PIPELINE_GROUPS.find(g => g.id === activeGroupId) || PIPELINE_GROUPS[0];

  const handleSaveThresholds = () => {
    onUpdateThresholds(localThresholds);
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 2000);
  };

  const handleThresholdChange = (level: keyof NumericDecisionThresholds, key: keyof DecisionThresholdRow, val: string) => {
    const num = parseFloat(val) || 0;
    setLocalThresholds(prev => ({
      ...prev,
      [level]: { ...prev[level], [key]: Math.min(10, Math.max(0, num)) }
    }));
  };

  // Toggle input/output module selection
  const toggleModuleKey = (type: 'input' | 'output', key: string) => {
    const field = type === 'input' ? 'selectedInputKeys' : 'selectedOutputKeys';
    const current = type === 'input' ? currentModuleConfig.selectedInputKeys : currentModuleConfig.selectedOutputKeys;
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    const newModules = workflowModules.map(m =>
      m.stageId === activeStage ? { ...m, [field]: updated } : m
    );
    // If stage doesn't exist yet, add it
    if (!workflowModules.find(m => m.stageId === activeStage)) {
      newModules.push({ stageId: activeStage, selectedInputKeys: type === 'input' ? updated : [], selectedOutputKeys: type === 'output' ? updated : [] });
    }
    onUpdateWorkflowModules(newModules);
    setModulesSaved(true);
    setTimeout(() => setModulesSaved(false), 1500);
  };

  const selectAllModules = (type: 'input' | 'output') => {
    const allKeys = EXPORT_COLUMNS.map(c => c.key);
    const field = type === 'input' ? 'selectedInputKeys' : 'selectedOutputKeys';
    const newModules = workflowModules.map(m =>
      m.stageId === activeStage ? { ...m, [field]: allKeys } : m
    );
    if (!workflowModules.find(m => m.stageId === activeStage)) {
      newModules.push({ stageId: activeStage, selectedInputKeys: type === 'input' ? allKeys : [], selectedOutputKeys: type === 'output' ? allKeys : [] });
    }
    onUpdateWorkflowModules(newModules);
  };

  const deselectAllModules = (type: 'input' | 'output') => {
    const field = type === 'input' ? 'selectedInputKeys' : 'selectedOutputKeys';
    const newModules = workflowModules.map(m =>
      m.stageId === activeStage ? { ...m, [field]: [] } : m
    );
    onUpdateWorkflowModules(newModules);
  };

  const stageLabel = (stage: PipelineStage) => stageNameMap[stage] || stage;

  const dimHeaderLabels: Record<string, { cn: string; en: string }> = {
    motivation: { cn: '真实动机', en: 'Motivation' },
    logic: { cn: '逻辑闭环', en: 'Logic' },
    resilience: { cn: '反思韧性', en: 'Resilience' },
    innovation: { cn: '创新潜质', en: 'Innovation' },
    commitment: { cn: '投入度', en: 'Commitment' },
    thinking_depth: { cn: '思维深度（开放题）', en: 'Thinking Depth (Open)' },
    multidimensional_thinking: { cn: '多维思考（开放题）', en: 'Multi-dim (Open)' },
    avg: { cn: '加权均分', en: 'Wtd Avg' },
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const newOrder = [...displayOrder];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    setDisplayOrder(newOrder);
  };

  const varLabel = (v: string): string => {
    const entry = VARIABLE_LABELS[v];
    if (!entry) return v;
    return lang === 'EN' ? entry.en : entry.zh;
  };

  const levelConfigs: { key: keyof NumericDecisionThresholds; label: string; color: string; bgRow: string }[] = [
    { key: 'reject', label: t.rejectThreshold, color: 'text-red-600', bgRow: 'bg-red-50/60' },
    { key: 'hold', label: t.holdThreshold, color: 'text-amber-600', bgRow: 'bg-amber-50/60' },
    { key: 'pass', label: t.passThreshold, color: 'text-green-600', bgRow: 'bg-green-50/60' },
    { key: 'star', label: t.starThreshold, color: 'text-tsinghua-600', bgRow: 'bg-tsinghua-50/60' },
  ];

  // Generate prompt preview from selected modules
  const promptPreview = useMemo(() => {
    const inputKeys = currentModuleConfig.selectedInputKeys;
    const outputKeys = currentModuleConfig.selectedOutputKeys;
    if (inputKeys.length === 0 && outputKeys.length === 0) return lang === 'CN' ? '请选择输入/输出模块以生成变量预览' : 'Select input/output modules to generate variable preview';
    const inputVars = inputKeys.map(k => {
      const col = EXPORT_COLUMNS.find(c => c.key === k);
      return col ? `{{${col.key}}}` : `{{${k}}}`;
    });
    const outputVars = outputKeys.map(k => {
      const col = EXPORT_COLUMNS.find(c => c.key === k);
      return col ? `{{${col.key}}}` : `{{${k}}}`;
    });
    const lines: string[] = [];
    if (inputVars.length > 0) lines.push(`INPUT: ${inputVars.join(', ')}`);
    if (outputVars.length > 0) lines.push(`OUTPUT: ${outputVars.join(', ')}`);
    return lines.join('\n');
  }, [currentModuleConfig, lang]);

  // Tailwind needs full class names at build time — cannot use dynamic interpolation
  const MODULE_STYLES = {
    input: {
      bgColor: 'from-blue-50 to-blue-100/50',
      borderOuter: 'border-blue-100',
      headingText: 'text-blue-500',
      countText: 'text-blue-400',
      selectAllText: 'text-blue-500 hover:text-blue-700',
      groupLabel: 'text-blue-400/70',
      selectedBorder: 'border-blue-300',
      checkboxOn: 'border-blue-500 bg-blue-500',
      demoText: 'text-blue-500',
    },
    output: {
      bgColor: 'from-green-50 to-green-100/50',
      borderOuter: 'border-green-100',
      headingText: 'text-green-500',
      countText: 'text-green-400',
      selectAllText: 'text-green-500 hover:text-green-700',
      groupLabel: 'text-green-400/70',
      selectedBorder: 'border-green-300',
      checkboxOn: 'border-green-500 bg-green-500',
      demoText: 'text-green-500',
    },
  };

  // Render module cards for a given type (read-only visual indicator)
  const renderModuleCards = (type: 'input' | 'output') => {
    const selectedKeys = type === 'input' ? currentModuleConfig.selectedInputKeys : currentModuleConfig.selectedOutputKeys;
    const s = MODULE_STYLES[type];
    const title = type === 'input' ? t.wfInputModules : t.wfOutputModules;

    return (
      <div className={`bg-gradient-to-br ${s.bgColor} rounded-2xl p-5 border ${s.borderOuter}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-[10px] font-black ${s.headingText} uppercase tracking-widest`}>{title}</h4>
          <span className={`text-[10px] font-bold ${s.countText}`}>
            {(t.wfSelectedCount as string).replace('{count}', String(selectedKeys.length))}
          </span>
        </div>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {EXPORT_COLUMN_GROUPS.map(group => {
            const groupLabel = GROUP_ID_TO_I18N[group.id];
            const groupKeys = group.keys as readonly string[];
            const groupCols = EXPORT_COLUMNS.filter(c => (groupKeys).includes(c.key));
            if (groupCols.length === 0) return null;
            return (
              <div key={group.id}>
                <div className={`text-[9px] font-black ${s.groupLabel} uppercase tracking-widest mb-1.5 sticky top-0 bg-gradient-to-r ${s.bgColor} py-1`}>
                  {lang === 'CN' ? groupLabel?.cn : groupLabel?.en}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {groupCols.map(col => {
                    const isSelected = selectedKeys.includes(col.key);
                    return (
                      <div
                        key={col.key}
                        className={`text-left px-3 py-2 rounded-xl border text-[11px] cursor-default ${
                          isSelected
                            ? `${s.selectedBorder} bg-white shadow-sm`
                            : 'border-transparent bg-white/20 opacity-40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? s.checkboxOn : 'border-gray-300/50 bg-white/50'
                          }`}>
                            {isSelected && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <div className="min-w-0">
                            <span className={`font-bold block truncate ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>{col.zh}</span>
                            <span className="text-[9px] text-gray-400 font-mono">{col.key}</span>
                            {isSelected && (
                              <span className={`text-[9px] font-bold ${s.demoText} ml-1`}>
                                · {WORKFLOW_MODULE_DEMO_DATA[col.key] || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="border-b-2 border-tsinghua-100 pb-8">
        <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{t.promptsTitle}</h2>
        <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-sm italic">{t.promptsSubtitle}</p>
      </div>

      {/* Pipeline Flow Visualization — 4 Groups */}
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-tsinghua-50/10 to-green-50/30" />
          {PIPELINE_GROUPS.map((group, idx) => {
            const gc = GROUP_COLORS[group.colorKey];
            const isActive = activeGroupId === group.id;
            const stageCount = group.stages.length;
            return (
              <React.Fragment key={group.id}>
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    onClick={() => { setActiveGroupId(group.id); setActiveStage(group.stages[0]); }}
                    className={`flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl border-2 transition-all ${isActive ? `bg-white ${gc.activeBorder} shadow-lg ring-2 ${gc.ring}` : 'bg-white/80 border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${isActive ? gc.bg : 'bg-gray-200'} flex items-center justify-center transition-colors`}>
                      <svg className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={STAGE_ICONS[group.iconStage]}/></svg>
                    </div>
                    <span className={`text-sm font-black tracking-tight ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{lang === 'CN' ? group.label_zh : group.label_en}</span>
                    {stageCount > 1 && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? `${gc.light} ${gc.text}` : 'bg-gray-100 text-gray-400'}`}>
                        {stageCount} {lang === 'CN' ? '个子环节' : 'sub-stages'}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-gray-400' : 'text-gray-300'}`}>{idx + 1}/{PIPELINE_GROUPS.length}</span>
                  </button>
                </div>
                {idx < PIPELINE_GROUPS.length - 1 && (
                  <div className="relative z-10 flex-shrink-0 mx-2">
                    <svg width="64" height="32" viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 16 L64 16" stroke="#e5e7eb" strokeWidth="1.5" />
                      <path d="M56 12 L64 16 L56 20" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <circle r="2.5" fill="#a34dff" opacity="0.6">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M0,16 L64,16" />
                      </circle>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ===== Stage Panels for Active Group ===== */}
      {activeGroup.stages.map((stageId) => {
        const stageCfg = promptConfig.stagePrompts.find(s => s.stage === stageId);
        if (!stageCfg) return null;
        const stageColors = STAGE_COLORS[stageId];
        const isInlineEditing = inlineEditStage === stageId;
        const draft = isInlineEditing ? inlineEditDraft : null;

        const upstreamMap: Record<string, { upstream: string | null; note_zh: string; note_en: string }> = {
          question_generation: { upstream: null, note_zh: '每位候选人独立数据单元', note_en: 'Each candidate is an independent data unit' },
          score_calculation: { upstream: 'probing_decision', note_zh: '每位候选人为独立数据单元，无跨候选人状态', note_en: 'Each candidate is an independent data unit, no cross-candidate state' },
          open_ended_scoring: { upstream: 'score_calculation', note_zh: '独立评估开放题回答，不受选择题成绩影响', note_en: 'Independently evaluates open-ended response, not affected by MCQ scores' },
          profile_generation: { upstream: 'score_calculation', note_zh: '仅使用当前候选人的评分结果，不引用其他候选人信息', note_en: 'Uses only current candidate scores, no cross-candidate references' },
          decision_making: { upstream: 'score_calculation', note_zh: '决策仅基于当前候选人的评分数据和全局阈值配置', note_en: 'Decision based only on current candidate scores and global thresholds' },
        };
        const inheritInfo = upstreamMap[stageId] || null;

        return (
          <div key={stageId} className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
            {/* Sub-Stage Header */}
            <div className={`${stageColors.light} px-10 py-6 border-b ${stageColors.border}`}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${stageColors.bg} flex items-center justify-center shadow-md`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={STAGE_ICONS[stageId]}/></svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stageLabel(stageId)}</h3>
                  <p className="text-gray-500 text-xs font-medium mt-0.5">{lang === 'EN' ? stageCfg.description_en : stageCfg.description_zh}</p>
                </div>
                {saved && inlineEditStage === null && <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-[10px] font-black animate-pulse">{t.promptSaved}</span>}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-gray-500 border border-gray-200">{resolveModelDisplay(stageId, stageCfg.model)}</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${stageId === 'probing_decision' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                    {stageId === 'probing_decision' ? (lang === 'CN' ? '本地逻辑' : 'Local') : 'AI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage Content */}
            {stageId === 'probing_decision' ? (
              <div className="p-10">
                <DecisionTreeViz decisionTree={decisionTree} onUpdate={onUpdateDecisionTree} lang={lang} probingStrategy={probingStrategy} />
              </div>
            ) : (
              <div className="p-10 space-y-6">
                {/* Context Inheritance Panel */}
                {inheritInfo && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-l-4 border-amber-400 overflow-hidden">
                    <div className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🔗</span>
                        <h5 className="text-xs font-black text-amber-700">{(t as any).inheritTitle}</h5>
                        {inheritInfo.upstream && <span className="text-[10px] text-amber-500 font-bold">{'· '}{(t as any).inheritUpstream}: {stageLabel(inheritInfo.upstream as PipelineStage)}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px]">🛡️</span>
                        <span className="text-[10px] text-gray-500 italic">{lang === 'CN' ? inheritInfo.note_zh : inheritInfo.note_en}</span>
                      </div>
                      {isInlineEditing && draft && stageId !== 'question_generation' ? (
                        <textarea
                          value={draft.inherited_context}
                          onChange={e => setInlineEditDraft({ ...draft, inherited_context: e.target.value })}
                          className="w-full bg-white/70 rounded-xl p-4 font-mono text-[11px] h-28 outline-none border-2 border-amber-200 focus:border-amber-400 transition resize-none"
                          spellCheck={false}
                          placeholder={lang === 'CN' ? '编辑上游继承上下文...' : 'Edit inherited context...'}
                        />
                      ) : stageId === 'question_generation' ? (
                        <div className="px-3 py-2 bg-white/60 rounded-lg"><span className="text-[11px] text-gray-400 italic">{(t as any).inheritNoUpstream}</span></div>
                      ) : stageCfg.inherited_context ? (
                        <div className="bg-white/70 rounded-xl p-3 border border-amber-200/60 max-h-[150px] overflow-y-auto">
                          <pre className="text-[11px] text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{stageCfg.inherited_context}</pre>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-white/60 rounded-lg"><span className="text-[11px] text-gray-400 italic">{(t as any).inheritNoUpstream}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Question Settings — only on question_generation */}
                {stageId === 'question_generation' && questionCountConfig && onUpdateQuestionCountConfig && (
                  <QuestionSettingsPanel
                    questionCountConfig={questionCountConfig}
                    onUpdateQuestionCountConfig={onUpdateQuestionCountConfig}
                    dimensionWeights={dimensionWeights}
                    onUpdateWeights={onUpdateWeights}
                    lang={lang}
                  />
                )}

                {/* System Prompt — view or inline edit */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-l-4 border-tsinghua-200 pl-4">{t.systemPrompt}</h4>
                  {isInlineEditing && draft ? (
                    <textarea
                      value={draft.system_prompt}
                      onChange={e => setInlineEditDraft({ ...draft, system_prompt: e.target.value })}
                      className="w-full bg-gray-50 rounded-2xl p-6 font-mono text-sm min-h-[200px] max-h-[500px] outline-none border-2 border-tsinghua-200 focus:border-tsinghua-400 transition resize-y"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[120px] max-h-[400px] overflow-y-auto">
                      <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{stageCfg.system_prompt}</pre>
                    </div>
                  )}
                </div>

                {/* Open-Ended Question Pool — inline for open_ended_scoring */}
                {stageId === 'open_ended_scoring' && (
                  <div className="border border-purple-100 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b bg-purple-50/30 flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-black text-gray-900">{(t as any).openEndedPoolTitle || '开放题库管理'}</h4>
                        <p className="text-[11px] text-gray-400">{lang === 'CN' ? '候选人作答时将随机抽取一道' : 'One question randomly selected per candidate'}</p>
                      </div>
                      <button
                        onClick={() => { setEditingOEQuestion({ id: `oe_custom_${Date.now()}`, topic_zh: '', topic_en: '', context_zh: '', context_en: '', question_zh: '', question_en: '', category: 'custom' }); setIsAddingOEQuestion(true); }}
                        className="px-4 py-2 bg-purple-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-purple-800 transition"
                      >+ {(t as any).openEndedPoolAdd || '新增'}</button>
                    </div>
                    <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                      {openEndedQuestions.length === 0 && <p className="text-center text-gray-400 text-sm py-4">{(t as any).openEndedPoolEmpty || '暂无题目'}</p>}
                      {openEndedQuestions.map((q, qIdx) => (
                        <div key={q.id} className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[8px] font-bold uppercase">{q.category}</span>
                              <span className="text-[10px] text-gray-400">#{qIdx + 1}</span>
                            </div>
                            <h5 className="text-xs font-bold text-gray-900 truncate">{lang === 'CN' ? q.topic_zh : q.topic_en}</h5>
                            <p className="text-[10px] text-purple-600 truncate mt-0.5">{lang === 'CN' ? q.question_zh : q.question_en}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingOEQuestion({ ...q }); setIsAddingOEQuestion(false); }} className="px-2 py-1 text-[9px] font-bold bg-white border border-gray-200 rounded hover:border-purple-300">{t.edit}</button>
                            <button onClick={() => { if (confirm(lang === 'CN' ? '确认删除？' : 'Delete?')) saveOEQuestions(openEndedQuestions.filter(oq => oq.id !== q.id)); }} className="px-2 py-1 text-[9px] font-bold bg-white border border-gray-200 rounded hover:border-red-300 text-red-500">{t.delete}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom: Edit / Save / Cancel buttons */}
            <div className="px-10 py-5 bg-gray-50/80 border-t flex items-center justify-end gap-3">
              {isInlineEditing ? (
                <>
                  <button onClick={handleCancelInlineEdit} className="px-6 py-2.5 text-gray-500 font-bold text-xs rounded-xl border border-gray-200 hover:bg-gray-100 transition uppercase tracking-widest">{t.cancel}</button>
                  <button onClick={handleSaveInlineEdit} className="px-8 py-2.5 bg-tsinghua-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition active:scale-95 text-xs uppercase tracking-widest">{t.savePromptConfig}</button>
                </>
              ) : stageId !== 'probing_decision' ? (
                <button onClick={() => handleStartInlineEdit(stageId)} className={`px-8 py-3 ${stageColors.light} border-2 ${stageColors.border} ${stageColors.text} font-black rounded-2xl hover:shadow-md transition active:scale-95 text-xs uppercase tracking-widest`}>{t.edit}</button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* =================== Open-Ended Question Pool — standalone (shown only for single-stage open_ended_scoring group, which doesn't apply now since it's in question_setup group) =================== */}
      {activeGroup.stages.length === 1 && activeGroup.stages[0] === 'open_ended_scoring' && (
        <div className="bg-white rounded-[40px] shadow-2xl border border-purple-100 overflow-hidden">
          <div className="px-12 py-8 border-b bg-purple-50/30">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{(t as any).openEndedPoolTitle || '开放题库管理'}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">{lang === 'CN' ? '管理开放式分析题的题库，候选人作答时将随机抽取一道' : 'Manage the open-ended question pool. One question is randomly selected for each candidate.'}</p>
          </div>
          <div className="p-8 space-y-4">
            {openEndedQuestions.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">{(t as any).openEndedPoolEmpty || '暂无题目，请添加'}</p>
            )}
            {openEndedQuestions.map((q, idx) => (
              <div key={q.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">{q.category}</span>
                      <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{lang === 'CN' ? q.topic_zh : q.topic_en}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lang === 'CN' ? q.context_zh : q.context_en}</p>
                    <p className="text-xs text-purple-600 mt-1 font-medium line-clamp-1">{lang === 'CN' ? q.question_zh : q.question_en}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => { setEditingOEQuestion({ ...q }); setIsAddingOEQuestion(false); }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition"
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => { if (confirm(lang === 'CN' ? '确认删除此题目？' : 'Delete this question?')) saveOEQuestions(openEndedQuestions.filter(oq => oq.id !== q.id)); }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-white border border-gray-200 rounded-lg hover:border-red-300 text-red-500 transition"
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-12 py-6 bg-gray-50/80 border-t flex justify-end">
            <button
              onClick={() => {
                setEditingOEQuestion({
                  id: `oe_custom_${Date.now()}`,
                  topic_zh: '', topic_en: '',
                  context_zh: '', context_en: '',
                  question_zh: '', question_en: '',
                  category: 'custom',
                });
                setIsAddingOEQuestion(true);
              }}
              className="px-8 py-3 bg-purple-700 text-white font-black rounded-2xl shadow-lg hover:bg-purple-800 transition-all active:scale-95 text-sm uppercase tracking-widest"
            >
              + {(t as any).openEndedPoolAdd || '新增题目'}
            </button>
          </div>
        </div>
      )}

      {/* Open-Ended Question Edit Modal */}
      {editingOEQuestion && (
        <div className="fixed inset-0 bg-tsinghua-900/90 backdrop-blur-xl z-[150] flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-purple-50 px-8 py-5 border-b flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-black text-gray-900">{isAddingOEQuestion ? ((t as any).openEndedPoolAdd || '新增题目') : ((t as any).openEndedPoolEdit || '编辑题目')}</h3>
              <button onClick={() => { setEditingOEQuestion(null); setIsAddingOEQuestion(false); }} className="p-2 hover:bg-white/50 rounded-full transition">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedTopic} (中文)</label>
                  <input value={editingOEQuestion.topic_zh} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, topic_zh: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedTopic} (EN)</label>
                  <input value={editingOEQuestion.topic_en} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, topic_en: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm outline-none focus:border-purple-300" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedContextLabel} (中文)</label>
                <textarea value={editingOEQuestion.context_zh} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, context_zh: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm h-24 outline-none focus:border-purple-300 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedContextLabel} (EN)</label>
                <textarea value={editingOEQuestion.context_en} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, context_en: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm h-24 outline-none focus:border-purple-300 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedQuestionLabel} (中文)</label>
                <textarea value={editingOEQuestion.question_zh} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, question_zh: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm h-20 outline-none focus:border-purple-300 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedQuestionLabel} (EN)</label>
                <textarea value={editingOEQuestion.question_en} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, question_en: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm h-20 outline-none focus:border-purple-300 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{(t as any).openEndedCategory}</label>
                <input value={editingOEQuestion.category} onChange={e => setEditingOEQuestion({ ...editingOEQuestion, category: e.target.value })} className="w-full mt-1 p-3 border rounded-xl text-sm outline-none focus:border-purple-300" placeholder="e.g., technology, economics, geopolitics" />
              </div>
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t flex justify-end gap-4 flex-shrink-0">
              <button onClick={() => { setEditingOEQuestion(null); setIsAddingOEQuestion(false); }} className="px-6 py-2.5 text-gray-500 font-bold text-sm rounded-xl border border-gray-200 hover:bg-gray-100 transition">
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  if (!editingOEQuestion.topic_zh && !editingOEQuestion.topic_en) return;
                  if (isAddingOEQuestion) {
                    saveOEQuestions([...openEndedQuestions, editingOEQuestion]);
                  } else {
                    saveOEQuestions(openEndedQuestions.map(q => q.id === editingOEQuestion.id ? editingOEQuestion : q));
                  }
                  setEditingOEQuestion(null);
                  setIsAddingOEQuestion(false);
                }}
                className="px-8 py-2.5 bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-purple-800 transition active:scale-95"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== Decision Thresholds Matrix =================== */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-12 py-8 border-b bg-gray-50/50">
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">{t.thresholdsTitle}</h3>
          <p className="text-gray-500 text-sm font-medium mt-1">{t.thresholdsSubtitle}</p>
        </div>
        <div className="p-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">
                  {lang === 'CN' ? '录取档位' : 'Level'}
                </th>
                {DIM_KEYS.map(k => (
                  <th key={k} className="px-3 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <div>{lang === 'CN' ? dimHeaderLabels[k].cn : dimHeaderLabels[k].en}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levelConfigs.map(({ key, label, color, bgRow }) => (
                <tr key={key} className={`${bgRow} border-t border-gray-100`}>
                  <td className={`px-4 py-4 ${color} font-black text-sm whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${key === 'reject' ? 'bg-red-400' : key === 'hold' ? 'bg-amber-400' : key === 'pass' ? 'bg-green-400' : 'bg-tsinghua-400'}`}></span>
                      {label}
                    </div>
                  </td>
                  {DIM_KEYS.map(dimKey => (
                    <td key={dimKey} className="px-3 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={localThresholds[key][dimKey]}
                        onChange={e => handleThresholdChange(key, dimKey, e.target.value)}
                        className={`w-16 h-10 text-center rounded-xl border-2 font-black text-sm outline-none transition-all focus:ring-4 ${
                          key === 'reject' ? 'border-red-200 focus:ring-red-100 text-red-700 bg-white' :
                          key === 'hold' ? 'border-amber-200 focus:ring-amber-100 text-amber-700 bg-white' :
                          key === 'pass' ? 'border-green-200 focus:ring-green-100 text-green-700 bg-white' :
                          'border-tsinghua-200 focus:ring-tsinghua-100 text-tsinghua-700 bg-white'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-12 py-6 bg-gray-50/80 border-t flex justify-end items-center gap-4">
          {thresholdSaved && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black animate-pulse">
              {lang === 'CN' ? '阈值已保存' : 'Thresholds Saved'}
            </span>
          )}
          <button
            onClick={handleSaveThresholds}
            className="px-10 py-4 bg-tsinghua-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            {t.syncThresholds}
          </button>
        </div>
      </div>

      {/* Old Edit Modal removed — now using inline editing (Part D) */}
    </div>
  );
};

export default AdminPrompts;
