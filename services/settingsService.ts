import { ApiConfig } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const TABLE = 'app_settings';

// ---- Generic helpers ----

/** Fetch any setting by id from app_settings (returns null if not found) */
export async function fetchSetting<T = unknown>(id: string): Promise<T | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data.value as T;
  } catch (e) {
    console.warn(`[Settings] Fetch ${id} failed:`, e);
    return null;
  }
}

/** Save (upsert) any setting by id into app_settings */
export async function saveSetting(id: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: true };

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { id, value, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn(`[Settings] Save ${id} failed:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn(`[Settings] Save ${id} network error:`, e);
    return { ok: false, error: String(e) };
  }
}

/** Fetch multiple settings in one call */
export async function fetchAllSettings(ids: string[]): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured() || !supabase) return {};

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, value')
      .in('id', ids);

    if (error || !data) return {};
    const map: Record<string, unknown> = {};
    for (const row of data) {
      map[row.id] = row.value;
    }
    return map;
  } catch (e) {
    console.warn('[Settings] Fetch all settings failed:', e);
    return {};
  }
}

// ---- Legacy wrappers (keep for backward compat) ----

/** Fetch API config from Supabase (falls back to null if not available) */
export async function fetchApiConfig(): Promise<ApiConfig | null> {
  return fetchSetting<ApiConfig>('api_config');
}

/** Save API config to Supabase (upsert) */
export async function saveApiConfig(config: ApiConfig): Promise<{ ok: boolean; error?: string }> {
  return saveSetting('api_config', config);
}
