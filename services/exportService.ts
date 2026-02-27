
import { CandidateRecord, EXPORT_COLUMNS } from '../types';
import { isExampleCandidate } from '../data/exampleCandidates';

/**
 * Escape and quote a cell value for CSV.
 * Handles nulls, undefined, embedded quotes, commas, and newlines.
 */
const csvCell = (val: any): string => {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  // Always wrap in quotes; double any existing quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Build the full field mapping for a CandidateRecord.
 */
const buildMapping = (c: CandidateRecord): Record<string, any> => {
  const p = c.profile;
  const s = c.scores;
  const ev = c.evidence;
  const dc = c.decision_card;
  const ar = c.admin_record;

  const isExample = isExampleCandidate(c.candidate_id);
  return {
    candidate_id: isExample ? `${c.candidate_id} [示例]` : c.candidate_id,
    name: isExample ? `${p.name} [示例]` : p.name,
    wechat_id: p.wechat_id,
    phone: p.phone,
    email: p.email,
    identity: p.identity,
    school_org: p.school_org,
    major_title: p.major_title,
    grade_level: p.grade_level,
    year_exp: p.entry_year_or_work_years,
    weekly_h1: p.weekly_commit_h1,
    weekly_h2: p.weekly_commit_h2,
    offline_interview: p.offline_interview ? '是' : '否',
    homework: p.homework_willingness ? '是' : '否',
    leader: p.leader_willingness ? '是' : '否',
    self_description: p.self_description,
    past_projects: p.past_projects,
    s_motivation: s.motivation,
    s_logic: s.logic,
    s_resilience: s.reflection_resilience,
    s_innovation: s.innovation,
    s_commitment: s.commitment,
    s_overall: s.overall,
    status: c.status_badge_text_zh,
    keywords: ar.search_keywords.join(', '),
    summary_zh: dc.zh.summary,
    summary_en: dc.en.summary,
    top_reasons: dc.zh.top_reasons.join('; '),
    risk_flags: ev.risk_flags.join('; '),
    evidence_points: ev.core_evidence_points.join('; '),
    interview_focus: dc.zh.suggested_interview_focus.join('; '),
    admin_notes: ev.admin_notes,
    s_thinking_depth: s.thinking_depth || 0,
    s_multidim_thinking: s.multidimensional_thinking || 0,
    open_ended_question: c.openEndedResponse ? (c.openEndedResponse.question.topic_zh + ': ' + c.openEndedResponse.question.question_zh) : '无',
    open_ended_answer: c.openEndedResponse?.answer || '无',
    qa_transcript: ev.qa_transcript,
    timestamp: c.timestamp ? new Date(c.timestamp).toLocaleString('zh-CN') : '',
  };
};

/**
 * Resolve which columns to export.
 * If columnKeys is provided, filter and reorder EXPORT_COLUMNS accordingly.
 */
const resolveColumns = (columnKeys?: string[]) => {
  if (!columnKeys || columnKeys.length === 0) return [...EXPORT_COLUMNS];
  return columnKeys
    .map(k => EXPORT_COLUMNS.find(c => c.key === k))
    .filter((c): c is (typeof EXPORT_COLUMNS)[number] => !!c);
};

/**
 * Trigger a CSV file download in the browser.
 */
const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export a list of CandidateRecords to a downloadable CSV file.
 * @param candidates — records to export
 * @param columnKeys — optional ordered list of column keys to include.
 *                     If omitted, exports all 34 columns in default order.
 */
export const exportToCSV = (candidates: CandidateRecord[], columnKeys?: string[]): void => {
  const cols = resolveColumns(columnKeys);
  const headers = cols.map(col => csvCell(col.zh));
  const rows = candidates.map(c => {
    const mapping = buildMapping(c);
    return cols.map(col => csvCell(mapping[col.key]));
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csvContent, `BMW_Admin_Archive_${new Date().toLocaleDateString('zh-CN')}.csv`);
};

/**
 * Download a blank CSV template with headers + one sample row.
 */
export const downloadCSVTemplate = (): void => {
  const headers = EXPORT_COLUMNS.map(col => csvCell(col.zh));

  const sampleValues: Record<string, string> = {
    candidate_id: 'ID001',
    name: '张三',
    wechat_id: 'zhangsan_wx',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    identity: '在校生',
    school_org: '清华大学',
    major_title: '工商管理',
    grade_level: '研二',
    year_exp: '2024',
    weekly_h1: '15',
    weekly_h2: '20',
    offline_interview: '是',
    homework: '是',
    leader: '否',
    self_description: '好奇心、执行力、韧性',
    past_projects: '校园创业项目',
    s_motivation: '8',
    s_logic: '7',
    s_resilience: '6',
    s_innovation: '7',
    s_commitment: '8',
    s_overall: '7',
    s_thinking_depth: '6',
    s_multidim_thinking: '7',
    status: '通过',
    keywords: '高潜力, 执行力强',
    summary_zh: '该候选人展现出较强的内在驱动力...',
    summary_en: 'The candidate demonstrates strong intrinsic motivation...',
    top_reasons: '动机真实; 逻辑清晰; 投入度高',
    risk_flags: '',
    evidence_points: '[动机] 主动放弃高薪机会; [逻辑] 清晰的因果链',
    interview_focus: '创新思维的深度验证; 团队冲突处理经验',
    admin_notes: '',
    open_ended_question: '中美关税战与供应链重构: 如果你是一家跨国企业的决策者...',
    open_ended_answer: '从多个角度来看...',
    qa_transcript: '',
    timestamp: '2024/12/1 14:30:00',
  };

  const sampleRow = EXPORT_COLUMNS.map(col => csvCell(sampleValues[col.key] || ''));
  const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
  downloadCSV(csvContent, `BMW_Import_Template.csv`);
};
