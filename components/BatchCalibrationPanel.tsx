
import React, { useState, useMemo } from 'react';
import { Language, CandidateRecord, CandidateScores, CalibrationReport, AnomalyFlag, NumericDecisionThresholds, DecisionThresholdRow, DimensionWeight } from '../types';
import { translations } from '../i18n';

interface Props {
  lang: Language;
  candidates: CandidateRecord[];
  isOpen: boolean;
  onClose: () => void;
  decisionThresholds: NumericDecisionThresholds;
  dimensionWeights: DimensionWeight[];
}

// Dimension key mapping: score field → threshold field → labels
const DIMS = [
  { scoreKey: 'motivation', thresholdKey: 'motivation', cn: '动机', en: 'Motivation' },
  { scoreKey: 'logic', thresholdKey: 'logic', cn: '逻辑', en: 'Logic' },
  { scoreKey: 'reflection_resilience', thresholdKey: 'resilience', cn: '韧性', en: 'Resilience' },
  { scoreKey: 'innovation', thresholdKey: 'innovation', cn: '创新', en: 'Innovation' },
  { scoreKey: 'commitment', thresholdKey: 'commitment', cn: '投入', en: 'Commitment' },
] as const;

const OE_DIMS = [
  { scoreKey: 'thinking_depth', thresholdKey: 'thinking_depth', cn: '思维深度', en: 'Thinking Depth' },
  { scoreKey: 'multidimensional_thinking', thresholdKey: 'multidimensional_thinking', cn: '多维思考', en: 'Multidim. Thinking' },
] as const;

// ---- Statistics helpers ----
const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std = (arr: number[]) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
};

const quartiles = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
  };
  return { q1: q(0.25), median: q(0.5), q3: q(0.75) };
};

// ---- Calibration engine ----
const runCalibration = (
  candidates: CandidateRecord[],
  thresholds: NumericDecisionThresholds,
  weights: DimensionWeight[],
  isCN: boolean,
): CalibrationReport => {
  const scoreDistributions: CalibrationReport['scoreDistributions'] = {};
  const anomalies: AnomalyFlag[] = [];

  // Helper: compute distribution + IQR outlier detection for a list of dims
  const processDims = (dims: ReadonlyArray<{ scoreKey: string; thresholdKey: string; cn: string; en: string }>) => {
    dims.forEach(dim => {
      const values = candidates.map(c => (c.scores as any)[dim.scoreKey] || 0).filter(v => v > 0);
      if (values.length < 2) return;
      const m = mean(values);
      const s = std(values);
      scoreDistributions[dim.scoreKey] = { mean: +m.toFixed(2), std: +s.toFixed(2), min: Math.min(...values), max: Math.max(...values) };

      // IQR outlier detection
      const { q1, q3 } = quartiles(values);
      const iqr = q3 - q1;
      const lowerMild = q1 - 1.5 * iqr;
      const upperMild = q3 + 1.5 * iqr;
      const lowerExtreme = q1 - 3 * iqr;
      const upperExtreme = q3 + 3 * iqr;

      candidates.forEach(c => {
        const val = (c.scores as any)[dim.scoreKey] || 0;
        if (val <= 0) return;
        const dimLabel = isCN ? dim.cn : dim.en;
        if (val < lowerExtreme || val > upperExtreme) {
          anomalies.push({
            candidateId: c.candidate_id,
            candidateName: c.display_name,
            type: 'score_outlier',
            description: isCN
              ? `${dimLabel}: ${val} (Q1=${q1.toFixed(1)} Q3=${q3.toFixed(1)} IQR=${iqr.toFixed(1)})`
              : `${dimLabel}: ${val} (Q1=${q1.toFixed(1)} Q3=${q3.toFixed(1)} IQR=${iqr.toFixed(1)})`,
            severity: 'high',
          });
        } else if (val < lowerMild || val > upperMild) {
          anomalies.push({
            candidateId: c.candidate_id,
            candidateName: c.display_name,
            type: 'score_outlier',
            description: isCN
              ? `${dimLabel}: ${val} (Q1=${q1.toFixed(1)} Q3=${q3.toFixed(1)} IQR=${iqr.toFixed(1)})`
              : `${dimLabel}: ${val} (Q1=${q1.toFixed(1)} Q3=${q3.toFixed(1)} IQR=${iqr.toFixed(1)})`,
            severity: 'medium',
          });
        }
      });
    });
  };

  // ---- 1. Score distribution + IQR outlier detection ----
  // Core dimensions
  processDims(DIMS);
  // Open-ended dimensions
  processDims(OE_DIMS);

  // Overall score (simple average of 5 core dims)
  const overallValues = candidates.map(c => c.scores.overall || 0).filter(v => v > 0);
  if (overallValues.length >= 2) {
    scoreDistributions['overall'] = {
      mean: +mean(overallValues).toFixed(2),
      std: +std(overallValues).toFixed(2),
      min: Math.min(...overallValues),
      max: Math.max(...overallValues),
    };
  }

  // Weighted average
  const calcWAvg = (scores: CandidateScores): number => {
    const dimScores = DIMS.map(d => (scores as any)[d.scoreKey] || 0);
    const dimWeights = weights.map(w => w.weight);
    const totalWeight = dimWeights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return 0;
    return dimScores.reduce((sum, s, i) => sum + s * (dimWeights[i] || 0), 0) / totalWeight;
  };
  const wAvgValues = candidates.map(c => calcWAvg(c.scores)).filter(v => v > 0);
  if (wAvgValues.length >= 2) {
    scoreDistributions['weighted_avg'] = {
      mean: +mean(wAvgValues).toFixed(2),
      std: +std(wAvgValues).toFixed(2),
      min: +Math.min(...wAvgValues).toFixed(1),
      max: +Math.max(...wAvgValues).toFixed(1),
    };
  }

  // ---- 2. Decision inconsistency — based on actual admission thresholds ----
  const getScore = (scores: CandidateScores, key: string): number => (scores as any)[key] || 0;
  const getThreshold = (row: DecisionThresholdRow, key: string): number => (row as any)[key] || 0;

  // Check if all core dimensions meet a given threshold level
  const meetsAllDims = (scores: CandidateScores, level: DecisionThresholdRow): { met: boolean; failures: string[] } => {
    const failures: string[] = [];
    for (const dim of DIMS) {
      const val = getScore(scores, dim.scoreKey);
      const thresh = getThreshold(level, dim.thresholdKey);
      if (val < thresh) failures.push(isCN ? dim.cn : dim.en);
    }
    // Optional: open-ended dims
    for (const dim of OE_DIMS) {
      const val = getScore(scores, dim.scoreKey);
      const thresh = getThreshold(level, dim.thresholdKey);
      if (val > 0 && thresh > 0 && val < thresh) failures.push(isCN ? dim.cn : dim.en);
    }
    return { met: failures.length === 0, failures };
  };

  // Calculate weighted average
  const calcWeightedAvg = (scores: CandidateScores): number => {
    const dimScores = DIMS.map(d => getScore(scores, d.scoreKey));
    const dimWeights = weights.map(w => w.weight);
    const totalWeight = dimWeights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return 0;
    return dimScores.reduce((sum, s, i) => sum + s * (dimWeights[i] || 0), 0) / totalWeight;
  };

  // Build a human-readable check string
  const buildCheckStr = (scores: CandidateScores, level: DecisionThresholdRow): string => {
    const parts: string[] = [];
    for (const dim of DIMS) {
      const val = getScore(scores, dim.scoreKey);
      const thresh = getThreshold(level, dim.thresholdKey);
      const label = isCN ? dim.cn : dim.en;
      const ok = val >= thresh;
      parts.push(`${label} ${val}${ok ? '✓' : '✗'}≥${thresh}`);
    }
    const avg = calcWeightedAvg(scores);
    if (level.avg > 0) {
      const ok = avg >= level.avg;
      parts.push(`${isCN ? '均分' : 'Avg'} ${avg.toFixed(1)}${ok ? '✓' : '✗'}≥${level.avg}`);
    }
    return parts.join('  ');
  };

  candidates.forEach(c => {
    const scores = c.scores;
    const status = c.status;
    const avg = calcWeightedAvg(scores);

    if (status === 'reject') {
      // Rejected — but meets pass thresholds?
      const passCheck = meetsAllDims(scores, thresholds.pass);
      const passAvgOk = thresholds.pass.avg <= 0 || avg >= thresholds.pass.avg;
      if (passCheck.met && passAvgOk) {
        anomalies.push({
          candidateId: c.candidate_id,
          candidateName: c.display_name,
          type: 'decision_inconsistency',
          description: isCN
            ? `所有维度达通过标准但被拒绝 — ${buildCheckStr(scores, thresholds.pass)}`
            : `All dims meet Pass thresholds but Rejected — ${buildCheckStr(scores, thresholds.pass)}`,
          severity: 'high',
        });
      } else {
        // Meets hold thresholds?
        const holdCheck = meetsAllDims(scores, thresholds.hold);
        const holdAvgOk = thresholds.hold.avg <= 0 || avg >= thresholds.hold.avg;
        if (holdCheck.met && holdAvgOk) {
          anomalies.push({
            candidateId: c.candidate_id,
            candidateName: c.display_name,
            type: 'decision_inconsistency',
            description: isCN
              ? `达待定标准但被拒绝（可能过严）— ${buildCheckStr(scores, thresholds.hold)}`
              : `Meets Hold thresholds but Rejected (possibly too strict) — ${buildCheckStr(scores, thresholds.hold)}`,
            severity: 'medium',
          });
        }
      }
    }

    if (status === 'pass') {
      // Passed — but has dims below reject threshold?
      const rejectCheck = meetsAllDims(scores, thresholds.reject);
      if (!rejectCheck.met) {
        const failedStr = rejectCheck.failures.join(', ');
        anomalies.push({
          candidateId: c.candidate_id,
          candidateName: c.display_name,
          type: 'decision_inconsistency',
          description: isCN
            ? `${failedStr} 低于清退阈值但被通过 — ${buildCheckStr(scores, thresholds.reject)}`
            : `${failedStr} below Reject threshold but Passed — ${buildCheckStr(scores, thresholds.reject)}`,
          severity: 'high',
        });
      } else {
        // Has dims below hold threshold?
        const holdCheck = meetsAllDims(scores, thresholds.hold);
        if (!holdCheck.met) {
          const failedStr = holdCheck.failures.join(', ');
          anomalies.push({
            candidateId: c.candidate_id,
            candidateName: c.display_name,
            type: 'decision_inconsistency',
            description: isCN
              ? `${failedStr} 未达待定标准但被通过（可能过松）— ${buildCheckStr(scores, thresholds.hold)}`
              : `${failedStr} below Hold threshold but Passed (possibly too lenient) — ${buildCheckStr(scores, thresholds.hold)}`,
            severity: 'medium',
          });
        }
      }
    }
  });

  return { generatedAt: Date.now(), candidateCount: candidates.length, scoreDistributions, anomalies, recommendations: [] };
};

// ---- Component ----
const BatchCalibrationPanel: React.FC<Props> = ({ lang, candidates, isOpen, onClose, decisionThresholds, dimensionWeights }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [report, setReport] = useState<CalibrationReport | null>(null);

  // Lookup map for candidate status
  const candidateMap = useMemo(() => {
    const map = new Map<string, CandidateRecord>();
    candidates.forEach(c => map.set(c.candidate_id, c));
    return map;
  }, [candidates]);

  // Group anomalies by candidate (must be before early return — React Hooks rules)
  const groupedAnomalies = useMemo(() => {
    if (!report) return [];
    const groups: Record<string, AnomalyFlag[]> = {};
    report.anomalies.forEach(a => {
      if (!groups[a.candidateId]) groups[a.candidateId] = [];
      groups[a.candidateId].push(a);
    });
    return Object.entries(groups);
  }, [report]);

  if (!isOpen) return null;

  const realCandidates = candidates.filter(c => c.scores.overall !== null && (c.scores.overall || 0) > 0);

  const handleRun = () => {
    if (realCandidates.length < 3) return;
    setReport(runCalibration(realCandidates, decisionThresholds, dimensionWeights, isCN));
  };

  const severityColor: Record<string, string> = { low: 'bg-blue-50 text-blue-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-red-50 text-red-700' };

  // Localize anomaly type
  const localizeType = (type: AnomalyFlag['type']): string => {
    const map: Record<string, { cn: string; en: string }> = {
      decision_inconsistency: { cn: '决策不一致', en: 'Decision Inconsistency' },
      score_outlier: { cn: '分数异常', en: 'Score Outlier' },
      dimension_imbalance: { cn: '维度失衡', en: 'Dimension Imbalance' },
    };
    const entry = map[type];
    return entry ? (isCN ? entry.cn : entry.en) : type;
  };

  // Status badge
  const statusBadge = (candidateId: string) => {
    const c = candidateMap.get(candidateId);
    if (!c) return null;
    const colors: Record<string, string> = { pass: 'bg-green-100 text-green-700', hold: 'bg-amber-100 text-amber-700', reject: 'bg-red-100 text-red-700' };
    const labels: Record<string, { cn: string; en: string }> = { pass: { cn: '通过', en: 'Pass' }, hold: { cn: '待定', en: 'Hold' }, reject: { cn: '未通过', en: 'Reject' } };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[c.status] || ''}`}>
        {isCN ? labels[c.status]?.cn : labels[c.status]?.en}
      </span>
    );
  };

  // Get threshold values for a dimension (for bar markers)
  const getThresholdMarkers = (scoreKey: string) => {
    const allDims = [...DIMS, ...OE_DIMS];
    const dim = allDims.find(d => d.scoreKey === scoreKey);
    if (!dim) return null;
    const rejectVal = (decisionThresholds.reject as any)[dim.thresholdKey] || 0;
    const passVal = (decisionThresholds.pass as any)[dim.thresholdKey] || 0;
    return { reject: rejectVal, pass: passVal };
  };

  // Reusable distribution bar row component
  const DistRow: React.FC<{
    label: string; dist: { mean: number; std: number; min: number; max: number }; scoreKey?: string; barColor?: string; maxScale?: number;
  }> = ({ label, dist, scoreKey, barColor, maxScale = 10 }) => {
    const markers = scoreKey ? getThresholdMarkers(scoreKey) : null;
    const color = barColor || 'bg-tsinghua-400';
    // Tick positions: evenly divide the scale
    const ticks = maxScale === 10 ? [0, 2, 4, 6, 8, 10] : [0, Math.round(maxScale / 4), Math.round(maxScale / 2), Math.round(maxScale * 3 / 4), maxScale];
    return (
      <div className="text-xs">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-gray-700 w-20 truncate">{label}</span>
          <span className="text-gray-500 text-[11px]">
            <span className="font-bold text-gray-700">{dist.mean}</span>
            <span className="text-gray-400 mx-0.5">±{dist.std}</span>
            <span className="text-gray-400">[{dist.min}–{dist.max}]</span>
          </span>
        </div>
        <div className="flex items-center gap-0">
          <div className="flex-1 relative">
            {/* Track background */}
            <div className="bg-gray-200 rounded-full h-3 relative overflow-visible">
              {/* Mean bar */}
              <div className={`${color} rounded-full h-3 transition-all`} style={{ width: `${Math.min((dist.mean / maxScale) * 100, 100)}%` }} />
              {/* ±1 std range overlay */}
              {dist.std > 0 && (
                <div
                  className="absolute top-0 h-3 bg-black/10 rounded-full"
                  style={{
                    left: `${Math.max((dist.mean - dist.std) / maxScale * 100, 0)}%`,
                    width: `${Math.min((dist.std * 2) / maxScale * 100, 100 - Math.max((dist.mean - dist.std) / maxScale * 100, 0))}%`,
                  }}
                  title={isCN ? `±1标准差范围: ${(dist.mean - dist.std).toFixed(1)}–${(dist.mean + dist.std).toFixed(1)}` : `±1 SD range: ${(dist.mean - dist.std).toFixed(1)}–${(dist.mean + dist.std).toFixed(1)}`}
                />
              )}
              {/* Mean marker (diamond) */}
              <div
                className="absolute top-[-1px] w-0 h-0"
                style={{
                  left: `${(dist.mean / maxScale) * 100}%`,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '5px solid #1f2937',
                  transform: 'translateX(-4px)',
                }}
                title={isCN ? `全体均值: ${dist.mean}` : `Mean: ${dist.mean}`}
              />
              {/* Threshold markers */}
              {markers && markers.reject > 0 && (
                <div className="absolute top-[-3px] w-[2px] h-[18px] bg-red-500 rounded-full" style={{ left: `${(markers.reject / maxScale) * 100}%` }} title={`${isCN ? '清退线' : 'Reject'}: ${markers.reject}`} />
              )}
              {markers && markers.pass > 0 && (
                <div className="absolute top-[-3px] w-[2px] h-[18px] bg-green-500 rounded-full" style={{ left: `${(markers.pass / maxScale) * 100}%` }} title={`${isCN ? '通过线' : 'Pass'}: ${markers.pass}`} />
              )}
            </div>
            {/* Scale ticks */}
            <div className="relative h-3 mt-0">
              {ticks.map(v => (
                <span key={v} className="absolute text-[9px] text-gray-400 -translate-x-1/2" style={{ left: `${(v / maxScale) * 100}%` }}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">{(t as any).calibration_title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh] space-y-4">
          {realCandidates.length < 3 ? (
            <p className="text-sm text-gray-400 text-center py-8">{(t as any).calibration_no_data}</p>
          ) : (
            <>
              <button onClick={handleRun} className="w-full py-3 bg-tsinghua-500 text-white font-bold rounded-xl hover:bg-tsinghua-600 transition-colors">
                {(t as any).calibration_run} ({realCandidates.length} {isCN ? '位候选人' : 'candidates'})
              </button>

              {report && (
                <>
                  {/* Score Distributions */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-600 mb-1">{(t as any).calibration_distribution}</h3>
                    <p className="text-[10px] text-gray-400 mb-2">
                      {isCN
                        ? '柱状条 = 全体候选人均值 | 半透明区 = ±1标准差范围 | ▼ = 均值位置'
                        : 'Bar = candidate mean | Shaded = ±1 SD range | ▼ = mean position'}
                    </p>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block" />{isCN ? '清退线' : 'Reject'}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />{isCN ? '通过线' : 'Pass'}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-black/10 rounded-full inline-block" />{isCN ? '±1标准差' : '±1 SD'}</span>
                    </div>

                    {/* Core dims */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isCN ? '核心维度（计入总分）' : 'Core Dimensions (in total score)'}</p>
                      {DIMS.map(dim => {
                        const dist = report.scoreDistributions[dim.scoreKey];
                        if (!dist) return null;
                        return <DistRow key={dim.scoreKey} label={isCN ? dim.cn : dim.en} dist={dist} scoreKey={dim.scoreKey} />;
                      })}
                    </div>

                    {/* Open-ended dims */}
                    {OE_DIMS.some(dim => report.scoreDistributions[dim.scoreKey]) && (
                      <div className="space-y-3 mt-4 pt-3 border-t border-gray-200">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isCN ? '开放题（不计入总分，但参与录取阈值判定）' : 'Open-Ended (not in total score, but checked against thresholds)'}</p>
                        {OE_DIMS.map(dim => {
                          const dist = report.scoreDistributions[dim.scoreKey];
                          if (!dist) return null;
                          return <DistRow key={dim.scoreKey} label={isCN ? dim.cn : dim.en} dist={dist} scoreKey={dim.scoreKey} barColor="bg-indigo-400" />;
                        })}
                      </div>
                    )}

                    {/* Overall + Weighted Avg */}
                    <div className="space-y-3 mt-4 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isCN ? '综合分数' : 'Aggregate Scores'}</p>
                      {report.scoreDistributions['overall'] && (
                        <DistRow
                          label={isCN ? '总分' : 'Overall'}
                          dist={report.scoreDistributions['overall']}
                          barColor="bg-purple-500"
                        />
                      )}
                      {report.scoreDistributions['weighted_avg'] && (
                        <DistRow
                          label={isCN ? '加权均分' : 'Weighted Avg'}
                          dist={report.scoreDistributions['weighted_avg']}
                          barColor="bg-amber-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* Anomalies — grouped by candidate */}
                  {groupedAnomalies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-orange-600 mb-2">
                        {(t as any).calibration_anomaly} ({report.anomalies.length})
                      </h3>
                      <div className="space-y-3">
                        {groupedAnomalies.map(([candidateId, anomalies]) => {
                          const displayName = anomalies[0].candidateName || candidateId;
                          return (
                            <div key={candidateId} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-black text-gray-900">{displayName}</span>
                                {statusBadge(candidateId)}
                                <span className="text-[10px] text-gray-400 ml-auto">
                                  {anomalies.length} {isCN ? '项异常' : 'anomalies'}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {anomalies.map((a, i) => (
                                  <div key={i} className={`px-3 py-2 rounded-lg text-xs ${severityColor[a.severity]}`}>
                                    <span className="font-semibold">{localizeType(a.type)}</span>
                                    <span className="mx-1.5 opacity-40">|</span>
                                    <span>{a.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {report.anomalies.length === 0 && (
                    <p className="text-sm text-emerald-600 text-center py-4">
                      {isCN ? '未发现显著异常，评分分布正常' : 'No significant anomalies detected'}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchCalibrationPanel;
