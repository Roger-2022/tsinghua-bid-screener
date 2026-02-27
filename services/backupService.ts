
import { CandidateRecord, QuestionTemplate, DimensionWeight, NumericDecisionThresholds, PromptConfig, DecisionTreeNode, ProbingStrategyConfig, WorkflowModuleConfig, ApiConfig, SystemSnapshot } from '../types';

const STORAGE_KEY = 'tsinghua_snapshots';
const MAX_SNAPSHOTS = 10;

// All localStorage keys that constitute the system state
const STATE_KEYS = [
  'tsinghua_candidates',
  'tsinghua_questions',
  'tsinghua_dimension_weights',
  'tsinghua_decision_thresholds',
  'tsinghua_prompt_config',
  'tsinghua_decision_tree',
  'tsinghua_probing_strategy',
  'tsinghua_workflow_modules',
  'tsinghua_api_config',
  'tsinghua_feedback',
  'tsinghua_prompt_versions',
] as const;

export const createSnapshot = (label: string): SystemSnapshot => {
  const data: Record<string, any> = {};
  STATE_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });

  const snapshot: SystemSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    label,
    timestamp: Date.now(),
    data,
  };

  const existing = listSnapshots();
  existing.unshift(snapshot);
  // Enforce max limit (FIFO)
  while (existing.length > MAX_SNAPSHOTS) existing.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  return snapshot;
};

export const restoreSnapshot = (id: string): boolean => {
  const snapshots = listSnapshots();
  const target = snapshots.find(s => s.id === id);
  if (!target) return false;

  // Clear all state keys first
  STATE_KEYS.forEach(key => localStorage.removeItem(key));

  // Write back from snapshot
  Object.entries(target.data).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  return true;
};

export const deleteSnapshot = (id: string): void => {
  const snapshots = listSnapshots().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
};

export const listSnapshots = (): SystemSnapshot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const hasBaselineSnapshot = (): boolean => {
  return listSnapshots().some(s => s.label === 'AI Native Upgrade Baseline');
};

export const createBaselineIfNeeded = (): void => {
  if (!hasBaselineSnapshot()) {
    createSnapshot('AI Native Upgrade Baseline');
  }
};
