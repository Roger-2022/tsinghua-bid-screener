import React, { useState } from 'react';
import { QuestionTemplate } from '../types';
import { EXAMPLE_QUESTIONS } from '../data/exampleQuestions';
import { ORIGINAL_MOTIVATION_QUESTIONS } from '../data/originalMotivationQuestions';
import { ORIGINAL_COMMITMENT_QUESTIONS } from '../data/originalCommitmentQuestions';

interface Props {
  questions: QuestionTemplate[];
}

const DIMENSION_ORDER = ['真实动机', '逻辑闭环', '反思与韧性', '创新潜质', '投入度'];

// 哪些维度有原版对比数据
const DIFF_DIMENSIONS: Record<string, QuestionTemplate[]> = {
  '真实动机': ORIGINAL_MOTIVATION_QUESTIONS,
  '投入度': ORIGINAL_COMMITMENT_QUESTIONS,
};

const SCORE_STYLE: Record<number, { bg: string; border: string; badge: string }> = {
  9: { bg: 'bg-emerald-50',  border: 'border-emerald-400', badge: 'bg-emerald-500 text-white'  },
  8: { bg: 'bg-emerald-50',  border: 'border-emerald-300', badge: 'bg-emerald-400 text-white'  },
  7: { bg: 'bg-teal-50',     border: 'border-teal-300',    badge: 'bg-teal-500 text-white'     },
  6: { bg: 'bg-sky-50',      border: 'border-sky-300',     badge: 'bg-sky-500 text-white'      },
  5: { bg: 'bg-yellow-50',   border: 'border-yellow-300',  badge: 'bg-yellow-500 text-white'   },
  3: { bg: 'bg-orange-50',   border: 'border-orange-300',  badge: 'bg-orange-400 text-white'   },
  2: { bg: 'bg-red-50',      border: 'border-red-300',     badge: 'bg-red-400 text-white'      },
  1: { bg: 'bg-red-50',      border: 'border-red-400',     badge: 'bg-red-600 text-white'      },
};

function getStyle(score: number) {
  return SCORE_STYLE[score] ?? { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-400 text-white' };
}

// ---- 单题选项列表 ----
function OptionList({ options }: { options: QuestionTemplate['options'] }) {
  const maxScore = Math.max(...(options?.map(o => o.score) ?? [0]));
  return (
    <div className="space-y-1.5">
      {options?.map(opt => {
        const s = getStyle(opt.score);
        const isTop = opt.score === maxScore;
        return (
          <div key={opt.label}
            className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border ${s.bg} ${s.border} ${isTop ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}>
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-gray-500 flex items-center justify-center">{opt.label}</span>
            <span className="flex-1 text-xs text-gray-700 leading-relaxed">{opt.text}</span>
            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{opt.score}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- 单题卡片（可展开） ----
function QuestionCard({ q, index, tag }: { key?: string; q: QuestionTemplate; index: number; tag?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const maxScore = Math.max(...(q.options?.map(o => o.score) ?? [0]));
  const topIsA = q.options?.[0]?.score === maxScore;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-gray-800 text-sm">{q.title}</span>
            {tag}
            {!topIsA && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">最高≠A</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{q.scenario}</p>
        </div>
        <span className="text-gray-300 text-sm flex-shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          <p className={`text-xs leading-relaxed rounded-lg p-2 ${q.scenario_adjusted ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-gray-50 text-gray-600'}`}>
            {q.scenario_adjusted && <span className="font-bold text-red-600 mr-1">[场景已调整]</span>}
            {q.scenario}
          </p>
          <OptionList options={q.options} />
          {q.probing_logic && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">追问</p>
              {[['代价', q.probing_logic.cost], ['假设', q.probing_logic.assumption], ['证据', q.probing_logic.evidence]].map(([k, v]) => (
                <div key={k} className="flex gap-1.5 text-xs text-gray-600">
                  <span className="flex-shrink-0 bg-gray-200 text-gray-600 font-bold px-1 py-0.5 rounded text-[9px]">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          {q.methodology_note && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-xs text-indigo-700 leading-relaxed">
              <span className="font-bold">设计意图：</span>{q.methodology_note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- 对比视图（原版 vs 新版并排） ----
function DiffView({ original, updated }: { original: QuestionTemplate[]; updated: QuestionTemplate[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 原版 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="text-sm font-bold text-gray-500">原版题目</span>
          <span className="text-xs text-gray-400">({original.length} 题)</span>
        </div>
        {original.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i}
            tag={<span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">原</span>}
          />
        ))}
      </div>

      {/* 新版 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span className="text-sm font-bold text-indigo-600">改版题目</span>
          <span className="text-xs text-gray-400">({updated.length} 题)</span>
        </div>
        {updated.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i}
            tag={<span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">新</span>}
          />
        ))}
      </div>
    </div>
  );
}

// ---- 主组件 ----
export default function QuestionReviewer({ questions }: Props) {
  const [source, setSource] = useState<'example' | 'custom'>('example');
  const [activeDim, setActiveDim] = useState<string>(DIMENSION_ORDER[0]);

  const pool = source === 'example' ? EXAMPLE_QUESTIONS : questions;

  const byDim: Record<string, QuestionTemplate[]> = {};
  DIMENSION_ORDER.forEach(d => {
    byDim[d] = pool.filter(q => q.dimension === d && q.type === 'objective');
  });

  const allQ = pool.filter(q => q.type === 'objective');
  const nonATopCount = allQ.filter(q => {
    const maxScore = Math.max(...(q.options?.map(o => o.score) ?? [0]));
    return q.options?.[0]?.score !== maxScore;
  }).length;

  const hasDiff = !!DIFF_DIMENSIONS[activeDim];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">题目审查视图</h1>
          <p className="text-sm text-gray-500 mt-0.5">绿色高亮 = 最高分选项；有原版对比的维度会显示左右对比</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 text-sm font-bold">
          {(['example', 'custom'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)}
              className={`px-4 py-1.5 rounded-lg transition-all ${source === s ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {s === 'example' ? '示例题库' : '自定义题库'}
            </button>
          ))}
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '客观题总数', value: allQ.length, color: 'text-gray-800' },
          { label: '最高分 ≠ A', value: nonATopCount, color: 'text-violet-600' },
          { label: '字母规律打破率', value: allQ.length > 0 ? `${Math.round(nonATopCount / allQ.length * 100)}%` : '0%', color: 'text-indigo-600' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 font-bold mr-1">分值颜色：</span>
        {[9, 7, 5, 3, 1].map(score => {
          const s = getStyle(score);
          return <span key={score} className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.badge}`}>{score}分</span>;
        })}
        <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-bold ml-2">最高≠A ✓</span>
        <span className="text-xs bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full font-bold">新</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-bold">原</span>
      </div>

      {/* 维度标签 */}
      <div className="flex gap-1.5 flex-wrap">
        {DIMENSION_ORDER.map(dim => (
          <button key={dim} onClick={() => setActiveDim(dim)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeDim === dim ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {dim}
            {DIFF_DIMENSIONS[dim] && <span className="ml-1 text-[10px] opacity-70">对比</span>}
            <span className="ml-1 opacity-60 text-xs">({byDim[dim]?.length ?? 0})</span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {hasDiff ? (
        <DiffView original={DIFF_DIMENSIONS[activeDim]} updated={byDim[activeDim] ?? []} />
      ) : (
        <div className="space-y-3">
          {(byDim[activeDim] ?? []).length === 0
            ? <div className="text-center py-12 text-gray-400 text-sm">该维度暂无客观题</div>
            : (byDim[activeDim] ?? []).map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)
          }
        </div>
      )}
    </div>
  );
}
