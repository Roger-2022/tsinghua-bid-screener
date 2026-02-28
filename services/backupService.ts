
import { SystemSnapshot } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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

export const createSnapshot = async (label: string): Promise<SystemSnapshot> => {
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
  while (existing.length > MAX_SNAPSHOTS) existing.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  // Async sync to Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('snapshots').insert({
        id: snapshot.id,
        label: snapshot.label,
        timestamp: snapshot.timestamp,
        data: snapshot.data,
      });
      if (error) console.warn('[Supabase] Snapshot insert failed (localStorage OK):', error.message);
    } catch (e) {
      console.warn('[Supabase] Snapshot insert network error:', e);
    }
  }

  return snapshot;
};

export const restoreSnapshot = (id: string): boolean => {
  const snapshots = listSnapshots();
  const target = snapshots.find(s => s.id === id);
  if (!target) return false;

  STATE_KEYS.forEach(key => localStorage.removeItem(key));

  Object.entries(target.data).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  return true;
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  const snapshots = listSnapshots().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('snapshots').delete().eq('id', id);
      if (error) console.warn('[Supabase] Snapshot delete failed:', error.message);
    } catch (e) {
      console.warn('[Supabase] Snapshot delete network error:', e);
    }
  }
};

/** Synchronous read from localStorage (for internal callers) */
export const listSnapshots = (): SystemSnapshot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Async fetch: merges Supabase cloud data with localStorage */
export const fetchSnapshots = async (): Promise<SystemSnapshot[]> => {
  const local = listSnapshots();

  if (!isSupabaseConfigured() || !supabase) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('[Supabase] Snapshot fetch failed, using localStorage:', error.message);
      return local;
    }

    // Merge: cloud takes precedence, add local-only snapshots
    const cloudMap = new Map<string, SystemSnapshot>();
    (data || []).forEach((row: any) => {
      cloudMap.set(row.id, {
        id: row.id,
        label: row.label,
        timestamp: row.timestamp,
        data: row.data,
      });
    });

    local.forEach(s => {
      if (!cloudMap.has(s.id)) cloudMap.set(s.id, s);
    });

    const merged = Array.from(cloudMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_SNAPSHOTS);

    // Update localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    return merged;
  } catch (e) {
    console.warn('[Supabase] Snapshot fetch network error:', e);
    return local;
  }
};

export const hasBaselineSnapshot = (): boolean => {
  return listSnapshots().some(s => s.label === 'AI Native Upgrade Baseline');
};

export const createBaselineIfNeeded = async (): Promise<void> => {
  if (!hasBaselineSnapshot()) {
    await createSnapshot('AI Native Upgrade Baseline');
  }
};
