import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, Trash2, X, ExternalLink } from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
} from '@/lib/supabase';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [source, setSource] = useState<'runtime' | 'env' | 'none'>('none');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getActiveSupabaseConfig();
      setUrl(cfg.source === 'runtime' ? cfg.url : '');
      setAnonKey(cfg.source === 'runtime' ? cfg.anonKey : '');
      setSource(cfg.source);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      saveRuntimeSupabaseConfig(url, anonKey);
      setSuccessMsg('Supabase conectado com sucesso! Recarregando a aplicação...');
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao validar credenciais.');
    }
  };

  const handleDisconnect = () => {
    clearRuntimeSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setSource(getActiveSupabaseConfig().source);
    setSuccessMsg('Conexão manual removida. Recarregando...');
    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supa-connect-title"
    >
      <div className="bg-bg-card border border-border-strong rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-bg-secondary border border-border-subtle">
              <Database className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <h2 id="supa-connect-title" className="text-base font-bold text-text-primary">
                Conectar Projeto Supabase
              </h2>
              <p className="text-xs text-text-secondary">
                Vincule seu banco PostgreSQL real pelo celular ou desktop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs space-y-1.5">
          <div className="flex items-center justify-between font-medium text-text-primary">
            <span>Status atual:</span>
            <span>
              {source === 'runtime' && 'Conectado via Chave no Dispositivo'}
              {source === 'env' && 'Conectado via Variáveis .env'}
              {source === 'none' && 'Modo Persistente Local'}
            </span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Cole abaixo a <strong>Project URL</strong> e a <strong>anon public key</strong> do seu
            painel Supabase (<em>Project Settings → API</em>). Certifique-se de ter executado o SQL
            de migração (<code className="font-mono">supabase/migrations/</code>) no SQL Editor do
            Supabase.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-secondary border border-text-primary text-xs text-text-primary">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-secondary border border-border-strong text-xs text-text-primary">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="supa-url"
              className="block text-xs font-medium text-text-secondary mb-1"
            >
              Supabase Project URL *
            </label>
            <input
              id="supa-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-text-primary"
            />
          </div>

          <div>
            <label
              htmlFor="supa-key"
              className="block text-xs font-medium text-text-secondary mb-1"
            >
              Supabase Anon Public Key *
            </label>
            <input
              id="supa-key"
              type="password"
              required
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-text-primary"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle">
            {source === 'runtime' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-xs text-text-secondary hover:text-text-primary"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            ) : (
              <span className="text-[11px] text-text-secondary inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> RLS Protegido
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
              >
                Conectar Supabase
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
