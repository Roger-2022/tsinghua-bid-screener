
import { FeedbackRecord, FeedbackStats } from '../types';
import { saveSetting, fetchSetting } from './settingsService';

const STORAGE_KEY = 'tsinghua_feedback';
const SETTING_ID = 'feedback';

const loadFeedback = (): FeedbackRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFeedbackList = (list: FeedbackRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Async sync to backend (fire-and-forget)
  saveSetting(SETTING_ID, list).catch(e =>
    console.warn('[Feedback] Backend sync failed:', e)
  );
};

/** Fetch feedback from backend, merge with localStorage */
export const fetchFeedbackFromBackend = async (): Promise<FeedbackRecord[]> => {
  const local = loadFeedback();
  try {
    const remote = await fetchSetting<FeedbackRecord[]>(SETTING_ID);
    if (!remote || !Array.isArray(remote)) return local;

    // Merge: use the version with more entries, or if same length, prefer remote (newer)
    const remoteMap = new Map<string, FeedbackRecord>();
    remote.forEach(r => remoteMap.set(r.candidateId, r));
    local.forEach(l => {
      const existing = remoteMap.get(l.candidateId);
      // Keep whichever has the later timestamp
      if (!existing || l.timestamp > existing.timestamp) {
        remoteMap.set(l.candidateId, l);
      }
    });

    const merged = Array.from(remoteMap.values());
    // Update localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('[Feedback] Backend fetch failed, using localStorage:', e);
    return local;
  }
};

export const saveFeedback = (
  candidateId: string,
  originalDecision: 'pass' | 'hold' | 'reject',
  adminDecision: FeedbackRecord['adminDecision'],
  reason?: string
): FeedbackRecord => {
  const record: FeedbackRecord = {
    candidateId,
    originalDecision,
    adminDecision,
    reason,
    timestamp: Date.now(),
  };
  const list = loadFeedback();
  // Replace existing feedback for the same candidate
  const existing = list.findIndex(f => f.candidateId === candidateId);
  if (existing >= 0) {
    list[existing] = record;
  } else {
    list.push(record);
  }
  saveFeedbackList(list);
  return record;
};

export const getFeedbackForCandidate = (candidateId: string): FeedbackRecord | null => {
  return loadFeedback().find(f => f.candidateId === candidateId) || null;
};

export const getAllFeedback = (): FeedbackRecord[] => loadFeedback();

export const getFeedbackStats = (): FeedbackStats => {
  const list = loadFeedback();
  if (list.length === 0) {
    return { totalReviewed: 0, agreeRate: 0, overrideBreakdown: {} };
  }
  const agrees = list.filter(f => f.adminDecision === 'agree').length;
  const overrides = list.filter(f => f.adminDecision !== 'agree');
  const breakdown: Record<string, number> = {};
  overrides.forEach(f => {
    breakdown[f.adminDecision] = (breakdown[f.adminDecision] || 0) + 1;
  });
  return {
    totalReviewed: list.length,
    agreeRate: agrees / list.length,
    overrideBreakdown: breakdown,
  };
};
