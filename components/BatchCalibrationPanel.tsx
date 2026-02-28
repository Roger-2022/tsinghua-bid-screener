
import React, { useState, useMemo } from 'react';
import { Language, CandidateRecord, CalibrationReport, AnomalyFlag } from '../types';
import { translations } from '../i18n';

interface Props {
  lang: Language;
  candidates: CandidateRecord[];
  isOpen: boolean;
  onClose: () => void;
}

const DIM_KEYS = ['motivation', 'logic', 'reflection_resilience', 'innovation', 'commitment'] as const;
const DIM_LABELS_CN: Record<string, string> = { motivation: '动机', logic: '逻辑', reflection_resilience: '韧性', innovation: '创新', commitment: '投入' };
const DIM_LABELS_EN: Record<string, string> = { motivation: 'Motivation', logic: 'Logic', reflection_resilience: 'Resilience', innovation: 'Innovation', commitment: 'Commitment' };

const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std = (arr: number[]) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
};

const runLocalCalibration = (candidates: CandidateRecord[]): CalibrationReport => {
  const scoreDistributions: CalibrationReport['scoreDistributions'] = {};
  const anomalies: AnomalyFlag[] = [];

  DIM_KEYS.forEach(dim => {
    const values = candidates.map(c => (c.scores as any)[dim] || 0).filter(v => v > 0);
    if (values.length < 2) return;
    const m = mean(values);
    const s = std(values);
    scoreDistributions[dim] = { mean: +m.toFixed(2), std: +s.toFixed(2), min: Math.min(...values), max: Math.max(...values) };

    // Detect outliers (>2 std from mean)
    candidates.forEach(c => {
      const val = (c.scores as any)[dim] || 0;
      if (val > 0 && Math.abs(val - m) > 2 * s) {
        anomalies.push({
          candidateId: c.candidate_id,
          candidateName: c.display_name,
          type: 'score_outlier',
          description: `${dim}: ${val} (mean: ${m.toFixed(1)}, std: ${s.toFixed(1)})`,
          severity: Math.abs(val - m) > 3 * s ? 'high' : 'medium',
        });
      }
    });
  });

  // Detect decision inconsistency (high score but reject, or low score but pass)
  candidates.forEach(c => {
    const overall = c.scores.overall || 0;
    if (c.status === 'reject' && overall >= 7) {
      anomalies.push({ candidateId: c.candidate_id, candidateName: c.display_name, type: 'decision_inconsistency', description: `Rejected with overall ${overall}/10`, severity: 'high' });
    }
    if (c.status === 'pass' && overall <= 3) {
      anomalies.push({ candidateId: c.candidate_id, candidateName: c.display_name, type: 'decision_inconsistency', description: `Passed with overall ${overall}/10`, severity: 'high' });
    }
  });

  return { generatedAt: Date.now(), candidateCount: candidates.length, scoreDistributions, anomalies, recommendations: [] };
};

const BatchCalibrationPanel: React.FC<Props> = ({ lang, candidates, isOpen, onClose }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const dimLabels = isCN ? DIM_LABELS_CN : DIM_LABELS_EN;
  const [report, setReport] = useState<CalibrationReport | null>(null);

  // Lookup map for candidate status
  const candidateMap = useMemo(() => {
    const map = new Map<string, CandidateRecord>();
    candidates.forEach(c => map.set(c.candidate_id, c));
    return map;
  }, [candidates]);

  if (!isOpen) return null;

  const realCandidates = candidates.filter(c => c.scores.overall !== null && (c.scores.overall || 0) > 0);

  const handleRun = () => {
    if (realCandidates.length < 3) return;
    setReport(runLocalCalibration(realCandidates));
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

  // Localize anomaly description
  const localizeDescription = (a: AnomalyFlag): string => {
    if (a.type === 'decision_inconsistency') {
      const scoreMatch = a.description.match(/([\d.]+)\/10/);
      const score = scoreMatch ? scoreMatch[1] : '?';
      if (a.description.startsWith('Rejected')) {
        return isCN ? `拒绝但综合分 ${score}/10` : a.description;
      }
      return isCN ? `通过但综合分 ${score}/10` : a.description;
    }
    if (a.type === 'score_outlier') {
      const match = a.description.match(/^(\w+): ([\d.]+) \(mean: ([\d.]+), std: ([\d.]+)\)/);
      if (match) {
        const [, dimKey, val, meanVal, stdVal] = match;
        const dimName = dimLabels[dimKey] || dimKey;
        return isCN
          ? `${dimName}: ${val} (均值: ${meanVal}, 标差: ${stdVal})`
          : `${dimName}: ${val} (mean: ${meanVal}, std: ${stdVal})`;
      }
    }
    return a.description;
  };

  // Status badge for a candidate
  const statusBadge = (candidateId: string) => {
    const c = candidateMap.get(candidateId);
    if (!c) return null;
    const colors: Record<string, string> = {
      pass: 'bg-green-100 text-green-700',
      hold: 'bg-amber-100 text-amber-700',
      reject: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, { cn: string; en: string }> = {
      pass: { cn: '通过', en: 'Pass' },
      hold: { cn: '待定', en: 'Hold' },
      reject: { cn: '未通过', en: 'Reject' },
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[c.status] || ''}`}>
        {isCN ? labels[c.status]?.cn : labels[c.status]?.en}
      </span>
    );
  };

  // Group anomalies by candidate
  const groupedAnomalies = useMemo(() => {
    if (!report) return [];
    const groups: Record<string, AnomalyFlag[]> = {};
    report.anomalies.forEach(a => {
      if (!groups[a.candidateId]) groups[a.candidateId] = [];
      groups[a.candidateId].push(a);
    });
    return Object.entries(groups);
  }, [report]);

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
                    <h3 className="text-sm font-bold text-gray-600 mb-3">{(t as any).calibration_distribution}</h3>
                    <div className="space-y-2">
                      {DIM_KEYS.map(dim => {
                        const dist = report.scoreDistributions[dim];
                        if (!dist) return null;
                        return (
                          <div key={dim} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-700 w-16">{dimLabels[dim]}</span>
                            <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 relative">
                              <div className="bg-tsinghua-400 rounded-full h-2" style={{ width: `${(dist.mean / 10) * 100}%` }} />
                            </div>
                            <span className="text-gray-500 w-40 text-right">
                              {isCN ? '均' : 'M'}={dist.mean} {isCN ? '标差' : 'SD'}={dist.std} [{dist.min}-{dist.max}]
                            </span>
                          </div>
                        );
                      })}
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
                              {/* Candidate header */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-black text-gray-900">{displayName}</span>
                                {statusBadge(candidateId)}
                                <span className="text-[10px] text-gray-400 ml-auto">
                                  {anomalies.length} {isCN ? '项异常' : 'anomalies'}
                                </span>
                              </div>
                              {/* Anomaly items */}
                              <div className="space-y-1.5">
                                {anomalies.map((a, i) => (
                                  <div key={i} className={`px-3 py-2 rounded-lg text-xs ${severityColor[a.severity]}`}>
                                    <span className="font-semibold">{localizeType(a.type)}</span>
                                    <span className="mx-1.5 opacity-40">|</span>
                                    <span>{localizeDescription(a)}</span>
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
