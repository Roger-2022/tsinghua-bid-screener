import { CandidateRecord } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---- Helper: CandidateRecord → Supabase row ----
function toRow(record: CandidateRecord) {
  return {
    id: record.candidate_id,
    display_name: record.display_name,
    status: record.status,
    status_badge: record.status_badge_text_zh,
    name: record.profile.name,
    email: record.profile.email || null,
    phone: record.profile.phone || null,
    wechat_id: record.profile.wechat_id || null,
    identity: record.profile.identity,
    school_org: record.profile.school_org,
    score_overall: record.scores.overall,
    data: record,
  };
}

// ---- Helper: Supabase row → CandidateRecord ----
function fromRow(row: { data: unknown }): CandidateRecord {
  return row.data as CandidateRecord;
}

const LS_KEY = 'tsinghua_candidates';

function saveToLocalStorage(records: CandidateRecord[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(records));
}

function loadFromLocalStorage(): CandidateRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---- Public API ----

/** Insert a new candidate (anonymous — no auth required by RLS) */
export async function insertCandidate(record: CandidateRecord): Promise<{ ok: boolean; error?: string }> {
  // Always write to localStorage first (immediate feedback)
  const local = loadFromLocalStorage();
  local.push(record);
  saveToLocalStorage(local);

  if (!isSupabaseConfigured() || !supabase) {
    return { ok: true };
  }

  try {
    const { error } = await supabase.from('candidates').insert(toRow(record));
    if (error) {
      console.warn('[Supabase] Insert failed (localStorage OK):', error.message);
      return { ok: true, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Supabase] Insert network error:', e);
    return { ok: true, error: String(e) };
  }
}

/** Fetch all candidates from cloud (admin only — requires auth session) */
export async function fetchCandidates(): Promise<CandidateRecord[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('data')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Fetch failed, falling back to localStorage:', error.message);
      return loadFromLocalStorage();
    }

    const records = (data || []).map(fromRow);
    // Update localStorage cache
    saveToLocalStorage(records);
    return records;
  } catch (e) {
    console.warn('[Supabase] Fetch network error, falling back to localStorage:', e);
    return loadFromLocalStorage();
  }
}

/** Update a candidate record (admin only) */
export async function updateCandidate(record: CandidateRecord): Promise<{ ok: boolean; error?: string }> {
  const local = loadFromLocalStorage();
  const idx = local.findIndex(c => c.candidate_id === record.candidate_id);
  if (idx >= 0) local[idx] = record; else local.push(record);
  saveToLocalStorage(local);

  if (!isSupabaseConfigured() || !supabase) {
    return { ok: true };
  }

  try {
    const { error } = await supabase
      .from('candidates')
      .update(toRow(record))
      .eq('id', record.candidate_id);
    if (error) {
      console.warn('[Supabase] Update failed:', error.message);
      return { ok: true, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Supabase] Update network error:', e);
    return { ok: true, error: String(e) };
  }
}

/** Delete a candidate (admin only) */
export async function deleteCandidate(candidateId: string): Promise<{ ok: boolean; error?: string }> {
  const local = loadFromLocalStorage().filter(c => c.candidate_id !== candidateId);
  saveToLocalStorage(local);

  if (!isSupabaseConfigured() || !supabase) {
    return { ok: true };
  }

  try {
    const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
    if (error) {
      console.warn('[Supabase] Delete failed:', error.message);
      return { ok: true, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Supabase] Delete network error:', e);
    return { ok: true, error: String(e) };
  }
}

/** Bulk upsert — for import, sync, or migration */
export async function upsertCandidates(records: CandidateRecord[]): Promise<{ ok: boolean; error?: string }> {
  saveToLocalStorage(records);

  if (!isSupabaseConfigured() || !supabase) {
    return { ok: true };
  }

  try {
    const rows = records.map(toRow);
    const { error } = await supabase.from('candidates').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Bulk upsert failed:', error.message);
      return { ok: true, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Supabase] Bulk upsert network error:', e);
    return { ok: true, error: String(e) };
  }
}
