
import React, { useState, useEffect } from 'react';
import { DecisionTreeNode, Language, ProbingStrategyConfig } from '../types';
import { translations } from '../i18n';

interface Props {
  decisionTree: DecisionTreeNode[];
  onUpdate: (tree: DecisionTreeNode[]) => void;
  lang: Language;
  probingStrategy: ProbingStrategyConfig;
}

type StrategyKey = 'cost' | 'assumption' | 'evidence';
type ActionType = 'cost' | 'assumption' | 'evidence' | 'all' | 'skip';

const STRATEGY_ICONS: Record<StrategyKey, string> = { cost: '💰', assumption: '🧠', evidence: '📋' };
const STRATEGY_COLORS: Record<StrategyKey, { bg: string; border: string; text: string }> = {
  cost: { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-300', text: 'text-amber-700' },
  assumption: { bg: 'from-tsinghua-400/20 to-tsinghua-500/10', border: 'border-tsinghua-300', text: 'text-tsinghua-700' },
  evidence: { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-300', text: 'text-green-700' },
};

const ACTION_OPTIONS: { key: ActionType; icon: string; colorClass: string }[] = [
  { key: 'cost', icon: '💰', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'assumption', icon: '🧠', colorClass: 'bg-tsinghua-100 text-tsinghua-800 border-tsinghua-300' },
  { key: 'evidence', icon: '📋', colorClass: 'bg-green-100 text-green-800 border-green-300' },
  { key: 'all', icon: '🔗', colorClass: 'bg-red-100 text-red-800 border-red-300' },
  { key: 'skip', icon: '⏭', colorClass: 'bg-gray-100 text-gray-600 border-gray-300' },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  consistency: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', glow: 'shadow-red-200/50' },
  depth: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', glow: 'shadow-blue-200/50' },
  validation: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', glow: 'shadow-green-200/50' },
  routine: { bg: 'bg-tsinghua-50', border: 'border-tsinghua-200', text: 'text-tsinghua-700', glow: 'shadow-tsinghua-200/50' },
};

const DecisionTreeViz: React.FC<Props> = ({ decisionTree, onUpdate, lang, probingStrategy }) => {
  const t = translations[lang] as any;
  const [localTree, setLocalTree] = useState<DecisionTreeNode[]>(decisionTree);
  const [saved, setSaved] = useState(false);
  const [activeDemo, setActiveDemo] = useState<number>(0);
  // Map: nodeId → selected action types (multi-select)
  const [nodeActions, setNodeActions] = useState<Record<string, ActionType[]>>(() => {
    const initial: Record<string, ActionType[]> = {};
    decisionTree.forEach(n => {
      if (n.action === 'deep_probe') initial[n.id] = ['cost', 'assumption', 'evidence'];
      else if (n.action === 'skip') initial[n.id] = ['skip'];
      else initial[n.id] = ['cost']; // default to cost for 'probe'
    });
    return initial;
  });

  useEffect(() => { setLocalTree(decisionTree); }, [decisionTree]);

  const handleThresholdChange = (id: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLocalTree(prev => prev.map(node => node.id === id ? { ...node, threshold: Math.max(0, num) } : node));
  };

  const handleProbabilityChange = (id: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const clamped = Math.min(1, Math.max(0, num / 100));
    setLocalTree(prev => prev.map(node => node.id === id ? { ...node, probability: clamped } : node));
  };

  const handleSave = () => {
    onUpdate(localTree);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => { setLocalTree(decisionTree); };

  const handleActionSelect = (nodeId: string, action: ActionType) => {
    setNodeActions(prev => {
      const current = prev[nodeId] || [];
      let updated: ActionType[];

      if (action === 'skip') {
        // Skip is exclusive — toggles all others off
        updated = current.includes('skip') ? [] : ['skip'];
      } else if (action === 'all') {
        // "All" selects cost+assumption+evidence, or deselects
        const hasAll = ['cost', 'assumption', 'evidence'].every(a => current.includes(a as ActionType));
        updated = hasAll ? [] : ['cost', 'assumption', 'evidence'];
      } else {
        // Toggle individual action, remove skip if present
        const withoutSkip = current.filter(a => a !== 'skip');
        updated = withoutSkip.includes(action)
          ? withoutSkip.filter(a => a !== action)
          : [...withoutSkip, action];
      }

      // Map to tree node action field + persist selectedActions
      const strategyActions = updated.filter(a => a !== 'skip' && a !== 'all') as ('cost' | 'assumption' | 'evidence')[];
      const mappedAction = updated.includes('skip') ? 'skip' as const
        : strategyActions.length >= 3 ? 'deep_probe' as const
        : strategyActions.length > 0 ? 'probe' as const
        : 'skip' as const;
      setLocalTree(p => p.map(node => node.id === nodeId ? { ...node, action: mappedAction, selectedActions: strategyActions } : node));

      return { ...prev, [nodeId]: updated };
    });
  };

  const getConditionLabel = (condition: string) => {
    const key = `dtCondition_${condition}` as keyof typeof t;
    return t[key] || condition;
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return '';
    const key = `dtRuleCategory_${cat}` as keyof typeof t;
    return t[key] || cat;
  };

  const getActionLabel = (action: ActionType): string => {
    const labels: Record<ActionType, { cn: string; en: string }> = {
      cost: { cn: probingStrategy.cost.label_zh, en: probingStrategy.cost.label_en },
      assumption: { cn: probingStrategy.assumption.label_zh, en: probingStrategy.assumption.label_en },
      evidence: { cn: probingStrategy.evidence.label_zh, en: probingStrategy.evidence.label_en },
      all: { cn: t.wfActionAll || '全部追问', en: t.wfActionAll || 'Full Probing' },
      skip: { cn: t.wfActionSkip || '跳过', en: t.wfActionSkip || 'Skip' },
    };
    return lang === 'CN' ? labels[action].cn : labels[action].en;
  };

  const getMultiActionLabels = (actions: ActionType[]): string => {
    if (actions.length === 0) return lang === 'CN' ? '未选择' : 'None';
    return actions.map(a => getActionLabel(a)).join(' + ');
  };

  // Generate dynamic demo content for each rule
  const getDemoContent = (node: DecisionTreeNode) => {
    const threshold = node.threshold ?? 0;
    const probability = Math.round((node.probability || 0) * 100);

    switch (node.condition) {
      case 'contradiction':
        return {
          scenario: lang === 'CN'
            ? `候选人在"真实动机"维度，前一题得到 ${9} 分，后一题仅得 ${9 - threshold - 1} 分，差值 > ${threshold}`
            : `Candidate scored ${9} then ${9 - threshold - 1} in Motivation, diff > ${threshold}`,
          visual: (
            <div className="flex items-center gap-3 my-3">
              <div className="px-3 py-2 bg-green-100 rounded-xl text-sm font-black text-green-700 border border-green-200">
                {lang === 'CN' ? '真实动机' : 'Motivation'}: 9
              </div>
              <span className="text-gray-400 font-bold text-lg">→</span>
              <div className="px-3 py-2 bg-red-100 rounded-xl text-sm font-black text-red-700 border border-red-200">
                {lang === 'CN' ? '真实动机' : 'Motivation'}: {9 - threshold - 1}
              </div>
              <span className="px-2 py-1 bg-amber-50 rounded text-[10px] font-bold text-amber-600">{lang === 'CN' ? `差值 ${threshold + 1} > ${threshold}` : `Diff ${threshold + 1} > ${threshold}`}</span>
            </div>
          ),
        };
      case 'same_option_streak':
        return {
          scenario: lang === 'CN'
            ? `候选人连续 ${threshold} 题选择了相同选项 B`
            : `Candidate chose option B for ${threshold} consecutive questions`,
          visual: (
            <div className="flex gap-1.5 my-3">
              {Array.from({ length: Math.min(threshold, 8) }).map((_, i) => (
                <div key={i} className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-sm font-black text-amber-700 border border-amber-200">
                  B
                </div>
              ))}
              {threshold > 8 && <span className="text-gray-400 font-bold self-center">...</span>}
            </div>
          ),
        };
      case 'low_score':
        return {
          scenario: lang === 'CN'
            ? `当前维度得分 ≤ ${threshold}，以 ${probability}% 概率触发追问`
            : `Current dimension score ≤ ${threshold}, triggers with ${probability}% probability`,
          visual: (
            <div className="flex items-center gap-3 my-3">
              <div className="px-3 py-2 bg-red-100 rounded-xl text-sm font-black text-red-700 border border-red-200">
                {lang === 'CN' ? '当前得分' : 'Score'}: {threshold}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex-1">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all" style={{ width: `${probability}%` }} />
                </div>
                <span className="text-xs font-black text-blue-600 whitespace-nowrap">{probability}%</span>
              </div>
            </div>
          ),
        };
      case 'high_score':
        return {
          scenario: lang === 'CN'
            ? `当前维度得分 ≥ ${threshold}，以 ${probability}% 概率触发验证追问`
            : `Current dimension score ≥ ${threshold}, triggers validation with ${probability}% probability`,
          visual: (
            <div className="flex items-center gap-3 my-3">
              <div className="px-3 py-2 bg-green-100 rounded-xl text-sm font-black text-green-700 border border-green-200">
                {lang === 'CN' ? '当前得分' : 'Score'}: {threshold}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex-1">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all" style={{ width: `${probability}%` }} />
                </div>
                <span className="text-xs font-black text-green-600 whitespace-nowrap">{probability}%</span>
              </div>
            </div>
          ),
        };
      case 'random':
        return {
          scenario: lang === 'CN'
            ? `以 ${probability}% 的概率随机触发常态化追问`
            : `Triggers routine probing with ${probability}% random probability`,
          visual: (
            <div className="flex items-center gap-3 my-3">
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex-1">
                <div className="h-full bg-gradient-to-r from-tsinghua-400 to-tsinghua-500 rounded-full transition-all animate-pulse" style={{ width: `${probability}%` }} />
              </div>
              <span className="text-sm font-black text-tsinghua-600 whitespace-nowrap">{probability}%</span>
            </div>
          ),
        };
      default:
        return { scenario: '', visual: null };
    }
  };

  return (
    <div className="space-y-10">

      {/* ===== Zone B: Probing Trigger Flow (Redesigned — no input column) ===== */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="px-10 py-6 border-b bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-sm font-black">⚡</div>
            <h4 className="text-xl font-black text-gray-900 tracking-tight">{t.dtFlowTitle}</h4>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-[1fr_240px] gap-8 items-start">
            {/* Left: Rule Cards */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">{t.wfFlowRules}</h5>
              {localTree.map((node, idx) => {
                const catColors = CATEGORY_COLORS[node.category || 'routine'];
                const selectedActions = nodeActions[node.id] || [];
                const hasAllStrategy = ['cost', 'assumption', 'evidence'].every(a => selectedActions.includes(a as ActionType));

                return (
                  <div key={node.id} className={`relative rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg ${catColors.border} ${catColors.bg}`}>
                    {/* Rule header — no category label */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{node.icon || '📌'}</span>
                        <h6 className="text-sm font-black text-gray-900">{getConditionLabel(node.condition)}</h6>
                      </div>
                    </div>

                    {/* Inline description with embedded threshold/probability inputs */}
                    <div className="text-xs text-gray-600 mb-4 leading-loose flex items-center flex-wrap gap-y-2">
                      {node.condition === 'contradiction' && (
                        <>
                          <span>{lang === 'CN' ? '同维度前后得分差异 >' : 'Same-dimension score diff >'}</span>
                          <input
                            type="number" min="0" max="10" step="1"
                            value={node.threshold ?? 0}
                            onChange={e => handleThresholdChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-red-200 font-black text-sm outline-none focus:ring-4 focus:ring-red-100 bg-white text-red-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '分，触发矛盾追问' : 'pts, triggers contradiction probing'}</span>
                        </>
                      )}
                      {node.condition === 'same_option_streak' && (
                        <>
                          <span>{lang === 'CN' ? '连续' : 'Consecutive'}</span>
                          <input
                            type="number" min="2" max="10" step="1"
                            value={node.threshold ?? 0}
                            onChange={e => handleThresholdChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-blue-200 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 bg-white text-blue-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '题选同一选项，触发深度追问' : 'questions with same option, triggers deep probing'}</span>
                        </>
                      )}
                      {node.condition === 'low_score' && (
                        <>
                          <span>{lang === 'CN' ? '当前得分 ≤' : 'Current score ≤'}</span>
                          <input
                            type="number" min="0" max="10" step="1"
                            value={node.threshold ?? 0}
                            onChange={e => handleThresholdChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-red-200 font-black text-sm outline-none focus:ring-4 focus:ring-red-100 bg-white text-red-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '且随机' : 'with random'}</span>
                          <input
                            type="number" min="0" max="100" step="5"
                            value={Math.round((node.probability || 0) * 100)}
                            onChange={e => handleProbabilityChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-blue-200 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 bg-white text-blue-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '% 概率，触发追问' : '% probability, triggers probing'}</span>
                        </>
                      )}
                      {node.condition === 'high_score' && (
                        <>
                          <span>{lang === 'CN' ? '当前得分 ≥' : 'Current score ≥'}</span>
                          <input
                            type="number" min="0" max="10" step="1"
                            value={node.threshold ?? 0}
                            onChange={e => handleThresholdChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-green-200 font-black text-sm outline-none focus:ring-4 focus:ring-green-100 bg-white text-green-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '且随机' : 'with random'}</span>
                          <input
                            type="number" min="0" max="100" step="5"
                            value={Math.round((node.probability || 0) * 100)}
                            onChange={e => handleProbabilityChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-green-200 font-black text-sm outline-none focus:ring-4 focus:ring-green-100 bg-white text-green-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '% 概率，触发验证追问' : '% probability, triggers validation probing'}</span>
                        </>
                      )}
                      {node.condition === 'random' && (
                        <>
                          <input
                            type="number" min="0" max="100" step="5"
                            value={Math.round((node.probability || 0) * 100)}
                            onChange={e => handleProbabilityChange(node.id, e.target.value)}
                            className="w-14 h-7 text-center rounded-lg border-2 border-tsinghua-200 font-black text-sm outline-none focus:ring-4 focus:ring-tsinghua-100 bg-white text-tsinghua-700 transition-all mx-1 inline-block"
                          />
                          <span>{lang === 'CN' ? '% 随机概率触发常态化探测' : '% random probability triggers routine probing'}</span>
                        </>
                      )}
                    </div>

                    {/* Action Selector — multi-select */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase mr-1">{t.wfSelectAction}:</span>
                      {ACTION_OPTIONS.map(opt => {
                        const isSelected = opt.key === 'all'
                          ? hasAllStrategy
                          : selectedActions.includes(opt.key);
                        return (
                          <button
                            key={opt.key}
                            onClick={() => handleActionSelect(node.id, opt.key)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              isSelected
                                ? `${opt.colorClass} shadow-md scale-105`
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                            title={getActionLabel(opt.key)}
                          >
                            {opt.icon}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected action badges — multi-select visualization */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-200 to-amber-400" />
                      <div className="flex items-center gap-1">
                        {selectedActions.length === 0 ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200">
                            {lang === 'CN' ? '未选择' : 'None'}
                          </span>
                        ) : selectedActions.map(action => {
                          const opt = ACTION_OPTIONS.find(a => a.key === action);
                          return (
                            <span key={action} className={`px-2 py-1 rounded-lg text-[10px] font-black ${opt?.colorClass || 'bg-gray-100 text-gray-600'} border flex items-center gap-1`}>
                              <span>{opt?.icon}</span>
                              <span>{getActionLabel(action)}</span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="h-px w-4 bg-amber-400" />
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </div>

                    {/* Theory basis */}
                    {(node.theory_basis_zh || node.theory_basis_en) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 italic leading-relaxed">
                          📖 {lang === 'EN' ? node.theory_basis_en : node.theory_basis_zh}
                        </p>
                      </div>
                    )}

                    {/* Flow connector */}
                    {idx < localTree.length - 1 && (
                      <div className="absolute -bottom-4 left-8 z-10">
                        <div className="w-px h-4 bg-gradient-to-b from-gray-200 to-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Action Nodes Panel */}
            <div className="space-y-3 sticky top-4">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">{t.wfFlowActions}</h5>
              {ACTION_OPTIONS.map(opt => {
                const connectedCount = (Object.values(nodeActions) as ActionType[][]).filter(actions => actions.includes(opt.key)).length;
                const isActive = connectedCount > 0;
                return (
                  <div key={opt.key} className={`rounded-2xl px-4 py-3 border-2 transition-all ${
                    isActive
                      ? `${opt.colorClass} shadow-lg scale-[1.02]`
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-xs font-black">{getActionLabel(opt.key)}</span>
                      {isActive && (
                        <span className="ml-auto text-[9px] font-bold bg-white/60 rounded px-1.5 py-0.5">
                          {connectedCount} {t.wfConnected}
                        </span>
                      )}
                    </div>
                    {opt.key !== 'skip' && opt.key !== 'all' && (
                      <p className="text-[10px] opacity-70 font-medium leading-relaxed">
                        {lang === 'CN' ? probingStrategy[opt.key as StrategyKey]?.description_zh : probingStrategy[opt.key as StrategyKey]?.description_en}
                      </p>
                    )}
                    {opt.key === 'all' && (
                      <p className="text-[10px] opacity-70 font-medium">
                        {lang === 'CN' ? '代价 + 假设 + 证据 三维追问' : 'Cost + Assumption + Evidence combined'}
                      </p>
                    )}
                    {opt.key === 'skip' && (
                      <p className="text-[10px] opacity-70 font-medium">
                        {lang === 'CN' ? '直接进入下一题' : 'Proceed to next question'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Zone C: Dynamic Demo (5 clickable tabs) ===== */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border border-amber-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-amber-100/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center text-amber-700 text-sm font-black">🎬</div>
            <div>
              <h4 className="text-lg font-black text-gray-900 tracking-tight">{t.wfDemoTitle || t.dtExampleTitle}</h4>
              <p className="text-[11px] text-gray-500 font-medium">{t.wfDemoSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Demo Tab Buttons */}
        <div className="px-8 pt-5 flex gap-2 flex-wrap">
          {localTree.map((node, idx) => {
            const catColors = CATEGORY_COLORS[node.category || 'routine'];
            const isActive = activeDemo === idx;
            return (
              <button
                key={node.id}
                onClick={() => setActiveDemo(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? `${catColors.bg} ${catColors.border} border-2 ${catColors.text} shadow-md`
                    : 'bg-white border-2 border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/80'
                }`}
              >
                <span className="mr-1.5">{node.icon || '📌'}</span>
                {getConditionLabel(node.condition)}
              </button>
            );
          })}
        </div>

        {/* Active Demo Content */}
        <div className="p-8">
          {localTree[activeDemo] && (() => {
            const node = localTree[activeDemo];
            const demo = getDemoContent(node);
            const catColors = CATEGORY_COLORS[node.category || 'routine'];
            const demoActions = nodeActions[node.id] || [];

            return (
              <div className={`bg-white rounded-2xl p-6 border-2 ${catColors.border} shadow-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{node.icon}</span>
                  <h5 className="text-sm font-black text-gray-900">{getConditionLabel(node.condition)}</h5>
                </div>

                {/* Scenario */}
                <div className="mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.wfDemoScenario}</span>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{demo.scenario}</p>
                </div>

                {/* Visual */}
                {demo.visual}

                {/* Current Params */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.wfDemoParams}:</span>
                  <span className="px-2 py-1 bg-amber-50 rounded text-xs font-bold text-amber-700">
                    {t.dtThreshold}: {node.threshold ?? 0}
                  </span>
                  {node.probability !== undefined && (
                    <span className="px-2 py-1 bg-blue-50 rounded text-xs font-bold text-blue-700">
                      {t.dtProbability}: {Math.round((node.probability || 0) * 100)}%
                    </span>
                  )}
                </div>

                {/* Result — multi-select badges */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 flex-wrap">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.wfDemoResult}:</span>
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  {demoActions.length === 0 ? (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200">
                      {lang === 'CN' ? '未选择' : 'None'}
                    </span>
                  ) : demoActions.map(action => {
                    const opt = ACTION_OPTIONS.find(a => a.key === action);
                    return (
                      <span key={action} className={`px-3 py-1.5 rounded-lg text-xs font-black ${opt?.colorClass || 'bg-gray-100 text-gray-600'} border flex items-center gap-1.5`}>
                        <span>{opt?.icon}</span>
                        <span>{getActionLabel(action)}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ===== Zone D: Save Bar ===== */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
            {t.dtLocalLogic}
          </div>
          {saved && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black animate-pulse">
              {t.dtTreeSaved}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-6 py-3 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-600 transition rounded-xl border-2 border-transparent hover:border-gray-200"
          >
            {t.dtResetTree}
          </button>
          <button
            onClick={handleSave}
            className="px-10 py-3 bg-tsinghua-900 text-white font-black rounded-xl shadow-xl hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            {t.dtSaveTree}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionTreeViz;
