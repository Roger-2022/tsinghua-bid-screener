
// ========== Language & App Navigation ==========
export type Language = 'CN' | 'EN';

export enum AppStage {
  WELCOME = 'WELCOME',
  BID_INTRO = 'BID_INTRO',
  BASIC_FORM = 'BASIC_FORM',
  INTERVIEW_QUESTIONNAIRE = 'INTERVIEW_QUESTIONNAIRE',
  OPEN_ENDED_ANALYSIS = 'OPEN_ENDED_ANALYSIS',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_LIBRARY = 'ADMIN_LIBRARY',
  ADMIN_CRITERIA = 'ADMIN_CRITERIA',
  ADMIN_QUESTIONS = 'ADMIN_QUESTIONS',
  ADMIN_PROMPTS = 'ADMIN_PROMPTS',
  ADMIN_QUICK_PREVIEW = 'ADMIN_QUICK_PREVIEW'
}

// ========== Message Types ==========
export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

// ========== Candidate Basic Info ==========
export interface CandidateBasicInfo {
  name: string;
  gender: 'male' | 'female';
  wechat: string;
  identity: 'Undergraduate' | 'Master' | 'MBA' | 'PhD';
  school: string;
  department: string;
  major: string;
  gradeOrLevel: string;
  timeCommitmentWeeks1to8: number;
  timeCommitmentWeeks9to16: number;
  offlineInterview: boolean;
  phone: string;
  email: string;
  projects: string;
  homeworkWillingness: boolean;
  leaderWillingness: boolean;
  selfDescription: string;
  hasReadRecruitPost: '' | 'yes' | 'familiar_no_need';
  careerPlan: string;
  referralSource: string;
}

export interface HelpWidgetConfig {
  contactEmail: string;
  businessHours: string;
  extraNote: string;
  recruitPostUrl: string;   // 招生推送链接，管理员可编辑
}

// ========== Question System ==========
export interface QuestionOption {
  label: string;
  text: string;
  score: number;
}

export interface QuestionTemplate {
  id: string;
  dimension: string;
  title: string;
  scenario: string;
  type: 'objective' | 'subjective';
  options?: QuestionOption[];
  probing_logic?: {
    cost: string;
    assumption: string;
    evidence: string;
  };
  methodology_note: string;
}

export interface ObjectiveResponse {
  q_id: string;
  score: number;
  dimension: string;
  selectedText: string;
  label: string;
  probingAnswers?: {
    cost: string;
    assumption: string;
    evidence: string;
  };
}

// ========== Open-Ended Analysis Question ==========
export interface OpenEndedQuestion {
  id: string;
  topic_zh: string;
  topic_en: string;
  context_zh: string;
  context_en: string;
  question_zh: string;
  question_en: string;
  category: string;
}

export interface OpenEndedResponse {
  questionId: string;
  question: OpenEndedQuestion;
  answer: string;
  timestamp: number;
}

// ========== Config Snapshot — frozen at interview start ==========
export interface SessionConfig {
  stagePrompts: StagePromptConfig[];
  apiConfig: ApiConfig;
  dimensionWeights: DimensionWeight[];
  decisionThresholds: NumericDecisionThresholds;
  decisionTree: DecisionTreeNode[];
  questionCountConfig: QuestionCountConfig;
}

// ========== Interview Session Recovery ==========
export interface InterviewSession {
  candidateInfo: CandidateBasicInfo;
  objectiveResponses: ObjectiveResponse[];
  currentQIndex: number;
  isProbing: boolean;
  messages: Message[];
  interviewQuestions: QuestionTemplate[];
  savedAt: number;
  // AI Native: adaptive question state
  adaptiveState?: AdaptiveQuestionStateSerialized;
  liveCandidateProfile?: LiveCandidateProfile;
  // Open-ended analysis
  openEndedResponse?: OpenEndedResponse;
  selectedOpenEndedQuestion?: OpenEndedQuestion;
  // Config snapshot — admin changes won't affect in-progress interview
  sessionConfig?: SessionConfig;
  // Suspended stage — records which stage the interview was at when navigated away
  suspendedStage?: AppStage;
}

// ========== Adaptive Question Selection (Local, no AI) ==========
export interface DimensionConfidence {
  dimension: string;
  answeredCount: number;
  scores: number[];
  mean: number;
  variance: number;
  confidence: number; // 0-1
  trend: 'stable' | 'rising' | 'falling';
}

/** Serializable version for localStorage (Map/Set cannot be serialized) */
export interface AdaptiveQuestionStateSerialized {
  dimensionConfidences: DimensionConfidence[];
  questionPool: Record<string, QuestionTemplate[]>; // dimName → remaining pool
  answeredQuestionIds: string[];
  totalAsked: number;
  totalTarget: number; // dynamically adjusted 8-20
  skippedDimensions: string[];
}

// ========== Live Candidate Profile (runtime) ==========
export interface LiveCandidateProfile {
  responsePatterns: {
    avgResponseScore: number;
    dimensionMeans: Record<string, number>;
    consistencyScore: number; // 0-1, low = contradictory
    engagementLevel: 'high' | 'medium' | 'low';
  };
  probingBias: {
    shouldProbeMore: string[]; // dimension names
    canSkipProbing: string[];
  };
}

// ========== Candidate Explainability ==========
export interface CandidateExplainability {
  strengths: string[];
  growth_areas: string[];
  development_suggestions: string[];
}

// ========== Prompt Version Control ==========
export interface PromptVersion {
  id: string;
  timestamp: number;
  stage: PipelineStage;
  system_prompt: string;
  inherited_context: string;
  changeNote: string;
  author: 'admin' | 'system';
}

// ========== Feedback Loop ==========
export interface FeedbackRecord {
  candidateId: string;
  originalDecision: 'pass' | 'hold' | 'reject';
  adminDecision: 'agree' | 'override_pass' | 'override_hold' | 'override_reject';
  reason?: string;
  timestamp: number;
}

export interface FeedbackStats {
  totalReviewed: number;
  agreeRate: number;
  overrideBreakdown: Record<string, number>;
}

// ========== Batch Calibration ==========
export interface CalibrationReport {
  generatedAt: number;
  candidateCount: number;
  scoreDistributions: Record<string, { mean: number; std: number; min: number; max: number }>;
  anomalies: AnomalyFlag[];
  recommendations: string[];
}

export interface AnomalyFlag {
  candidateId: string;
  candidateName: string;
  type: 'score_outlier' | 'decision_inconsistency' | 'dimension_imbalance';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// ========== Hybrid Probing ==========
export interface HybridProbingConfig {
  enabled: boolean;
  aiProbingThreshold: number;
  maxAICallsPerSession: number;
  fallbackToLocal: boolean;
}

// ========== System Backup ==========
export interface SystemSnapshot {
  id: string;
  label: string;
  timestamp: number;
  data: Record<string, any>;
}

// ========== Decision Tree for AI Probing ==========
export interface DecisionTreeNode {
  id: string;
  condition: 'contradiction' | 'same_option_streak' | 'low_score' | 'high_score' | 'random';
  threshold?: number;
  action: 'probe' | 'skip' | 'deep_probe';
  description_zh: string;
  description_en: string;
  // Visualization & theory metadata
  category?: 'consistency' | 'depth' | 'validation' | 'routine';
  theory_basis_zh?: string;
  theory_basis_en?: string;
  icon?: string;
  color?: string;
  probability?: number;  // 0-1, for rules with random component
  selectedActions?: ('cost' | 'assumption' | 'evidence')[];  // which probing actions to trigger
}

// ========== Question Count Config ==========
export interface QuestionCountConfig {
  totalMin: number;   // default 8
  totalMax: number;   // default 20
  minPerDim: number;  // default 1
  maxPerDim: number;  // default 4
}

export const DEFAULT_QUESTION_COUNT_CONFIG: QuestionCountConfig = {
  totalMin: 8,
  totalMax: 20,
  minPerDim: 1,
  maxPerDim: 4,
};

// ========== Evaluation Criteria (Simplified: weight-only) ==========
export interface DimensionWeight {
  dimension: string;      // "真实动机"
  dimension_en: string;   // "Motivation"
  weight: number;         // 0.20
}

export interface DecisionThresholdRow {
  motivation: number;
  logic: number;
  resilience: number;
  innovation: number;
  commitment: number;
  thinking_depth: number;              // 开放题 — 思维深度
  multidimensional_thinking: number;   // 开放题 — 多维思考
  avg: number;            // 加权均分阈值，0 = 不启用
}

export interface NumericDecisionThresholds {
  reject: DecisionThresholdRow;   // 低于此线 → 清退
  hold: DecisionThresholdRow;     // 介于 reject-pass 之间 → 待定
  pass: DecisionThresholdRow;     // 达到此线 → 通过
  star: DecisionThresholdRow;     // 达到此线 → 示范
}

// ========== Legacy types (kept for migration) ==========
export interface DimensionCriteria {
  dimension: string;
  definition: string;
  definition_en: string;
  rationale: string;
  rationale_en: string;
  what_to_observe: string[];
  what_to_observe_en: string[];
  high_score_signals: string[];
  high_score_signals_en: string[];
  low_score_signals: string[];
  low_score_signals_en: string[];
  scoring_rubric: {
    range: string;
    label_zh: string;
    label_en: string;
    description_zh: string;
    description_en: string;
    examples_zh: string[];
    examples_en: string[];
  }[];
  anchors: {
    low: string;
    medium: string;
    high: string;
    expert: string;
    master: string;
  };
  weight: number;
}

export interface GlobalDecisionRules {
  reject_conditions: string[];
  reject_conditions_en: string[];
  waitlist_conditions: string[];
  waitlist_conditions_en: string[];
  pass_conditions: string[];
  pass_conditions_en: string[];
  star_conditions: string[];
  star_conditions_en: string[];
}

// ========== Pipeline Stage Prompts ==========
export type PipelineStage =
  | 'question_generation'
  | 'probing_decision'
  | 'score_calculation'
  | 'open_ended_scoring'
  | 'profile_generation'
  | 'decision_making';

export interface StagePromptConfig {
  stage: PipelineStage;
  name_zh: string;
  name_en: string;
  description_zh: string;
  description_en: string;
  system_prompt: string;
  user_prompt_template: string;
  variables: string[];
  output_format: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
  inherited_context: string;
}

export interface PromptConfig {
  template: string;
  stagePrompts: StagePromptConfig[];
  sections?: QuestionPromptSections;
}

// ========== Structured Prompt Sections ==========

export interface QualityCheckItem {
  id: string;
  text_zh: string;
  text_en: string;
  enabled: boolean;
}

export interface QuestionPromptSections {
  role: string;
  courseBackground: string;
  pressureScenarios: string;
  caseLibrary: string[];
  optionDesignRules: string;
  probingDesignRules: string;
  scoringFormat: {
    optionCount: number;
    scoreSequence: number[];
    caseEmbedPercent: number;
  };
  dimensionMethodology: string;
  designAntiPatterns: string;
  qualityChecks: QualityCheckItem[];
  examples: string;
  generationInstructions: string;
}

export const DEFAULT_QUALITY_CHECKS: QualityCheckItem[] = [
  { id: 'qc_info_elicit', text_zh: '选项是否能最大化暴露候选人真实信息（而非仅用于打分）？', text_en: 'Do options maximize genuine information elicitation (not just scoring)?', enabled: true },
  { id: 'qc_behavior', text_zh: '是否行为导向（问"你会怎么做"而非"你怎么看"）？', text_en: 'Behavior-oriented ("what would you do")?', enabled: true },
  { id: 'qc_score_nonlinear', text_zh: '分值是否体现非线性逻辑（如D可能高于C，避免简单递减）？', text_en: 'Scoring reflects non-linear logic (e.g., D may score higher than C)?', enabled: true },
  { id: 'qc_options_fair', text_zh: '每个选项是否都"看起来合理"，让候选人愿意选择真实答案？', text_en: 'All options look reasonable, encouraging honest selection?', enabled: true },
  { id: 'qc_probing_layers', text_zh: '追问是否指向不同认知层次（代价/假设/证据）？', text_en: 'Probing targets different layers (cost/assumption/evidence)?', enabled: true },
  { id: 'qc_no_social_desirability', text_zh: '是否避免了社会期望偏差（候选人无法通过"猜正确答案"得高分）？', text_en: 'Avoids social desirability bias (candidates cannot guess the "right" answer)?', enabled: true },
  { id: 'qc_no_duplicate', text_zh: '确保每道新题与已有题目在场景、表述和考察角度上无重复', text_en: 'Each new question must differ from existing ones in scenario, wording, angle', enabled: true },
  { id: 'qc_balanced_len', text_zh: '各选项文字长度应大致均衡，不要通过长短暗示得分', text_en: 'Option text lengths should be roughly balanced', enabled: true },
];

export const DEFAULT_PROMPT_SECTIONS: QuestionPromptSections = {
  role: `你是 BID 商业模式工坊的招生筛选官。你的核心任务是设计能让候选人"暴露真实信息"的筛选问题。

【最重要的设计原则】
你设计题目的首要目标不是给候选人打分，而是让他们在作答过程中尽可能多地暴露真实信息。
- 好的题目 = 候选人选完之后，你对 TA 的了解大幅增加
- 差的题目 = 候选人选了"看起来最好的"选项，你什么新信息也没得到
- 每个选项都应该是一个"信息探针"——无论候选人选哪个，都能暴露 TA 的某个真实特征
- 选项之间不应该有"明显的好坏"，而应该是"不同类型的人会做出不同选择"

你不是在考察"知识储备"，而是在识别：
- 这个人的驱动力到底来自哪里（内驱 vs 外驱 vs 社交压力）
- 这个人面对不确定性时的真实反应模式
- 这个人是否具备从错误中提取结构性教训的能力
- 这个人说的和做的是否一致（言行一致性）

你的最终目标：通过题目选择 + 追问组合，让每个候选人的"真实画像"浮出水面。`,
  courseBackground: `- 高强度：每周需投入 8-12 小时，持续 14 周
- 小组作业制：3-5 人小组，共同完成商业模式拆解与重构
- 案例驱动：基于真实商业案例进行深度分析
- 嘉宾分享：邀请一线创业者、投资人进行实战分享
- 课堂展示：每周需进行小组汇报，接受带队教练和同学质询
- 课后讨论：需参与异步讨论，贡献观点并回应他人`,
  pressureScenarios: `- 期中考试周与工坊高峰期重叠
- 小组成员失联需要补位
- 方案被带队教练连续否定要求推倒重来
- 预习材料需 6 小时完成但只剩 2 天
- 嘉宾提问直击方案软肋`,
  caseLibrary: [
    '拼多多', 'SHEIN', '西南航空', '麦当劳', 'Google',
    '瑞幸咖啡', 'Costco', '利丰', '格莱珉银行', '猪八戒网',
    '小米', '7-Eleven', '韩都衣舍', 'Steam (Valve)', '嘉德置地'
  ],
  optionDesignRules: `【核心理念：选项是信息探针，不是评分梯度】

每个选项的设计目标是"让不同类型的人做出不同选择"，而不是"从好到坏排列"。

内部打分逻辑（候选人看不到，仅供 AI 评分参考）：
- A = 9 分：真正的深度行为——选难题、遇到错误愿意重来、结果不完美但过程真实
- B = 7 分：系统性好、有自我校验意识，稍微保守但诚实
- C = 5 分：有智识兴趣但执行遇阻就停了，有潜力但令人担忧
- D = 6 分：能完成结构化任务，但动机是"走完流程"而非好奇心（注意：D 可高于 C）
- E = 4 分：诚实专业，但对于需要自选深度工作的场景来说，主动性不够

【关键】分值不是简单的 A>B>C>D>E 线性递减。D 可以高于 C（踏实完成 > 半途而废），E 也不是"最差"而是"信息量最少"。

选项设计具体规则：
- 行为导向：问"你会怎么做"而非"你怎么看"
- 每个选项都必须看起来合理——候选人应该无法猜出"标准答案"
- 用通用场景，不要求候选人了解 BID 的具体运作方式
- 让低分选项也很有诱惑力（如"聪明人应该止损"、"先解决生存问题"）
- 高分选项不应该是"最积极/最热情的"，而应该是"展示思考深度的"`,
  probingDesignRules: `追问的目标同样是"暴露更多真实信息"，而非"验证答案正确性"。

- 成本追问：让候选人说出真实代价——"如果这样做，你具体会放弃什么？"
- 假设追问：暴露隐含假设——"你这个判断背后的前提是什么？如果前提不成立呢？"
- 证据追问：要求真实经历——"你有没有真的这样做过？结果如何？"

追问设计原则：
- 不要引导性追问（如"你不觉得 A 更好吗？"）
- 追问应该让候选人感到"被认真对待"而非"被考试"
- 好的追问能让候选人在回答中自然流露出更多信息`,
  scoringFormat: {
    optionCount: 5,
    scoreSequence: [9, 7, 5, 6, 4],
    caseEmbedPercent: 30,
  },
  dimensionMethodology: `===== 维度一：真实动机 (Motivation) =====
定义：候选人参与BID的驱动力是否真实、深层——是否超越"想学AI"的表面表述，是否能说清自己当下的认知困境，是否有具体的改变意图。
评分段：
[0-2] 仅表达"对AI感兴趣"或"想提升自己"，无具体内容
[3-4] 能说出一个具体场景，但动机停留在工具层面，如"想学会用AI做某事"
[5-6] 能描述自己的认知困境或判断失误，动机有真实性
[7-8] 动机来自具体经历，能说清"我在哪里卡住了"，有明确的改变意图
[9-10] 动机深层且自洽，能将个人困境与时代变化挂钩，清楚表达自己想要的认知升级是什么

===== 维度二：逻辑闭环 (Logic) =====
定义：候选人表达是否自洽——论点、论据、结论是否形成完整链条，是否能在追问下保持一致，是否存在明显的逻辑跳跃或自相矛盾。
评分段：
[0-2] 表达混乱，无法形成完整句子或论点
[3-4] 有基本观点但论据缺失，结论缺乏支撑
[5-6] 论点与论据基本匹配，但存在局部跳跃或未解释的假设
[7-8] 完整的论点-论据-结论链条，追问下能自洽补充
[9-10] 逻辑严密且有层次，能主动识别并说明自己论点的边界与局限

===== 维度三：反思与韧性 (Resilience) =====
定义：候选人面对失败、挑战或不确定性的认知处理方式——是否能从经历中提取结构性教训，是否有自我修正能力，是否能在压力下保持清醒。
评分段：
[0-2] 回避失败经历，或仅给出"我很努力"式的表述
[3-4] 能描述失败但停留在情绪层面，如"那段时间很难熬"
[5-6] 能说清楚发生了什么，有基本的经验总结
[7-8] 能从失败中提取可复用的教训，并说明如何影响后续判断
[9-10] 反思有结构性深度，能区分"我的判断错在哪一层"，并展示认知迭代的轨迹

===== 维度四：创新潜质 (Innovation) =====
定义：候选人是否具备在既有框架之外思考的能力——是否能提出非常规问题，是否能在熟悉的领域发现被忽视的假设，是否有重新定义问题的冲动。
评分段：
[0-2] 所有回答均在常识范围内，无任何非标准视角
[3-4] 偶有新颖表述，但缺乏支撑，更像直觉而非洞察
[5-6] 能在某个具体问题上提出不同角度，有一定的假设质疑
[7-8] 能主动识别被忽视的假设，并提出替代性解释框架
[9-10] 能重新定义问题本身，提出让评审产生"没想到"反应的视角

===== 维度五：投入度 (Commitment) =====
定义：候选人是否有真实的行动信号——是否已经在做相关探索，是否愿意为认知升级付出具体代价，是否能说清楚BID在自己当下阶段的优先级。
评分段：
[0-2] 仅表达意愿，无任何行动证据
[3-4] 有模糊的行动描述，如"我最近在看一些AI的东西"
[5-6] 有具体的行动记录，如读了某本书、做了某个项目
[7-8] 行动与目标高度匹配，能说清为什么现在是正确时机
[9-10] 已有实质性探索成果，且能清晰表达BID对自己下一步的具体价值`,
  designAntiPatterns: `【本章是题目设计的"防错手册"，生成每道题后必须逐条对照检查】

===== 错误一：A 选项模式化——"最积极 = 最高分" =====
典型症状：A 选项永远是"最主动反思 + 最愿意投入 + 最有条理"的那个。
危害：候选人只需记住"选最有主人翁精神的"就能秒猜全部答案，测的不是真实行为，而是"谁更懂得表演积极"。
正确做法：
- A 选项应该有明显的"代价"或"不完美"——比如"做了但报告写得比较乱"、"选了难题但过程很混乱"
- 高分 ≠ 最积极/最热情，高分 = 展示了真实的思考深度或行为复杂性
- 让 A 看起来"不太体面"反而更好：愿意选这个的人，说明是在如实描述而非表演

===== 错误二：选项线性递减——ABCDE 从好到坏一目了然 =====
典型症状：A 最积极 → B 稍积极 → C 中间 → D 消极 → E 最消极，形成明显的"态度阶梯"。
危害：候选人瞬间看出哪个"最好"，根本不需要思考，直接选最上面的。
正确做法：
- D 可以高于 C（踏实完成流程 > 有兴趣但半途而废）
- E 不是"最差"而是"信息量最少"（如"没做，但主动说明了原因"）
- 制造真正的两难：多个选项各有优劣，没有明显的"最优解"
正面案例：
  A = 9：做了独立研究，选了个难题，过程中推翻了自己的预设，报告写得比较乱
  B = 7：选了熟悉领域验证框架理解，发现两个模块套不上，记下来要问教练
  C = 5：认真选了题，但公开资料太少，换题又不感兴趣，最终没交
  D = 6：按框架走了一遍全流程，步骤都完成了，主要想看自己能不能独立跑完
  E = 4：没做，算了时间不够，主动和教练说明了没有提交
→ 这组选项里没有哪个"明显最好"——A承认写得乱，B选了安全路线，C想做没做成，D只是走流程，E坦诚但没做

===== 错误三：场景依赖内部信息——"不了解我们就没法答" =====
典型症状：题目的前提假设候选人已经深入了解 BID 的运作方式、评分规则或内部术语。
反面案例：
  ✗ "如果BID工坊取消一切证书、学分和公开展示机会，仅保留课堂内容和小组实战训练，你会如何调整自己的参与策略？"
  → 候选人第一次听说你们，根本不知道"参与策略"要调整什么，只能空谈，回答必然假大空。
正确做法：
- 用通用场景：学习、团队协作、项目管理、时间冲突——这些是所有人都经历过的
- 候选人不需要知道 BID 是什么就能给出真实回答
- 好的场景应该让人想到自己的亲身经历，而不是被迫想象一个不了解的环境

===== 错误四：问态度不问行为——"你怎么看" vs "你会怎么做" =====
典型症状：选项都是抽象的态度表达，如"我觉得这很重要"、"我愿意全力以赴"、"我认为应该平衡"。
危害：态度人人都会说，行为才能区分人。任何人都能说出"正确的态度"。
正确做法：
- 每个选项必须描述一个具体的行为或做法
- 用"我会做XXX"代替"我觉得XXX很重要"
- 选项要说人话——真实的人在真实情境中真的会做的事，而不是面试里的官方回答

===== 错误五：追问引导性太强——暗示"正确方向" =====
典型症状：追问本身就在暗示哪个选项更好，如"你不觉得主动反思更好吗？"
正确做法：
- 追问应该是中性的、好奇的，像朋友在聊天
- 好的追问让候选人感到"被认真倾听"而非"被考试"
- 目标是引出更多细节和真实经历，而非引导到某个答案`,
  qualityChecks: DEFAULT_QUALITY_CHECKS,
  examples: `示例 1（真实动机）：选课动机排序
场景：你选择参加一个课外商业研修项目。以下哪项最接近你的真实想法？
A，我有一个具体困惑想在这类训练中找到答案，哪怕过程很枯燥，9
B，这个项目口碑很好，能学到东西又能拓展人脉，一举多得，7
C，身边优秀的人都在参加，我不想落下，5
D，简历上需要一段有含金量的经历，这个项目很适合，6
E，导师建议我参加，我觉得听建议总没错，4
成本，如果这个项目完全不能写进简历，你还会参加吗？
假设，你认为"学到东西"和"拿到背书"哪个更重要？
证据，你过去有没有纯粹因为好奇而长期投入某件事的经历？
【打分逻辑】A 有具体困惑=深层内驱；B 看似全面但仍是外驱；D 虽功利但诚实，高于 C 的从众。

示例 2（逻辑闭环）：相关vs因果
场景：一家公司发现使用高级会员服务的用户留存率比普通用户高50%。市场部提议加大推广。你怎么看？
A，不能直接得出结论——可能是忠诚度高的用户本来就倾向购买高级服务，9
B，数据很有说服力，值得投入推广，7
C，可以试试，但要设置对照组看效果，5
D，先做一个小范围测试再决定，6
E，50%的差距很大，应该果断行动，4
成本，如果推广后发现留存未提升，最可能的原因是什么？
假设，你如何区分"相关"和"因果"？
证据，你能举一个"数据表面说明A但实际原因是B"的例子吗？
【打分逻辑】A 识别相关≠因果；D 虽保守但有验证意识，高于 C 的被动试探。`,
  generationInstructions: `生成题目时务必遵循以下流程：
1. 明确维度：确认要生成哪个维度的问题，参照该维度的方法论和评分段
2. 设计场景：使用通用化场景，候选人不需要了解 BID 就能回答
3. 设计选项：
   - 每个选项是一个"信息探针"，选了就会暴露某类信息
   - 分值不必线性递减（D 可高于 C）
   - 高分选项 = 展示思考深度，而非"最积极的态度"
   - 低分选项也要有诱惑力，让人觉得"选这个也挺合理"
4. 设计追问：成本/假设/证据三个追问缺一不可，目标是引出更多真实信息
5. 标注打分逻辑：简要说明为什么这样赋分（候选人不可见）`,
};

// ========== Candidate Record ==========
export interface CandidateProfile {
  name: string;
  gender: string;
  identity: string;
  school: string;
  department: string;
  major_title: string;
  grade_level: string;
  weekly_commit_h1: number;
  weekly_commit_h2: number;
  offline_interview: boolean;
  wechat_id: string | null;
  phone: string | null;
  email?: string | null;
  past_projects: string;
  homework_willingness: boolean;
  leader_willingness: boolean;
  self_description: string;
  has_read_recruit_post: string;
  career_plan: string;
  referral_source: string;
}

export interface CandidateScores {
  motivation: number;
  logic: number;
  reflection_resilience: number;
  innovation: number;
  commitment: number;
  thinking_depth?: number;
  multidimensional_thinking?: number;
  overall: number | null;
}

export interface CandidateRecord {
  candidate_id: string;
  display_name: string;
  status: 'pass' | 'hold' | 'reject';
  status_badge_text_zh: string;
  profile: CandidateProfile;
  scores: CandidateScores;
  evidence: {
    core_evidence_points: string[];
    risk_flags: string[];
    admin_notes: string;
    qa_transcript: string;
    objective_responses?: ObjectiveResponse[];
  };
  decision_card: {
    zh: { summary: string; top_reasons: string[]; suggested_interview_focus: string[] };
    en: { summary: string; top_reasons: string[]; suggested_interview_focus: string[] };
  };
  admin_record: {
    visibility: 'admin_only';
    raw_payload: any;
    search_keywords: string[];
  };
  messages: Message[];
  timestamp: number;
  // Open-ended analysis
  openEndedResponse?: OpenEndedResponse;
  // AI Native extensions
  explainability?: CandidateExplainability;
  feedback?: FeedbackRecord;
  adaptiveMetadata?: {
    totalQuestionsAsked: number;
    confidenceAtCompletion: DimensionConfidence[];
    skippedDimensions: string[];
  };
}

// ========== LLM API Configuration ==========
export type LLMProvider =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'moonshot'
  | 'qwen'
  | 'zhipu'
  | 'openrouter'
  | 'custom';

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  nameCN: string;
  baseUrl: string;
  models: { id: string; name: string; isDefault?: boolean }[];
  apiKeyPlaceholder: string;
  docUrl: string;
  supportsJsonMode: boolean;
}

export interface ApiConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;           // allow override for custom/proxy
  fastModel: string;         // for scoring, decisions
  deepModel: string;         // for profile generation
  temperature?: number;
}

// ========== Import/Export ==========
export interface ImportSummary {
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  common_issues: string[];
}

// ========== Excel Export Column Definition (按顺序排列) ==========
export const EXPORT_COLUMNS = [
  { key: 'candidate_id',      zh: '编号',              en: 'ID' },
  { key: 'name',              zh: '姓名',              en: 'Name' },
  { key: 'gender',            zh: '性别',              en: 'Gender' },
  { key: 'wechat_id',         zh: '微信号',            en: 'WeChat ID' },
  { key: 'phone',             zh: '电话',              en: 'Phone' },
  { key: 'email',             zh: '邮箱',              en: 'Email' },
  { key: 'identity',          zh: '身份类型',           en: 'Identity' },
  { key: 'school',            zh: '学校',               en: 'School' },
  { key: 'department',        zh: '院系',               en: 'Department' },
  { key: 'major_title',       zh: '专业/职位',          en: 'Major/Title' },
  { key: 'grade_level',       zh: '年级',               en: 'Grade' },
  { key: 'weekly_h1',         zh: '前8周每周投入(h)',    en: 'Weekly Hours (Wk1-8)' },
  { key: 'weekly_h2',         zh: '后8周每周投入(h)',    en: 'Weekly Hours (Wk9-16)' },
  { key: 'offline_interview', zh: '能否线下面试',        en: 'Offline Interview' },
  { key: 'homework',          zh: '全程参与意愿',        en: 'Homework Willingness' },
  { key: 'leader',            zh: '组长意愿',           en: 'Leader Willingness' },
  { key: 'self_description',  zh: '三词自述',           en: 'Self Description' },
  { key: 'past_projects',     zh: '过往项目经历',        en: 'Past Projects' },
  { key: 'has_read_recruit_post', zh: '是否阅读招生推送', en: 'Read Recruit Post' },
  { key: 'career_plan',       zh: '职业规划',            en: 'Career Plan' },
  { key: 'referral_source',   zh: '从何得知',            en: 'Referral Source' },
  { key: 's_motivation',      zh: '真实动机(0-10)',      en: 'Motivation (0-10)' },
  { key: 's_logic',           zh: '逻辑闭环(0-10)',      en: 'Logic (0-10)' },
  { key: 's_resilience',      zh: '反思与韧性(0-10)',    en: 'Resilience (0-10)' },
  { key: 's_innovation',      zh: '创新潜质(0-10)',      en: 'Innovation (0-10)' },
  { key: 's_commitment',      zh: '投入度(0-10)',        en: 'Commitment (0-10)' },
  { key: 's_thinking_depth',  zh: '思维深度(0-10)',      en: 'Thinking Depth (0-10)' },
  { key: 's_multidim_thinking', zh: '多维思考(0-10)',    en: 'Multi-dim Thinking (0-10)' },
  { key: 's_overall',         zh: '综合得分',            en: 'Overall Score' },
  { key: 'status',            zh: '筛选结果',            en: 'Decision' },
  { key: 'keywords',          zh: '画像标签',            en: 'Profile Tags' },
  { key: 'summary_zh',        zh: '综合评价(中)',        en: 'Summary (CN)' },
  { key: 'summary_en',        zh: '综合评价(英)',        en: 'Summary (EN)' },
  { key: 'top_reasons',       zh: '核心理由',            en: 'Top Reasons' },
  { key: 'risk_flags',        zh: '风险提示',            en: 'Risk Flags' },
  { key: 'evidence_points',   zh: '核心证据',            en: 'Evidence Points' },
  { key: 'interview_focus',   zh: '建议面试重点',        en: 'Interview Focus' },
  { key: 'admin_notes',       zh: '管理员备注',          en: 'Admin Notes' },
  { key: 'qa_transcript',     zh: '问答实录',            en: 'QA Transcript' },
  { key: 'open_ended_question', zh: '开放题目',          en: 'Open-Ended Question' },
  { key: 'open_ended_answer', zh: '开放题回答',          en: 'Open-Ended Answer' },
  { key: 'timestamp',         zh: '提交时间',            en: 'Timestamp' },
] as const;

// ========== Export Column Groups (逻辑分组) ==========
export const EXPORT_COLUMN_GROUPS = [
  { id: 'basic', zh: '基本信息', en: 'Basic Information', keys: ['candidate_id', 'name', 'gender', 'identity', 'school', 'department', 'major_title', 'grade_level', 'self_description', 'past_projects', 'has_read_recruit_post', 'career_plan', 'referral_source'] },
  { id: 'contact', zh: '联系方式', en: 'Contact Information', keys: ['wechat_id', 'phone', 'email'] },
  { id: 'availability', zh: '参与意愿', en: 'Availability & Willingness', keys: ['weekly_h1', 'weekly_h2', 'offline_interview', 'homework', 'leader'] },
  { id: 'scores', zh: '评分维度', en: 'Score Dimensions', keys: ['s_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment', 's_thinking_depth', 's_multidim_thinking', 's_overall'] },
  { id: 'evaluation', zh: '评估结果', en: 'Evaluation Results', keys: ['status', 'keywords', 'summary_zh', 'summary_en', 'top_reasons', 'risk_flags', 'evidence_points', 'interview_focus'] },
  { id: 'admin', zh: '管理信息', en: 'Admin & Records', keys: ['admin_notes', 'qa_transcript', 'open_ended_question', 'open_ended_answer', 'timestamp'] },
] as const;

export interface ExportColumnPreferences {
  selectedKeys: string[];
  orderedKeys: string[];
}

// ========== Workflow Module Configuration ==========
export interface WorkflowModuleConfig {
  stageId: PipelineStage;
  selectedInputKeys: string[];
  selectedOutputKeys: string[];
}

export interface ProbingStrategyItem {
  label_zh: string;
  label_en: string;
  description_zh: string;
  description_en: string;
  prompt_template: string;
}

export interface ProbingStrategyConfig {
  cost: ProbingStrategyItem;
  assumption: ProbingStrategyItem;
  evidence: ProbingStrategyItem;
}

// Demo data for workflow module cards
export const WORKFLOW_MODULE_DEMO_DATA: Record<string, string> = {
  candidate_id: 'BMW-2025-042',
  name: '张三',
  wechat_id: 'zhangsan_wx',
  phone: '138****6789',
  email: 'zhang@tsinghua.edu',
  identity: '硕士生',
  school: '清华大学',
  department: '经管学院',
  major_title: '金融学',
  grade_level: 'master2',
  weekly_h1: '12',
  weekly_h2: '8',
  offline_interview: '是',
  homework: '是',
  leader: '否',
  self_description: '好奇、坚韧、逻辑强',
  past_projects: '主导某社交App原型设计...',
  s_motivation: '8.5',
  s_logic: '7.0',
  s_resilience: '6.5',
  s_innovation: '8.0',
  s_commitment: '7.5',
  s_overall: '7.5',
  status: 'pass',
  keywords: '逻辑清晰, 创新思维',
  summary_zh: '该候选人展现出较强的...',
  summary_en: 'The candidate demonstrates...',
  top_reasons: '逻辑能力突出, 创新意识强',
  risk_flags: '投入时间偏低',
  evidence_points: '项目经历丰富, 表述清晰',
  interview_focus: '时间管理, 团队协作',
  admin_notes: '推荐进入复试',
  qa_transcript: 'Q1: ... A1: ...',
  s_thinking_depth: '7.5',
  s_multidim_thinking: '8.0',
  open_ended_question: 'DeepSeek-R1开源模型发布后...',
  open_ended_answer: '从技术、商业和地缘政治角度分析...',
  timestamp: '2025-01-15 14:30',
};

export const DEFAULT_PROBING_STRATEGY: ProbingStrategyConfig = {
  cost: {
    label_zh: '代价追问',
    label_en: 'Cost Probing',
    description_zh: '迫使候选人说出具体代价与机会成本，验证承诺的真实性与深度。如果回答模糊，继续追问具体的时间投入和放弃的替代选项。',
    description_en: 'Forces candidates to articulate specific costs and opportunity costs, verifying the authenticity and depth of commitment. If answers are vague, probe further on time investment and foregone alternatives.',
    prompt_template: '如果你决定放弃BID课程的每周8小时投入，你觉得自己会错过什么？你为此推掉了哪些其他安排？',
  },
  assumption: {
    label_zh: '假设追问',
    label_en: 'Assumption Probing',
    description_zh: '暴露候选人回答中隐含的未经验证假设，测试元认知水平。追问候选人是否意识到自己判断的前提条件，以及前提不成立时的应对方案。',
    description_en: 'Exposes unverified assumptions hidden in candidate responses, testing metacognitive level. Probes whether candidates recognize the preconditions of their judgments and contingency plans.',
    prompt_template: '你刚才说想通过BID课程学习商业模式创新——你这个判断的前提是什么？如果课程内容和你预期完全不同，你会怎么调整？',
  },
  evidence: {
    label_zh: '证据追问',
    label_en: 'Evidence Probing',
    description_zh: '要求候选人举出真实经历来支撑观点，验证实证思维能力。关注具体情境描述、个人行动和结果，而非泛泛而谈。',
    description_en: 'Requires candidates to cite real experiences to support claims, verifying evidence-based thinking. Focuses on specific situations, personal actions, and outcomes rather than generalizations.',
    prompt_template: '你提到自己善于团队协作——能举一个你在小组项目中遇到意见冲突的真实经历吗？当时你做了什么，结果如何？',
  },
};

// Default workflow module configs per stage
export const DEFAULT_WORKFLOW_MODULES: WorkflowModuleConfig[] = [
  { stageId: 'question_generation', selectedInputKeys: ['identity', 'school', 'major_title', 'grade_level', 'self_description', 'past_projects'], selectedOutputKeys: ['s_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment'] },
  { stageId: 'probing_decision', selectedInputKeys: ['s_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment'], selectedOutputKeys: [] },
  { stageId: 'score_calculation', selectedInputKeys: ['name', 'identity', 'school', 'self_description', 'past_projects', 's_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment'], selectedOutputKeys: ['s_overall', 'evidence_points', 'risk_flags'] },
  { stageId: 'open_ended_scoring', selectedInputKeys: ['name', 'identity', 'school', 'self_description', 'open_ended_question', 'open_ended_answer'], selectedOutputKeys: ['s_thinking_depth', 's_multidim_thinking'] },
  { stageId: 'profile_generation', selectedInputKeys: ['name', 'identity', 'school', 'major_title', 's_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment', 's_thinking_depth', 's_multidim_thinking', 's_overall', 'evidence_points'], selectedOutputKeys: ['summary_zh', 'summary_en', 'top_reasons', 'keywords', 'interview_focus', 'admin_notes'] },
  { stageId: 'decision_making', selectedInputKeys: ['s_motivation', 's_logic', 's_resilience', 's_innovation', 's_commitment', 's_thinking_depth', 's_multidim_thinking', 's_overall', 'risk_flags', 'evidence_points'], selectedOutputKeys: ['status'] },
];

// ========== Default Open-Ended Question Pool (三选一) ==========
export const DEFAULT_OPEN_ENDED_QUESTIONS: OpenEndedQuestion[] = [
  {
    id: 'oe_1',
    topic_zh: '中国 AI 的下一波商业机会',
    topic_en: 'The Next Wave of AI Business Opportunities in China',
    context_zh: '2025年，中国 AI 产业经历了从"百模大战"到落地应用的转折。大模型价格战、AI Agent 爆发、垂直行业渗透加速，但真正跑通商业闭环的公司仍是少数。与此同时，AI 基础设施、数据服务、行业解决方案等赛道正在涌现新机会。',
    context_en: 'In 2025, China\'s AI industry shifted from the "hundred-model war" to real-world applications. LLM price wars, AI Agent explosion, and accelerated vertical industry adoption are reshaping the landscape, yet few companies have achieved sustainable business models. Meanwhile, AI infrastructure, data services, and industry-specific solutions are creating new opportunities.',
    question_zh: '你认为中国 AI 下一阶段最大的商业机会在哪里？为什么？请结合具体行业或场景展开分析。',
    question_en: 'Where do you see the biggest business opportunities in China\'s next phase of AI development? Why? Please analyze with specific industries or scenarios.',
    category: 'ai_business',
  },
  {
    id: 'oe_2',
    topic_zh: 'AI 时代的学习与成长',
    topic_en: 'Learning & Growth in the AI Era',
    context_zh: 'AI 正在深刻改变知识获取和能力培养的方式。传统的"先学知识、再做事情"的路径正在被"边用 AI 边学习"所替代。有人担心过度依赖 AI 会让人丧失深度思考能力，也有人认为 AI 时代最重要的不再是记住知识，而是提出好问题、做好判断。',
    context_en: 'AI is fundamentally reshaping how we acquire knowledge and build skills. The traditional path of "learn first, do later" is being replaced by "learn while using AI." Some worry that over-reliance on AI erodes deep thinking, while others argue that asking good questions and making sound judgments matter more than memorizing knowledge.',
    question_zh: 'AI 时代，你觉得什么能力是最重要的？你打算怎么学习和成长？请结合你自己的经历或规划来谈。',
    question_en: 'In the AI era, what skills do you think matter most? How do you plan to learn and grow? Please share based on your own experience or plans.',
    category: 'personal_growth',
  },
  {
    id: 'oe_3',
    topic_zh: '中国互联网的 AI 入口之争',
    topic_en: 'China\'s AI Gateway Battle Among Internet Giants',
    context_zh: '2025年，中国互联网巨头纷纷将 AI 作为核心战略：美团推出 AI 点餐和智能配送，抖音用 AI 重构内容推荐和电商，微信接入大模型打造 AI 助手，百度押注文心一言做搜索革命。各家都在争夺"AI 时代的用户入口"，但路径和打法截然不同。',
    context_en: 'In 2025, China\'s internet giants are making AI their core strategy: Meituan launched AI ordering and smart delivery, Douyin uses AI to reshape content and e-commerce, WeChat integrated LLMs for an AI assistant, and Baidu is betting on ERNIE for a search revolution. Everyone is fighting for the "AI-era user gateway," but with vastly different approaches.',
    question_zh: '你怎么看中国互联网公司的 AI 入口之争？谁的打法更有前景？为什么？请从用户需求、商业模式或竞争格局等角度分析。',
    question_en: 'How do you view the AI gateway battle among China\'s internet giants? Whose approach has the most promise? Why? Please analyze from user needs, business models, or competitive dynamics.',
    category: 'business',
  },
];
