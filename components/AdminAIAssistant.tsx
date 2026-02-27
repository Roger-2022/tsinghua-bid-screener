
import React, { useState } from 'react';
import { Language, CandidateRecord } from '../types';
import { translations } from '../i18n';

interface Props {
  lang: Language;
  candidates: CandidateRecord[];
}

interface QueryResult {
  query: string;
  answer: string;
  matchedCandidates?: CandidateRecord[];
}

const parseLocalQuery = (query: string, candidates: CandidateRecord[], isCN: boolean): QueryResult => {
  const q = query.toLowerCase().trim();

  // Score-based queries: "逻辑 > 8", "logic > 8", "motivation >= 7"
  const scorePattern = /(motivation|logic|resilience|innovation|commitment|动机|逻辑|韧性|创新|投入)\s*(>|>=|<|<=|=)\s*(\d+)/i;
  const scoreMatch = q.match(scorePattern);
  if (scoreMatch) {
    const dimMap: Record<string, string> = {
      motivation: 'motivation', '动机': 'motivation',
      logic: 'logic', '逻辑': 'logic',
      resilience: 'reflection_resilience', '韧性': 'reflection_resilience',
      innovation: 'innovation', '创新': 'innovation',
      commitment: 'commitment', '投入': 'commitment',
    };
    const dim = dimMap[scoreMatch[1].toLowerCase()] || scoreMatch[1].toLowerCase();
    const op = scoreMatch[2];
    const val = parseInt(scoreMatch[3]);

    const filtered = candidates.filter(c => {
      const score = (c.scores as any)[dim] || 0;
      switch (op) {
        case '>': return score > val;
        case '>=': return score >= val;
        case '<': return score < val;
        case '<=': return score <= val;
        case '=': return score === val;
        default: return false;
      }
    });

    return {
      query,
      answer: isCN
        ? `找到 ${filtered.length} 位候选人满足条件：`
        : `Found ${filtered.length} candidate(s) matching criteria:`,
      matchedCandidates: filtered,
    };
  }

  // Status queries: "通过", "rejected", "pass"
  const statusMap: Record<string, string> = { '通过': 'pass', 'pass': 'pass', '待定': 'hold', 'hold': 'hold', '拒绝': 'reject', 'reject': 'reject', 'rejected': 'reject' };
  for (const [keyword, status] of Object.entries(statusMap)) {
    if (q.includes(keyword)) {
      const filtered = candidates.filter(c => c.status === status);
      return {
        query,
        answer: isCN
          ? `共 ${filtered.length} 位候选人状态为「${keyword}」：`
          : `${filtered.length} candidate(s) with status "${status}":`,
        matchedCandidates: filtered,
      };
    }
  }

  // Name search
  const nameFiltered = candidates.filter(c =>
    c.display_name.toLowerCase().includes(q) || c.profile.name.toLowerCase().includes(q)
  );
  if (nameFiltered.length > 0) {
    return {
      query,
      answer: isCN ? `找到 ${nameFiltered.length} 位匹配候选人：` : `Found ${nameFiltered.length} matching candidate(s):`,
      matchedCandidates: nameFiltered,
    };
  }

  // Count / stats
  if (q.includes('总') || q.includes('count') || q.includes('how many') || q.includes('多少')) {
    const passCount = candidates.filter(c => c.status === 'pass').length;
    const holdCount = candidates.filter(c => c.status === 'hold').length;
    const rejectCount = candidates.filter(c => c.status === 'reject').length;
    return {
      query,
      answer: isCN
        ? `共 ${candidates.length} 位候选人：通过 ${passCount}，待定 ${holdCount}，拒绝 ${rejectCount}`
        : `Total ${candidates.length} candidates: Pass ${passCount}, Hold ${holdCount}, Reject ${rejectCount}`,
    };
  }

  return {
    query,
    answer: isCN
      ? '未能理解查询。支持：分数查询（如"逻辑>8"）、状态筛选（如"通过"）、姓名搜索、统计（如"总数"）'
      : 'Could not parse query. Try: score queries ("logic > 8"), status ("pass"), name search, or stats ("count")',
  };
};

const AdminAIAssistant: React.FC<Props> = ({ lang, candidates }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);

  const handleQuery = () => {
    if (!query.trim()) return;
    const result = parseLocalQuery(query, candidates, isCN);
    setResults(prev => [result, ...prev].slice(0, 10));
    setQuery('');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-tsinghua-500 to-tsinghua-700 text-white rounded-full shadow-lg shadow-tsinghua-300/50 flex items-center justify-center hover:scale-110 transition-transform"
        title={(t as any).ai_assistant_title}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-tsinghua-500 to-tsinghua-600 text-white flex justify-between items-center">
            <span className="font-bold text-sm">{(t as any).ai_assistant_title}</span>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">&times;</button>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
            {results.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                {isCN ? '输入查询开始分析' : 'Enter a query to start'}
              </p>
            )}
            {results.map((r, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-tsinghua-500 font-semibold">{r.query}</p>
                <p className="text-xs text-gray-700">{r.answer}</p>
                {r.matchedCandidates && r.matchedCandidates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.matchedCandidates.slice(0, 8).map(c => (
                      <span key={c.candidate_id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                        {c.display_name} ({c.scores.overall || '-'})
                      </span>
                    ))}
                    {r.matchedCandidates.length > 8 && (
                      <span className="text-[10px] text-gray-400">+{r.matchedCandidates.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder={(t as any).ai_assistant_placeholder}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-tsinghua-200"
            />
            <button onClick={handleQuery} className="px-3 py-2 bg-tsinghua-500 text-white text-xs font-bold rounded-lg hover:bg-tsinghua-600">
              &rarr;
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminAIAssistant;
