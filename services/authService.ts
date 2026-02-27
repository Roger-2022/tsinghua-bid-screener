import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
}

/** Sign in with email/password. Falls back to hardcoded check when Supabase is not configured. */
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback: hardcoded login for local dev without Supabase
    if (email === 'admin@mails.tsinghua.edu.cn' && password === 'BIDBIDBID88') {
      return { user: { id: 'local-admin', email }, error: null };
    }
    return { user: null, error: '邮箱或密码错误' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: '登录失败' };
    return { user: { id: data.user.id, email: data.user.email || email }, error: null };
  } catch (e) {
    return { user: null, error: String(e) };
  }
}

/** Sign out */
export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/** Get current session (for restoring auth on page reload) */
export async function getSession(): Promise<AuthUser | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return { id: data.session.user.id, email: data.session.user.email || '' };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
    if (session?.user) {
      callback({ id: session.user.id, email: session.user.email || '' });
    } else {
      callback(null);
    }
  });
  return () => subscription.unsubscribe();
}
