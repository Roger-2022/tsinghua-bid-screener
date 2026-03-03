
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
  hasReadRecruitPost: 'yes' | 'no';
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
  { id: 'basic', zh: '基本信息', en: 'Basic Information', keys: ['candidate_id', 'name', 'identity', 'school', 'department', 'major_title', 'grade_level', 'self_description', 'past_projects', 'has_read_recruit_post', 'career_plan', 'referral_source'] },
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

// ========== Default Open-Ended Question Pool ==========
export const DEFAULT_OPEN_ENDED_QUESTIONS: OpenEndedQuestion[] = [
  {
    id: 'oe_1',
    topic_zh: '中美关税战与供应链重构',
    topic_en: 'US-China Tariff War & Supply Chain Restructuring',
    context_zh: '2025年，美国对华加征关税最高达125%，随后又降至10%的"临时税率"。大量制造业通过越南、墨西哥等地转口贸易规避关税，全球供应链正经历前所未有的重构。',
    context_en: 'In 2025, the US imposed tariffs on China as high as 125%, later reduced to a 10% "temporary rate." Manufacturers increasingly rerouted through Vietnam and Mexico, triggering unprecedented global supply chain restructuring.',
    question_zh: '如果你是一家跨国企业的决策者，你会如何分析这一政策变化对不同利益相关方的影响？请从多个角度展开你的思考。',
    question_en: 'If you were a decision-maker at a multinational corporation, how would you analyze the impact of these policy shifts on different stakeholders? Share your thinking from multiple angles.',
    category: 'geopolitics',
  },
  {
    id: 'oe_2',
    topic_zh: 'DeepSeek-R1 开源推理模型',
    topic_en: 'DeepSeek-R1 Open-Source Reasoning Model',
    context_zh: '2025年1月，中国团队DeepSeek发布了开源推理模型R1，在多个基准上逼近GPT-4级别表现，训练成本却低一个数量级，引发全球AI产业震动，Nvidia股价单日下跌17%。',
    context_en: 'In January 2025, Chinese team DeepSeek released R1, an open-source reasoning model approaching GPT-4-level performance at a fraction of the training cost, sending shockwaves through the global AI industry and causing Nvidia stock to drop 17% in one day.',
    question_zh: '你如何看待这件事的深层意义？它可能对AI产业格局、技术路线选择和各方利益产生什么样的连锁反应？',
    question_en: 'What deeper significance do you see in this event? What chain reactions might it trigger for the AI industry landscape, technology strategy choices, and various stakeholders?',
    category: 'technology',
  },
  {
    id: 'oe_3',
    topic_zh: 'Nvidia市值突破5万亿美元',
    topic_en: 'Nvidia Surpasses $5 Trillion Market Cap',
    context_zh: '2025年，Nvidia成为全球首家市值突破5万亿美元的公司，AI芯片需求的爆发性增长是核心驱动力。但同时，替代架构（如Google TPU、定制ASIC）和开源模型对算力需求的降低也引发了市场讨论。',
    context_en: 'In 2025, Nvidia became the first company to surpass $5 trillion in market cap, driven by explosive demand for AI chips. Meanwhile, alternative architectures (Google TPU, custom ASICs) and open-source models reducing compute needs sparked market debates.',
    question_zh: '这一现象背后有哪些值得深入思考的问题？请从不同维度分析这种集中化趋势的利弊。',
    question_en: 'What questions worth deep reflection lie behind this phenomenon? Analyze the pros and cons of this concentration trend from different dimensions.',
    category: 'technology',
  },
  {
    id: 'oe_4',
    topic_zh: '美联储降息周期与全球政策分化',
    topic_en: 'Fed Rate Cuts & Global Policy Divergence',
    context_zh: '2024-2025年，美联储累计降息75个基点，而日本央行加息、欧洲央行谨慎跟随、中国持续宽松，各国货币政策出现明显分化，引发资本流动和汇率波动。',
    context_en: 'In 2024-2025, the Fed cut rates by 75 basis points cumulatively, while the Bank of Japan raised rates, the ECB cautiously followed, and China maintained easing — creating significant monetary policy divergence and capital flow volatility.',
    question_zh: '这种全球货币政策分化对不同国家、企业和个人分别意味着什么？你能从中识别出哪些深层逻辑？',
    question_en: 'What does this global monetary policy divergence mean for different countries, businesses, and individuals? What deeper logic can you identify?',
    category: 'economics',
  },
  {
    id: 'oe_5',
    topic_zh: 'AI对生产力的实际影响',
    topic_en: 'AI\'s Real Impact on Productivity',
    context_zh: '2025年多项研究显示，AI工具的使用与企业和个人生产力增长呈正相关，但也出现了"AI生产力悖论"——部分企业大量投入AI却未见明显产出提升，岗位替代和新岗位创造并存。',
    context_en: 'Multiple 2025 studies show AI tool adoption correlates with productivity gains, yet an "AI productivity paradox" emerged — some companies invested heavily in AI with no clear output improvement, while job displacement and job creation coexist.',
    question_zh: '你如何看待AI对生产力影响的深层含义？为什么会出现"投入多、产出未必高"的悖论？',
    question_en: 'What deeper implications do you see in AI\'s impact on productivity? Why does the paradox of "high investment, uncertain returns" arise?',
    category: 'technology',
  },
  {
    id: 'oe_6',
    topic_zh: '中国出口结构转型',
    topic_en: 'China\'s Export Structure Transformation',
    context_zh: '2025年中国贸易顺差超万亿美元，出口结构从传统制造业向新能源汽车、光伏、锂电池等高附加值产品转移，同时稀土出口管制增强了上游话语权。',
    context_en: 'In 2025, China\'s trade surplus exceeded $1 trillion, with exports shifting from traditional manufacturing to high-value products like EVs, solar panels, and batteries, while rare earth export controls strengthened upstream bargaining power.',
    question_zh: '这种出口结构转型对国际贸易格局、竞争国家和全球产业链的多维影响是什么？请展开分析。',
    question_en: 'What are the multi-dimensional impacts of this export transformation on international trade patterns, competing nations, and global supply chains? Please analyze in depth.',
    category: 'economics',
  },
  {
    id: 'oe_7',
    topic_zh: '美国最高法院裁定大规模关税违法',
    topic_en: 'US Supreme Court Rules Mass Tariffs Unlawful',
    context_zh: '2025年，美国最高法院裁定总统依据《国际紧急经济权力法》(IEEPA)征收的大规模关税违反宪法，这是司法权对行政权扩张的一次关键制衡。',
    context_en: 'In 2025, the US Supreme Court ruled that mass tariffs imposed under the International Emergency Economic Powers Act (IEEPA) were unconstitutional — a landmark check of judicial power on executive overreach.',
    question_zh: '这件事揭示了哪些更深层的问题？从制度设计、国际关系和商业影响等角度展开你的思考。',
    question_en: 'What deeper issues does this reveal? Share your thinking from the perspectives of institutional design, international relations, and business impact.',
    category: 'geopolitics',
  },
  {
    id: 'oe_8',
    topic_zh: '开源AI vs 闭源AI竞争',
    topic_en: 'Open-Source AI vs Closed-Source AI Competition',
    context_zh: '2025年，中国大力推进开源AI策略（如DeepSeek、Qwen），而多家美国企业也开始使用中国开源大模型。开源与闭源之争不再是纯技术问题，而涉及国家战略、生态控制和安全考量。',
    context_en: 'In 2025, China pushed aggressively on open-source AI (DeepSeek, Qwen) while multiple US companies adopted Chinese open-source LLMs. The open vs closed debate transcended pure technology into national strategy, ecosystem control, and security.',
    question_zh: '这场开源与闭源的竞争，其本质是什么？你能从技术、商业、地缘政治等多个层面分析吗？',
    question_en: 'What is the essence of this open-source vs closed-source competition? Can you analyze it from technology, business, and geopolitical perspectives?',
    category: 'technology',
  },
  {
    id: 'oe_9',
    topic_zh: 'AI Agent 与智能工作流',
    topic_en: 'AI Agent & Intelligent Workflows',
    context_zh: '2025年，"AI Agent"成为科技圈最热门的概念之一。围绕它出现了 Prompt（提示词）、Workflow（工作流）、MCP（模型上下文协议）、Skill（技能插件）等一系列新名词。有人说这是下一代软件的雏形，也有人觉得概念太多反而让人困惑。',
    context_en: 'In 2025, "AI Agent" became one of tech\'s hottest concepts, surrounded by terms like Prompt, Workflow, MCP (Model Context Protocol), and Skill. Some see it as the next generation of software; others find the proliferation of buzzwords more confusing than helpful.',
    question_zh: '你怎么理解 AI Agent、Prompt、Workflow、MCP、Skill 这些概念？它们之间是什么关系？如果让你给一个完全不懂技术的朋友解释，你会怎么说？',
    question_en: 'How do you understand concepts like AI Agent, Prompt, Workflow, MCP, and Skill? How do they relate to each other? If you had to explain them to a non-technical friend, what would you say?',
    category: 'ai_application',
  },
  {
    id: 'oe_10',
    topic_zh: '数据仓库、数据湖与数据空间',
    topic_en: 'Data Warehouse, Data Lake & Data Space',
    context_zh: '在数据管理领域，"数据仓库"、"数据湖"和"数据空间"是三个经常被提到的概念。从最早的结构化数据仓库，到能容纳各种格式的数据湖，再到最近兴起的强调数据主权和跨组织共享的数据空间，数据管理的理念一直在演进。',
    context_en: 'In data management, "data warehouse," "data lake," and "data space" are three frequently mentioned concepts. From early structured data warehouses to format-agnostic data lakes, and now to data spaces emphasizing data sovereignty and cross-organizational sharing, data management philosophy keeps evolving.',
    question_zh: '你怎么理解数据仓库、数据湖和数据空间这三个概念？它们各自想解决什么问题？你觉得这种演进背后的逻辑是什么？',
    question_en: 'How do you understand the concepts of data warehouse, data lake, and data space? What problem does each try to solve? What logic do you see behind this evolution?',
    category: 'data',
  },
  {
    id: 'oe_11',
    topic_zh: 'AI 赋能自媒体与品牌运营',
    topic_en: 'AI Empowering Content Creators & Brand Marketing',
    context_zh: '2025年，越来越多的自媒体创作者和品牌开始借助 AI 工具进行内容生成、选题策划、粉丝画像分析和投放优化。有人一个人用 AI 就能运营一个百万粉丝账号，也有人担心 AI 生成的内容会让平台变得千篇一律。',
    context_en: 'In 2025, more content creators and brands leverage AI tools for content generation, topic planning, audience analysis, and ad optimization. Some solo creators use AI to run million-follower accounts, while others worry AI-generated content makes platforms homogeneous.',
    question_zh: '你怎么看 AI 对自媒体和品牌运营这个行业的改变？这里面有哪些机会和问题？你会怎么拆解这个话题？',
    question_en: 'How do you see AI changing the content creation and brand marketing industry? What opportunities and problems do you see? How would you break down this topic?',
    category: 'ai_application',
  },
  {
    id: 'oe_12',
    topic_zh: 'AI+玄学：当科技遇上非传统行业',
    topic_en: 'AI + Metaphysics: When Tech Meets Unconventional Industries',
    context_zh: '最近，"AI 算命"、"AI 塔罗"、"AI 风水"等产品意外走红，有的小程序月流水超过百万。AI 正在与玄学、星座、情感咨询等非传统行业发生碰撞，引发了关于技术边界、用户心理和商业伦理的讨论。',
    context_en: 'Recently, "AI fortune-telling," "AI tarot," and "AI feng shui" products have unexpectedly gone viral, with some mini-programs generating over a million yuan monthly. AI\'s collision with metaphysics, astrology, and emotional consulting has sparked discussions about technology boundaries, user psychology, and business ethics.',
    question_zh: '你怎么看"AI+玄学"这种现象？为什么它能火起来？这背后反映了什么？如果让你分析这个话题，你会从哪几个角度切入？',
    question_en: 'What do you think about the "AI + metaphysics" phenomenon? Why has it gone viral? What does it reflect? If you were to analyze this topic, what angles would you explore?',
    category: 'ai_application',
  },
  {
    id: 'oe_13',
    topic_zh: '短视频平台生态与 AI 入局',
    topic_en: 'Short-Video Platform Ecosystem & AI Entry',
    context_zh: '抖音、快手、视频号等短视频平台已经成为日常生活的一部分，平台上汇聚了内容创作、电商带货、本地生活、知识付费等多种业态。2025年，AI 工具开始大规模进入短视频领域——AI 剪辑、AI 数字人、AI 直播带货正在改变整个生态。',
    context_en: 'Short-video platforms like Douyin, Kuaishou, and WeChat Channels have become part of daily life, hosting content creation, e-commerce, local services, and paid knowledge. In 2025, AI tools entered the short-video space at scale — AI editing, AI digital humans, and AI live-streaming are reshaping the ecosystem.',
    question_zh: '你怎么理解现在短视频平台的生态？AI 大规模入局后，这个生态会发生什么变化？对创作者、平台和用户分别意味着什么？',
    question_en: 'How do you understand the current short-video platform ecosystem? How will AI\'s large-scale entry change it? What does it mean for creators, platforms, and users respectively?',
    category: 'business',
  },
  {
    id: 'oe_14',
    topic_zh: 'AI 赋能医疗产业链',
    topic_en: 'AI Empowering the Healthcare Industry Chain',
    context_zh: 'AI 在医疗领域的应用正在加速落地：AI 辅助诊断、AI 药物研发、智能导诊、病历结构化、医疗影像分析等场景越来越成熟。同时，数据隐私、误诊责任、医患信任等问题也在引发讨论。',
    context_en: 'AI applications in healthcare are accelerating: AI-assisted diagnosis, AI drug discovery, intelligent triage, medical record structuring, and medical imaging analysis are maturing rapidly. Meanwhile, issues around data privacy, malpractice liability, and doctor-patient trust are sparking debate.',
    question_zh: '你怎么看 AI 在医疗领域的应用前景？如果让你拆解"AI 赋能医疗"这个话题，你会分成哪几个层面来思考？',
    question_en: 'How do you view the prospects of AI in healthcare? If you were to break down the topic of "AI empowering healthcare," what layers would you think through?',
    category: 'ai_application',
  },
  {
    id: 'oe_15',
    topic_zh: '豆包手机与 AI 原生硬件',
    topic_en: 'Doubao Phone & AI-Native Hardware',
    context_zh: '2025年，字节跳动推出了"豆包手机"概念，主打 AI 原生体验——不再是在传统手机上加一个 AI 助手，而是让 AI 深度融入操作系统和交互方式。这引发了关于"AI 原生硬件"和"传统手机+AI"两条路线的讨论。',
    context_en: 'In 2025, ByteDance introduced the "Doubao Phone" concept, featuring an AI-native experience — instead of adding an AI assistant to a traditional phone, AI is deeply integrated into the OS and interaction model. This sparked debate about "AI-native hardware" vs. "traditional phone + AI" approaches.',
    question_zh: '你怎么理解"豆包手机"这个产品？AI 原生手机和我们现在用的手机有什么本质区别？你觉得这个方向有前景吗？为什么？',
    question_en: 'How do you understand the "Doubao Phone" concept? What\'s the fundamental difference between an AI-native phone and the phones we use today? Do you think this direction has potential? Why?',
    category: 'consumer',
  },
];
