import { ApiConfig } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const TABLE = 'app_settings';

/** Fetch API config from Supabase (falls back to null if not available) */
export async function fetchApiConfig(): Promise<ApiConfig | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('id', 'api_config')
      .single();

    if (error || !data) return null;
    return data.value as ApiConfig;
  } catch (e) {
    console.warn('[Settings] Fetch api_config failed:', e);
    return null;
  }
}

/** Save API config to Supabase (upsert) */
export async function saveApiConfig(config: ApiConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: true };

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { id: 'api_config', value: config, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[Settings] Save api_config failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Settings] Save api_config network error:', e);
    return { ok: false, error: String(e) };
  }
}
