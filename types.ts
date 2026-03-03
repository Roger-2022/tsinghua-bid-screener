
// ========== Language & App Navigation ==========
export type Language = 'CN' | 'EN';

export enum AppStage {
  WELCOME = 'WELCOME',
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
  hasReadRecruitPost: 'yes' | 'familiar_no_need';
  careerPlan: string;
  referralSource: string;
}

export interface HelpWidgetConfig {
  contactEmail: string;
  businessHours: string;
  extraNote: string;
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
  qualityChecks: QualityCheckItem[];
  examples: string;
  generationInstructions: string;
}

export const DEFAULT_QUALITY_CHECKS: QualityCheckItem[] = [
  { id: 'qc_bid_scene', text_zh: '是否基于 BID 真实场景？', text_en: 'Based on BID real scenarios?', enabled: true },
  { id: 'qc_behavior', text_zh: '是否行为导向（问"做什么"而非"想什么"）？', text_en: 'Behavior-oriented ("what would you do")?', enabled: true },
  { id: 'qc_score_desc', text_zh: '分值是否合理递减？', text_en: 'Scores decrease logically?', enabled: true },
  { id: 'qc_options_fair', text_zh: '每个选项是否都"看起来合理"（无明显诱导）？', text_en: 'All options look reasonable (no leading)?', enabled: true },
  { id: 'qc_probing_layers', text_zh: '追问是否指向不同认知层次（代价/假设/证据）？', text_en: 'Probing targets different layers (cost/assumption/evidence)?', enabled: true },
  { id: 'qc_methodology', text_zh: '方法论备注是否说明了考察要点？', text_en: 'Methodology note explains assessment focus?', enabled: true },
  { id: 'qc_no_duplicate', text_zh: '确保每道新题与已有题目在场景、表述和考察角度上无重复', text_en: 'Each new question must differ from existing ones in scenario, wording, angle', enabled: true },
  { id: 'qc_balanced_len', text_zh: '各选项文字长度应大致均衡，不要通过长短暗示得分', text_en: 'Option text lengths should be roughly balanced', enabled: true },
];

export const DEFAULT_PROMPT_SECTIONS: QuestionPromptSections = {
  role: `你是 BID 商业模式工坊的招生筛选官。你的任务是生成高质量的筛选问题，用于评估申请者是否具备参与高强度商业模式训练的潜质。
你不是在考察"知识储备"，而是在识别：
- 这个人会不会在压力下消失
- 这个人能不能把判断说清楚
- 这个人是否具备从错误中学习的能力
- 这个人是否能在约束下重组规则
你的目标是判断在真实学期压力、真实小组协作、真实商业不确定性下，这个人是否会持续参与并产生高质量输出。`,
  courseBackground: `- 高强度：每周需投入 8-12 小时，持续 14 周
- 小组作业制：3-5 人小组，共同完成商业模式拆解与重构
- 案例驱动：基于真实商业案例进行深度分析
- 嘉宾分享：邀请一线创业者、投资人进行实战分享
- 课堂展示：每周需进行小组汇报，接受导师和同学质询
- 课后讨论：需参与异步讨论，贡献观点并回应他人`,
  pressureScenarios: `- 期中考试周与课程高峰期重叠
- 小组成员失联需要补位
- 方案被导师连续否定要求推倒重来
- 预习材料需 6 小时完成但只剩 2 天
- 嘉宾提问直击方案软肋`,
  caseLibrary: [
    '拼多多', 'SHEIN', '西南航空', '麦当劳', 'Google',
    '瑞幸咖啡', 'Costco', '利丰', '格莱珉银行', '猪八戒网',
    '小米', '7-Eleven', '韩都衣舍', 'Steam (Valve)', '嘉德置地'
  ],
  optionDesignRules: `- 行为导向而非态度导向：问"你会怎么做"而非"你怎么看"
- 情境具体化：使用 BID 真实场景
- 避免社会期望偏差：让每个选项看起来都"合理"`,
  probingDesignRules: `- 成本追问：迫使申请者说出具体代价
- 假设追问：暴露申请者的隐含假设
- 证据追问：要求举出真实经历`,
  scoringFormat: {
    optionCount: 5,
    scoreSequence: [9, 7, 5, 3, 1],
    caseEmbedPercent: 30,
  },
  qualityChecks: DEFAULT_QUALITY_CHECKS,
  examples: `示例 1：真实动机，证书剥离，如果本课程不提供任何证书、排名或公开展示，你会：
A，反而更专注能力本身，9
B，继续参与但降低优先级，7
C，先观望一两次再决定，5
D，明显减少投入，3
E，基本不参加，1
成本，没有外部背书你损失的最大价值是什么？
假设，你认为这门课"真正值钱"的产出是什么？
证据，你是否有无证书但长期投入的学习经历？
备注，剥离功利动机。

示例 2：投入度，考试周冲突，课程与考试高峰重叠你会：
A，提前调节保证不断档，9
B，阶段性降投入后补，7
C，优先考试，5
D，只完成最低要求，3
E，暂停参与，1
成本，你为课程让渡什么？
假设，你如何评估长期回报？
证据，有并行高压经验吗？
备注，看可持续性。`,
  generationInstructions: `- 明确维度：确认要生成哪个维度的问题
- 选择场景：从 BID 真实场景中选择
- 嵌入案例：从案例库中选择合适的案例作为情境锚点
- 设计选项：确保选项反映不同的行为模式
- 设计追问：成本/假设/证据三个追问缺一不可`,
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
