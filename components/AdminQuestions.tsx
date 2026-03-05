
import React, { useState, useMemo, useEffect } from 'react';
import { QuestionTemplate, Language, DimensionWeight, QuestionOption, PromptConfig, NumericDecisionThresholds, ApiConfig, ProbingStrategyConfig, DEFAULT_PROBING_STRATEGY, QuestionPromptSections, DEFAULT_QUALITY_CHECKS, QualityCheckItem } from '../types';
import { generateBatchQuestions } from '../services/aiService';
import { translations } from '../i18n';
import { getExamplesByDimension, isExampleQuestion } from '../data/exampleQuestions';
import { DEFAULT_PROMPT_SECTIONS } from '../types';

interface Props {
  questions: QuestionTemplate[];
  dimensionWeights: DimensionWeight[];
  onUpdate: (newList: QuestionTemplate[]) => void;
  lang: Language;
  promptConfig: PromptConfig;
  onUpdatePrompt: (newPrompt: PromptConfig) => void;
  decisionThresholds: NumericDecisionThresholds;
  apiConfig: ApiConfig;
  probingStrategy: ProbingStrategyConfig;
  onUpdateProbingStrategy: (s: ProbingStrategyConfig) => void;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
type StrategyKey = 'cost' | 'assumption' | 'evidence';

const STRATEGY_ICONS: Record<StrategyKey, string> = { cost: '💰', assumption: '🧠', evidence: '📋' };
const STRATEGY_COLORS: Record<StrategyKey, { bg: string; text: string }> = {
  cost: { bg: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-200' },
  assumption: { bg: 'from-tsinghua-400/20 to-tsinghua-500/10', text: 'text-tsinghua-200' },
  evidence: { bg: 'from-green-500/20 to-green-600/10', text: 'text-green-200' },
};

const AdminQuestions: React.FC<Props> = ({ questions, dimensionWeights, onUpdate, lang, promptConfig, onUpdatePrompt, decisionThresholds, apiConfig, probingStrategy, onUpdateProbingStrategy }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuestionTemplate | null>(null);
  const [activeDimension, setActiveDimension] = useState<string>("真实动机");
  const [pageIndices, setPageIndices] = useState<Record<string, number>>({});
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [isPromptEditing, setIsPromptEditing] = useState(false);
  const [bulkScope, setBulkScope] = useState<'all' | 'dimension'>('dimension');
  const [bulkText, setBulkText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSections, setEditingSections] = useState<QuestionPromptSections>(
    promptConfig.sections || DEFAULT_PROMPT_SECTIONS
  );
  const [newCaseTag, setNewCaseTag] = useState('');
  const [newQualityText, setNewQualityText] = useState('');
  const [isFullTextEdit, setIsFullTextEdit] = useState(false);
  const [fullTextDraft, setFullTextDraft] = useState('');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorDetail, setErrorDetail] = useState<{ message: string; lineNum?: number } | null>(null);
  // Probing strategy editing state
  const [editingStrategy, setEditingStrategy] = useState<ProbingStrategyConfig>(probingStrategy);
  const [strategySaved, setStrategySaved] = useState(false);

  // AI fill dialog state
  const [isAIFillOpen, setIsAIFillOpen] = useState(false);
  const [aiFillScope, setAiFillScope] = useState<'dimension' | 'all'>('dimension');
  const [aiFillCounts, setAiFillCounts] = useState<Record<string, number>>({});
  const [generatingDim, setGeneratingDim] = useState<string | null>(null);

  const defaultDimensions = ["真实动机", "逻辑闭环", "反思与韧性", "创新潜质", "投入度"];
  const dimLabels: Record<string, string> = lang === 'EN' ? {
    "真实动机": "Motivation", "逻辑闭环": "Logic", "反思与韧性": "Resilience", "创新潜质": "Innovation", "投入度": "Commitment"
  } : {};
  const currentDimensions = Array.from(new Set([...defaultDimensions, ...questions.map(q => q.dimension)]));

  const filteredQuestions = questions.filter(q => q.dimension === activeDimension);
  const currentIndex = pageIndices[activeDimension] || 0;
  const currentQ = filteredQuestions[currentIndex];

  // Sync probing strategy prop → local editing state
  useEffect(() => { setEditingStrategy(probingStrategy); }, [probingStrategy]);
  // Sync sections prop → local editing state
  useEffect(() => { setEditingSections(promptConfig.sections || DEFAULT_PROMPT_SECTIONS); }, [promptConfig.sections]);

  // Init AI fill counts when dialog opens
  useEffect(() => {
    if (isAIFillOpen) {
      const initial: Record<string, number> = {};
      currentDimensions.forEach(dim => { initial[dim] = 5; });
      setAiFillCounts(initial);
    }
  }, [isAIFillOpen]);

  // ==================== Probing Strategy Handlers ====================
  const updateStrategyField = (key: StrategyKey, field: string, value: string) => {
    setEditingStrategy(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };
  const handleStrategySave = () => {
    onUpdateProbingStrategy(editingStrategy);
    setStrategySaved(true);
    setTimeout(() => setStrategySaved(false), 2000);
  };
  const handleStrategyReset = () => {
    setEditingStrategy(DEFAULT_PROBING_STRATEGY);
    onUpdateProbingStrategy(DEFAULT_PROBING_STRATEGY);
  };

  // ==================== Assembly & Prompt Preview ====================
  const assembleFromSections = (sec: QuestionPromptSections, fwStr: string, thrStr: string): string => {
    const enabledChecks = sec.qualityChecks
      .filter(c => c.enabled)
      .map((c, i) => `${i + 1}. ${isCN ? c.text_zh : c.text_en}`)
      .join('\n');
    const lastLetter = String.fromCharCode(64 + sec.scoringFormat.optionCount);
    return [
      `一、角色定位\n${sec.role}`,
      `二、课程与场景背景\n\n2.1 课程特性\n${sec.courseBackground}\n\n2.2 典型压力场景\n${sec.pressureScenarios}\n\n2.3 案例库\n${sec.caseLibrary.join('、')}`,
      `三、评估框架\n${fwStr}`,
      `四、题目设计规则\n\n4.1 基本结构\n- 每题 ${sec.scoringFormat.optionCount} 个选项（A-${lastLetter}）\n- 分值序列：${sec.scoringFormat.scoreSequence.join('/')}\n- 至少 ${sec.scoringFormat.caseEmbedPercent}% 问题嵌入案例库具体案例\n\n4.2 选项设计原则\n${sec.optionDesignRules}\n\n4.3 追问设计原则\n${sec.probingDesignRules}`,
      `五、质量检查清单\n${enabledChecks}`,
      `六、决策规则\n${thrStr}`,
      `七、生成示例\n${sec.examples}`,
      `八、生成任务指令\n${sec.generationInstructions}`,
    ].join('\n\n');
  };

  // Reverse-parse full text back into sections (best-effort)
  const parseFullTextToSections = (text: string, prev: QuestionPromptSections): QuestionPromptSections => {
    const result = { ...prev };
    // Split by major section headers (一、二、...八、)
    const headerPattern = /^(一|二|三|四|五|六|七|八)、.+/m;
    const parts: Record<string, string> = {};
    const segments = text.split(/\n\n(?=(一|二|三|四|五|六|七|八)、)/);
    let currentKey = '';
    for (const seg of segments) {
      const hMatch = seg.match(headerPattern);
      if (hMatch) {
        currentKey = hMatch[1];
        // Remove header line
        parts[currentKey] = seg.replace(/^.+\n?/, '').trim();
      } else if (currentKey) {
        parts[currentKey] = (parts[currentKey] || '') + '\n\n' + seg.trim();
      }
    }

    // 一 → role
    if (parts['一'] !== undefined) result.role = parts['一'];

    // 二 → courseBackground, pressureScenarios, caseLibrary
    if (parts['二'] !== undefined) {
      const sec2 = parts['二'];
      const sub21 = sec2.match(/2\.1\s+[^\n]+\n([\s\S]*?)(?=\n2\.2\s|$)/);
      const sub22 = sec2.match(/2\.2\s+[^\n]+\n([\s\S]*?)(?=\n2\.3\s|$)/);
      const sub23 = sec2.match(/2\.3\s+[^\n]+\n([\s\S]*?)$/);
      if (sub21) result.courseBackground = sub21[1].trim();
      if (sub22) result.pressureScenarios = sub22[1].trim();
      if (sub23) result.caseLibrary = sub23[1].trim().split(/[、,，]/).map(s => s.trim()).filter(Boolean);
    }

    // 三 → SKIP (read-only framework)
    // 四 → scoringFormat, optionDesignRules, probingDesignRules
    if (parts['四'] !== undefined) {
      const sec4 = parts['四'];
      const optMatch = sec4.match(/每题\s*(\d+)\s*个选项/);
      if (optMatch) result.scoringFormat = { ...result.scoringFormat, optionCount: parseInt(optMatch[1]) };
      const seqMatch = sec4.match(/分值序列[：:]\s*([\d/,]+)/);
      if (seqMatch) result.scoringFormat = { ...result.scoringFormat, scoreSequence: seqMatch[1].split('/').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) };
      const pctMatch = sec4.match(/至少\s*(\d+)\s*%/);
      if (pctMatch) result.scoringFormat = { ...result.scoringFormat, caseEmbedPercent: parseInt(pctMatch[1]) };
      const sub42 = sec4.match(/4\.2\s+[^\n]+\n([\s\S]*?)(?=\n4\.3\s|$)/);
      const sub43 = sec4.match(/4\.3\s+[^\n]+\n([\s\S]*?)$/);
      if (sub42) result.optionDesignRules = sub42[1].trim();
      if (sub43) result.probingDesignRules = sub43[1].trim();
    }

    // 五 → qualityChecks (match by text, preserve existing toggles)
    if (parts['五'] !== undefined) {
      const lines = parts['五'].split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      const updatedChecks = prev.qualityChecks.map(c => ({
        ...c,
        enabled: lines.some(l => l === (isCN ? c.text_zh : c.text_en))
      }));
      // New lines not matching existing checks → add as custom
      const existingTexts = new Set(prev.qualityChecks.map(c => isCN ? c.text_zh : c.text_en));
      const newCustom = lines.filter(l => !existingTexts.has(l)).map((l, i) => ({
        id: `custom_qc_parse_${Date.now()}_${i}`,
        text_zh: l, text_en: l, enabled: true
      }));
      result.qualityChecks = [...updatedChecks, ...newCustom];
    }

    // 六 → SKIP (read-only thresholds)
    // 七 → examples
    if (parts['七'] !== undefined) result.examples = parts['七'];
    // 八 → generationInstructions
    if (parts['八'] !== undefined) result.generationInstructions = parts['八'];

    return result;
  };

  const fullLivePrompt = useMemo(() => {
    const frameworkStr = dimensionWeights.map((w, i) => {
      return `3.${i+1} ${w.dimension} (${w.dimension_en}) — ${lang === 'EN' ? 'Weight' : '权重'}: ${Math.round(w.weight * 100)}%`;
    }).join('\n');

    const thresholdStr = lang === 'EN'
      ? `Decision Thresholds (numeric):
- Reject (<): M=${decisionThresholds.reject.motivation} L=${decisionThresholds.reject.logic} R=${decisionThresholds.reject.resilience} I=${decisionThresholds.reject.innovation} C=${decisionThresholds.reject.commitment}
- Hold (>=): M=${decisionThresholds.hold.motivation} L=${decisionThresholds.hold.logic} R=${decisionThresholds.hold.resilience} I=${decisionThresholds.hold.innovation} C=${decisionThresholds.hold.commitment} Avg>=${decisionThresholds.hold.avg}
- Pass (>=): M=${decisionThresholds.pass.motivation} L=${decisionThresholds.pass.logic} R=${decisionThresholds.pass.resilience} I=${decisionThresholds.pass.innovation} C=${decisionThresholds.pass.commitment} Avg>=${decisionThresholds.pass.avg}
- Star (>=): M=${decisionThresholds.star.motivation} L=${decisionThresholds.star.logic} R=${decisionThresholds.star.resilience} I=${decisionThresholds.star.innovation} C=${decisionThresholds.star.commitment} Avg>=${decisionThresholds.star.avg}`
      : `决策阈值 (数字):
- 清退 (<): 动机=${decisionThresholds.reject.motivation} 逻辑=${decisionThresholds.reject.logic} 韧性=${decisionThresholds.reject.resilience} 创新=${decisionThresholds.reject.innovation} 投入=${decisionThresholds.reject.commitment}
- 待定 (>=): 动机=${decisionThresholds.hold.motivation} 逻辑=${decisionThresholds.hold.logic} 韧性=${decisionThresholds.hold.resilience} 创新=${decisionThresholds.hold.innovation} 投入=${decisionThresholds.hold.commitment} 均分>=${decisionThresholds.hold.avg}
- 通过 (>=): 动机=${decisionThresholds.pass.motivation} 逻辑=${decisionThresholds.pass.logic} 韧性=${decisionThresholds.pass.resilience} 创新=${decisionThresholds.pass.innovation} 投入=${decisionThresholds.pass.commitment} 均分>=${decisionThresholds.pass.avg}
- 示范 (>=): 动机=${decisionThresholds.star.motivation} 逻辑=${decisionThresholds.star.logic} 韧性=${decisionThresholds.star.resilience} 创新=${decisionThresholds.star.innovation} 投入=${decisionThresholds.star.commitment} 均分>=${decisionThresholds.star.avg}`;

    return assembleFromSections(editingSections, frameworkStr, thresholdStr);
  }, [editingSections, dimensionWeights, decisionThresholds, lang]);

  // ==================== Text Parsing ====================
  const parseRawText = (text: string): { records: QuestionTemplate[]; error?: string } => {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
    const results: QuestionTemplate[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 9) {
        const errMsg = lang === 'EN'
          ? `Question ${results.length + 1}: insufficient content. Must include title, A-E options, and 3 probing items.`
          : `第 ${results.length + 1} 道题目内容不足，请确保包含：标题行、A-E五个选项、成本/假设/证据三个追问。`;
        return { records: [], error: errMsg };
      }

      try {
        const firstLineParts = lines[0].split(/[，,]/);
        const dimension = firstLineParts[0]?.trim() || activeDimension;
        const title = firstLineParts[1]?.trim() || (lang === 'EN' ? "Untitled" : "未命名题目");
        const scenario = firstLineParts.slice(2).join('，').trim() || (lang === 'EN' ? "No scenario" : "未配置场景");

        const options: QuestionOption[] = [];
        const optionLines = lines.filter(l => /^[A-E][，,.]/i.test(l) || /^[A-E]\s/i.test(l));

        if (optionLines.length < 5) {
          const errMsg = lang === 'EN'
            ? `Question ${results.length + 1}: missing options. Use "A, text, score" format.`
            : `第 ${results.length + 1} 道题缺少选项。请使用 "A，内容，分值" 格式。`;
          return { records: [], error: errMsg };
        }

        optionLines.slice(0, 5).forEach(ol => {
          const parts = ol.split(/[，,]/);
          const label = parts[0].trim().charAt(0).toUpperCase();
          const text = parts[1]?.trim() || "";
          const score = parseInt(parts[2]?.trim()) || 0;
          options.push({ label, text, score });
        });

        const costLine = lines.find(l => l.startsWith('成本') || l.toLowerCase().startsWith('cost'));
        const assumptionLine = lines.find(l => l.startsWith('假设') || l.toLowerCase().startsWith('assumption'));
        const evidenceLine = lines.find(l => l.startsWith('证据') || l.toLowerCase().startsWith('evidence'));
        const noteLine = lines.find(l => l.startsWith('备注') || l.toLowerCase().startsWith('note'));

        results.push({
          id: `raw_${Date.now()}_${results.length}`,
          dimension, title, scenario, type: 'objective', options,
          probing_logic: {
            cost: costLine?.split(/[，,]/).slice(1).join('，').trim() || "",
            assumption: assumptionLine?.split(/[，,]/).slice(1).join('，').trim() || "",
            evidence: evidenceLine?.split(/[，,]/).slice(1).join('，').trim() || ""
          },
          methodology_note: noteLine?.split(/[，,]/).slice(1).join('，').trim() || (lang === 'EN' ? "Natural text entry" : "自然文本录入")
        });
      } catch (e) {
        const errMsg = lang === 'EN'
          ? `Error parsing question ${results.length + 1}. Check delimiters.`
          : `解析第 ${results.length + 1} 道题时发生未知错误，请检查分隔符。`;
        return { records: [], error: errMsg };
      }
    }
    return { records: results };
  };

  const generateRawText = (qs: QuestionTemplate[]) => {
    return qs.map(q => {
      const opts = q.options?.map(o => `${o.label}，${o.text}，${o.score}`).join('\n') || "";
      const probing = q.probing_logic
        ? `成本，${q.probing_logic.cost}\n假设，${q.probing_logic.assumption}\n证据，${q.probing_logic.evidence}`
        : "";
      return `${q.dimension}，${q.title}，${q.scenario}\n${opts}\n${probing}\n备注，${q.methodology_note}`;
    }).join('\n\n');
  };

  // ==================== Handlers ====================
  const handleOpenBulkEdit = (scope: 'all' | 'dimension') => {
    setBulkScope(scope);
    const editable = questions.filter(q => !isExampleQuestion(q.id));
    const data = scope === 'all' ? editable : editable.filter(q => q.dimension === activeDimension);
    setBulkText(generateRawText(data));
    setSaveStatus('idle');
    setErrorDetail(null);
    setIsBulkEditing(true);
  };

  const handleSaveBulkEdit = () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    setErrorDetail(null);

    setTimeout(() => {
      const { records, error } = parseRawText(bulkText);
      if (error) {
        setSaveStatus('error');
        setErrorDetail({ message: error });
        return;
      }

      const examples = questions.filter(q => isExampleQuestion(q.id));
      let newList: QuestionTemplate[];
      if (bulkScope === 'all') newList = [...examples, ...records];
      else {
        const others = questions.filter(q => q.dimension !== activeDimension);
        newList = [...others, ...records];
      }

      onUpdate(newList);
      setSaveStatus('success');
      setTimeout(() => {
        setIsBulkEditing(false);
        setSaveStatus('idle');
      }, 1000);
    }, 800);
  };

  const handleEdit = (q: QuestionTemplate) => {
    setEditingId(q.id);
    setEditForm(JSON.parse(JSON.stringify(q)));
  };

  const handleSave = () => {
    if (editForm) {
      const newList = questions.map(q => q.id === editForm.id ? editForm : q);
      onUpdate(newList);
      setEditingId(null);
    }
  };

  const movePage = (dir: number) => {
    const newIdx = Math.max(0, Math.min(filteredQuestions.length - 1, currentIndex + dir));
    setPageIndices({ ...pageIndices, [activeDimension]: newIdx });
  };

  const handleAddQuestionToDim = () => {
    const newId = `q_${Date.now()}`;
    const newQ: QuestionTemplate = {
      id: newId, dimension: activeDimension,
      title: `${activeDimension} BID ${lang === 'EN' ? 'Question' : '专项'} ${filteredQuestions.length + 1}`,
      scenario: "", type: "objective",
      options: [
        { label: "A", text: lang === 'EN' ? "Excellent option" : "优异选项", score: 9 },
        { label: "B", text: lang === 'EN' ? "Good option" : "较好选项", score: 7 },
        { label: "C", text: lang === 'EN' ? "Average option" : "一般选项", score: 5 },
        { label: "D", text: lang === 'EN' ? "Below average" : "偏差选项", score: 3 },
        { label: "E", text: lang === 'EN' ? "Poor option" : "极差选项", score: 1 }
      ],
      probing_logic: { cost: "", assumption: "", evidence: "" },
      methodology_note: ""
    };
    onUpdate([...questions, newQ]);
    setPageIndices({ ...pageIndices, [activeDimension]: filteredQuestions.length });
    handleEdit(newQ);
  };

  // ==================== AI Fill Dialog Handler ====================
  const handleAIFillFromDialog = async () => {
    if (!apiConfig.apiKey) {
      alert(isCN ? '请先在右上角设置中配置 API 密钥。' : 'Please configure your API key in Settings first.');
      return;
    }

    setIsGenerating(true);
    try {
      let allNewQs: QuestionTemplate[] = [];
      const dims = aiFillScope === 'dimension' ? [activeDimension] : currentDimensions;

      for (const dim of dims) {
        const count = aiFillCounts[dim] || 5;
        if (count <= 0) continue;
        setGeneratingDim(dim);
        const examples = getExamplesByDimension(dim);
        const batch = await generateBatchQuestions(apiConfig, promptConfig.stagePrompts, dim, count, examples);
        allNewQs.push(...batch);
      }

      onUpdate([...questions, ...allNewQs]);
      setIsAIFillOpen(false);
      setGeneratingDim(null);
      alert(isCN
        ? `AI 补全成功！共生成 ${allNewQs.length} 道题目。`
        : `AI auto-fill complete! Generated ${allNewQs.length} questions.`);
    } catch (e: any) {
      alert((isCN ? "生成失败: " : "Generation failed: ") + e.message);
    } finally {
      setIsGenerating(false);
      setGeneratingDim(null);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullLivePrompt);
    alert(t.promptCopied);
  };

  const handleSavePrompt = () => {
    onUpdatePrompt({ ...promptConfig, template: fullLivePrompt, sections: editingSections });
    onUpdateProbingStrategy(editingStrategy);
    setIsPromptEditing(false);
  };

  const dimLabel = (dim: string) => (lang === 'EN' && dimLabels[dim]) ? dimLabels[dim] : dim;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-fade-in relative">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-tsinghua-100 pb-8 relative z-[60]">
        <div>
          <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{t.questionsTitle}</h2>
          <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-sm italic">{t.questionsSubtitle}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsPromptEditing(true)} className="px-6 py-3 bg-[#FEF2F2] border border-[#FEE2E2] text-red-600 font-black rounded-2xl hover:bg-red-50 transition shadow-sm flex items-center gap-2 text-xs uppercase tracking-widest">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
            {t.promptManagement}
          </button>

          <button onClick={() => setIsAIFillOpen(true)} className="px-6 py-3 bg-[#EEF2FF] border border-[#E0E7FF] text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition shadow-sm flex items-center gap-2 text-xs uppercase tracking-widest">
            {isGenerating ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>}
            {t.aiFill}
          </button>

          <div className="relative group">
            <button className="px-6 py-3 bg-[#F3F4F6] border border-gray-200 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition shadow-sm text-xs uppercase tracking-widest">{t.textMaintenance}</button>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[80] overflow-hidden">
               <button onClick={() => handleOpenBulkEdit('dimension')} className="w-full text-left px-5 py-4 text-[11px] font-black text-gray-600 hover:bg-gray-50 transition border-b">{t.currentDimension}</button>
               <button onClick={() => handleOpenBulkEdit('all')} className="w-full text-left px-5 py-4 text-[11px] font-black text-tsinghua-600 hover:bg-gray-50 transition">{t.allDimensions}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension Tabs */}
      <div className="space-y-3 relative z-10">
        <div className="flex bg-white rounded-3xl p-2 shadow-sm border overflow-x-auto gap-2">
           {currentDimensions.map(dim => {
             const dimQs = questions.filter(q => q.dimension === dim);
             return (
               <button key={dim} onClick={() => setActiveDimension(dim)} className={`flex-1 min-w-[140px] px-6 py-4 rounded-2xl font-black text-sm transition-all ${activeDimension === dim ? 'bg-tsinghua-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                 {dimLabel(dim)} <span className="ml-2 opacity-50 text-[11px] font-bold">({dimQs.length})</span>
               </button>
             );
           })}
        </div>
        <div className="flex justify-center gap-6 text-[11px] font-bold">
          <span className="text-blue-500">{(t.exampleQuestionCount || '').replace('{count}', String(questions.filter(q => q.dimension === activeDimension && isExampleQuestion(q.id)).length))}</span>
          <span className="text-gray-400">|</span>
          <span className="text-tsinghua-500">{(t.userQuestionCount || '').replace('{count}', String(questions.filter(q => q.dimension === activeDimension && !isExampleQuestion(q.id)).length))}</span>
        </div>
      </div>

      {/* Content */}
      {currentQ ? (
        <div className="relative animate-scale-in">
          <div className="bg-white rounded-[60px] shadow-2xl border border-gray-100 overflow-hidden">
             <div className="bg-gray-50/80 px-12 py-10 border-b flex justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="px-6 py-2.5 bg-tsinghua-500 text-white rounded-full text-xs font-black uppercase tracking-[0.2em]">{dimLabel(currentQ.dimension)}</div>
                   {isExampleQuestion(currentQ.id) && (
                     <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">{t.exampleBadge}</span>
                   )}
                   <h3 className="text-3xl font-black text-gray-800 tracking-tight">{currentQ.title}</h3>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-gray-300 font-black text-xl tracking-widest">{currentIndex + 1} / {filteredQuestions.length}</div>
                   {!isExampleQuestion(currentQ.id) && (
                     <button onClick={() => handleEdit(currentQ)} className="px-8 py-3 bg-white border-2 border-gray-100 text-tsinghua-600 font-black rounded-2xl hover:bg-tsinghua-50 transition active:scale-95 shadow-sm text-xs uppercase tracking-widest">{t.editTemplate}</button>
                   )}
                   {isExampleQuestion(currentQ.id) && (
                     <span className="px-6 py-3 text-gray-300 text-xs font-black italic">{t.exampleReadOnly}</span>
                   )}
                </div>
             </div>
             <div className="p-16 grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-7 space-y-12">
                   <div>
                      <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 border-l-4 border-tsinghua-200 pl-5">{t.scenarioLabel}</h4>
                      <div className="bg-gray-50/50 p-12 rounded-[50px] border border-gray-100 text-xl text-gray-700 leading-relaxed shadow-inner font-medium whitespace-pre-wrap">{currentQ.scenario || (lang === 'EN' ? "No scenario..." : "未填写场景...")}</div>
                   </div>
                   {currentQ.type === 'objective' && currentQ.options && (
                      <div className="space-y-4">
                         {currentQ.options.map((opt) => (
                           <div key={opt.label} className="flex justify-between items-center p-6 bg-white border-2 border-gray-50 rounded-[24px] shadow-sm hover:border-tsinghua-200 transition-all group">
                             <div className="flex items-center gap-4">
                               <span className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-lg">{opt.label}</span>
                               <span className="font-bold text-gray-800 text-lg">{opt.text}</span>
                             </div>
                             <span className="px-5 py-2 bg-tsinghua-50 text-tsinghua-600 rounded-xl font-black text-sm border border-tsinghua-100">{opt.score}{lang === 'EN' ? 'pt' : '分'}</span>
                           </div>
                         ))}
                      </div>
                   )}
                </div>
                <div className="lg:col-span-5 space-y-12">
                   <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 border-l-4 border-tsinghua-400 pl-5">{t.probingPool}</h4>
                   <div className="space-y-8">
                      {[
                        { label: t.costProbing, text: currentQ.probing_logic?.cost, color: "text-blue-600", bg: "bg-blue-50/40", bullet: "bg-blue-500" },
                        { label: t.assumptionProbing, text: currentQ.probing_logic?.assumption, color: "text-tsinghua-600", bg: "bg-tsinghua-50/40", bullet: "bg-tsinghua-500" },
                        { label: t.evidenceProbing, text: currentQ.probing_logic?.evidence, color: "text-green-600", bg: "bg-green-50/40", bullet: "bg-green-500" }
                      ].map(p => (
                        <div key={p.label} className={`${p.bg} p-10 rounded-[40px] border border-transparent hover:border-white transition-all shadow-sm`}>
                           <p className={`text-[11px] font-black ${p.color} uppercase mb-4 tracking-widest flex items-center gap-3`}><span className={`w-2 h-2 rounded-full ${p.bullet}`}></span>{p.label}</p>
                           <p className="text-[15px] text-gray-700 font-bold italic leading-relaxed">"{p.text || t.noProbing}"</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="px-16 py-8 bg-gray-50/50 border-t flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.methodologyNote}:</span>
                   <span className="text-sm text-tsinghua-700 font-bold italic bg-white px-5 py-2 rounded-full border border-gray-100 shadow-sm">"{currentQ.methodology_note || (lang === 'EN' ? "Assessing BID core competency." : "该题目旨在考察 BID 核心能力。")}"</span>
                </div>
                <div className="flex gap-6">
                  <button onClick={() => movePage(-1)} disabled={currentIndex === 0} className="w-16 h-16 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-tsinghua-500 disabled:opacity-20 shadow-lg active:scale-90"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></button>
                  <button onClick={() => movePage(1)} disabled={currentIndex === filteredQuestions.length - 1} className="w-16 h-16 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-tsinghua-500 disabled:opacity-20 shadow-lg active:scale-90"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg></button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center bg-gray-50 rounded-[60px] border border-dashed border-gray-200">
           <p className="text-gray-400 font-black text-xl italic tracking-widest uppercase">{t.noDimensionQuestions}</p>
           <button onClick={handleAddQuestionToDim} className="mt-8 px-10 py-4 bg-tsinghua-500 text-white rounded-full font-black shadow-xl hover:bg-tsinghua-600 transition active:scale-95">{t.addQuestion}</button>
        </div>
      )}

      {/* ==================== Question Prompt Editor (Single-Panel Section Editor) ==================== */}
      {isPromptEditing && (
        <div className="fixed inset-0 bg-tsinghua-900/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-8 overflow-hidden">
          <div className="bg-white rounded-[40px] w-full max-w-7xl h-[90vh] shadow-2xl overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 border-b bg-gray-50/80">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{t.promptManagement}</h3>
                <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Modular Section Editor</p>
              </div>
              <button onClick={() => setIsPromptEditing(false)} className="p-3 hover:bg-gray-200 rounded-full transition">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Migration banner for legacy users */}
            {!promptConfig.sections && (
              <div className="px-10 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                <span className="text-amber-600 text-xs font-bold">{t.migrationWarning}</span>
                <button onClick={() => {
                  setEditingSections(DEFAULT_PROMPT_SECTIONS);
                  onUpdatePrompt({ ...promptConfig, template: fullLivePrompt, sections: DEFAULT_PROMPT_SECTIONS });
                }} className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg hover:bg-amber-600 transition">
                  {t.migrationReset}
                </button>
              </div>
            )}

            {/* Main content: Left editor + Right preview */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Section Editor */}
              <div className="w-1/2 overflow-y-auto custom-scrollbar p-8 space-y-6 border-r">

                {/* ── 📌 角色定位 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📌</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionRole}</h4>
                  </div>
                  <textarea
                    value={editingSections.role}
                    onChange={e => setEditingSections(s => ({ ...s, role: e.target.value }))}
                    className="w-full bg-gray-50 rounded-2xl p-4 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none font-medium"
                    rows={5} spellCheck={false}
                  />
                </div>

                {/* ── 📚 课程背景 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📚</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionCourseBackground}</h4>
                  </div>
                  <div className="pl-6 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">{isCN ? '课程特性' : 'Course Features'}</label>
                      <textarea value={editingSections.courseBackground} onChange={e => setEditingSections(s => ({ ...s, courseBackground: e.target.value }))}
                        className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none" rows={4} spellCheck={false} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">{t.sectionPressureScenarios}</label>
                      <textarea value={editingSections.pressureScenarios} onChange={e => setEditingSections(s => ({ ...s, pressureScenarios: e.target.value }))}
                        className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none" rows={4} spellCheck={false} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">{t.sectionCaseLibrary}</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editingSections.caseLibrary.map((c, i) => (
                          <span key={i} className="px-3 py-1.5 bg-tsinghua-50 text-tsinghua-700 rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-tsinghua-100">
                            {c}
                            <button onClick={() => setEditingSections(s => ({ ...s, caseLibrary: s.caseLibrary.filter((_, idx) => idx !== i) }))} className="text-tsinghua-300 hover:text-red-500 transition text-xs leading-none">&times;</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newCaseTag} onChange={e => setNewCaseTag(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && newCaseTag.trim()) { setEditingSections(s => ({ ...s, caseLibrary: [...s.caseLibrary, newCaseTag.trim()] })); setNewCaseTag(''); } }}
                          placeholder={t.addCase} className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs outline-none border-2 border-transparent focus:border-tsinghua-100"
                        />
                        <button onClick={() => { if (newCaseTag.trim()) { setEditingSections(s => ({ ...s, caseLibrary: [...s.caseLibrary, newCaseTag.trim()] })); setNewCaseTag(''); } }}
                          className="px-3 py-2 bg-tsinghua-500 text-white rounded-lg text-xs font-black hover:bg-tsinghua-600 transition">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 🎯 评估框架 (read-only) ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🎯</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionEvalFramework}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[9px] font-bold">{t.sectionAutoSynced}</span>
                  </div>
                  <div className="pl-6 flex flex-wrap gap-2">
                    {dimensionWeights.map(w => (
                      <span key={w.dimension} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-600">
                        {w.dimension} <span className="text-tsinghua-500">{Math.round(w.weight * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── 📝 选项设计 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📝</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionOptionRules}</h4>
                  </div>
                  <div className="pl-6 space-y-3">
                    <div className="flex gap-4 items-center flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400">{t.optionCount}</label>
                        <input type="number" min={2} max={10} value={editingSections.scoringFormat.optionCount}
                          onChange={e => setEditingSections(s => ({ ...s, scoringFormat: { ...s.scoringFormat, optionCount: parseInt(e.target.value) || 5 } }))}
                          className="w-14 h-8 text-center bg-gray-50 border-2 border-gray-100 rounded-lg font-black text-sm outline-none focus:border-tsinghua-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400">{t.scoreSequence}</label>
                        <input type="text" value={editingSections.scoringFormat.scoreSequence.join(',')}
                          onChange={e => {
                            const nums = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                            if (nums.length) setEditingSections(s => ({ ...s, scoringFormat: { ...s.scoringFormat, scoreSequence: nums } }));
                          }}
                          className="w-32 h-8 text-center bg-gray-50 border-2 border-gray-100 rounded-lg font-mono text-xs outline-none focus:border-tsinghua-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400">{t.caseEmbedPercent}</label>
                        <input type="number" min={0} max={100} value={editingSections.scoringFormat.caseEmbedPercent}
                          onChange={e => setEditingSections(s => ({ ...s, scoringFormat: { ...s.scoringFormat, caseEmbedPercent: parseInt(e.target.value) || 0 } }))}
                          className="w-14 h-8 text-center bg-gray-50 border-2 border-gray-100 rounded-lg font-black text-sm outline-none focus:border-tsinghua-200" />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <textarea value={editingSections.optionDesignRules} onChange={e => setEditingSections(s => ({ ...s, optionDesignRules: e.target.value }))}
                      className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none" rows={3} spellCheck={false} />
                  </div>
                </div>

                {/* ── 🔍 追问规则与策略 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🔍</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionProbingRules}</h4>
                  </div>
                  <div className="pl-6 space-y-3">
                    <textarea value={editingSections.probingDesignRules} onChange={e => setEditingSections(s => ({ ...s, probingDesignRules: e.target.value }))}
                      className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none" rows={3} spellCheck={false} />
                    {/* Inline probing strategy cards (light theme) */}
                    <div className="grid grid-cols-3 gap-3">
                      {(['cost', 'assumption', 'evidence'] as StrategyKey[]).map(key => {
                        const stItem = editingStrategy[key];
                        return (
                          <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-tsinghua-200 transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-lg">{STRATEGY_ICONS[key]}</span>
                              <input value={isCN ? stItem.label_zh : stItem.label_en}
                                onChange={e => updateStrategyField(key, isCN ? 'label_zh' : 'label_en', e.target.value)}
                                className="flex-1 bg-transparent text-xs font-black text-gray-700 outline-none border-b border-transparent focus:border-tsinghua-200 pb-0.5 transition" spellCheck={false} />
                            </div>
                            <div className="mb-2">
                              <span className="text-[9px] font-bold text-gray-400">{isCN ? '追问逻辑' : 'Logic'}</span>
                              <textarea value={isCN ? stItem.description_zh : stItem.description_en}
                                onChange={e => updateStrategyField(key, isCN ? 'description_zh' : 'description_en', e.target.value)}
                                className="w-full bg-white rounded-lg p-2 text-xs text-gray-600 leading-relaxed outline-none resize-none h-28 border border-gray-100 focus:border-tsinghua-200 transition mt-1" spellCheck={false} />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-gray-400">{isCN ? '示例追问' : 'Example'}</span>
                              <textarea value={stItem.prompt_template}
                                onChange={e => updateStrategyField(key, 'prompt_template', e.target.value)}
                                className="w-full bg-white rounded-lg p-2 text-xs text-tsinghua-600 leading-relaxed outline-none resize-none h-20 border border-gray-100 focus:border-tsinghua-200 transition mt-1 italic" spellCheck={false} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-center text-gray-400 text-[9px] font-medium">
                      {isCN ? '苏格拉底反诘法：代价(承诺深度) · 假设(元认知) · 证据(实证思维)' : 'Socratic Elenchus: Cost (commitment) · Assumption (metacognition) · Evidence (empirical)'}
                    </p>
                  </div>
                </div>

                {/* ── ✅ 质量检查清单 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">✅</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionQualityChecks}</h4>
                  </div>
                  <div className="pl-6 space-y-1.5">
                    {editingSections.qualityChecks.map(check => (
                      <label key={check.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-gray-50 transition cursor-pointer group">
                        <input type="checkbox" checked={check.enabled}
                          onChange={e => setEditingSections(s => ({
                            ...s, qualityChecks: s.qualityChecks.map(c => c.id === check.id ? { ...c, enabled: e.target.checked } : c)
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500 accent-tsinghua-600" />
                        <span className={`flex-1 text-xs font-medium ${check.enabled ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                          {isCN ? check.text_zh : check.text_en}
                        </span>
                        {(check.id === 'qc_no_duplicate' || check.id === 'qc_balanced_len') && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[8px] font-black uppercase">new</span>
                        )}
                        {check.id.startsWith('custom_') && (
                          <button onClick={e => { e.preventDefault(); setEditingSections(s => ({ ...s, qualityChecks: s.qualityChecks.filter(c => c.id !== check.id) })); }}
                            className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition text-xs leading-none ml-1">&times;</button>
                        )}
                      </label>
                    ))}
                    {/* Add new quality check */}
                    <div className="flex gap-2 mt-2 pl-3">
                      <input value={newQualityText} onChange={e => setNewQualityText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newQualityText.trim()) {
                            setEditingSections(s => ({ ...s, qualityChecks: [...s.qualityChecks, { id: `custom_qc_${Date.now()}`, text_zh: newQualityText.trim(), text_en: newQualityText.trim(), enabled: true }] }));
                            setNewQualityText('');
                          }
                        }}
                        placeholder={t.newQualityPlaceholder}
                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs outline-none border-2 border-transparent focus:border-tsinghua-100" />
                      <button onClick={() => {
                        if (newQualityText.trim()) {
                          setEditingSections(s => ({ ...s, qualityChecks: [...s.qualityChecks, { id: `custom_qc_${Date.now()}`, text_zh: newQualityText.trim(), text_en: newQualityText.trim(), enabled: true }] }));
                          setNewQualityText('');
                        }
                      }} className="px-3 py-2 bg-tsinghua-500 text-white rounded-lg text-xs font-black hover:bg-tsinghua-600 transition">+</button>
                    </div>
                  </div>
                </div>

                {/* ── 💡 生成示例 (collapsible) ── */}
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer mb-2 select-none list-none">
                    <span className="text-base">💡</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionExamples}</h4>
                    <svg className="w-4 h-4 text-gray-300 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </summary>
                  <div className="pl-6">
                    <textarea value={editingSections.examples} onChange={e => setEditingSections(s => ({ ...s, examples: e.target.value }))}
                      className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none font-mono" rows={10} spellCheck={false} />
                  </div>
                </details>

                {/* ── 📋 生成任务指令 ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📋</span>
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">{t.sectionInstructions}</h4>
                  </div>
                  <div className="pl-6">
                    <textarea value={editingSections.generationInstructions} onChange={e => setEditingSections(s => ({ ...s, generationInstructions: e.target.value }))}
                      className="w-full bg-gray-50 rounded-xl p-3 text-xs leading-relaxed outline-none border-2 border-transparent focus:border-tsinghua-100 resize-none" rows={4} spellCheck={false} />
                  </div>
                </div>

              </div>

              {/* Right: Live Preview / Full Text Edit */}
              <div className="w-1/2 bg-gray-50 p-8 flex flex-col space-y-4 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {/* Section / Full Text toggle */}
                    <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <button onClick={() => {
                        if (isFullTextEdit) {
                          // Switching back to section mode → parse full text back into sections
                          setEditingSections(parseFullTextToSections(fullTextDraft, editingSections));
                          setIsFullTextEdit(false);
                        }
                      }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${!isFullTextEdit ? 'bg-tsinghua-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {t.sectionMode}
                      </button>
                      <button onClick={() => {
                        if (!isFullTextEdit) {
                          setFullTextDraft(fullLivePrompt);
                          setIsFullTextEdit(true);
                        }
                      }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${isFullTextEdit ? 'bg-tsinghua-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {t.fullTextEdit}
                      </button>
                    </div>
                    {!isFullTextEdit && (
                      <p className="text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {t.syncedWithLib}
                      </p>
                    )}
                  </div>
                  <button onClick={handleCopyPrompt} className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition shadow-sm">{t.copyFullPrompt}</button>
                </div>
                {isFullTextEdit ? (
                  <textarea
                    value={fullTextDraft}
                    onChange={e => setFullTextDraft(e.target.value)}
                    className="flex-1 bg-white rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-gray-700 overflow-y-auto custom-scrollbar border-2 border-tsinghua-200 shadow-inner whitespace-pre-wrap resize-none outline-none focus:border-tsinghua-300"
                    spellCheck={false}
                  />
                ) : (
                  <div className="flex-1 bg-white rounded-2xl p-6 font-mono text-[10px] leading-relaxed text-gray-500 overflow-y-auto custom-scrollbar border border-gray-100 shadow-inner select-all whitespace-pre-wrap">
                    {fullLivePrompt}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t bg-white flex justify-between items-center flex-shrink-0">
              <button onClick={() => { setEditingSections(promptConfig.sections || DEFAULT_PROMPT_SECTIONS); setEditingStrategy(probingStrategy); setIsPromptEditing(false); }}
                className="px-8 py-3 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition">{t.cancelModify}</button>
              <button onClick={handleSavePrompt}
                className="px-10 py-3 bg-tsinghua-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-black transition active:scale-[0.98]">{t.saveAndSync}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI Fill Dialog ==================== */}
      {isAIFillOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-8" onClick={() => !isGenerating && setIsAIFillOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-10 py-6 border-b bg-indigo-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <span className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
                    </span>
                    {isCN ? 'AI 自动补全' : 'AI Auto-Fill'}
                  </h3>
                  <p className="text-gray-500 text-xs mt-1">{isCN ? '基于示例题目，调用 AI 生成新题' : 'Generate new questions based on examples via AI'}</p>
                </div>
                <button onClick={() => !isGenerating && setIsAIFillOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Scope toggle */}
            <div className="px-10 py-4 flex gap-3 border-b">
              <button onClick={() => setAiFillScope('dimension')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${aiFillScope === 'dimension' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {isCN ? '当前维度' : 'Current Dimension'} ({dimLabel(activeDimension)})
              </button>
              <button onClick={() => setAiFillScope('all')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${aiFillScope === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {isCN ? '全部维度' : 'All Dimensions'}
              </button>
            </div>

            {/* Per-dimension count inputs */}
            <div className="px-10 py-6 space-y-3 max-h-[350px] overflow-y-auto">
              {(aiFillScope === 'dimension' ? [activeDimension] : currentDimensions).map(dim => {
                const existCount = questions.filter(q => q.dimension === dim).length;
                const isCurrentlyGenerating = generatingDim === dim;
                return (
                  <div key={dim} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isCurrentlyGenerating ? 'bg-indigo-50 border-indigo-200 animate-pulse' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 bg-tsinghua-500 text-white rounded-full text-[10px] font-black">{dimLabel(dim)}</span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {isCN ? '现有' : 'existing'}: {existCount} {isCN ? '题' : 'Q'}
                      </span>
                      {isCurrentlyGenerating && (
                        <span className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-black">
                          <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          {isCN ? '生成中...' : 'Generating...'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-bold">{isCN ? '生成' : 'Generate'}</span>
                      <input
                        type="number" min="1" max="20"
                        value={aiFillCounts[dim] || 5}
                        onChange={e => setAiFillCounts(prev => ({ ...prev, [dim]: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) }))}
                        className="w-16 h-10 text-center rounded-xl border-2 border-indigo-200 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition"
                        disabled={isGenerating}
                      />
                      <span className="text-[10px] text-gray-500 font-bold">{isCN ? '题' : 'Q'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick presets */}
            <div className="px-10 py-3 flex gap-2 items-center border-t">
              <span className="text-[10px] text-gray-400 font-bold">{isCN ? '快捷:' : 'Presets:'}</span>
              {[3, 5, 10].map(n => (
                <button key={n} onClick={() => {
                  const updated = { ...aiFillCounts };
                  const dims = aiFillScope === 'dimension' ? [activeDimension] : currentDimensions;
                  dims.forEach(d => { updated[d] = n; });
                  setAiFillCounts(updated);
                }} className="px-3 py-1 text-[10px] font-bold rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition" disabled={isGenerating}>
                  {n}{isCN ? '题' : 'Q'}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-10 py-6 bg-gray-50 border-t flex justify-between items-center">
              <div className="text-[10px] text-gray-400">
                {isCN ? '将消耗 API 调用，请确保已配置 API 密钥' : 'Will consume API calls, ensure API key is configured'}
              </div>
              <div className="flex gap-3">
                <button onClick={() => !isGenerating && setIsAIFillOpen(false)} disabled={isGenerating} className="px-6 py-3 text-gray-400 font-black text-xs hover:text-gray-600 transition disabled:opacity-40">
                  {isCN ? '取消' : 'Cancel'}
                </button>
                <button onClick={handleAIFillFromDialog} disabled={isGenerating} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-xs uppercase tracking-widest">
                  {isGenerating
                    ? (isCN ? '生成中...' : 'Generating...')
                    : (isCN ? '开始生成' : 'Start Generation')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditing && (
        <div className="fixed inset-0 bg-tsinghua-900/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-8 overflow-hidden">
          <div className="bg-white rounded-[60px] w-full max-w-7xl h-[85vh] shadow-2xl overflow-hidden animate-scale-in flex flex-col">
             <div className="flex flex-1 overflow-hidden">
                <div className="w-1/3 bg-gray-50 p-12 border-r overflow-y-auto custom-scrollbar">
                   <h4 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">{lang === 'EN' ? 'Format Example' : '格式示例 (请对照书写)'}</h4>
                   <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-xs font-mono space-y-4 leading-relaxed text-gray-500">
                      <p className="text-indigo-600 font-black"># {lang === 'EN' ? 'One question per block, separated by blank lines' : '每一道题占一个段落，空行分隔'}</p>
                      <div className="text-gray-800 font-bold bg-gray-50 p-4 rounded-xl border border-gray-100">
                        投入度，退出探测，在什么情况下你会选择退出？<br/>
                        A，长期目标不匹配，9<br/>
                        B，投入产出失衡，7<br/>
                        C，短期压力过大，5<br/>
                        D，课程冲突，3<br/>
                        E，有事就不来，1<br/>
                        成本，你退出时的最大沉没成本？<br/>
                        假设，如何区分止损与逃避？<br/>
                        证据，是否有次退出证明是正确的？<br/>
                        备注，考察决策底线
                      </div>
                   </div>
                   {saveStatus === 'error' && errorDetail && (
                    <div className="mt-8 bg-red-50 border-2 border-red-100 p-6 rounded-3xl animate-shake">
                       <p className="text-red-600 font-black text-sm mb-2 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                         {lang === 'EN' ? 'Parse Error' : '录入异常'}
                       </p>
                       <p className="text-xs text-red-700 leading-relaxed font-bold">{errorDetail.message}</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-12 flex flex-col space-y-6 overflow-hidden">
                   <div className="flex justify-between items-center flex-shrink-0">
                      <div>
                        <h3 className="text-4xl font-black text-gray-900">{t.textMaintenance}</h3>
                        <p className="text-tsinghua-500 font-black mt-2 text-xs uppercase tracking-widest">Natural Text Parsing Engine</p>
                      </div>
                      <button onClick={() => setIsBulkEditing(false)} className="p-3 hover:bg-gray-100 rounded-full transition"><svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                   </div>

                   <div className="relative flex-1 group overflow-hidden">
                      <div className="absolute top-4 right-4 z-10">
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${saveStatus === 'error' ? 'bg-red-500 text-white animate-pulse' : saveStatus === 'success' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                           {saveStatus === 'error' ? 'Parsing Failed' : saveStatus === 'success' ? 'Import Success' : 'Ready'}
                         </span>
                      </div>
                      <textarea
                        value={bulkText}
                        onChange={e => {setBulkText(e.target.value); if(saveStatus==='error')setSaveStatus('idle');}}
                        className={`w-full h-full bg-gray-50 rounded-[40px] p-10 font-mono text-sm outline-none transition-all border-4 ${saveStatus==='error'?'border-red-100 focus:border-red-200':'border-transparent focus:border-indigo-100'} custom-scrollbar resize-none`}
                        spellCheck={false}
                        placeholder={lang === 'EN' ? 'Enter questions in the format shown...' : '在此按照示例格式录入题目内容...'}
                      />
                   </div>
                </div>
             </div>

             <div className="p-8 px-12 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-6 max-w-4xl ml-auto">
                   <button onClick={() => setIsBulkEditing(false)} className="flex-1 py-6 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition active:scale-95 border-2 border-transparent hover:border-gray-100 rounded-3xl">{t.cancelModify}</button>
                   <button onClick={handleSaveBulkEdit} disabled={saveStatus==='saving'||saveStatus==='success'} className={`flex-[2] py-6 text-white font-black rounded-3xl shadow-2xl transition-all active:scale-[0.98] uppercase text-xs tracking-widest ${saveStatus==='saving'?'bg-indigo-300 cursor-wait':saveStatus==='success'?'bg-green-600':'bg-tsinghua-900 hover:bg-black'}`}>
                     {saveStatus==='saving'?(lang === 'EN' ? 'Parsing...' : '正在解析并录入结构...'):saveStatus==='success'?(lang === 'EN' ? 'Synced!' : '题库同步成功'):(t.saveAndSync)}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Detail Edit Modal */}
      {editingId && editForm && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-[60px] w-full max-w-5xl shadow-2xl overflow-hidden animate-scale-in my-auto">
             <div className="p-16 space-y-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start">
                   <div>
                     <h3 className="text-4xl font-black text-gray-900">{t.configDimension}</h3>
                     <p className="text-tsinghua-500 font-black mt-2 uppercase text-xs tracking-widest">Dimension Logic Integrity Control</p>
                   </div>
                   <button onClick={() => setEditingId(null)} className="p-5 hover:bg-gray-100 rounded-full transition"><svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div className="space-y-10">
                   <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{lang === 'EN' ? 'Dimension' : '维度'}</label>
                         <select value={editForm.dimension} onChange={e => setEditForm({...editForm, dimension: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl p-6 font-black outline-none appearance-none focus:ring-4 focus:ring-tsinghua-100">
                            {currentDimensions.map(d => <option key={d} value={d}>{dimLabel(d)}</option>)}
                         </select>
                      </div>
                      <div className="space-y-4">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{lang === 'EN' ? 'Title' : '标题'}</label>
                         <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl p-6 font-black outline-none focus:ring-4 focus:ring-tsinghua-100"/>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{t.scenarioLabel}</label>
                      <textarea value={editForm.scenario} onChange={e => setEditForm({...editForm, scenario: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-50 rounded-3xl p-8 text-lg h-40 focus:ring-8 focus:ring-tsinghua-100 outline-none transition font-medium"/>
                   </div>
                   <div className="space-y-6">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{lang === 'EN' ? 'Options' : '选项配置'}</label>
                      <div className="space-y-4">
                        {editForm.options?.map((opt, i) => (
                          <div key={i} className="flex gap-4 items-center">
                            <input type="text" value={opt.label} onChange={e=>{const o=[...(editForm.options||[])]; o[i] = {...o[i], label: e.target.value}; setEditForm({...editForm,options:o});}} className="w-14 h-14 bg-gray-900 text-white rounded-xl text-center font-black shadow-lg"/>
                            <input type="text" value={opt.text} onChange={e=>{const o=[...(editForm.options||[])]; o[i] = {...o[i], text: e.target.value}; setEditForm({...editForm,options:o});}} className="flex-1 bg-gray-50 border-2 border-gray-50 rounded-xl px-6 py-4 font-bold outline-none focus:bg-white transition shadow-sm"/>
                            <input type="number" value={opt.score} onChange={e=>{const o=[...(editForm.options||[])]; o[i] = {...o[i], score: parseInt(e.target.value)||0}; setEditForm({...editForm,options:o});}} className="w-24 h-14 bg-tsinghua-50 text-tsinghua-700 text-center rounded-xl font-black outline-none border-2 border-tsinghua-100 shadow-sm"/>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
                <div className="flex gap-10 pt-10 border-t">
                   <button onClick={() => setEditingId(null)} className="flex-1 py-6 text-gray-400 font-black uppercase text-xs tracking-widest">{t.cancelModify}</button>
                   <button onClick={handleSave} className="flex-[2] py-6 bg-tsinghua-900 text-white font-black rounded-[30px] shadow-2xl hover:bg-black transition-all active:scale-[0.98] uppercase text-xs tracking-widest">{t.saveAndSync}</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>
    </div>
  );
};

export default AdminQuestions;
