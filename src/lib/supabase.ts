import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const RUNTIME_SUPABASE_URL_KEY = 'goal_runtime_supabase_url';
export const RUNTIME_SUPABASE_ANON_KEY = 'goal_runtime_supabase_anon_key';

// Credenciais públicas (anon) do projeto Supabase oficial do GOAL (protegido por RLS)
export const DEFAULT_PROJECT_SUPABASE_URL = 'https://xkilcwryxdpkwocozotj.supabase.co';
export const DEFAULT_PROJECT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraWxjd3J5eGRwa3dvY296b3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTM5NzAsImV4cCI6MjEwODUyOTk3MH0.5moZ21ptBENIRXQ62xlipCHYPKtLeh2I_JfKiwPJf_Y';

function getSafeLocalStorage(key: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem(key) || '').trim();
    }
  } catch {
    // ignore storage errors
  }
  return '';
}

export function getActiveSupabaseConfig(): {
  url: string;
  anonKey: string;
  source: 'runtime' | 'env' | 'none';
} {
  // Envitando conectar ao Supabase real durante a execução de testes unitários no Vitest
  if (typeof process !== 'undefined' && process.env?.VITEST) {
    return { url: '', anonKey: '', source: 'none' };
  }

  const runtimeUrl = getSafeLocalStorage(RUNTIME_SUPABASE_URL_KEY);
  const runtimeKey = getSafeLocalStorage(RUNTIME_SUPABASE_ANON_KEY);

  if (
    runtimeUrl &&
    runtimeKey &&
    runtimeUrl.startsWith('http') &&
    !runtimeUrl.includes('xyzcompany.supabase.co')
  ) {
    return { url: runtimeUrl, anonKey: runtimeKey, source: 'runtime' };
  }

  const envUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
    DEFAULT_PROJECT_SUPABASE_URL;
  const envKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    DEFAULT_PROJECT_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    envUrl.startsWith('http') &&
    !envUrl.includes('xyzcompany.supabase.co')
  ) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  return { url: '', anonKey: '', source: 'none' };
}

const initialConfig = getActiveSupabaseConfig();

export let isSupabaseConfigured = initialConfig.source !== 'none';

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(initialConfig.url, initialConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function saveRuntimeSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = anonKey.trim();

  if (!cleanUrl.startsWith('http')) {
    throw new Error('A Project URL deve iniciar com https:// (ex: https://xyz.supabase.co).');
  }
  if (cleanKey.length < 20) {
    throw new Error('A Anon Key informada parece inválida ou incompleta.');
  }

  localStorage.setItem(RUNTIME_SUPABASE_URL_KEY, cleanUrl);
  localStorage.setItem(RUNTIME_SUPABASE_ANON_KEY, cleanKey);

  supabase = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  isSupabaseConfigured = true;
}

export function clearRuntimeSupabaseConfig(): void {
  localStorage.removeItem(RUNTIME_SUPABASE_URL_KEY);
  localStorage.removeItem(RUNTIME_SUPABASE_ANON_KEY);
  const fallback = getActiveSupabaseConfig();
  isSupabaseConfigured = fallback.source !== 'none';
  supabase = isSupabaseConfigured
    ? createClient(fallback.url, fallback.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
}
