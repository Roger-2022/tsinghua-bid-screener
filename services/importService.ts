
import { CandidateRecord, ImportSummary } from '../types';

const cleanValue = (val: string): string => val?.trim() || '';

const normalizeScore = (val: any): number => {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  if (num <= 5 && num > 0) return num * 2;
  return Math.min(Math.max(num, 0), 10);
};

/**
 * Robust CSV parser that handles quoted fields containing newlines, commas, and escaped quotes.
 */
const parseCSVRobust = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell);
        if (currentRow.length > 1 || currentRow[0] !== '') {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentRow.length > 0 || currentCell !== '') {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

/**
 * Process imported raw text (CSV or JSON) into CandidateRecord[].
 */
export const processImportData = (
  rawText: string,
  fileType: 'csv' | 'json'
): { summary: ImportSummary; records: CandidateRecord[]; errors: string[] } => {
  let records: (CandidateRecord | null)[] = [];
  let errors: string[] = [];
  let summary: ImportSummary = {
    total_rows: 0,
    imported_rows: 0,
    failed_rows: 0,
    common_issues: [],
  };

  try {
    if (fileType === 'json') {
      const parsed = JSON.parse(rawText);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      summary.total_rows = rows.length;
      records = rows.map((row, index) => mapRowToRecord(row, index, errors));
    } else {
      const rows = parseCSVRobust(rawText);
      if (rows.length < 2) throw new Error('CSV文件格式错误或数据为空');

      summary.total_rows = rows.length - 1;
      const dataRows = rows.slice(1); // skip header

      records = dataRows.map((parts, index) => {
        // Detect format: new format has 38 columns, old format has 34
        const isNewFormat = parts.length >= 38;

        let rowObj: any;
        if (isNewFormat) {
          // New 38-column format (matching EXPORT_COLUMNS order)
          rowObj = {
            id: parts[0],           // 编号
            name: parts[1],         // 姓名
            wechat_id: parts[2],    // 微信号
            phone: parts[3],        // 电话
            email: parts[4],        // 邮箱
            identity: parts[5],     // 身份类型
            school: parts[6],       // 学校
            department: parts[7],   // 院系
            major_title: parts[8],  // 专业/职位
            grade_level: parts[9],  // 年级
            weekly_h1: parts[10],   // 前8周每周投入(h)
            weekly_h2: parts[11],   // 后8周每周投入(h)
            offline: parts[12],     // 能否线下面试
            homework: parts[13],    // 全程参与意愿
            leader: parts[14],      // 组长意愿
            self_description: parts[15], // 三词自述
            past_projects: parts[16],    // 过往项目经历
            has_read_recruit_post: parts[17], // 是否阅读招生推送
            career_plan: parts[18],     // 职业规划
            referral_source: parts[19], // 从何得知
            s_motiv: parts[20],     // 真实动机(0-10)
            s_logic: parts[21],     // 逻辑闭环(0-10)
            s_resil: parts[22],     // 反思与韧性(0-10)
            s_innov: parts[23],     // 创新潜质(0-10)
            s_commit: parts[24],    // 投入度(0-10)
            s_thinking_depth: parts[25],   // 思维深度(0-10)
            s_multidim_thinking: parts[26], // 多维思考(0-10)
            s_overall: parts[27],   // 综合得分
            status: parts[28],      // 筛选结果
            keywords_raw: parts[29],// 画像标签
            summary_zh: parts[30],  // 综合评价(中)
            summary_en: parts[31],  // 综合评价(英)
            top_reasons: parts[32], // 核心理由
            risks: parts[33],       // 风险提示
            evidence_points: parts[34], // 核心证据
            interview_focus: parts[35], // 建议面试重点
            admin_notes: parts[36], // 管理员备注
            transcript: parts[37],  // 问答实录
            open_ended_question: parts[38], // 开放题目
            open_ended_answer: parts[39],   // 开放题回答
            timestamp: parts[40],   // 提交时间
          };
        } else {
          // Old 34-column format (backward compatible)
          rowObj = {
            id: parts[0],           // 编号
            name: parts[1],         // 姓名
            wechat_id: parts[2],    // 微信号
            phone: parts[3],        // 电话
            email: parts[4],        // 邮箱
            identity: parts[5],     // 身份类型
            school_org: parts[6],   // 学校/单位
            major_title: parts[7],  // 专业/职位
            grade_level: parts[8],  // 年级/职级
            year_exp: parts[9],     // 入学年份/工作年限
            weekly_h1: parts[10],   // 前8周每周投入(h)
            weekly_h2: parts[11],   // 后8周每周投入(h)
            offline: parts[12],     // 能否线下面试
            homework: parts[13],    // 全程参与意愿
            leader: parts[14],      // 组长意愿
            self_description: parts[15], // 三词自述
            past_projects: parts[16],    // 过往项目经历
            s_motiv: parts[17],     // 真实动机(0-10)
            s_logic: parts[18],     // 逻辑闭环(0-10)
            s_resil: parts[19],     // 反思与韧性(0-10)
            s_innov: parts[20],     // 创新潜质(0-10)
            s_commit: parts[21],    // 投入度(0-10)
            s_overall: parts[22],   // 综合得分
            status: parts[23],      // 筛选结果
            keywords_raw: parts[24],// 画像标签
            summary_zh: parts[25],  // 综合评价(中)
            summary_en: parts[26],  // 综合评价(英)
            top_reasons: parts[27], // 核心理由
            risks: parts[28],       // 风险提示
            evidence_points: parts[29], // 核心证据
            interview_focus: parts[30], // 建议面试重点
            admin_notes: parts[31], // 管理员备注
            transcript: parts[32],  // 问答实录
            timestamp: parts[33],   // 提交时间
          };
        }
        return mapRowToRecord(rowObj, index + 1, errors);
      });
    }
  } catch (e: any) {
    errors.push(`系统解析失败: ${e.message}`);
  }

  const validRecords = records.filter((r): r is CandidateRecord => r !== null);
  summary.imported_rows = validRecords.length;
  summary.failed_rows = summary.total_rows - summary.imported_rows;

  return { summary, records: validRecords, errors };
};

const parseBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  const s = String(val || '').trim().toLowerCase();
  return s === '是' || s === 'true' || s === 'yes' || s === '1';
};

const splitSemicolon = (val: any): string[] => {
  if (!val) return [];
  return String(val)
    .split(/[;；]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

const mapRowToRecord = (row: any, index: number, errors: string[]): CandidateRecord | null => {
  try {
    const name = cleanValue(row.name) || `候选人-${index}`;

    // Determine status
    const statusRaw = String(row.status || 'hold').toLowerCase();
    let status: 'pass' | 'hold' | 'reject' = 'hold';
    if (statusRaw.includes('通') || statusRaw === 'pass') status = 'pass';
    else if (
      statusRaw.includes('落') ||
      statusRaw.includes('不') ||
      statusRaw.includes('拒') ||
      statusRaw === 'reject'
    )
      status = 'reject';

    const keywords = cleanValue(row.keywords_raw)
      .split(/[，,、\s]+/)
      .filter((k: string) => k.length > 0);

    const record: CandidateRecord = {
      candidate_id: row.id || Math.random().toString(36).substr(2, 9),
      display_name: name,
      status,
      status_badge_text_zh: status === 'pass' ? '通过' : status === 'hold' ? '待定' : '拒绝',
      profile: {
        name,
        identity: (row.identity || '其他') as any,
        school: row.school || row.school_org || '',
        department: row.department || '',
        major_title: row.major_title || '',
        grade_level: row.grade_level || '',
        weekly_commit_h1: parseInt(row.weekly_h1 || row.weekly_hours) || 0,
        weekly_commit_h2: parseInt(row.weekly_h2) || 0,
        offline_interview: parseBool(row.offline),
        wechat_id: row.wechat_id || null,
        phone: row.phone || null,
        email: row.email || null,
        past_projects: row.past_projects || row.projects || '',
        homework_willingness: parseBool(row.homework),
        leader_willingness: parseBool(row.leader),
        self_description: row.self_description || '',
        has_read_recruit_post: row.has_read_recruit_post || 'familiar_no_need',
        career_plan: row.career_plan || '',
        referral_source: row.referral_source || '',
      },
      scores: {
        motivation: normalizeScore(row.s_motiv),
        logic: normalizeScore(row.s_logic),
        reflection_resilience: normalizeScore(row.s_resil),
        innovation: normalizeScore(row.s_innov),
        commitment: normalizeScore(row.s_commit),
        thinking_depth: row.s_thinking_depth ? normalizeScore(row.s_thinking_depth) : undefined,
        multidimensional_thinking: row.s_multidim_thinking ? normalizeScore(row.s_multidim_thinking) : undefined,
        overall: 0,
      },
      evidence: {
        core_evidence_points: splitSemicolon(row.evidence_points),
        risk_flags: splitSemicolon(row.risks),
        admin_notes: row.admin_notes || '',
        qa_transcript: row.transcript || '',
      },
      decision_card: {
        zh: {
          summary: row.summary_zh || '',
          top_reasons: splitSemicolon(row.top_reasons),
          suggested_interview_focus: splitSemicolon(row.interview_focus),
        },
        en: {
          summary: row.summary_en || '',
          top_reasons: [],
          suggested_interview_focus: [],
        },
      },
      admin_record: {
        visibility: 'admin_only',
        raw_payload: row,
        search_keywords: keywords.length > 0 ? keywords : ['新入库'],
      },
      messages: [],
      timestamp: row.timestamp ? new Date(row.timestamp).getTime() || Date.now() : Date.now(),
    };

    // Calculate overall score (include open-ended dims when available)
    const s = record.scores;
    const coreDims = [s.motivation, s.logic, s.reflection_resilience, s.innovation, s.commitment];
    const oeDims = [s.thinking_depth, s.multidimensional_thinking].filter((v): v is number => (v || 0) > 0);
    const allDims = [...coreDims, ...oeDims];
    record.scores.overall = Math.round((allDims.reduce((a, b) => a + b, 0) / allDims.length) * 10) / 10;

    // Import open-ended data if present and not "无"
    const oeQuestion = cleanValue(row.open_ended_question);
    const oeAnswer = cleanValue(row.open_ended_answer);
    if (oeQuestion && oeQuestion !== '无' && oeAnswer && oeAnswer !== '无') {
      record.openEndedResponse = {
        questionId: 'imported',
        question: {
          id: 'imported',
          topic_zh: oeQuestion.split(':')[0] || oeQuestion,
          topic_en: oeQuestion.split(':')[0] || oeQuestion,
          context_zh: '',
          context_en: '',
          question_zh: oeQuestion.includes(':') ? oeQuestion.split(':').slice(1).join(':').trim() : oeQuestion,
          question_en: oeQuestion.includes(':') ? oeQuestion.split(':').slice(1).join(':').trim() : oeQuestion,
          category: 'imported' as any,
        },
        answer: oeAnswer,
        timestamp: record.timestamp,
      };
    }

    return record;
  } catch (e: any) {
    errors.push(`行 ${index} 解析异常: ${e.message}`);
    return null;
  }
};
