import React, { useState, useMemo } from 'react';
import { QuestionTemplate } from '../types';
import { EXAMPLE_QUESTIONS } from '../data/exampleQuestions';
import { ORIGINAL_MOTIVATION_QUESTIONS } from '../data/originalMotivationQuestions';
import { ORIGINAL_COMMITMENT_QUESTIONS } from '../data/originalCommitmentQuestions';
import { ORIGINAL_LOGIC_QUESTIONS } from '../data/originalLogicQuestions';
import { ORIGINAL_RESILIENCE_QUESTIONS } from '../data/originalResilienceQuestions';
import { ORIGINAL_INNOVATION_QUESTIONS } from '../data/originalInnovationQuestions';

interface Props {
  questions: QuestionTemplate[];
}

const DIMENSION_ORDER = ['真实动机', '逻辑闭环', '反思与韧性', '创新潜质', '投入度'];

const DIFF_DIMENSIONS: Record<string, QuestionTemplate[]> = {
  '真实动机': ORIGINAL_MOTIVATION_QUESTIONS,
  '逻辑闭环': ORIGINAL_LOGIC_QUESTIONS,
  '反思与韧性': ORIGINAL_RESILIENCE_QUESTIONS,
  '创新潜质': ORIGINAL_INNOVATION_QUESTIONS,
  '投入度': ORIGINAL_COMMITMENT_QUESTIONS,
};

const SCORE_COLORS: Record<number, { bg: string; border: string; badge: string }> = {
  9: { bg: 'bg-emerald-50',  border: 'border-emerald-400', badge: 'bg-emerald-500 text-white' },
  8: { bg: 'bg-emerald-50',  border: 'border-emerald-300', badge: 'bg-emerald-400 text-white' },
  7: { bg: 'bg-teal-50',     border: 'border-teal-300',    badge: 'bg-teal-500 text-white' },
  6: { bg: 'bg-sky-50',      border: 'border-sky-300',     badge: 'bg-sky-500 text-white' },
  5: { bg: 'bg-yellow-50',   border: 'border-yellow-300',  badge: 'bg-yellow-500 text-white' },
  4: { bg: 'bg-orange-50',   border: 'border-orange-200',  badge: 'bg-orange-400 text-white' },
  3: { bg: 'bg-orange-50',   border: 'border-orange-300',  badge: 'bg-orange-500 text-white' },
  2: { bg: 'bg-red-50',      border: 'border-red-300',     badge: 'bg-red-400 text-white' },
  1: { bg: 'bg-red-50',      border: 'border-red-400',     badge: 'bg-red-600 text-white' },
};

function getStyle(score: number) {
  return SCORE_COLORS[score] ?? { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-400 text-white' };
}

/* ---------- 选项列表 ---------- */
function OptionList({ options }: { options: QuestionTemplate['options'] }) {
  const maxScore = Math.max(...(options?.map(o => o.score) ?? [0]));
  return (
    <div className="space-y-2">
      {options?.map(opt => {
        const s = getStyle(opt.score);
        const isTop = opt.score === maxScore;
        return (
          <div key={opt.label}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${s.bg} ${s.border} ${isTop ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}>
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center">{opt.label}</span>
            <span className="flex-1 text-sm text-gray-700 leading-relaxed">{opt.text}</span>
            <span className={`flex-shrink-0 text-xs font-bold w-7 h-7 rounded-full ${s.badge} flex items-center justify-center`}>{opt.score}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 追问区 ---------- */
function ProbingSection({ probing }: { probing: QuestionTemplate['probing_logic'] }) {
  if (!probing) return null;
  const items = [
    { key: '代价', value: probing.cost },
    { key: '假设', value: probing.assumption },
    { key: '证据', value: probing.evidence },
  ].filter(item => item.value);
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">追问设计</p>
      {items.map(({ key, value }) => (
        <div key={key} className="flex gap-2 text-sm text-gray-600">
          <span className="flex-shrink-0 bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded text-xs">{key}</span>
          <span className="leading-relaxed">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 单题卡片 ---------- */
function QuestionCard({ q, index, tag, isOpen, onToggle }: {
  q: QuestionTemplate;
  index: number;
  tag?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const maxScore = Math.max(...(q.options?.map(o => o.score) ?? [0]));
  const topOption = q.options?.find(o => o.score === maxScore);
  const topIsA = q.options?.[0]?.score === maxScore;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800 text-base leading-snug">{q.title}</span>
            {tag}
            {!topIsA && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">最高分={topOption?.label}</span>}
          </div>
          <p className={`text-sm text-gray-400 mt-1 ${isOpen ? '' : 'line-clamp-2'}`}>{q.scenario}</p>
        </div>
        <span className="text-gray-300 text-base flex-shrink-0 mt-1 select-none">{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* 完整场景 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 leading-relaxed">{q.scenario}</p>
          </div>

          {/* 选项 */}
          <OptionList options={q.options} />

          {/* 追问 */}
          <ProbingSection probing={q.probing_logic} />

          {/* 设计意图 */}
          {q.methodology_note && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <p className="text-sm text-indigo-700 leading-relaxed">
                <span className="font-bold">设计意图：</span>{q.methodology_note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 对比视图 ---------- */
function DiffView({ original, updated, expandAll }: { original: QuestionTemplate[]; updated: QuestionTemplate[]; expandAll: boolean }) {
  const [openOriginal, setOpenOriginal] = useState<Record<number, boolean>>({});
  const [openUpdated, setOpenUpdated] = useState<Record<number, boolean>>({});

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* 原版 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
          <span className="text-base font-bold text-gray-500">原版题目</span>
          <span className="text-sm text-gray-400">({original.length} 题)</span>
        </div>
        {original.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i}
            isOpen={expandAll || !!openOriginal[i]}
            onToggle={() => setOpenOriginal(prev => ({ ...prev, [i]: !prev[i] }))}
            tag={<span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">原</span>}
          />
        ))}
      </div>

      {/* 新版 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-200">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span className="text-base font-bold text-indigo-600">改版题目</span>
          <span className="text-sm text-gray-400">({updated.length} 题)</span>
        </div>
        {updated.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i}
            isOpen={expandAll || !!openUpdated[i]}
            onToggle={() => setOpenUpdated(prev => ({ ...prev, [i]: !prev[i] }))}
            tag={<span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">新</span>}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- 单列视图 ---------- */
function SingleView({ questions, expandAll }: { questions: QuestionTemplate[]; expandAll: boolean }) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  if (questions.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-base">该维度暂无客观题</div>;
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <QuestionCard key={q.id} q={q} index={i}
          isOpen={expandAll || !!openMap[i]}
          onToggle={() => setOpenMap(prev => ({ ...prev, [i]: !prev[i] }))}
        />
      ))}
    </div>
  );
}

/* ---------- 主组件 ---------- */
export default function QuestionReviewer({ questions }: Props) {
  const [source, setSource] = useState<'example' | 'custom'>('example');
  const [activeDim, setActiveDim] = useState<string>(DIMENSION_ORDER[0]);
  const [expandAll, setExpandAll] = useState(false);

  const pool = source === 'example' ? EXAMPLE_QUESTIONS : questions;

  const byDim = useMemo(() => {
    const map: Record<string, QuestionTemplate[]> = {};
    DIMENSION_ORDER.forEach(d => {
      map[d] = pool.filter(q => q.dimension === d && q.type === 'objective');
    });
    return map;
  }, [pool]);

  const allQ = useMemo(() => pool.filter(q => q.type === 'objective'), [pool]);

  const nonATopCount = useMemo(() => allQ.filter(q => {
    const maxScore = Math.max(...(q.options?.map(o => o.score) ?? [0]));
    return q.options?.[0]?.score !== maxScore;
  }).length, [allQ]);

  // Collect all unique scores used
  const allScores = useMemo(() => {
    const scores = new Set<number>();
    allQ.forEach(q => q.options?.forEach(o => scores.add(o.score)));
    return [...scores].sort((a, b) => b - a);
  }, [allQ]);

  const hasDiff = !!DIFF_DIMENSIONS[activeDim];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">题目审查视图</h1>
          <p className="text-sm text-gray-500 mt-1">审查各维度题目质量、评分分布、选项设计合理性</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 text-sm font-bold">
          {(['example', 'custom'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)}
              className={`px-4 py-2 rounded-lg transition-all ${source === s ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {s === 'example' ? '示例题库' : '自定义题库'}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-gray-800">{allQ.length}</div>
          <div className="text-sm text-gray-400 mt-1">客观题总数</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-violet-600">{nonATopCount}</div>
          <div className="text-sm text-gray-400 mt-1">最高分非 A 选项</div>
          <div className="text-xs text-gray-300 mt-0.5">打破"A 永远最优"的规律</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-indigo-600">{allQ.length > 0 ? `${Math.round(nonATopCount / allQ.length * 100)}%` : '0%'}</div>
          <div className="text-sm text-gray-400 mt-1">非线性评分占比</div>
          <div className="text-xs text-gray-300 mt-0.5">越高说明评分越不可预测</div>
        </div>
      </div>

      {/* 分值图例 — 动态显示所有实际用到的分值 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-400 font-bold mr-1">分值颜色：</span>
        {allScores.map(score => {
          const s = getStyle(score);
          return <span key={score} className={`text-xs font-bold px-3 py-1.5 rounded-full ${s.badge}`}>{score}分</span>;
        })}
        <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-bold ml-3">最高分非A</span>
        {hasDiff && <>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full font-bold">新</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-bold">原</span>
        </>}
      </div>

      {/* 维度标签 + 展开按钮 */}
      <div className="flex items-center gap-2 flex-wrap">
        {DIMENSION_ORDER.map(dim => (
          <button key={dim} onClick={() => { setActiveDim(dim); setExpandAll(false); }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeDim === dim ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {dim}
            {DIFF_DIMENSIONS[dim] && <span className="ml-1 text-xs opacity-70">对比</span>}
            <span className="ml-1 opacity-60 text-xs">({byDim[dim]?.length ?? 0})</span>
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={() => setExpandAll(!expandAll)}
            className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
            {expandAll ? '折叠全部 ▲' : '展开全部 ▼'}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      {hasDiff ? (
        <DiffView original={DIFF_DIMENSIONS[activeDim]} updated={byDim[activeDim] ?? []} expandAll={expandAll} />
      ) : (
        <SingleView questions={byDim[activeDim] ?? []} expandAll={expandAll} />
      )}
    </div>
  );
}
