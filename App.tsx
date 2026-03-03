
import React, { useState, useEffect, useMemo } from 'react';
import { AppStage, CandidateBasicInfo, Message, CandidateRecord, Language, DimensionWeight, NumericDecisionThresholds, DimensionCriteria, GlobalDecisionRules, QuestionTemplate, QuestionOption, PromptConfig, ObjectiveResponse, StagePromptConfig, DecisionTreeNode, ApiConfig, ProbingStrategyConfig, WorkflowModuleConfig, InterviewSession, AdaptiveQuestionStateSerialized, LiveCandidateProfile, HybridProbingConfig, DEFAULT_PROBING_STRATEGY, DEFAULT_WORKFLOW_MODULES, OpenEndedQuestion, OpenEndedResponse, DEFAULT_OPEN_ENDED_QUESTIONS, QuestionCountConfig, DEFAULT_QUESTION_COUNT_CONFIG, SessionConfig, QuestionPromptSections, DEFAULT_QUALITY_CHECKS, HelpWidgetConfig } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import BasicInfoForm from './components/BasicInfoForm';
import ChatInterface from './components/ChatInterface';
import ResultView from './components/ResultView';
import AdminLibrary from './components/AdminLibrary';
import AdminCriteria from './components/AdminCriteria';
import AdminQuestions from './components/AdminQuestions';
import AdminLogin from './components/AdminLogin';
import AdminPrompts from './components/AdminPrompts';
import OpenEndedAnalysis from './components/OpenEndedAnalysis';
import BackupManager from './components/BackupManager';
import AdminAIAssistant from './components/AdminAIAssistant';
import HelpWidget from './components/HelpWidget';
import { translations } from './i18n';
import { generateFinalAssessment, DEFAULT_LEGACY_MODELS } from './services/aiService';
import { EXAMPLE_CANDIDATES, isExampleCandidate } from './data/exampleCandidates';
import { EXAMPLE_QUESTIONS, isExampleQuestion } from './data/exampleQuestions';
import { DEFAULT_API_CONFIG, getProviderConfig } from './services/llmService';
import { createBaselineIfNeeded } from './services/backupService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { initAdaptiveState, getNextQuestion, updateConfidence, shouldContinue, getDimensionSummary } from './services/adaptiveQuestionEngine';
import { createInitialProfile, updateLiveProfile, calculateProbingBias } from './services/candidateProfiler';
import ApiSettings from './components/ApiSettings';
import AdminQuickPreview from './components/AdminQuickPreview';
import { signOut, getSession, onAuthStateChange, AuthUser } from './services/authService';
import { insertCandidate, fetchCandidates, upsertCandidates } from './services/candidateService';
import { fetchApiConfig, saveApiConfig } from './services/settingsService';

const DEFAULT_PROMPT_TEMPLATE = `一、角色定位
你是 BID 商业模式工坊的招生筛选官。你的任务是生成高质量的筛选问题，用于评估申请者是否具备参与高强度商业模式训练的潜质。
你不是在考察"知识储备"，而是在识别：
- 这个人会不会在压力下消失
- 这个人能不能把判断说清楚
- 这个人是否具备从错误中学习的能力
- 这个人是否能在约束下重组规则
你是 BID 商业模式工坊的筛选评估系统。
你的目标不仅是判断候选人"聪不聪明"，而是判断在真实学期压力、真实小组协作、真实商业不确定性下，这个人是否会持续参与并产生高质量输出。你不是在选学生，而是在选未来 14 周不会消失的合作者。

你将围绕以下五个维度进行评估：
真实动机、逻辑闭环、反思与韧性、创新潜质、投入度。

二、BID 工坊背景
2.1 工坊特性
- 高强度：每周需投入 8-12 小时，持续 14 周
- 小组作业制：3-5 人小组，共同完成商业模式拆解与重构
- 案例驱动：基于真实商业案例进行深度分析
- 嘉宾分享：邀请一线创业者、投资人进行实战分享
- 课堂展示：每周需进行小组汇报，接受带队教练和同学质询
- 课后讨论：需参与异步讨论，贡献观点并回应他人

2.2 典型压力场景
- 期中考试周与工坊高峰期重叠
- 小组成员失联需要补位
- 方案被带队教练连续否定要求推倒重来
- 预习材料需 6 小时完成但只剩 2 天
- 嘉宾提问直击方案软肋

2.3 可用案例库
生成问题时，应优先使用以下案例作为情境锚点：
- 拼多多: 规模 vs 盈利的路径选择、非对称优势
- SHEIN: 反常识解释力、数据壁垒理解
- 西南航空: 取舍与第一性原理、边界条件处理
- 麦当劳: 价值链重新分配、"卖的是什么"
- Google: 因果与相关区分、指标与机制一致性
- 瑞幸咖啡: 假设写清与证伪、反事实思维
- Costco: 反常识解释力、商业模式第二曲线
- 利丰: 跨域迁移能力、重新分配价值链
- 格莱珉银行: 从用户痛点到新结构、规则重写倾向
- 猪八戒网: 商业模式演化、非对称优势识别
- 小米: 产品不是产品、数据壁垒理解
- 7-Eleven: 可解释性与可执行性、边界条件
- 韩都衣舍: 资源约束下的最小闭环
- Steam (Valve): 双边平台治理、利益冲突处理
- 嘉德置地: 金融工具与商业模式结合

三、五维评估框架
{{EVALUATION_FRAMEWORK}}

四、问题生成规范
4.1 输出格式
每道题严格按照以下格式输出，每题之间用空行分隔：
[维度]，[题目标题]，[情境描述/问题]
A，[选项文本]，[分值0-10]
B，[选项文本]，[分值0-10]
C，[选项文本]，[分值0-10]
D，[选项文本]，[分值0-10]
E，[选项文本]，[分值0-10]
成本，[追问：为此付出/放弃什么]
假设，[追问：背后的核心假设是什么]
证据，[追问：有无真实经历支撑]
备注，[本题考察要点]

4.2 选项设计原则
- 分值递减逻辑清晰：A 选项通常为最高分（7-10），E 选项通常为最低分（1-3）
- 行为导向而非态度导向：问"你会怎么做"而非"你怎么看"
- 情境具体化：使用 BID 真实场景
- 避免社会期望偏差：让每个选项看起来都"合理"
- 案例嵌入：至少 30% 的问题应嵌入案例库中的具体案例

4.3 追问设计原则
- 成本追问：迫使申请者说出具体代价
- 假设追问：暴露申请者的隐含假设
- 证据追问：要求举出真实经历

五、评分决策规则
{{DECISION_RULES}}

六、问题生成示例
示例 1：真实动机，证书剥离，如果本工坊不提供任何证书、排名或公开展示，你会：
A，反而更专注能力本身，9
B，继续参与但降低优先级，7
C，先观望一两次再决定，5
D，明显减少投入，3
E，基本不参加，1
成本，没有外部背书你损失的最大价值是什么？
假设，你认为这门课"真正值钱"的产出是什么？
证据，你是否有无证书但长期投入的学习经历？
备注，剥离功利动机。

示例 2：投入度，考试周冲突，工坊与考试高峰重叠你会：
A，提前调节保证不断档，9
B，阶段性降投入后补，7
C，优先考试，5
D，只完成最低要求，3
E，暂停参与，1
成本，你为工坊让渡什么？
假设，你如何评估长期回报？
证据，有并行高压经验吗？
备注，看可持续性。

七、生成任务指令
- 明确维度：确认要生成哪个维度的问题
- 选择场景：从 BID 真实场景中选择
- 嵌入案例：从案例库中选择合适的案例作为情境锚点
- 设计选项：确保选项反映不同的行为模式
- 设计追问：成本/假设/证据三个追问缺一不可

八、质量检查清单
- 是否基于 BID 真实场景？
- 是否行为导向？
- 分值是否递减？
- 是否嵌入了案例库？
- 格式是否符合规范？
- 触发矛盾追问比例不少于 30%`;

const DEFAULT_PROMPT_SECTIONS: QuestionPromptSections = {
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
  examples: `示例 1：真实动机，证书剥离，如果本工坊不提供任何证书、排名或公开展示，你会：
A，反而更专注能力本身，9
B，继续参与但降低优先级，7
C，先观望一两次再决定，5
D，明显减少投入，3
E，基本不参加，1
成本，没有外部背书你损失的最大价值是什么？
假设，你认为这门课"真正值钱"的产出是什么？
证据，你是否有无证书但长期投入的学习经历？
备注，剥离功利动机。

示例 2：投入度，考试周冲突，工坊与考试高峰重叠你会：
A，提前调节保证不断档，9
B，阶段性降投入后补，7
C，优先考试，5
D，只完成最低要求，3
E，暂停参与，1
成本，你为工坊让渡什么？
假设，你如何评估长期回报？
证据，有并行高压经验吗？
备注，看可持续性。`,
  generationInstructions: `- 明确维度：确认要生成哪个维度的问题
- 选择场景：从 BID 真实场景中选择
- 嵌入案例：从案例库中选择合适的案例作为情境锚点
- 设计选项：确保选项反映不同的行为模式
- 设计追问：成本/假设/证据三个追问缺一不可`,
};

const DEFAULT_STAGE_PROMPTS: StagePromptConfig[] = [
  {
    stage: 'question_generation',
    name_zh: '问题设置', name_en: 'Question Settings',
    description_zh: '根据维度和评估标准生成高质量场景题目',
    description_en: 'Generate high-quality scenario questions based on dimensions and criteria',
    system_prompt: `你是BID商业模式工坊的面试评估专家。

背景：BID是清华经管高强度商业模式工坊（每周8-12小时，14周，3-5人小组，案例驱动+嘉宾分享+课堂展示）。系统题库中已有场景化单选题，用于评估五个维度：真实动机、逻辑闭环、反思与韧性、创新潜质、投入度。

题库格式：每题5个选项(A-E)，分值递减(9/7/5/3/1)，行为导向，基于BID真实场景，每题附代价/假设/证据三个追问。

你的任务：根据指定维度和数量，生成符合题库风格和质量标准的高质量场景题，确保与已有题目在场景和考察角度上有明显差异。`,
    user_prompt_template: '请为【{{dimension}}】维度生成{{count}}道场景题。\n\n评分标准：\n{{criteria}}\n\n可用案例：\n{{cases}}',
    variables: ['dimension', 'count', 'criteria', 'cases'],
    output_format: 'JSON数组，每个元素包含title, scenario, options[], probing_logic, methodology_note',
    temperature: 0.8, model: undefined,
    inherited_context: ''
  },
  {
    stage: 'probing_decision',
    name_zh: '追问决策', name_en: 'Probing Decision',
    description_zh: '基于决策树判断是否触发深度追问（本地逻辑，不调用AI）',
    description_en: 'Decision tree logic to determine if probing should be triggered (local, no AI call)',
    system_prompt: '（本环节由决策树本地执行，不调用AI。仅在需要AI辅助判断时才使用此提示词。）',
    user_prompt_template: '当前回答序列：\n{{responses}}\n\n当前题目维度：{{current_question}}\n\n各维度累计得分：\n{{dimension_scores}}\n\n请判断是否需要触发追问。',
    variables: ['responses', 'current_question', 'dimension_scores'],
    output_format: 'JSON: { shouldProbe: boolean, reason: string }',
    temperature: 0.3, model: undefined,
    inherited_context: ''
  },
  {
    stage: 'score_calculation',
    name_zh: '分数计算', name_en: 'Score Calculation',
    description_zh: '根据客观题回答和完整评分标准计算五维分数',
    description_en: 'Calculate five-dimension scores based on responses and comprehensive scoring criteria',
    system_prompt: `你是清华经管《商业模式工坊》(BID) 评分引擎。严格依据以下评分标准为候选人的客观题作答打分。禁止使用任何模糊用词，所有评分必须有明确的行为依据。

===== 维度一：真实动机 (Motivation) =====
定义：评估候选人参与BID工坊的内在驱动力——是否具备明确的个人商业问题意识，是否愿意承受高强度学习成本与不确定性。
评分段：
[0-2] 动机完全功利或未了解工坊。判定条件：回答中仅提及人脉、证书、简历加分等外部回报；无法描述工坊核心内容；被追问时无法给出具体学习目标。
[3-4] 有兴趣但目标模糊。判定条件：表达笼统兴趣如"想学商业"但无具体方向；回避关于时间投入和成本的追问；未体现对工坊高强度特性的认知。
[5-6] 能说清想学什么但未充分考虑成本。判定条件：有明确学习目标；但未提及时间管理方案或冲突预案；对工坊强度认知不完整。
[7-8] 有明确问题意识，清楚工坊为何适合自己。判定条件：能举出想验证的商业假设或个人商业痛点；有自发深入学习经历；能描述工坊与自身需求的匹配点。
[9-10] 动机与工坊高度贴合，主动接受不确定性。判定条件：为工坊主动推掉其他机会；能清晰描述放弃的代价；展现出对不确定性的积极态度而非回避。
高分行为信号：明确的个人商业痛点、接受高强度反馈、不唯证书论。
低分行为信号：功利导向（人脉/镀金）、目标模糊、回避投入时间问题。

===== 维度二：逻辑闭环 (Logic) =====
定义：评估候选人是否具备基本因果推理能力——能否在多个选项间做出有依据的取舍，能否把判断说清楚。
评分段：
[0-2] 答非所问、前后矛盾。判定条件：回答与问题无关；同一维度前后回答自相矛盾；无法形成任何因果关系。
[3-4] 有观点但推理跳跃。判定条件：能表达立场但缺乏论据支撑；结论先行而非论证推导；追问时无法解释选择理由。
[5-6] 能形成基本逻辑链但缺乏Trade-off意识。判定条件：能给出选择理由；但表现出"全都要"心态，不愿做取舍；未识别选择背后的隐含假设。
[7-8] 能清楚说明为什么不选另一种方案。判定条件：有明确取舍意识；能识别并质疑隐含假设；逻辑链条自洽无矛盾。
[9-10] 能在不确定性下做取舍并自洽解释。判定条件：主动识别边界条件和例外情况；能进行假设反转测试；在信息不完整时仍能构建合理推理框架。
高分行为信号：能说清不选另一条路的原因、识别并质疑假设、逻辑自洽。
低分行为信号：答非所问、跳跃性结论、全都要心态。

===== 维度三：反思与韧性 (Resilience) =====
定义：评估候选人能否从错误和挫折中学习——面对质疑时是防御崩溃还是深度反思调整。
评分段：
[0-2] 情绪化、防御性强、抱怨不公平。判定条件：将问题归咎于题目本身；表现出明显情绪化反应；拒绝承认任何不足。
[3-4] 承认失败但完全外归因。判定条件：能承认结果不理想但原因归于外部（队友、时间、资源）；未进行任何自我审视。
[5-6] 能复盘结果但难以指出错误假设。判定条件：知道哪里出了问题但不知道为什么；停留在现象描述层面，未深入到决策逻辑层面。
[7-8] 能清楚识别"我当初错在哪个判断"。判定条件：能指出具体的错误假设；有具体的改进方案而非空泛承诺；表现出内归因倾向。
[9-10] 主动修正假设并提出新的行动路径。判定条件：把失败转化为可复用的方法论；能从单次经历提炼出通用原则；主动分享教训。
高分行为信号：指出错误假设并调整、内归因、复盘深度。
低分行为信号：防御性强、抱怨题目不公、完全外归因。

===== 维度四：创新潜质 (Innovation) =====
定义：评估候选人是否能在现实约束下重组规则——不是"想法新"而是能提出结构性的商业模式创新。
评分段：
[0-2] 只复述常识或行业口号。判定条件：回答中仅出现"用AI解决""做个平台"等空洞表述；无任何具体机制设计或结构性思考。
[3-4] 有想法但不可执行。判定条件：能提出有趣的想法但完全未考虑落地可行性；缺乏商业逻辑支撑。
[5-6] 能提出改进型思路。判定条件：基于现有方案进行优化而非重构；有一定可行性但未触及底层机制。
[7-8] 提出结构性新视角。判定条件：重新定义定价逻辑或激励机制；能从价值链角度提出新的分配方式；不是增量改进而是结构性变化。
[9-10] 能重新定义问题边界或价值来源。判定条件：发现被忽视的价值链环节；创造新的利益分配方式；从根本上改变问题的定义方式。
高分行为信号：结构性重构、定义新边界、定价/激励创新。
低分行为信号：复述常识、口号式创新、点子堆砌。

===== 维度五：投入度 (Commitment) =====
定义：评估在真实学期压力下候选人是否会消失——能否在14周内持续投入高质量时间。
评分段：
[0-2] 无法给出明确投入时间。判定条件：回答"看情况""不确定"；无法给出每周可用小时数；对工坊时间要求毫无认知。
[3-4] 投入时间明显不足或高度不确定。判定条件：每周仅能投入3-4小时（工坊要求8-12小时）；有多个冲突活动且无法说明优先级。
[5-6] 能满足最低要求但缺乏预案。判定条件：能给出时间承诺但没有冲突解决方案；采取被动应对策略而非主动规划。
[7-8] 有清晰时间安排与冲突管理方案。判定条件：已做好时间规划；有备选方案应对突发情况；能描述具体的时间分配策略。
[9-10] 主动为工坊让渡其他事务。判定条件：已推掉其他课外活动为工坊腾出时间；提前调整了学期计划；展现出超出预期的投入承诺。
高分行为信号：明确的时间节奏、主动让渡事务、冲突方案清晰。
低分行为信号：模糊承诺、无法给出时长、高度不确定性。

===== 评分规则约束 =====
1. 每个维度分数必须为0-10的整数。
2. 评分必须严格对照上述分数段的判定条件，不得凭主观印象打分。
3. 当某维度信息不足以判断时，默认给5分，并在risk_flags中标注"该维度信息不足"。
4. evidence_objects中的每条证据必须引用候选人的具体回答内容，不得泛泛而谈。
5. 如果候选人同一维度前后回答得分差异>3分，必须在risk_flags中标注"矛盾回答"。`,
    user_prompt_template: '维度权重：\n{{weights}}\n\n客观题回答：\n{{responses}}\n\n追问回答：\n{{probing_answers}}\n\n请严格依据系统提示词中的评分标准，输出各维度分数(0-10整数)、核心证据点和风险标记。',
    variables: ['weights', 'responses', 'probing_answers'],
    output_format: 'JSON: { motivation, logic, resilience, innovation, commitment, evidence_objects[], risk_flags[] }',
    temperature: 0.2, model: undefined,
    inherited_context: `[上游流程概述]
在你评分之前，系统已为该候选人完成了以下环节：
1. 题目生成环节：根据五维评估标准（真实动机、逻辑闭环、反思与韧性、创新潜质、投入度），为候选人自适应生成场景化选择题（8-20题，基于置信度动态调整），每道题关联一个核心维度，选项按商业思维深度从高到低排列（A最优→E最弱）。
2. 追问决策环节：系统用决策树分析候选人的客观题作答模式，识别出需要深入验证的维度，并对其发起追问。追问类型包括三种：
   - 代价追问：迫使候选人说出具体代价与机会成本，验证承诺的真实性
   - 假设追问：暴露回答中隐含的未经验证假设，测试元认知水平
   - 证据追问：要求举出真实经历来支撑观点，验证实证思维能力
   候选人的追问回答将通过 {{probing_answers}} 变量注入。

[你的任务]
你现在需要综合候选人的客观题选择（通过 {{responses}} 注入）和追问回答（通过 {{probing_answers}} 注入），为五个维度打分（0-10整数）。

[数据隔离]
每位候选人为独立数据单元，本次评分仅基于当前候选人的回答数据，不参考任何其他候选人信息。`
  },
  {
    stage: 'profile_generation',
    name_zh: '画像生成', name_en: 'Profile Generation',
    description_zh: '基于分数和候选人信息生成中英文画像报告',
    description_en: 'Generate bilingual profile report based on scores and candidate info',
    system_prompt: `你是清华经管《商业模式工坊》(BID) 招生画像撰写专家。你的任务是基于候选人的五维评分和面试证据，撰写深度中英文画像报告。

一、撰写原则
1. 证据驱动：每一条判断必须引用候选人的具体回答或行为数据
2. 双语对等：中文版和英文版内容等价，不可一方为另一方的缩写
3. 建设性：即使分数低的维度也要指出改进方向
4. 结构化：严格按照输出格式要求组织内容

二、输出结构要求

2.1 summary_zh (中文综述, 200-400字)
- 第一段：候选人画像概述（身份、核心特质、整体评价）
- 第二段：突出优势维度（引用具体回答）
- 第三段：需关注的维度（指出具体行为信号）
- 第四段：综合判断与建议

2.2 summary_en (英文综述, 150-300 words)
- 与中文版等价，结构相同

2.3 top_reasons (3-5条核心理由)
- 每条理由一句话，格式："[维度标签] 具体发现"
- 示例："[逻辑闭环] 在拼多多案例讨论中展现出清晰的Trade-off推理链"

2.4 suggested_focus (面试重点, 2-4条)
- 后续面试官应追问的关键问题
- 格式："[重点方向] 具体追问建议"

2.5 admin_notes (管理员备注, 1-3条)
- 仅对管理员可见的内部判断
- 包含风险预警、特殊关注点、与往届对比等

2.6 keywords (画像关键词, 5-8个)
- 用于快速标签化和检索
- 示例：["强动机", "逻辑清晰", "创新一般", "时间管理风险", "内归因"]

三、评分解读参考
- 0-3分：明显不足，需重点关注
- 4-5分：基本达标但有提升空间
- 6-7分：良好，符合预期
- 8-10分：优秀，超出预期`,
    user_prompt_template: '候选人：{{candidate_info}}\n\n评分结果：{{scores}}\n\n核心证据：{{evidence}}\n\n客观题回答摘要：{{responses}}\n\n请输出中英文综述、核心理由、建议面试重点、管理员备注和画像关键词。',
    variables: ['candidate_info', 'scores', 'evidence', 'responses'],
    output_format: 'JSON: { summary_zh, summary_en, top_reasons[], suggested_focus[], admin_notes, keywords[] }',
    temperature: 0.7, model: undefined,
    inherited_context: `[上游流程概述]
在你撰写画像之前，该候选人已经历了完整的评估流程：
1. 题目生成环节：系统根据五维标准为候选人自适应生成场景化选择题（8-20题，基于置信度动态调整），覆盖真实动机、逻辑闭环、反思与韧性、创新潜质、投入度五个维度。
2. 追问决策环节：系统分析客观题作答模式后，针对需要验证的维度发起了追问（代价追问/假设追问/证据追问），获取了更深层的思维信号。
3. 评分计算环节：评分引擎综合客观题和追问回答，为五个维度各打了0-10分，并提取了核心证据点（evidence_objects[]）和风险标记（risk_flags[]）。

[你收到的数据]
- 候选人基本信息（通过 {{candidate_info}} 注入）
- 各维度评分及总分（通过 {{scores}} 注入）：motivation, logic, resilience, innovation, commitment, thinking_depth, multidimensional_thinking, overall
- 核心证据点（通过 {{evidence}} 注入）：每条包含具体的行为证据和所属维度
- 客观题回答摘要（通过 {{responses}} 注入）

[你的任务]
基于以上完整评估数据，撰写深度中英文画像报告，包括综述、核心理由、面试建议、管理员备注和画像关键词。

[数据隔离]
仅使用当前候选人的评分和证据数据，不引用或对比其他候选人信息。`
  },
  {
    stage: 'decision_making',
    name_zh: '决策判定', name_en: 'Decision Making',
    description_zh: '纯分数逻辑，不调用AI——根据阈值矩阵自动判定',
    description_en: 'Pure score-based logic, no AI call — automatic threshold-based decision',
    system_prompt: `（本环节由纯分数逻辑本地执行，不调用AI。）
决策逻辑：
1. 所有维度分数均达到star行阈值且加权均分≥star.avg → pass（标记示范）
2. 所有维度分数均达到pass行阈值且加权均分≥pass.avg → pass（通过）
3. 所有维度分数均达到hold行阈值且加权均分≥hold.avg → hold（待定）
4. 其余情况 → reject（低于待定线即淘汰）`,
    user_prompt_template: '（本环节不调用AI，由本地分数逻辑自动计算。）',
    variables: [],
    output_format: 'JSON: { decision: "pass"|"hold"|"reject", reasoning: string, isStar: boolean }',
    temperature: 0, model: undefined,
    inherited_context: `[说明]
本环节完全由分数阈值驱动，不调用AI模型。决策逻辑：star → pass → hold → reject（低于hold即淘汰）。

[数据隔离]
决策仅基于当前候选人的评分数据和全局阈值配置，不参考其他候选人的结果。`
  },
  {
    stage: 'open_ended_scoring',
    name_zh: '开放题评分', name_en: 'Open-Ended Scoring',
    description_zh: '评估候选人开放式分析题的思维深度和多维思考能力',
    description_en: 'Evaluate candidate open-ended analysis for thinking depth and multi-dimensional thinking',
    system_prompt: `你是清华经管《商业模式工坊》(BID) 开放式分析题评分专家。你的任务是评估候选人对时事热点分析的**思维深度**和**多维思考**能力。

重要：你不考察候选人对商业知识的了解程度，而是评估其思维方式。

===== 维度一：思维深度 (Thinking Depth) =====
定义：候选人推理链的深度——是否从表面现象深入到底层逻辑，是否能形成完整推理链，是否有反直觉洞察。
评分段：
[0-2] 仅复述新闻或常识，无任何分析
[3-4] 有简单的因果判断但停留表面，如"A导致B"
[5-6] 能识别表面之下的一层逻辑，有基本推理链
[7-8] 形成完整推理链，能区分短期/长期影响，识别二阶效应
[9-10] 完整推理链+反直觉洞察，能发现被忽视的因果路径或提出非显而易见的结论

===== 维度二：多维思考 (Multi-dimensional Thinking) =====
定义：候选人分析角度的广度——是否从单一视角跳出，是否能关联不同维度，是否有跨维度联动分析。
评分段：
[0-2] 仅从单一视角分析，如"对企业的影响"
[3-4] 涉及两个视角但缺乏关联
[5-6] 从3个以上角度分析，有一定的维度覆盖
[7-8] 多维度分析且有交叉关联，如"技术变化如何影响政策，政策又如何反作用于商业"
[9-10] 多维度关联分析+跨维度联动，形成系统性思维框架

===== 评分规则 =====
1. 每个维度分数为0-10整数
2. 严格对照上述分数段判定，不凭主观印象
3. 必须引用候选人回答中的具体内容作为评分证据
4. 不要因为候选人不了解事件细节而扣分，重点看思维过程`,
    user_prompt_template: '候选人信息：{{candidate_info}}\n\n分析题目背景：{{question_context}}\n\n分析题目：{{question_text}}\n\n候选人回答：\n{{answer}}\n\n请评估思维深度和多维思考两个维度，输出分数和证据。',
    variables: ['candidate_info', 'question_context', 'question_text', 'answer'],
    output_format: 'JSON: { thinking_depth: number, multidimensional_thinking: number, depth_evidence: string, multidim_evidence: string }',
    temperature: 0.3, model: undefined,
    inherited_context: `[上游流程概述]
在评估开放题之前，候选人已完成了选择题阶段的全部环节：
1. 自适应选择题（8-20题）
2. 决策树驱动的追问

[你的任务]
独立评估候选人的开放式分析回答，不受选择题成绩影响。

[评估重点]
- 不考察商业知识本身，而是评估思维方式
- 思维深度：推理链是否完整，是否有深层洞察
- 多维思考：是否从多角度分析，是否有跨维度关联`
  }
];

// Initialize default questions from EXAMPLE_QUESTIONS (clone with q_ prefix for editable copies)
const BID_DIMS = ["真实动机", "逻辑闭环", "反思与韧性", "创新潜质", "投入度"];
const DEFAULT_QUESTIONS: QuestionTemplate[] = EXAMPLE_QUESTIONS.map(q => ({
  ...q,
  id: q.id.replace(/^ex_/, 'q_'),
  options: q.options.map(o => ({ ...o })),
  probing_logic: q.probing_logic ? { ...q.probing_logic } : undefined,
}));

const DEFAULT_DIMENSION_WEIGHTS: DimensionWeight[] = [
  { dimension: "真实动机", dimension_en: "Motivation", weight: 0.15 },
  { dimension: "逻辑闭环", dimension_en: "Logic", weight: 0.20 },
  { dimension: "反思与韧性", dimension_en: "Resilience", weight: 0.15 },
  { dimension: "创新潜质", dimension_en: "Innovation", weight: 0.15 },
  { dimension: "投入度", dimension_en: "Commitment", weight: 0.15 },
  { dimension: "思维深度", dimension_en: "Thinking Depth", weight: 0.10 },
  { dimension: "多维思考", dimension_en: "Multidim. Thinking", weight: 0.10 },
];

const DEFAULT_DECISION_THRESHOLDS: NumericDecisionThresholds = {
  reject: { motivation: 0, logic: 0, resilience: 0, innovation: 0, commitment: 0, thinking_depth: 0, multidimensional_thinking: 0, avg: 0 },
  hold:   { motivation: 4, logic: 4, resilience: 4, innovation: 3, commitment: 5, thinking_depth: 4, multidimensional_thinking: 4, avg: 5 },
  pass:   { motivation: 5, logic: 6, resilience: 5, innovation: 4, commitment: 6, thinking_depth: 5, multidimensional_thinking: 5, avg: 6.5 },
  star:   { motivation: 8, logic: 8, resilience: 8, innovation: 7, commitment: 8, thinking_depth: 8, multidimensional_thinking: 8, avg: 8 },
};

const DEFAULT_DECISION_TREE: DecisionTreeNode[] = [
  { id: 'dt1', condition: 'contradiction', threshold: 3, action: 'probe', description_zh: '同维度前后得分差异>3分，触发矛盾追问', description_en: 'Score difference >3 within same dimension triggers contradiction probing', category: 'consistency', theory_basis_zh: '苏格拉底反诘法：通过暴露矛盾引发深层反思', theory_basis_en: 'Socratic Elenchus: Exposing contradictions to trigger deeper reflection', icon: '🔄', color: 'red', probability: 1.0, selectedActions: ['cost'] },
  { id: 'dt2', condition: 'same_option_streak', threshold: 5, action: 'deep_probe', description_zh: '连续5题选同一选项，触发深度追问', description_en: '5 consecutive same options triggers deep probing', category: 'consistency', theory_basis_zh: '社会期望偏差检测：连续同选项可能为策略性应答', theory_basis_en: 'Social Desirability Bias Detection: Consecutive same options may indicate strategic responding', icon: '📊', color: 'amber', probability: 1.0, selectedActions: ['cost', 'assumption', 'evidence'] },
  { id: 'dt3', condition: 'low_score', threshold: 3, action: 'probe', description_zh: '当前得分≤3且随机30%概率，触发追问', description_en: 'Current score ≤3 with 30% random chance triggers probing', category: 'depth', theory_basis_zh: '最近发展区理论：低分区域追问可发掘潜在能力', theory_basis_en: 'Zone of Proximal Development: Probing low-score areas may reveal latent capabilities', icon: '🔍', color: 'blue', probability: 0.3, selectedActions: ['cost'] },
  { id: 'dt4', condition: 'high_score', threshold: 9, action: 'probe', description_zh: '当前得分≥9且随机20%概率，触发验证追问', description_en: 'Current score ≥9 with 20% random chance triggers validation probing', category: 'validation', theory_basis_zh: '验证性偏差防控：高分需追问验证真实深度', theory_basis_en: 'Confirmation Bias Prevention: High scores need probing to verify authentic depth', icon: '✅', color: 'green', probability: 0.2, selectedActions: ['cost'] },
  { id: 'dt5', condition: 'random', threshold: 25, action: 'probe', description_zh: '25%随机概率触发常态化探测', description_en: '25% random probability triggers routine probing', category: 'routine', theory_basis_zh: '随机抽检：保持候选人注意力，避免策略性懈怠', theory_basis_en: 'Random Sampling: Maintain candidate attention, prevent strategic disengagement', icon: '🎲', color: 'tsinghua', probability: 0.25, selectedActions: ['cost'] }
];

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('CN');
  const [stage, setStage] = useState<AppStage>(AppStage.WELCOME);
  const [candidateInfo, setCandidateInfo] = useState<CandidateBasicInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assessment, setAssessment] = useState<CandidateRecord | null>(null);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [dimensionWeights, setDimensionWeights] = useState<DimensionWeight[]>(DEFAULT_DIMENSION_WEIGHTS);
  const [questions, setQuestions] = useState<QuestionTemplate[]>(DEFAULT_QUESTIONS);
  const [decisionThresholds, setDecisionThresholds] = useState<NumericDecisionThresholds>(DEFAULT_DECISION_THRESHOLDS);
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({ template: DEFAULT_PROMPT_TEMPLATE, stagePrompts: DEFAULT_STAGE_PROMPTS, sections: DEFAULT_PROMPT_SECTIONS });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const isAuthenticated = authUser !== null;
  const [interviewQuestions, setInterviewQuestions] = useState<QuestionTemplate[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [objectiveResponses, setObjectiveResponses] = useState<ObjectiveResponse[]>([]);
  const [isProbing, setIsProbing] = useState(false);
  const [probingActions, setProbingActions] = useState<('cost' | 'assumption' | 'evidence')[]>([]);
  const [decisionTree, setDecisionTree] = useState<DecisionTreeNode[]>(DEFAULT_DECISION_TREE);
  const [probingStrategy, setProbingStrategy] = useState<ProbingStrategyConfig>(() => {
    try { const s = localStorage.getItem('tsinghua_probing_strategy'); if (s) return JSON.parse(s); } catch {} return DEFAULT_PROBING_STRATEGY;
  });
  const [workflowModules, setWorkflowModules] = useState<WorkflowModuleConfig[]>(() => {
    try { const s = localStorage.getItem('tsinghua_workflow_modules'); if (s) return JSON.parse(s); } catch {} return DEFAULT_WORKFLOW_MODULES;
  });
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    try {
      const saved = localStorage.getItem('tsinghua_api_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_API_CONFIG;
  });
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<InterviewSession | null>(null);
  // AI Native: Adaptive question state
  const [adaptiveQuestionState, setAdaptiveQuestionState] = useState<AdaptiveQuestionStateSerialized | null>(null);
  // Question count config (configurable in workflow)
  const [questionCountConfig, setQuestionCountConfig] = useState<QuestionCountConfig>(() => {
    try { const s = localStorage.getItem('tsinghua_question_count_config'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_QUESTION_COUNT_CONFIG;
  });
  const [liveCandidateProfile, setLiveCandidateProfile] = useState<LiveCandidateProfile | null>(null);
  // Config snapshot — frozen at interview start so admin edits don't affect in-progress interviews
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  // AI Native: Backup manager
  const [showBackupManager, setShowBackupManager] = useState(false);
  // AI Native: Hybrid probing config
  const [hybridProbingConfig, setHybridProbingConfig] = useState<HybridProbingConfig>(() => {
    try { const s = localStorage.getItem('tsinghua_hybrid_probing'); if (s) return JSON.parse(s); } catch {}
    return { enabled: false, aiProbingThreshold: 0.5, maxAICallsPerSession: 2, fallbackToLocal: true };
  });
  // Open-ended analysis state
  const [openEndedQuestions, setOpenEndedQuestions] = useState<OpenEndedQuestion[]>(() => {
    try { const s = localStorage.getItem('tsinghua_open_ended_questions'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_OPEN_ENDED_QUESTIONS;
  });
  const [selectedOpenEndedQuestion, setSelectedOpenEndedQuestion] = useState<OpenEndedQuestion | null>(null);
  const [openEndedResponse, setOpenEndedResponse] = useState<OpenEndedResponse | null>(null);
  // Interview suspend/resume — tracks session when user navigates away mid-interview
  const [suspendedSession, setSuspendedSession] = useState<InterviewSession | null>(null);
  // Help widget config — editable by admin, synced to Supabase
  const [helpConfig, setHelpConfig] = useState<HelpWidgetConfig>(() => {
    try {
      const raw = localStorage.getItem('tsinghua_help_config');
      return raw ? JSON.parse(raw) : { contactEmail: '', businessHours: '', extraNote: '' };
    } catch { return { contactEmail: '', businessHours: '', extraNote: '' }; }
  });
  // Fetch help config from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    supabase.from('help_config').select('*').eq('id', 'default').single().then(({ data }) => {
      if (data) {
        const cfg: HelpWidgetConfig = { contactEmail: data.contact_email || '', businessHours: data.business_hours || '', extraNote: data.extra_note || '' };
        setHelpConfig(cfg);
        localStorage.setItem('tsinghua_help_config', JSON.stringify(cfg));
      }
    });
  }, []);

  // Merge example candidates (read-only) with real candidates for display
  const allCandidates = useMemo(() => [...EXAMPLE_CANDIDATES, ...candidates], [candidates]);
  // Merge example questions (read-only) with user questions for display
  const allQuestions = useMemo(() => [...EXAMPLE_QUESTIONS, ...questions], [questions]);

  const t = translations[lang];

  // Session lifecycle status for header badge
  const sessionStatus = useMemo((): { status: 'idle' | 'active' | 'interrupted'; label: string } => {
    if (pendingRecovery) {
      return {
        status: 'interrupted',
        label: (t.sessionBadgeProgress as string)
          .replace('{name}', pendingRecovery.candidateInfo.name)
          .replace('{answered}', String(pendingRecovery.objectiveResponses.length))
          .replace('{total}', String(pendingRecovery.interviewQuestions.length)),
      };
    }
    if (stage === AppStage.INTERVIEW_QUESTIONNAIRE && candidateInfo) {
      return {
        status: 'active',
        label: (t.sessionBadgeProgress as string)
          .replace('{name}', candidateInfo.name)
          .replace('{answered}', String(objectiveResponses.length))
          .replace('{total}', String(interviewQuestions.length)),
      };
    }
    return { status: 'idle', label: t.sessionIdle as string };
  }, [pendingRecovery, stage, candidateInfo, objectiveResponses.length, interviewQuestions.length, t]);

  // Auto-logout when leaving admin stages
  useEffect(() => {
    const adminStages = [AppStage.ADMIN_LOGIN, AppStage.ADMIN_LIBRARY, AppStage.ADMIN_CRITERIA, AppStage.ADMIN_QUESTIONS, AppStage.ADMIN_PROMPTS, AppStage.ADMIN_QUICK_PREVIEW];
    if (!adminStages.includes(stage) && authUser) {
      signOut();
      setAuthUser(null);
    }
  }, [stage, authUser]);

  // Restore auth session on mount + listen for changes
  useEffect(() => {
    getSession().then(user => { if (user) setAuthUser(user); });
    const unsub = onAuthStateChange(user => setAuthUser(user));
    return unsub;
  }, []);

  // Fetch candidates from cloud when admin logs in
  useEffect(() => {
    if (authUser) {
      fetchCandidates().then(records => setCandidates(records));
    }
  }, [authUser]);

  // Load API config from Supabase on startup (cloud settings override localStorage)
  useEffect(() => {
    fetchApiConfig().then(cloudConfig => {
      if (cloudConfig && cloudConfig.apiKey) {
        setApiConfig(cloudConfig);
        localStorage.setItem('tsinghua_api_config', JSON.stringify(cloudConfig));
      }
    });
  }, []);

  useEffect(() => {
    const savedCandidates = localStorage.getItem('tsinghua_candidates');
    if (savedCandidates) try { setCandidates(JSON.parse(savedCandidates)); } catch (e) {}

    // Migration: old DimensionCriteria[] → DimensionWeight[]
    const savedWeights = localStorage.getItem('tsinghua_dimension_weights');
    if (savedWeights) {
      try {
        const parsed: DimensionWeight[] = JSON.parse(savedWeights);
        // Migration: 5-dim → 7-dim weights (add open-ended dims)
        if (parsed.length === 5) {
          const scaleFactor = 0.80;
          const migrated: DimensionWeight[] = [
            ...parsed.map(w => ({ ...w, weight: Math.round(w.weight * scaleFactor * 100) / 100 })),
            { dimension: '思维深度', dimension_en: 'Thinking Depth', weight: 0.10 },
            { dimension: '多维思考', dimension_en: 'Multidim. Thinking', weight: 0.10 },
          ];
          setDimensionWeights(migrated);
          localStorage.setItem('tsinghua_dimension_weights', JSON.stringify(migrated));
        } else {
          setDimensionWeights(parsed);
        }
      } catch (e) {}
    } else {
      const savedCriteria = localStorage.getItem('tsinghua_criteria');
      if (savedCriteria) {
        try {
          const old: any[] = JSON.parse(savedCriteria);
          if (old.length && old[0].definition) {
            // Old format detected, migrate
            const migrated: DimensionWeight[] = old.map(c => ({
              dimension: c.dimension,
              dimension_en: c.definition_en?.split(':')[0]?.trim() || c.dimension,
              weight: c.weight
            }));
            setDimensionWeights(migrated);
            localStorage.setItem('tsinghua_dimension_weights', JSON.stringify(migrated));
            localStorage.removeItem('tsinghua_criteria');
          }
        } catch (e) {}
      }
    }

    // Migration: old GlobalDecisionRules → NumericDecisionThresholds
    const savedThresholds = localStorage.getItem('tsinghua_decision_thresholds');
    if (savedThresholds) {
      try {
        const parsed = JSON.parse(savedThresholds);
        // Migration: add thinking_depth + multidimensional_thinking if missing
        for (const level of ['reject', 'hold', 'pass', 'star'] as const) {
          if (parsed[level] && parsed[level].thinking_depth === undefined) {
            parsed[level].thinking_depth = DEFAULT_DECISION_THRESHOLDS[level].thinking_depth;
            parsed[level].multidimensional_thinking = DEFAULT_DECISION_THRESHOLDS[level].multidimensional_thinking;
          }
        }
        // Migration: zero out reject row (decision is now purely score-based, below hold = eliminated)
        if (parsed.reject) {
          parsed.reject = { motivation: 0, logic: 0, resilience: 0, innovation: 0, commitment: 0, thinking_depth: 0, multidimensional_thinking: 0, avg: 0 };
        }
        setDecisionThresholds(parsed);
      } catch (e) {}
    } else {
      // If old rules exist, just remove them and use defaults
      localStorage.removeItem('tsinghua_decision_rules');
    }

    const savedQuestions = localStorage.getItem('tsinghua_questions');
    if (savedQuestions) try { setQuestions(JSON.parse(savedQuestions)); } catch (e) {}
    const savedPrompt = localStorage.getItem('tsinghua_prompt_config');
    if (savedPrompt) try {
      const loaded = JSON.parse(savedPrompt);
      // Migrate: ensure inherited_context exists on all stages
      if (loaded.stagePrompts) {
        loaded.stagePrompts = loaded.stagePrompts.map((s: any) => {
          let patched = s;
          if (patched.inherited_context === undefined) {
            const def = DEFAULT_STAGE_PROMPTS.find(d => d.stage === patched.stage);
            patched = { ...patched, inherited_context: def?.inherited_context || '' };
          }
          // Migrate: clear legacy default model names so display follows apiConfig
          if (patched.model && DEFAULT_LEGACY_MODELS.includes(patched.model)) {
            patched = { ...patched, model: undefined };
          }
          return patched;
        });
        // Migrate: ensure open_ended_scoring stage exists
        if (!loaded.stagePrompts.find((s: any) => s.stage === 'open_ended_scoring')) {
          const oeDefault = DEFAULT_STAGE_PROMPTS.find(d => d.stage === 'open_ended_scoring');
          if (oeDefault) loaded.stagePrompts.push(oeDefault);
        }
      }
      // Migrate: add sections if missing (v1 → v2)
      if (!loaded.sections) {
        const isDefault = loaded.template?.trim() === DEFAULT_PROMPT_TEMPLATE.trim();
        if (isDefault || !loaded.template) {
          loaded.sections = DEFAULT_PROMPT_SECTIONS;
        }
        // If user has custom template, sections stays undefined → UI shows migration banner
      }
      // Migrate: update question_generation system_prompt from "题目设计专家" → "面试评估专家"
      if (loaded.stagePrompts) {
        const qgStage = loaded.stagePrompts.find((s: any) => s.stage === 'question_generation');
        if (qgStage && qgStage.system_prompt?.includes('题目设计专家')) {
          qgStage.system_prompt = DEFAULT_STAGE_PROMPTS[0].system_prompt;
        }
      }
      // Persist any migrations back to localStorage
      localStorage.setItem('tsinghua_prompt_config', JSON.stringify(loaded));
      setPromptConfig(loaded);
    } catch (e) {}
    const savedTree = localStorage.getItem('tsinghua_decision_tree');
    if (savedTree) try { setDecisionTree(JSON.parse(savedTree)); } catch (e) {}

    // Check for interrupted interview session
    const savedSession = localStorage.getItem('tsinghua_interview_session');
    if (savedSession) {
      try {
        const session: InterviewSession = JSON.parse(savedSession);
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        if (Date.now() - session.savedAt < TWO_HOURS) {
          setPendingRecovery(session);
        } else {
          localStorage.removeItem('tsinghua_interview_session');
        }
      } catch {
        localStorage.removeItem('tsinghua_interview_session');
      }
    }

    // AI Native: Create baseline snapshot on first load
    createBaselineIfNeeded().catch(() => {});
  }, []);

  // Persist live interview progress to localStorage for admin real-time monitoring
  useEffect(() => {
    if (stage === AppStage.INTERVIEW_QUESTIONNAIRE && candidateInfo) {
      const progress = {
        name: candidateInfo.name,
        total: interviewQuestions.length,
        answered: objectiveResponses.length,
        isProbing,
        currentDimension: interviewQuestions[currentQIndex]?.dimension || '',
        byDimension: BID_DIMS.reduce((acc, dim) => {
          acc[dim] = {
            total: interviewQuestions.filter(q => q.dimension === dim).length,
            done: objectiveResponses.filter(r => r.dimension === dim).length,
          };
          return acc;
        }, {} as Record<string, { total: number; done: number }>),
        timestamp: Date.now(),
      };
      localStorage.setItem('tsinghua_live_progress', JSON.stringify(progress));
    } else if (stage === AppStage.ANALYZING || stage === AppStage.RESULT) {
      localStorage.removeItem('tsinghua_live_progress');
      localStorage.removeItem('tsinghua_interview_session');
    }
  }, [stage, objectiveResponses.length, isProbing, currentQIndex]);

  // Persist recoverable interview session to localStorage (covers both questionnaire and open-ended stages)
  useEffect(() => {
    const isInterviewActive = (stage === AppStage.INTERVIEW_QUESTIONNAIRE || stage === AppStage.OPEN_ENDED_ANALYSIS) && candidateInfo && interviewQuestions.length > 0;
    if (isInterviewActive) {
      const session: InterviewSession = {
        candidateInfo,
        objectiveResponses,
        currentQIndex,
        isProbing,
        messages,
        interviewQuestions,
        savedAt: Date.now(),
        adaptiveState: adaptiveQuestionState || undefined,
        liveCandidateProfile: liveCandidateProfile || undefined,
        openEndedResponse: openEndedResponse || undefined,
        selectedOpenEndedQuestion: selectedOpenEndedQuestion || undefined,
        sessionConfig: sessionConfig || undefined,
        suspendedStage: stage,
      };
      localStorage.setItem('tsinghua_interview_session', JSON.stringify(session));
    }
  }, [stage, objectiveResponses, currentQIndex, isProbing, messages, candidateInfo, interviewQuestions, openEndedResponse]);

  const handleStartForm = () => setStage(AppStage.BASIC_FORM);

  const handleRecoverSession = () => {
    if (!pendingRecovery) return;
    setCandidateInfo(pendingRecovery.candidateInfo);
    setInterviewQuestions(pendingRecovery.interviewQuestions);
    setObjectiveResponses(pendingRecovery.objectiveResponses);
    setCurrentQIndex(pendingRecovery.currentQIndex);
    setIsProbing(pendingRecovery.isProbing);
    setMessages(pendingRecovery.messages);
    // AI Native: Restore adaptive state if available
    if (pendingRecovery.adaptiveState) setAdaptiveQuestionState(pendingRecovery.adaptiveState);
    if (pendingRecovery.liveCandidateProfile) setLiveCandidateProfile(pendingRecovery.liveCandidateProfile);
    if (pendingRecovery.openEndedResponse) setOpenEndedResponse(pendingRecovery.openEndedResponse);
    if (pendingRecovery.selectedOpenEndedQuestion) setSelectedOpenEndedQuestion(pendingRecovery.selectedOpenEndedQuestion);
    if (pendingRecovery.sessionConfig) setSessionConfig(pendingRecovery.sessionConfig);
    setStage(pendingRecovery.suspendedStage || AppStage.INTERVIEW_QUESTIONNAIRE);
    setPendingRecovery(null);
  };

  const handleDiscardSession = () => {
    localStorage.removeItem('tsinghua_interview_session');
    setPendingRecovery(null);
    setSessionConfig(null);
  };

  // Navigate away from an active interview — snapshot session so user can return
  const handleNavigateAway = (targetStage: AppStage) => {
    const isActive = stage === AppStage.INTERVIEW_QUESTIONNAIRE || stage === AppStage.OPEN_ENDED_ANALYSIS;
    if (isActive && candidateInfo) {
      const session: InterviewSession = {
        candidateInfo,
        objectiveResponses,
        currentQIndex,
        isProbing,
        messages,
        interviewQuestions,
        savedAt: Date.now(),
        adaptiveState: adaptiveQuestionState || undefined,
        liveCandidateProfile: liveCandidateProfile || undefined,
        openEndedResponse: openEndedResponse || undefined,
        selectedOpenEndedQuestion: selectedOpenEndedQuestion || undefined,
        sessionConfig: sessionConfig || undefined,
        suspendedStage: stage,
      };
      setSuspendedSession(session);
      localStorage.setItem('tsinghua_interview_session', JSON.stringify(session));
    }
    setStage(targetStage);
  };

  // Resume a suspended interview session
  const handleResumeSession = () => {
    if (!suspendedSession) return;
    setCandidateInfo(suspendedSession.candidateInfo);
    setInterviewQuestions(suspendedSession.interviewQuestions);
    setObjectiveResponses(suspendedSession.objectiveResponses);
    setCurrentQIndex(suspendedSession.currentQIndex);
    setIsProbing(suspendedSession.isProbing);
    setMessages(suspendedSession.messages);
    if (suspendedSession.adaptiveState) setAdaptiveQuestionState(suspendedSession.adaptiveState);
    if (suspendedSession.liveCandidateProfile) setLiveCandidateProfile(suspendedSession.liveCandidateProfile);
    if (suspendedSession.openEndedResponse) setOpenEndedResponse(suspendedSession.openEndedResponse);
    if (suspendedSession.selectedOpenEndedQuestion) setSelectedOpenEndedQuestion(suspendedSession.selectedOpenEndedQuestion);
    if (suspendedSession.sessionConfig) setSessionConfig(suspendedSession.sessionConfig);
    setStage(suspendedSession.suspendedStage || AppStage.INTERVIEW_QUESTIONNAIRE);
    setSuspendedSession(null);
  };

  // Abandon a suspended interview session
  const handleAbandonSession = () => {
    if (!confirm((t as any).abandonConfirm)) return;
    localStorage.removeItem('tsinghua_interview_session');
    setSuspendedSession(null);
    setSessionConfig(null);
  };

  const handleFormSubmit = (info: CandidateBasicInfo) => {
    localStorage.removeItem('tsinghua_interview_session');
    setPendingRecovery(null);
    setSuspendedSession(null);
    setCandidateInfo(info);

    // Freeze config snapshot — admin edits after this point won't affect this interview
    const frozenConfig: SessionConfig = {
      stagePrompts: JSON.parse(JSON.stringify(promptConfig.stagePrompts)),
      apiConfig: { ...apiConfig },
      dimensionWeights: dimensionWeights.map(w => ({ ...w })),
      decisionThresholds: JSON.parse(JSON.stringify(decisionThresholds)),
      decisionTree: JSON.parse(JSON.stringify(decisionTree)),
      questionCountConfig: { ...questionCountConfig },
    };
    setSessionConfig(frozenConfig);

    // AI Native: Initialize adaptive question engine (uses frozen config)
    const adaptiveState = initAdaptiveState(allQuestions, BID_DIMS, frozenConfig.questionCountConfig);
    setAdaptiveQuestionState(adaptiveState);
    setLiveCandidateProfile(createInitialProfile());

    // Get first question from adaptive engine
    const firstQ = getNextQuestion(adaptiveState, frozenConfig.questionCountConfig);
    const startingQuestions = firstQ ? [firstQ] : [];
    setInterviewQuestions(startingQuestions);
    setObjectiveResponses([]);
    setCurrentQIndex(0);
    setIsProbing(false);

    const welcomeMsg = lang === 'CN'
      ? `你好，欢迎参加清华经管《商业模式工坊》的面测。${(t as any).adaptive_welcome}`
      : `Welcome to the Tsinghua SEM Business Model Workshop assessment. ${(t as any).adaptive_welcome}`;
    setMessages([{ role: 'model', content: welcomeMsg, timestamp: Date.now() }]);
    setStage(AppStage.INTERVIEW_QUESTIONNAIRE);
  };

  // Decision tree-based probing logic + AI Native live profile bias
  type ProbingResult = { triggered: boolean; actions: ('cost' | 'assumption' | 'evidence')[] };
  const checkTriggerProbing = (newResponses: ObjectiveResponse[], currentOpt: QuestionOption, currentQ: QuestionTemplate): ProbingResult => {
    let triggeredNode: DecisionTreeNode | null = null;
    const activeTree = sessionConfig?.decisionTree ?? decisionTree;
    for (const node of activeTree) {
      let matched = false;
      switch (node.condition) {
        case 'contradiction': {
          const sameDim = newResponses.filter(r => r.dimension === currentQ.dimension && r.q_id !== currentQ.id);
          if (sameDim.length > 0) {
            const lastSameDim = sameDim[sameDim.length - 1];
            if (Math.abs(lastSameDim.score - currentOpt.score) > (node.threshold || 3)) matched = true;
          }
          break;
        }
        case 'same_option_streak': {
          const streak = node.threshold || 5;
          if (newResponses.length >= streak) {
            const lastN = newResponses.slice(-streak);
            if (lastN.every(r => r.label === currentOpt.label)) matched = true;
          }
          break;
        }
        case 'low_score': {
          const prob = node.probability ?? 0.3;
          if (currentOpt.score <= (node.threshold || 3) && Math.random() < prob) matched = true;
          break;
        }
        case 'high_score': {
          const prob = node.probability ?? 0.2;
          if (currentOpt.score >= (node.threshold || 9) && Math.random() < prob) matched = true;
          break;
        }
        case 'random': {
          const prob = node.probability ?? 0.25;
          if (Math.random() < prob) matched = true;
          break;
        }
      }
      if (matched) { triggeredNode = node; break; }
    }

    const treeResult = triggeredNode !== null;
    const actions: ('cost' | 'assumption' | 'evidence')[] = triggeredNode?.selectedActions?.length
      ? triggeredNode.selectedActions
      : treeResult ? ['cost', 'assumption', 'evidence'] : [];

    // AI Native: Apply live candidate profile bias adjustments
    if (liveCandidateProfile) {
      if (treeResult && liveCandidateProfile.probingBias.canSkipProbing.includes(currentQ.dimension)) {
        if (Math.random() < 0.5) return { triggered: false, actions: [] };
      }
      if (!treeResult && liveCandidateProfile.probingBias.shouldProbeMore.includes(currentQ.dimension)) {
        if (Math.random() < 0.4) return { triggered: true, actions: ['cost', 'assumption', 'evidence'] };
      }
    }

    return { triggered: treeResult, actions };
  };

  const handleOptionSelect = (opt: QuestionOption) => {
    const q = interviewQuestions[currentQIndex];
    const newResponse: ObjectiveResponse = { q_id: q.id, score: opt.score, dimension: q.dimension, selectedText: opt.text, label: opt.label };
    const newResponses = [...objectiveResponses, newResponse];
    setObjectiveResponses(newResponses);

    // AI Native: Update adaptive confidence and live profile
    // Keep a local reference to the updated state to pass directly (avoids stale closure)
    let latestAdaptive: AdaptiveQuestionStateSerialized | null = adaptiveQuestionState;
    if (adaptiveQuestionState) {
      const activeQCountConfig = sessionConfig?.questionCountConfig ?? questionCountConfig;
      const updatedAdaptive = updateConfidence(adaptiveQuestionState, newResponse, activeQCountConfig);
      setAdaptiveQuestionState(updatedAdaptive);
      latestAdaptive = updatedAdaptive;
      // Update live profile with all responses
      if (liveCandidateProfile) {
        let updatedProfile = updateLiveProfile(liveCandidateProfile, newResponses);
        updatedProfile = calculateProbingBias(updatedProfile, updatedAdaptive.dimensionConfidences);
        setLiveCandidateProfile(updatedProfile);
      }
    }

    const userMsg: Message = { role: 'user', content: opt.text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const probingResult = checkTriggerProbing(newResponses, opt, q);
    if (probingResult.triggered) {
      setProbingActions(probingResult.actions);
      setIsProbing(true);
    } else {
      advanceQuestion(newMessages, newResponses, latestAdaptive);
    }
  };

  const handleProbingSubmit = (answers: { cost: string, assumption: string, evidence: string }) => {
    const updatedResponses = [...objectiveResponses];
    const last = updatedResponses[updatedResponses.length - 1];
    last.probingAnswers = answers;
    setObjectiveResponses(updatedResponses);
    setIsProbing(false);
    setProbingActions([]);
    // Build probing message — only include non-empty fields
    const parts: string[] = [];
    if (answers.cost.trim()) parts.push(`${lang === 'CN' ? '代价' : 'Cost'}: ${answers.cost}`);
    if (answers.assumption.trim()) parts.push(`${lang === 'CN' ? '假设' : 'Assumption'}: ${answers.assumption}`);
    if (answers.evidence.trim()) parts.push(`${lang === 'CN' ? '证据' : 'Evidence'}: ${answers.evidence}`);
    const probingMsg: Message = { role: 'user', content: `[${lang === 'CN' ? '探测回复' : 'Probing Response'}]\n${parts.join('\n')}`, timestamp: Date.now() };
    advanceQuestion([...messages, probingMsg], updatedResponses, adaptiveQuestionState);
  };

  const advanceQuestion = (
    history: Message[],
    finalResponses: ObjectiveResponse[],
    latestAdaptive?: AdaptiveQuestionStateSerialized | null
  ) => {
    setMessages(history);
    // AI Native: Adaptive question flow — use passed-in state to avoid stale closure
    const adaptive = latestAdaptive ?? adaptiveQuestionState;
    const activeQCountCfg = sessionConfig?.questionCountConfig ?? questionCountConfig;
    if (adaptive && shouldContinue(adaptive, activeQCountCfg)) {
      const nextQ = getNextQuestion(adaptive, activeQCountCfg);
      if (nextQ) {
        setInterviewQuestions(prev => [...prev, nextQ]);
        setCurrentQIndex(prev => prev + 1);
        return;
      }
    }
    // No more questions or adaptive engine says stop → transition to open-ended
    if (currentQIndex < interviewQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      transitionToOpenEnded(history, finalResponses);
    }
  };

  const transitionToOpenEnded = (history: Message[], finalResponses: ObjectiveResponse[]) => {
    setMessages(history);
    // Pick a random question from the open-ended pool
    const pool = openEndedQuestions.length > 0 ? openEndedQuestions : DEFAULT_OPEN_ENDED_QUESTIONS;
    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    setSelectedOpenEndedQuestion(randomQ);
    setOpenEndedResponse(null);
    setStage(AppStage.OPEN_ENDED_ANALYSIS);
  };

  const handleOpenEndedSubmit = (answer: string) => {
    if (!selectedOpenEndedQuestion) return;
    const oeResponse: OpenEndedResponse = {
      questionId: selectedOpenEndedQuestion.id,
      question: selectedOpenEndedQuestion,
      answer,
      timestamp: Date.now(),
    };
    setOpenEndedResponse(oeResponse);
    finishFullInterview(messages, objectiveResponses, oeResponse);
  };

  const finishFullInterview = async (history: Message[], finalResponses: ObjectiveResponse[], openEndedData?: OpenEndedResponse) => {
    setStage(AppStage.ANALYZING);
    try {
      // Use frozen config snapshot if available (protects in-progress interview from admin edits)
      const cfg = sessionConfig ?? { apiConfig, dimensionWeights, decisionThresholds, stagePrompts: promptConfig.stagePrompts };
      const expectedTotal = adaptiveQuestionState?.totalTarget || interviewQuestions.length;
      const result = await generateFinalAssessment(cfg.apiConfig, history, candidateInfo!, cfg.dimensionWeights, cfg.decisionThresholds, finalResponses, cfg.stagePrompts, openEndedData, expectedTotal);
      const newRecord: CandidateRecord = {
        candidate_id: Math.random().toString(36).substr(2, 9),
        display_name: candidateInfo!.name,
        status: result.status || 'hold',
        status_badge_text_zh: result.status_badge_text_zh || '待定',
        profile: {
          name: candidateInfo!.name,
          identity: candidateInfo!.identity,
          school: candidateInfo!.school,
          department: candidateInfo!.department,
          major_title: candidateInfo!.major,
          grade_level: candidateInfo!.gradeOrLevel,
          weekly_commit_h1: candidateInfo!.timeCommitmentWeeks1to8,
          weekly_commit_h2: candidateInfo!.timeCommitmentWeeks9to16,
          offline_interview: candidateInfo!.offlineInterview,
          wechat_id: candidateInfo!.wechat,
          phone: candidateInfo!.phone,
          email: candidateInfo!.email,
          past_projects: candidateInfo!.projects,
          homework_willingness: candidateInfo!.homeworkWillingness,
          leader_willingness: candidateInfo!.leaderWillingness,
          self_description: candidateInfo!.selfDescription,
          has_read_recruit_post: candidateInfo!.hasReadRecruitPost,
          career_plan: candidateInfo!.careerPlan,
          referral_source: candidateInfo!.referralSource,
        },
        scores: result.scores as any,
        evidence: { ...result.evidence as any, objective_responses: finalResponses },
        decision_card: result.decision_card as any,
        admin_record: result.admin_record as any,
        messages: history,
        timestamp: Date.now(),
        // AI Native extensions
        explainability: result.explainability,
        adaptiveMetadata: adaptiveQuestionState ? getDimensionSummary(adaptiveQuestionState) : undefined,
        openEndedResponse: openEndedData,
      };
      setAssessment(newRecord);
      const updated = [...candidates, newRecord];
      setCandidates(updated);
      insertCandidate(newRecord);
      localStorage.removeItem('tsinghua_interview_session');
      setSessionConfig(null);
      setStage(AppStage.RESULT);
    } catch (e) {
      console.error('Assessment generation failed:', e);
      const errMsg = (e as Error)?.message || '';

      // Detect model restriction / not-allowed errors
      const isModelError = /model.*not.*allowed|not.*allowed.*model|allowed.*models|model.*not.*found|model.*not.*exist|does not exist|not available/i.test(errMsg);
      const isApiKeyError = /api.?key|unauthorized|authentication|401|403/i.test(errMsg);

      let userMsg: string;
      if (isModelError) {
        userMsg = lang === 'CN'
          ? `❌ API 模型不匹配\n\n您的 API 服务不支持当前配置的模型名称。\n\n当前快速模型: ${apiConfig.fastModel}\n当前深度模型: ${apiConfig.deepModel}\n\n请点击右上角「设置API」按钮，在 Base URL 中填入您的 API 地址，并在模型名称中填入您的 API 服务允许的模型名称。\n\n原始错误: ${errMsg.slice(0, 300)}`
          : `❌ Model Not Allowed\n\nYour API service doesn't support the configured model names.\n\nCurrent fast model: ${apiConfig.fastModel}\nCurrent deep model: ${apiConfig.deepModel}\n\nPlease click "API Settings" in the header to update your Base URL and model names to match your API service.\n\nRaw error: ${errMsg.slice(0, 300)}`;
      } else if (isApiKeyError) {
        userMsg = lang === 'CN'
          ? `❌ API Key 无效或未配置\n\n请点击右上角「设置API」按钮配置有效的 API Key。\n\n错误信息: ${errMsg.slice(0, 200)}`
          : `❌ Invalid or missing API Key\n\nPlease click "API Settings" in the header to configure a valid API key.\n\nError: ${errMsg.slice(0, 200)}`;
      } else {
        userMsg = lang === 'CN'
          ? `❌ 评估生成失败\n\n错误信息: ${errMsg.slice(0, 300)}\n\n请检查 API 配置和网络连接后重试。`
          : `❌ Assessment generation failed\n\nError: ${errMsg.slice(0, 300)}\n\nPlease check your API config and network connection.`;
      }
      alert(userMsg);

      // If it's a config error, auto-open settings so user can fix it immediately
      if (isModelError || isApiKeyError) {
        setShowApiSettings(true);
      }
      // Go back but keep responses so retry is possible via "manual finish"
      setStage(AppStage.INTERVIEW_QUESTIONNAIRE);
    }
  };

  const updateCandidates = (list: CandidateRecord[]) => { const realOnly = list.filter(c => !isExampleCandidate(c.candidate_id)); setCandidates(realOnly); upsertCandidates(realOnly); };
  const handleUpdateWeights = (w: DimensionWeight[]) => { setDimensionWeights(w); localStorage.setItem('tsinghua_dimension_weights', JSON.stringify(w)); };
  const handleUpdateThresholds = (t: NumericDecisionThresholds) => { setDecisionThresholds(t); localStorage.setItem('tsinghua_decision_thresholds', JSON.stringify(t)); };
  const handleUpdateQuestions = (q: QuestionTemplate[]) => { const realOnly = q.filter(q => !isExampleQuestion(q.id)); setQuestions(realOnly); localStorage.setItem('tsinghua_questions', JSON.stringify(realOnly)); };
  const handleUpdatePrompt = (p: PromptConfig) => { setPromptConfig(p); localStorage.setItem('tsinghua_prompt_config', JSON.stringify(p)); };
  const handleUpdateDecisionTree = (tree: DecisionTreeNode[]) => { setDecisionTree(tree); localStorage.setItem('tsinghua_decision_tree', JSON.stringify(tree)); };
  const handleUpdateProbingStrategy = (s: ProbingStrategyConfig) => { setProbingStrategy(s); localStorage.setItem('tsinghua_probing_strategy', JSON.stringify(s)); };
  const handleUpdateWorkflowModules = (m: WorkflowModuleConfig[]) => { setWorkflowModules(m); localStorage.setItem('tsinghua_workflow_modules', JSON.stringify(m)); };
  const handleUpdateQuestionCountConfig = (cfg: QuestionCountConfig) => { setQuestionCountConfig(cfg); localStorage.setItem('tsinghua_question_count_config', JSON.stringify(cfg)); };
  const handleUpdateApiConfig = (cfg: ApiConfig) => { setApiConfig(cfg); localStorage.setItem('tsinghua_api_config', JSON.stringify(cfg)); saveApiConfig(cfg); };
  const handleQuickPreviewCandidateCreated = (record: CandidateRecord) => { const updated = [...candidates, record]; setCandidates(updated); insertCandidate(record); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-tsinghua-50/30 text-gray-900 font-sans">
      {/* Header */}
      <div className="bg-white/95 border-b border-gray-100 py-3 px-6 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-xl">
        <button onClick={() => handleNavigateAway(AppStage.WELCOME)} className="flex items-center gap-3 group">
          <div className="bg-gradient-to-br from-tsinghua-500 to-tsinghua-700 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-tsinghua-200/50 group-hover:scale-110 transition-transform">BM</div>
          <div className="hidden sm:block">
            <span className="font-black text-gray-800 tracking-tight text-sm">{t.title}</span>
            <p className="text-[9px] text-gray-400 font-medium">{t.subtitle}</p>
          </div>
        </button>
        <div className="flex gap-4 items-center">
          {/* Session Status Badge (admin only) */}
          {isAuthenticated && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
              sessionStatus.status === 'idle'
                ? 'bg-gray-50 text-gray-400 border-gray-200'
                : sessionStatus.status === 'active'
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                sessionStatus.status === 'idle'
                  ? 'bg-gray-300'
                  : sessionStatus.status === 'active'
                  ? 'bg-green-400'
                  : 'bg-amber-400'
              }`} />
              <span>
                {sessionStatus.status === 'idle' ? t.sessionIdle
                  : sessionStatus.status === 'active' ? t.sessionActive
                  : t.sessionInterrupted}
              </span>
              {sessionStatus.status !== 'idle' && (
                <span className="text-[9px] opacity-70 normal-case">{sessionStatus.label}</span>
              )}
            </div>
          )}
          {isAuthenticated && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNavigateAway(AppStage.WELCOME)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-tsinghua-600 hover:bg-tsinghua-50 transition-all flex items-center gap-1.5"
                title={lang === 'CN' ? '返回主页' : 'Back to Home'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="hidden md:inline">{t.backHome}</span>
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <div className="flex bg-gray-50 rounded-xl p-1 shadow-inner border border-gray-100">
                {[
                  { stage: AppStage.ADMIN_LIBRARY, label: t.navTalentPool },
                  { stage: AppStage.ADMIN_QUESTIONS, label: t.navQuestions },
                  { stage: AppStage.ADMIN_PROMPTS, label: t.navPrompts },
                  { stage: AppStage.ADMIN_QUICK_PREVIEW, label: (t as any).navQuickPreview || '预测试' },
                ].map(item => (
                  <button key={item.stage} onClick={() => handleNavigateAway(item.stage)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${stage === item.stage ? 'bg-white shadow-md text-tsinghua-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* AI Native: Backup Button (admin only) */}
          {isAuthenticated && (
            <button
              onClick={() => setShowBackupManager(true)}
              className="px-3 py-1.5 text-[10px] font-black rounded-lg border bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 uppercase tracking-widest transition-all"
              title={lang === 'CN' ? '版本备份' : 'Version Backup'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
            </button>
          )}
          {/* API Settings Button (admin only) */}
          {isAuthenticated && (
            <button
              onClick={() => setShowApiSettings(true)}
              className={`relative px-3 py-1.5 text-[10px] font-black rounded-lg border uppercase tracking-widest transition-all ${
                apiConfig.apiKey
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse'
              }`}
              title={lang === 'CN' ? 'API 模型设置' : 'API Model Settings'}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {apiConfig.apiKey
                  ? (lang === 'CN' ? '已设置API' : 'API Set')
                  : (lang === 'CN' ? '设置API' : 'Set API')
                }
              </span>
            </button>
          )}
          <button onClick={() => setLang(l => l === 'CN' ? 'EN' : 'CN')} className="px-3 py-1.5 bg-gradient-to-r from-tsinghua-50 to-tsinghua-100 text-tsinghua-700 text-[10px] font-black rounded-lg border border-tsinghua-200 uppercase tracking-widest hover:from-tsinghua-100 hover:to-tsinghua-200 transition-all">
            {lang === 'CN' ? 'EN' : '中'}
          </button>
          {!isAuthenticated && (
            <button onClick={() => handleNavigateAway(AppStage.ADMIN_LOGIN)} className="text-xs font-bold text-gray-400 hover:text-tsinghua-500 transition-colors">
              {t.adminAccess}
            </button>
          )}
        </div>
      </div>

      {/* Suspended Interview Banner — shows on ALL non-interview screens (including admin pages) */}
      {suspendedSession && stage !== AppStage.INTERVIEW_QUESTIONNAIRE && stage !== AppStage.OPEN_ENDED_ANALYSIS && stage !== AppStage.ANALYZING && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 shadow-2xl shadow-amber-900/30">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm tracking-tight">{(t as any).interviewSuspended}</p>
                <p className="text-white/80 text-xs truncate">
                  {((t as any).interviewSuspendedDetail as string)
                    .replace('{name}', suspendedSession.candidateInfo.name)
                    .replace('{answered}', String(suspendedSession.objectiveResponses.length))
                    .replace('{total}', String(suspendedSession.interviewQuestions.length))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAbandonSession}
                className="px-4 py-2 text-xs font-bold text-white/90 border border-white/40 rounded-xl hover:bg-white/10 transition-all"
              >
                {(t as any).abandonInterview}
              </button>
              <button
                onClick={handleResumeSession}
                className="px-5 py-2 text-xs font-black bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition-all shadow-lg"
              >
                {(t as any).resumeInterview}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Recovery Dialog */}
      {pendingRecovery && (
        <div className="fixed inset-0 bg-tsinghua-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">{t.sessionRecoveryTitle}</h3>
              </div>
            </div>
            <div className="px-8 py-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {(t.sessionRecoveryMsg as string)
                  .replace('{name}', pendingRecovery.candidateInfo.name)
                  .replace('{answered}', String(pendingRecovery.objectiveResponses.length))
                  .replace('{total}', String(pendingRecovery.interviewQuestions.length))}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{new Date(pendingRecovery.savedAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 border-t flex gap-4">
              <button
                onClick={handleDiscardSession}
                className="flex-1 py-3 text-gray-400 font-black text-xs uppercase tracking-widest border-2 border-gray-200 rounded-2xl hover:border-red-200 hover:text-red-500 transition-all"
              >
                {t.sessionRecoveryDiscard}
              </button>
              <button
                onClick={handleRecoverSession}
                className="flex-[2] py-3 bg-tsinghua-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-tsinghua-700 transition-all active:scale-95"
              >
                {t.sessionRecoveryContinue}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto pb-20">
        {stage === AppStage.WELCOME && <WelcomeScreen onStart={handleStartForm} lang={lang} />}
        {stage === AppStage.BASIC_FORM && <BasicInfoForm onSubmit={handleFormSubmit} lang={lang} />}
        {stage === AppStage.INTERVIEW_QUESTIONNAIRE && (
          <ChatInterface
            messages={messages}
            currentQuestion={interviewQuestions[currentQIndex]}
            onOptionSelect={handleOptionSelect}
            isProbing={isProbing}
            onProbingSubmit={handleProbingSubmit}
            probingActions={probingActions}
            questionIndex={currentQIndex}
            totalQuestions={adaptiveQuestionState?.totalTarget || interviewQuestions.length}
            onSendMessage={() => {}}
            isLoading={false}
            onFinish={() => transitionToOpenEnded(messages, objectiveResponses)}
            lang={lang}
            objectiveResponses={objectiveResponses}
            interviewQuestions={interviewQuestions}
            adaptiveState={adaptiveQuestionState}
          />
        )}
        {stage === AppStage.OPEN_ENDED_ANALYSIS && selectedOpenEndedQuestion && (
          <OpenEndedAnalysis
            question={selectedOpenEndedQuestion}
            lang={lang}
            onSubmit={handleOpenEndedSubmit}
          />
        )}
        {stage === AppStage.ANALYZING && (
          <div className="flex flex-col items-center justify-center h-[80vh]">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-tsinghua-200 rounded-full animate-spin" style={{ borderTopColor: '#660099' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-gradient-to-br from-tsinghua-400 to-tsinghua-600 rounded-full animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-8">{t.analyzing}</h2>
            <p className="text-gray-400 mt-2 font-medium text-sm">{t.analyzingSub}</p>
            <p className="text-tsinghua-500 mt-4 font-bold text-sm animate-pulse">{lang === 'CN' ? '请耐心等待，您的评估报告即将生成完毕' : 'Please stay — your assessment results are almost ready'}</p>
            <div className="flex gap-1 mt-6">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="w-2 h-2 bg-tsinghua-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        {stage === AppStage.RESULT && assessment && <ResultView record={assessment} lang={lang} onBackHome={() => setStage(AppStage.WELCOME)} candidateInfo={candidateInfo || undefined} onUpdateCandidateInfo={(updatedInfo) => { setCandidateInfo(updatedInfo); }} />}
        {stage === AppStage.ADMIN_LOGIN && <AdminLogin onLogin={(user) => { setAuthUser(user); setStage(AppStage.ADMIN_LIBRARY); }} lang={lang} />}
        {/* Config-frozen banner: warn admin that changes won't affect in-progress interview */}
        {isAuthenticated && sessionConfig && [AppStage.ADMIN_LIBRARY, AppStage.ADMIN_QUESTIONS, AppStage.ADMIN_PROMPTS].includes(stage) && (
          <div className="max-w-7xl mx-auto px-6 pt-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold">
              <span className="text-base">⚠️</span>
              {lang === 'CN'
                ? '当前有面试进行中，此处改动将在下一个面试开始时生效'
                : 'An interview is in progress. Changes here will take effect for the next interview'}
            </div>
          </div>
        )}
        {stage === AppStage.ADMIN_LIBRARY && <AdminLibrary candidates={allCandidates} lang={lang} onUpdate={updateCandidates} decisionThresholds={decisionThresholds} dimensionWeights={dimensionWeights} />}
        {/* ADMIN_CRITERIA removed — weights moved to AdminPrompts */}
        {stage === AppStage.ADMIN_QUESTIONS && <AdminQuestions questions={allQuestions} dimensionWeights={dimensionWeights} onUpdate={handleUpdateQuestions} lang={lang} promptConfig={promptConfig} onUpdatePrompt={handleUpdatePrompt} decisionThresholds={decisionThresholds} apiConfig={apiConfig} probingStrategy={probingStrategy} onUpdateProbingStrategy={handleUpdateProbingStrategy} />}
        {stage === AppStage.ADMIN_PROMPTS && <AdminPrompts promptConfig={promptConfig} onUpdate={handleUpdatePrompt} dimensionWeights={dimensionWeights} onUpdateWeights={handleUpdateWeights} decisionThresholds={decisionThresholds} onUpdateThresholds={handleUpdateThresholds} lang={lang} decisionTree={decisionTree} onUpdateDecisionTree={handleUpdateDecisionTree} probingStrategy={probingStrategy} workflowModules={workflowModules} onUpdateWorkflowModules={handleUpdateWorkflowModules} apiConfig={apiConfig} questionCountConfig={questionCountConfig} onUpdateQuestionCountConfig={handleUpdateQuestionCountConfig} />}
        {stage === AppStage.ADMIN_QUICK_PREVIEW && <AdminQuickPreview lang={lang} questions={allQuestions} openEndedQuestions={openEndedQuestions} dimensionWeights={dimensionWeights} decisionThresholds={decisionThresholds} promptConfig={promptConfig} apiConfig={apiConfig} onCandidateCreated={handleQuickPreviewCandidateCreated} />}
      </div>

      {/* API Settings Modal */}
      {showApiSettings && (
        <ApiSettings
          apiConfig={apiConfig}
          onUpdate={handleUpdateApiConfig}
          lang={lang}
          onClose={() => setShowApiSettings(false)}
        />
      )}

      {/* AI Native: Backup Manager */}
      <BackupManager lang={lang} isOpen={showBackupManager} onClose={() => setShowBackupManager(false)} />

      {/* Help Widget — user-facing pages (read-only) */}
      {(!isAuthenticated || [AppStage.WELCOME, AppStage.BASIC_FORM, AppStage.INTERVIEW_QUESTIONNAIRE, AppStage.OPEN_ENDED_ANALYSIS, AppStage.ANALYZING, AppStage.RESULT].includes(stage)) && (
        <HelpWidget config={helpConfig} lang={lang} />
      )}
      {/* Help Widget — admin pages (editable) */}
      {isAuthenticated && (stage === AppStage.ADMIN_LIBRARY || stage === AppStage.ADMIN_QUESTIONS || stage === AppStage.ADMIN_CRITERIA || stage === AppStage.ADMIN_PROMPTS || stage === AppStage.ADMIN_QUICK_PREVIEW) && (
        <HelpWidget config={helpConfig} lang={lang} isAdmin onSave={(cfg) => {
          setHelpConfig(cfg);
          localStorage.setItem('tsinghua_help_config', JSON.stringify(cfg));
          if (isSupabaseConfigured() && supabase) {
            supabase.from('help_config').upsert({ id: 'default', contact_email: cfg.contactEmail, business_hours: cfg.businessHours, extra_note: cfg.extraNote }).then(({ error }) => {
              if (error) console.warn('[Supabase] Help config sync failed:', error.message);
            });
          }
        }} />
      )}
    </div>
  );
};

export default App;
