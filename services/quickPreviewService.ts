/**
 * Pre-test Service — mock data generation for admin pipeline testing
 */
import { CandidateBasicInfo, QuestionTemplate, ObjectiveResponse, OpenEndedQuestion, OpenEndedResponse, Message } from '../types';

// ==================== Test candidate identification ====================

export const isTestCandidate = (id: string): boolean => id.startsWith('test_');

// ==================== Random helpers ====================

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

// ==================== Data pools ====================

const NAMES = [
  '王思远', '李明轩', '张晨曦', '刘佳宁', '陈思远',
  '赵天宇', '孙文博', '周宇航', '吴嘉欣', '郑子涵',
  '黄思琪', '林梓萌', '马浩然', '高思齐', '杨雪莹',
];

const SCHOOLS: { school: string; department: string; major: string }[] = [
  { school: '清华大学', department: '经管学院', major: '工商管理' },
  { school: '清华大学', department: '工学院', major: '工程管理' },
  { school: '清华大学', department: '公管学院', major: '公共管理' },
  { school: '北京大学', department: '光华管理学院', major: 'MBA' },
  { school: '北京大学', department: '国家发展研究院', major: '经济学' },
  { school: '中国人民大学', department: '商学院', major: '企业管理' },
  { school: '上海交通大学', department: '安泰经管学院', major: '金融学' },
  { school: '浙江大学', department: '管理学院', major: '战略管理' },
];

const IDENTITIES: CandidateBasicInfo['identity'][] = [
  'Master', 'Master', 'MBA', 'MBA', 'Undergraduate', 'PhD',
];

const SELF_DESCRIPTIONS = [
  '好奇、坚韧、系统思考',
  '踏实、分析、协作',
  '创新、执行力、同理心',
  '逻辑、洞察、抗压',
  '务实、批判思维、团队合作',
  '探索、深度思考、快速学习',
  '战略视野、数据驱动、沟通',
  '跨界思维、韧性、结构化',
];

const PROJECTS = [
  '本科期间参与导师的新零售研究课题，独立完成盒马鲜生与永辉超市的对比案例分析报告。',
  '曾在某咨询公司实习，参与了3个行业的市场调研项目，负责数据分析和报告撰写。',
  '大学创业社团核心成员，主导校园二手交易平台项目，用户规模达2000+。',
  '参加"挑战杯"创业大赛获省级银奖，项目方向为AI驱动的教育个性化推荐。',
  '在某互联网公司产品岗实习6个月，参与了用户增长策略的A/B测试。',
  '研究生阶段参与供应链优化课题，发表过1篇中文核心期刊论文。',
  '暂无相关项目经历，但对商业模式创新有浓厚兴趣，阅读了大量相关书籍。',
  '某快消品牌校园代理，负责区域推广和团队管理，营收排名全国前10%。',
];

const GRADES = ['freshman', 'sophomore', 'junior', 'senior', 'master1', 'master2', 'mba1', 'phd1', 'phd2'];
const REFERRAL_SOURCES = ['wechatPost', 'friendRefer', 'teacherRefer', 'schoolForum', 'socialMedia', 'searchEngine', 'other'];
const CAREER_PLANS = [
  '希望进入咨询行业，成为战略咨询顾问',
  '计划创业，专注消费品行业的数字化转型',
  '目标投资领域，未来做风险投资',
  '希望在科技公司做产品经理',
  '计划继续深造，攻读博士学位',
  '目标进入金融行业，从事投行业务',
];

const PROBING_COST_TEMPLATES = [
  '为了深度学习，我愿意放弃短期实习机会，投入更多时间在课程项目上。',
  '如果时间冲突，我会优先保证课程质量，减少其他社团活动的参与。',
  '我愿意在周末额外投入时间来完成高质量的作业和小组讨论。',
];

const PROBING_ASSUMPTION_TEMPLATES = [
  '我假设课程内容与实际商业场景紧密结合，能直接提升实践能力。',
  '前提是团队成员都能保持相似的投入度和合作意愿。',
  '我认为课程的核心价值在于思维方式的训练而非具体知识的积累。',
];

const PROBING_EVIDENCE_TEMPLATES = [
  '大三时主动放弃保研名额转向创业，最终虽然失败但获得了宝贵经验。',
  '上学期选修了一门高强度的案例分析课，最终获得A+的成绩。',
  '在实习中曾独立完成一个从0到1的项目，得到了主管的高度认可。',
];

// ==================== Mock Open-Ended Answers by Category ====================

const MOCK_OE_ANSWERS: Record<string, string[]> = {
  geopolitics: [
    '从地缘政治的角度看，这一现象反映了全球经济格局正在发生深层次的结构性变化。表面上是单一事件，但背后牵涉供应链重构、技术主权争夺和区域经济联盟的重新洗牌。我认为需要关注三个维度：一是短期市场波动与长期战略布局的矛盾，二是不同利益相关方的博弈策略，三是对中国企业出海的启示。',
  ],
  technology: [
    '这个技术趋势的核心在于它正在改变价值创造的底层逻辑。从产业链角度分析，上游基础设施的变革会传导到中游的商业模式创新，最终影响下游的用户体验。我认为关键问题有两个：一是技术成熟度与商业化之间的时间差如何把握，二是在技术红利期如何建立可持续的竞争壁垒而非仅仅追逐热点。',
  ],
  economics: [
    '这一经济现象需要从宏观和微观两个层面来理解。宏观层面，它反映了全球经济增长动力的转换和产业结构的深度调整；微观层面，对企业的战略选择和资源配置提出了新要求。我的分析框架是：先看结构性驱动力，再看周期性因素，最后评估政策环境的影响。核心矛盾在于短期效率与长期韧性之间的平衡。',
  ],
  ai_application: [
    'AI应用落地的关键不在于技术本身，而在于是否真正解决了用户的核心痛点。从商业模式角度看，成功的AI应用往往满足三个条件：数据飞轮效应明显、边际成本递减、用户切换成本高。当前的挑战在于很多团队过度关注技术指标而忽略了产品市场匹配度。我建议从最小可行场景切入，快速验证商业假设。',
  ],
  business: [
    '商业竞争的本质正在从产品层面转向生态系统层面。这个案例展示了一个有趣的趋势：平台型企业通过构建多边网络效应来创造护城河。但这种模式的风险在于生态参与者之间的利益分配问题。我认为可持续的商业模式应该兼顾效率和公平，否则长期来看会面临监管压力和参与者流失的双重挑战。',
  ],
  data: [
    '数据驱动决策的前提是数据质量和分析框架的可靠性。这个话题涉及一个关键的矛盾：数据量越大，噪声也越多，如何在信息过载中找到真正的信号是核心挑战。我的思考是分三步：首先明确决策目标，然后设计最小充分的数据指标体系，最后建立快速迭代的实验文化。避免陷入"有数据但不知道该看什么"的陷阱。',
  ],
  consumer: [
    '消费者行为的变化本质上是社会文化和技术进步共同作用的结果。这个现象背后有两个深层驱动力：一是Z世代价值观对消费决策的重塑，二是数字基础设施降低了信息不对称。对品牌而言，核心挑战是在追求增长的同时保持品牌的差异化定位。我认为"内容即渠道"的趋势将进一步加速，纯流量打法的可持续性存疑。',
  ],
};

const GENERIC_OE_ANSWER = '这是一个值得深入分析的问题。从多个维度来看，首先需要理解其背后的结构性驱动力——这不仅仅是一个孤立事件，而是反映了更深层次的趋势变化。从经济角度，资源配置效率和市场结构的演变是关键；从技术角度，创新的非线性扩散正在重塑竞争格局；从社会角度，利益相关方的多元诉求需要被系统性地纳入分析框架。我认为核心矛盾在于短期利益与长期价值的平衡。';

// ==================== Generators ====================

export function generateMockCandidateInfo(): CandidateBasicInfo {
  const name = pick(NAMES);
  const schoolInfo = pick(SCHOOLS);
  const identity = pick(IDENTITIES);
  const grade = pick(GRADES);
  const pinyin = name.length > 0 ? `user_${Math.random().toString(36).substr(2, 6)}` : 'test_wx';

  return {
    name,
    gender: Math.random() > 0.5 ? 'male' : 'female' as const,
    wechat: pinyin,
    identity,
    school: schoolInfo.school,
    department: schoolInfo.department,
    major: schoolInfo.major,
    gradeOrLevel: grade,
    timeCommitmentWeeks1to8: randInt(8, 15),
    timeCommitmentWeeks9to16: randInt(6, 12),
    offlineInterview: Math.random() > 0.2,
    phone: `138${String(randInt(10000000, 99999999))}`,
    email: `${pinyin}@mails.tsinghua.edu.cn`,
    projects: pick(PROJECTS),
    homeworkWillingness: Math.random() > 0.1,
    leaderWillingness: Math.random() > 0.5,
    selfDescription: pick(SELF_DESCRIPTIONS),
    hasReadRecruitPost: Math.random() > 0.3 ? 'yes' : 'familiar_no_need',
    careerPlan: pick(CAREER_PLANS),
    referralSource: pick(REFERRAL_SOURCES),
  };
}

export function generateMockObjectiveResponses(
  questions: QuestionTemplate[],
  count: number = 10,
): ObjectiveResponse[] {
  // Ensure at least 1 question per dimension
  const dims = [...new Set(questions.filter(q => q.options && q.options.length > 0).map(q => q.dimension))];
  const pool = questions.filter(q => q.type === 'objective' && q.options && q.options.length > 0);
  if (pool.length === 0) return [];

  const selected: QuestionTemplate[] = [];
  const usedIds = new Set<string>();

  // Pick at least 1 per dimension
  for (const dim of dims) {
    const dimQs = pool.filter(q => q.dimension === dim && !usedIds.has(q.id));
    if (dimQs.length > 0) {
      const q = pick(dimQs);
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  // Fill remaining slots randomly
  const remaining = pool.filter(q => !usedIds.has(q.id));
  const needed = Math.min(count, pool.length) - selected.length;
  for (let i = 0; i < needed && remaining.length > 0; i++) {
    const idx = randInt(0, remaining.length - 1);
    selected.push(remaining[idx]);
    usedIds.add(remaining[idx].id);
    remaining.splice(idx, 1);
  }

  // Generate responses with weighted option distribution (favor B/C)
  return selected.map(q => {
    const opts = q.options!;
    // Weighted distribution: favor middle options
    const weights = opts.length === 5
      ? [0.10, 0.30, 0.30, 0.20, 0.10]
      : opts.map(() => 1 / opts.length);
    const r = Math.random();
    let cumulative = 0;
    let chosenIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) { chosenIdx = i; break; }
    }
    const opt = opts[chosenIdx];

    const response: ObjectiveResponse = {
      q_id: q.id,
      score: opt.score,
      dimension: q.dimension,
      selectedText: opt.text,
      label: opt.label,
    };

    // ~30% chance of probing answers
    if (Math.random() < 0.3) {
      response.probingAnswers = {
        cost: pick(PROBING_COST_TEMPLATES),
        assumption: pick(PROBING_ASSUMPTION_TEMPLATES),
        evidence: pick(PROBING_EVIDENCE_TEMPLATES),
      };
    }

    return response;
  });
}

export function generateMockOpenEndedResponse(
  questions: OpenEndedQuestion[],
): OpenEndedResponse {
  const q = pick(questions);
  const categoryAnswers = MOCK_OE_ANSWERS[q.category] || [];
  const answer = categoryAnswers.length > 0 ? pick(categoryAnswers) : GENERIC_OE_ANSWER;

  return {
    questionId: q.id,
    question: q,
    answer,
    timestamp: Date.now(),
  };
}

export function generateMockMessages(
  info: CandidateBasicInfo,
  responses: ObjectiveResponse[],
): Message[] {
  const now = Date.now();
  const messages: Message[] = [
    {
      role: 'system',
      content: `候选人: ${info.name}, 身份: ${info.identity}, 学校: ${info.school} ${info.department}, 专业: ${info.major}, 自我描述: ${info.selfDescription}`,
      timestamp: now - 60000,
    },
  ];

  responses.forEach((r, i) => {
    messages.push({
      role: 'model',
      content: `[Q${i + 1}] 维度:${r.dimension} — 请选择最符合您情况的选项`,
      timestamp: now - 50000 + i * 1000,
    });
    messages.push({
      role: 'user',
      content: `选择了 ${r.label}: ${r.selectedText}${r.probingAnswers ? ` (追问回答: 代价=${r.probingAnswers.cost}, 假设=${r.probingAnswers.assumption}, 证据=${r.probingAnswers.evidence})` : ''}`,
      timestamp: now - 49500 + i * 1000,
    });
  });

  return messages;
}
