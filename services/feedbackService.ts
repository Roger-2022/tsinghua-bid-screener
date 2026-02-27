
import { FeedbackRecord, FeedbackStats } from '../types';

const STORAGE_KEY = 'tsinghua_feedback';

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
