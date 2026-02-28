
import { chatCompletionJSON } from './llmService';
import { ApiConfig, CandidateRecord, CandidateExplainability, Message, DimensionWeight, NumericDecisionThresholds, QuestionTemplate, StagePromptConfig, PipelineStage, OpenEndedResponse } from '../types';

// ===========================================================================
// 1. Question Generation
// ===========================================================================

export const generateBatchQuestions = async (
  apiConfig: ApiConfig,
  stagePrompts: StagePromptConfig[],
  dimension: string,
  count: number = 5,
  exampleQuestions?: QuestionTemplate[]
): Promise<QuestionTemplate[]> => {
  const qgStage = stagePrompts.find(s => s.stage === 'question_generation');

  // Pick 1 random example to keep prompt short
  const singleExample = exampleQuestions?.length
    ? [exampleQuestions[Math.floor(Math.random() * exampleQuestions.length)]]
    : [];
  const examplesBlock = singleExample.length
    ? `\n### 示例（参考风格和结构，请勿复制）\n${singleExample.map(q =>
        `【${q.dimension}】${q.title}\n场景：${q.scenario}\n${q.options?.map(o => `${o.label}. ${o.text}（${o.score}分）`).join('\n')}\n追问-成本：${q.probing_logic?.cost}\n追问-假设：${q.probing_logic?.assumption}\n追问-证据：${q.probing_logic?.evidence}\n考察要点：${q.methodology_note}`
      ).join('\n\n')}`
    : '';

  // Use admin-configured system prompt, fallback to built-in default
  const rawSystemPrompt = qgStage?.system_prompt || `你是清华经管BID商业模式工坊的题目设计专家。生成场景化选择题评估申请者潜质。

核心规则：
- 每题5个选项(A-E)，分值递减(A:9, B:7, C:5, D:3, E:1)
- 行为导向：问"你会怎么做"，非"你怎么看"
- 使用BID真实场景(小组协作、案例分析、嘉宾提问、路演答辩等)
- 每题3个追问：成本(代价)、假设(前提)、证据(经历)
- 选项须看起来都合理，避免社会期望偏差
- 至少30%题目嵌入案例库(拼多多/SHEIN/西南航空/麦当劳/Costco/瑞幸等)`;
  const inheritedCtx = qgStage?.inherited_context || '';
  const systemPrompt = inheritedCtx
    ? `[上下文继承]\n${inheritedCtx}\n\n[系统提示词]\n${rawSystemPrompt}`
    : rawSystemPrompt;

  const userPrompt = `${examplesBlock}

请生成 ${count} 道针对【${dimension}】维度的全新场景题目。每道题必须有独立的、真实可信的BID课程场景。
直接返回JSON数组：
[{"title":"题目标题","scenario":"场景描述","type":"objective","options":[{"label":"A","text":"选项文本","score":9},...],
"probing_logic":{"cost":"...","assumption":"...","evidence":"..."},"methodology_note":"考察要点说明"}]`;

  const parsed = await chatCompletionJSON<any[]>(apiConfig, {
    model: resolveModel(qgStage?.model, apiConfig.fastModel),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: qgStage?.temperature ?? 0.8,
    jsonMode: true,
  });

  return (Array.isArray(parsed) ? parsed : []).map((q: any) => ({
    ...q,
    id: `ai_${Math.random().toString(36).substr(2, 9)}`,
    dimension: dimension
  }));
};

// ===========================================================================
// 2. Chat helpers (compatibility exports)
// ===========================================================================

export const startChatSession = async (_apiConfig: ApiConfig, info: any, weights: DimensionWeight[], _questions: QuestionTemplate[]) => {
  // Chat sessions are no longer used in the main flow (objective questions only).
  // This is kept for backward compatibility.
  return { chat: null, initialMessage: `面试启动。候选人：${info.name}` };
};

export const sendCandidateMessage = async (_chatSession: any, _message: string) => {
  return '（已切换为客观题模式，此接口已弃用）';
};

// ===========================================================================
// 3. Final Assessment — 3 focused sub-steps
// ===========================================================================

const buildResponsesText = (objectiveData: any[]): string =>
  objectiveData.map(d => `题ID: ${d.q_id}, 维度: ${d.dimension}, 选择项描述: ${d.selectedText}, 得分: ${d.score}`).join('\n');

const buildWeightsSnippet = (weights: DimensionWeight[]): string =>
  weights.map(w => `${w.dimension}(${w.dimension_en}): ${Math.round(w.weight * 100)}%`).join(', ');

// Hardcoded default model names from DEFAULT_STAGE_PROMPTS — if the stage still has
// one of these defaults, we should use apiConfig models instead (the user may have
// switched to a different provider that doesn't support these model names).
export const DEFAULT_LEGACY_MODELS = ['gemini-2.0-flash', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-05-20', 'gemini-1.5-pro'];

export const resolveModel = (stageModel: string | undefined, apiConfigModel: string): string => {
  if (!stageModel) return apiConfigModel;
  // If the stage still has a legacy default model name, use apiConfig's model instead
  if (DEFAULT_LEGACY_MODELS.includes(stageModel)) return apiConfigModel;
  // Admin explicitly set a custom model for this stage — use it
  return stageModel;
};

// ---- Runtime Context Builder ----
const buildRuntimeInheritedContext = (
  stage: PipelineStage,
  stageConfig: StagePromptConfig | undefined,
  runtimeData?: { scores?: any; profile?: any }
): string => {
  const staticCtx = stageConfig?.inherited_context || '';
  if (!runtimeData) return staticCtx;

  let runtimeCtx = '';
  if (stage === 'profile_generation' && runtimeData.scores) {
    runtimeCtx = `\n[运行时上下文-评分阶段输出]\n` +
      `维度评分: 动机${runtimeData.scores.motivation}, 逻辑${runtimeData.scores.logic}, ` +
      `韧性${runtimeData.scores.resilience}, 创新${runtimeData.scores.innovation}, 投入${runtimeData.scores.commitment}\n` +
      `核心证据: ${runtimeData.scores.evidence_objects?.map((e: any) => e.point).join('; ') || '无'}\n` +
      `风险标记: ${runtimeData.scores.risk_flags?.join('; ') || '无'}`;
  }
  if (stage === 'decision_making' && runtimeData.scores) {
    runtimeCtx = `\n[运行时上下文-前序阶段关键输出]\n` +
      `评分结果已在用户消息中提供。请注意证据链的完整性和风险标记。`;
  }
  return staticCtx ? (staticCtx + runtimeCtx) : runtimeCtx;
};

// ---- Step 1: Score calculation ----

const runScoreCalculation = async (
  apiConfig: ApiConfig,
  objectiveData: any[],
  weights: DimensionWeight[],
  stagePrompts: StagePromptConfig[],
  completionRate?: number
): Promise<any> => {
  const responsesText = buildResponsesText(objectiveData);
  const weightsSnippet = buildWeightsSnippet(weights);

  const scoreStage = stagePrompts.find(s => s.stage === 'score_calculation');
  const rawSystemPrompt = scoreStage?.system_prompt || '你是评分引擎。';
  const scoreInheritedCtx = (scoreStage as any)?.inherited_context || '';
  const systemPrompt = scoreInheritedCtx
    ? `[上下文继承]\n${scoreInheritedCtx}\n\n[系统提示词]\n${rawSystemPrompt}`
    : rawSystemPrompt;

  const probingText = objectiveData
    .filter(d => d.probingAnswers)
    .map(d => `题ID: ${d.q_id}, 维度: ${d.dimension}, 代价: ${d.probingAnswers.cost}, 假设: ${d.probingAnswers.assumption}, 证据: ${d.probingAnswers.evidence}`)
    .join('\n') || '无追问回答';

  const completionNote = completionRate !== undefined && completionRate < 1
    ? `\n\n**题目完成度：${Math.round(completionRate * 100)}%**（候选人提前结束了评估，未回答全部题目）\n- 完成度低于 50%：投入度(commitment)维度最高给 3 分，其余未充分考察的维度应酌情降分\n- 完成度 50%-80%：投入度维度最高给 5 分\n- 请在 risk_flags 中标注"候选人提前结束评估（完成${Math.round(completionRate * 100)}%）"`
    : '';

  const userPrompt = `维度权重：\n${weightsSnippet}\n\n客观题回答：\n${responsesText}\n\n追问回答：\n${probingText}${completionNote}\n\n请严格依据系统提示词中的评分标准，输出各维度分数(0-10整数)、核心证据点和风险标记。

**严格评分要求**：
- 追问回答（代价/假设/证据）是核心评分依据。如果追问回答是乱填内容（随机数字、无意义字符）、敷衍回答（如"不知道"、"没有"）或与问题完全无关，该维度最高给 2 分
- 追问回答只有一两句无实质内容的话，该维度最高给 3 分
- 仅凭客观题选项得分不足以给高分，必须结合追问回答的质量综合评估
- 不可给同情分，严格基于候选人实际展现的思考深度来打分

请严格按照以下JSON格式输出：
{
  "motivation": <0-10整数>,
  "logic": <0-10整数>,
  "resilience": <0-10整数>,
  "innovation": <0-10整数>,
  "commitment": <0-10整数>,
  "evidence_objects": [{"point": "...", "dimension": "...", "strength": <0-10>}],
  "risk_flags": ["..."]
}`;

  return chatCompletionJSON(apiConfig, {
    model: resolveModel(scoreStage?.model, apiConfig.fastModel),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: scoreStage?.temperature ?? 0.2,
    jsonMode: true,
  });
};

// ---- Step 2: Profile generation ----

const runProfileGeneration = async (
  apiConfig: ApiConfig,
  scores: any,
  info: any,
  objectiveData: any[],
  stagePrompts: StagePromptConfig[],
  openEndedScores?: { thinking_depth: number; multidimensional_thinking: number } | null,
): Promise<any> => {
  const responsesText = buildResponsesText(objectiveData);
  const profileStage = stagePrompts.find(s => s.stage === 'profile_generation');
  const rawProfilePrompt = profileStage?.system_prompt || '';
  const runtimeCtx = buildRuntimeInheritedContext('profile_generation', profileStage, { scores });
  const systemPrompt = runtimeCtx
    ? `[上下文继承]\n${runtimeCtx}\n\n[系统提示词]\n${rawProfilePrompt}`
    : rawProfilePrompt;

  const userPrompt = `请基于候选人分数和信息，撰写中英文画像。

### 候选人信息
姓名: ${info.name}, 身份: ${info.identity}, 学校/单位: ${info.schoolOrUnit}, 专业: ${info.major}
自述: ${info.selfDescription}
过往项目: ${info.projects}

### 评分结果
动机: ${scores.motivation}, 逻辑: ${scores.logic}, 反思韧性: ${scores.resilience}, 创新: ${scores.innovation}, 投入: ${scores.commitment}${openEndedScores ? `, 思维深度: ${openEndedScores.thinking_depth}, 多维思考: ${openEndedScores.multidimensional_thinking}` : ''}

### 核心证据
${scores.evidence_objects.map((e: any) => `[${e.dimension}] ${e.point}`).join('\n')}

### 风险点
${scores.risk_flags.join('; ') || '无'}

### 客观题回答摘要
${responsesText}

请严格按照以下JSON格式输出：
{
  "summary_zh": "中文综述(200-400字)",
  "summary_en": "英文综述(150-300 words)",
  "top_reasons": ["理由1", "理由2", "理由3"],
  "suggested_focus": ["面试重点1", "面试重点2"],
  "admin_notes": "管理员备注",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`;

  return chatCompletionJSON(apiConfig, {
    model: resolveModel(profileStage?.model, apiConfig.deepModel),
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user', content: userPrompt }
    ],
    temperature: profileStage?.temperature ?? 0.7,
    jsonMode: true,
  });
};

// ---- Step 3: Decision making ----

const runDecisionMaking = async (
  _apiConfig: ApiConfig,
  scores: any,
  thresholds: NumericDecisionThresholds,
  weights: DimensionWeight[],
  _info: any,
  _stagePrompts: StagePromptConfig[],
  openEndedScores?: { thinking_depth: number; multidimensional_thinking: number }
): Promise<{ decision: 'pass' | 'hold' | 'reject'; reasoning: string; isStar: boolean }> => {
  // Pure deterministic decision — no AI call
  const hasOpenEnded = openEndedScores !== undefined && openEndedScores !== null;
  const coreDimScores = [scores.motivation, scores.logic, scores.resilience, scores.innovation, scores.commitment];
  const oeTD = openEndedScores?.thinking_depth || 0;
  const oeMulti = openEndedScores?.multidimensional_thinking || 0;
  // Always include open-ended scores in weighted average when candidate had the question (even if 0)
  const allDimScores = [...coreDimScores, ...(hasOpenEnded ? [oeTD, oeMulti] : [])];
  const availableWeights = weights.slice(0, allDimScores.length).map(w => w.weight);
  const totalWeight = availableWeights.reduce((a: number, b: number) => a + b, 0);
  const weightedAvg = totalWeight > 0
    ? allDimScores.reduce((sum: number, s: number, i: number) => sum + s * (availableWeights[i] || 0), 0) / totalWeight
    : 0;

  // Dimension score map for threshold checking
  const dimMap: Record<string, number> = {
    motivation: scores.motivation,
    logic: scores.logic,
    resilience: scores.resilience,
    innovation: scores.innovation,
    commitment: scores.commitment,
    thinking_depth: oeTD,
    multidimensional_thinking: oeMulti,
  };

  // Check if all dimensions meet or exceed the threshold row
  // When candidate had open-ended question, ALWAYS check those dimensions (even if score = 0)
  const meetsLevel = (levelRow: any): boolean => {
    for (const key of ['motivation', 'logic', 'resilience', 'innovation', 'commitment']) {
      if ((dimMap[key] || 0) < (levelRow[key] || 0)) return false;
    }
    // Always check open-ended dimensions when candidate had the open-ended question
    if (hasOpenEnded) {
      if ((dimMap.thinking_depth || 0) < (levelRow.thinking_depth || 0)) return false;
      if ((dimMap.multidimensional_thinking || 0) < (levelRow.multidimensional_thinking || 0)) return false;
    }
    // Check weighted average
    if (levelRow.avg > 0 && weightedAvg < levelRow.avg) return false;
    return true;
  };

  // Decision: star → pass → hold → reject (below hold = eliminated)
  let decision: 'pass' | 'hold' | 'reject';
  let reasoning: string;
  let isStar = false;

  if (meetsLevel(thresholds.star)) {
    decision = 'pass';
    isStar = true;
    reasoning = `示范候选人：所有维度均达到示范标准，加权均分 ${weightedAvg.toFixed(1)} 分。`;
  } else if (meetsLevel(thresholds.pass)) {
    decision = 'pass';
    reasoning = `通过：所有维度均达到通过标准，加权均分 ${weightedAvg.toFixed(1)} 分。`;
  } else if (meetsLevel(thresholds.hold)) {
    decision = 'hold';
    reasoning = `待定：部分维度未达通过标准，加权均分 ${weightedAvg.toFixed(1)} 分，建议进一步面试确认。`;
  } else {
    decision = 'reject';
    reasoning = `未通过：多项维度低于待定标准，加权均分 ${weightedAvg.toFixed(1)} 分。`;
  }

  return { decision, reasoning, isStar };
};

// ---- Step 4: Candidate Explainability ----

const runExplainability = async (
  apiConfig: ApiConfig,
  scores: any,
  info: any,
  stagePrompts: StagePromptConfig[],
  openEndedScores?: { thinking_depth: number; multidimensional_thinking: number } | null,
): Promise<CandidateExplainability> => {
  // Use profile_generation stage config for model/temperature (explainability is a sub-step)
  const profileStage = stagePrompts.find(s => s.stage === 'profile_generation');

  const systemPrompt = `你是清华经管BID商业模式工坊的评估解读专家。请基于候选人的评估数据，生成面向候选人本人的个性化反馈。
要求：
- 语气鼓励、具体、可操作
- 不论通过与否，都给出真诚有用的反馈
- 亮点聚焦具体表现而非泛泛夸奖
- 成长方向指出具体可改进的思维模式
- 发展建议给出可执行的1-2周内行动`;

  const userPrompt = `候选人：${info.name}，身份：${info.identity}
评分：动机${scores.motivation}, 逻辑${scores.logic}, 韧性${scores.resilience}, 创新${scores.innovation}, 投入${scores.commitment}${openEndedScores ? `, 思维深度${openEndedScores.thinking_depth}, 多维思考${openEndedScores.multidimensional_thinking}` : ''}
核心证据：${scores.evidence_objects?.map((e: any) => e.point).join('; ') || '无'}
风险标记：${scores.risk_flags?.join('; ') || '无'}

请输出JSON：
{
  "strengths": ["亮点1(20字内)", "亮点2", "亮点3"],
  "growth_areas": ["成长方向1(30字内)", "成长方向2"],
  "development_suggestions": ["建议1(具体可操作,40字内)", "建议2"]
}`;

  try {
    const result = await chatCompletionJSON<CandidateExplainability>(apiConfig, {
      model: resolveModel(profileStage?.model, apiConfig.deepModel),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: profileStage?.temperature ?? 0.6,
      jsonMode: true,
    });
    return {
      strengths: result.strengths || [],
      growth_areas: result.growth_areas || [],
      development_suggestions: result.development_suggestions || [],
    };
  } catch {
    // Fallback if explainability generation fails — don't block the whole assessment
    return { strengths: [], growth_areas: [], development_suggestions: [] };
  }
};

// ---- Step 5: Open-Ended Scoring ----

const runOpenEndedScoring = async (
  apiConfig: ApiConfig,
  openEndedData: OpenEndedResponse,
  info: any,
  stagePrompts: StagePromptConfig[]
): Promise<{ thinking_depth: number; multidimensional_thinking: number; depth_evidence: string; multidim_evidence: string }> => {
  const oeStage = stagePrompts.find(s => s.stage === 'open_ended_scoring');
  const rawSystemPrompt = oeStage?.system_prompt || '你是开放题评分引擎。评估思维深度和多维思考。';
  const inheritedCtx = oeStage?.inherited_context || '';
  const systemPrompt = inheritedCtx
    ? `[上下文继承]\n${inheritedCtx}\n\n[系统提示词]\n${rawSystemPrompt}`
    : rawSystemPrompt;

  const isCN = true; // Context and questions are always bilingual, use CN context for scoring
  const q = openEndedData.question;
  const contextText = q.context_zh || q.context_en;
  const questionText = q.question_zh || q.question_en;

  const userPrompt = `候选人信息：${info.name}，身份：${info.identity}，学校/单位：${info.schoolOrUnit || ''}

分析题目背景：${contextText}

分析题目：${questionText}

候选人回答：
${openEndedData.answer}

请评估思维深度和多维思考两个维度，输出分数和证据。

**严格评分要求**：
- 如果回答是乱填内容（如随机数字、无意义字符、重复字符等），两项均给 0 分
- 如果回答只有一两句话且无实质分析内容，两项均给 0-1 分
- 如果回答与题目完全无关，两项均给 0 分
- 必须基于候选人实际展现的分析深度和多角度思考来打分，不可给同情分

严格按以下JSON格式输出：
{
  "thinking_depth": <0-10整数>,
  "multidimensional_thinking": <0-10整数>,
  "depth_evidence": "思维深度评分依据（引用候选人具体内容，若为0分请说明原因）",
  "multidim_evidence": "多维思考评分依据（引用候选人具体内容，若为0分请说明原因）"
}`;

  try {
    const result = await chatCompletionJSON<any>(apiConfig, {
      model: resolveModel(oeStage?.model, apiConfig.fastModel),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: oeStage?.temperature ?? 0.3,
      jsonMode: true,
    });
    return {
      thinking_depth: Math.min(10, Math.max(0, Math.round(result.thinking_depth || 0))),
      multidimensional_thinking: Math.min(10, Math.max(0, Math.round(result.multidimensional_thinking || 0))),
      depth_evidence: result.depth_evidence || '',
      multidim_evidence: result.multidim_evidence || '',
    };
  } catch {
    // Fallback — don't block the whole assessment
    return { thinking_depth: 0, multidimensional_thinking: 0, depth_evidence: '', multidim_evidence: '' };
  }
};

// ---- Public entry: orchestrates the sub-steps ----

export const generateFinalAssessment = async (
  apiConfig: ApiConfig,
  messages: Message[],
  info: any,
  weights: DimensionWeight[],
  thresholds: NumericDecisionThresholds,
  objectiveData: any[],
  stagePrompts: StagePromptConfig[],
  openEndedData?: OpenEndedResponse,
  totalExpectedQuestions?: number
): Promise<Partial<CandidateRecord>> => {
  const responsesText = buildResponsesText(objectiveData);

  // Completion rate: how many questions answered vs expected
  const completionRate = totalExpectedQuestions && totalExpectedQuestions > 0
    ? objectiveData.length / totalExpectedQuestions
    : undefined;

  // Phase 1: Score calculation + Open-ended scoring in parallel (independent of each other)
  const [scores, openEndedScores] = await Promise.all([
    runScoreCalculation(apiConfig, objectiveData, weights, stagePrompts, completionRate),
    openEndedData ? runOpenEndedScoring(apiConfig, openEndedData, info, stagePrompts) : Promise.resolve(null),
  ]);

  // Phase 2: Profile + Decision (with open-ended scores) + Explainability in parallel
  const [profile, decision, explainability] = await Promise.all([
    runProfileGeneration(apiConfig, scores, info, objectiveData, stagePrompts,
      openEndedScores ? { thinking_depth: openEndedScores.thinking_depth, multidimensional_thinking: openEndedScores.multidimensional_thinking } : null),
    runDecisionMaking(apiConfig, scores, thresholds, weights, info, stagePrompts,
      openEndedScores ? { thinking_depth: openEndedScores.thinking_depth, multidimensional_thinking: openEndedScores.multidimensional_thinking } : undefined),
    runExplainability(apiConfig, scores, info, stagePrompts,
      openEndedScores ? { thinking_depth: openEndedScores.thinking_depth, multidimensional_thinking: openEndedScores.multidimensional_thinking } : null),
  ]);

  const statusMap: Record<string, string> = { pass: '通过', hold: '待定', reject: '未通过' };

  return {
    status: decision.decision,
    status_badge_text_zh: decision.isStar ? '示范' : (statusMap[decision.decision] || '待定'),
    scores: {
      motivation: scores.motivation,
      logic: scores.logic,
      reflection_resilience: scores.resilience,
      innovation: scores.innovation,
      commitment: scores.commitment,
      thinking_depth: openEndedScores?.thinking_depth || 0,
      multidimensional_thinking: openEndedScores?.multidimensional_thinking || 0,
      // overall = average of all scored dimensions (core + open-ended when available)
      overall: (() => {
        const core = [scores.motivation, scores.logic, scores.resilience, scores.innovation, scores.commitment];
        const oe = [openEndedScores?.thinking_depth, openEndedScores?.multidimensional_thinking].filter((v): v is number => (v || 0) > 0);
        const all = [...core, ...oe];
        return Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;
      })()
    },
    evidence: {
      core_evidence_points: [
        ...scores.evidence_objects.map((o: any) => `[${o.dimension}] ${o.point}`),
        ...(openEndedScores?.depth_evidence ? [`[思维深度] ${openEndedScores.depth_evidence}`] : []),
        ...(openEndedScores?.multidim_evidence ? [`[多维思考] ${openEndedScores.multidim_evidence}`] : []),
      ],
      risk_flags: scores.risk_flags,
      admin_notes: profile.admin_notes,
      qa_transcript: responsesText
    },
    decision_card: {
      zh: { summary: profile.summary_zh, top_reasons: profile.top_reasons, suggested_interview_focus: profile.suggested_focus },
      en: { summary: profile.summary_en, top_reasons: profile.top_reasons, suggested_interview_focus: profile.suggested_focus }
    },
    admin_record: {
      visibility: 'admin_only',
      raw_payload: { scores, profile, decision, openEndedScores },
      search_keywords: profile.keywords || []
    },
    explainability,
  };
};
