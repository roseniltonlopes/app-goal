import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sun,
  Moon,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { goalRepository } from '@/services/goalRepository';
import { SupabaseConnectModal } from '@/components/SupabaseConnectModal';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
} from '@/validations/schemas';
import { cn } from '@/lib/utils';
import type { z } from 'zod';

type AuthMode = 'login' | 'register' | 'forgot';

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export const AuthPage: React.FC = () => {
  const { user, isLoading, isRemoteSupabase, signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localResetPassword, setLocalResetPassword] = useState('');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  });

  const forgotForm = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (values: LoginValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signIn(values.email, values.password);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signUp(values.full_name, values.email, values.password);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (values: ForgotValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const msg = await goalRepository.resetPassword(
        values.email,
        !isRemoteSupabase ? localResetPassword : undefined
      );
      setSuccessMsg(msg);
      if (!isRemoteSupabase && localResetPassword.length >= 6) {
        setTimeout(() => switchMode('login'), 1800);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível recuperar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg-primary text-text-primary">
      {/* Coluna Institucional / Manifesto GOAL */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-bg-secondary border-b lg:border-b-0 lg:border-r border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-text-primary text-bg-primary flex items-center justify-center font-bold text-xl">
              G
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block leading-none">GOAL</span>
              <span className="text-xs text-text-secondary">
                Planeje melhor. Viva com intenção.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-bg-card text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="my-10 lg:my-0 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-card border border-border-subtle text-xs text-text-secondary">
            <span>Planejamento Semanal Pessoal & Equilíbrio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Planeje melhor.{' '}
            <span className="text-text-secondary block mt-1">Viva com intenção.</span>
          </h1>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Organize trabalho, academia, estudos, família, leitura e espiritualidade em um único
            ambiente minimalista. Acompanhe o que foi planejado versus o que foi realizado com
            clareza e constância.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              'Agenda semanal com recorrência inteligente',
              'Visão Meu Dia com ações rápidas',
              'Metas semanais por frequência ou horas',
              'Indicadores reais e lembretes WhatsApp',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-bg-card border border-border-subtle text-xs text-text-primary"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary pt-4 border-t border-border-subtle">
          <span>GOAL © {new Date().getFullYear()}</span>
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-card border border-border-subtle hover:border-border-strong text-text-primary transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {isRemoteSupabase ? 'Supabase Cloud Conectado' : 'Conectar Supabase'}
            </span>
          </button>
        </div>
      </div>

      {/* Coluna de Autenticação */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-bg-card border border-border-strong rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Abas Login / Cadastro */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-bg-secondary border border-border-subtle">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={cn(
                'py-2 rounded-lg text-xs font-semibold transition-colors',
                mode === 'login'
                  ? 'bg-text-primary text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={cn(
                'py-2 rounded-lg text-xs font-semibold transition-colors',
                mode === 'register'
                  ? 'bg-text-primary text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Criar Conta
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {mode === 'login' && 'Acesse sua semana'}
              {mode === 'register' && 'Comece a planejar com intenção'}
              {mode === 'forgot' && 'Recuperar acesso'}
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              {mode === 'login' && 'Entre com seu e-mail e senha para carregar seus dados.'}
              {mode === 'register' &&
                'Sua conta já virá configurada com as 9 categorias oficiais do GOAL.'}
              {mode === 'forgot' && 'Informe seu e-mail cadastrado para redefinir sua senha.'}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-bg-secondary border border-text-primary text-xs text-text-primary"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-bg-secondary border border-border-strong text-xs text-text-primary"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    {...loginForm.register('email')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-text-primary mt-1">
                    ⚠ {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-medium text-text-secondary"
                  >
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-text-secondary hover:text-text-primary underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-text-primary mt-1">
                    ⚠ {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Autenticando...' : 'Entrar no GOAL'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORM: CADASTRO */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Nome completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome"
                    {...registerForm.register('full_name')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
                {registerForm.formState.errors.full_name && (
                  <p className="text-xs text-text-primary mt-1">
                    ⚠ {registerForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    {...registerForm.register('email')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-text-primary mt-1">
                    ⚠ {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-pass"
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    Senha
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mín. 6 caracteres"
                    {...registerForm.register('password')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-text-primary mt-1">
                      ⚠ {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    {...registerForm.register('confirm_password')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  />
                  {registerForm.formState.errors.confirm_password && (
                    <p className="text-xs text-text-primary mt-1">
                      ⚠ {registerForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Criando conta...' : 'Criar Minha Conta'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORM: RECUPERAÇÃO DE SENHA */}
          {mode === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  E-mail cadastrado
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  {...forgotForm.register('email')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-xs text-text-primary mt-1">
                    ⚠ {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {!isRemoteSupabase && (
                <div>
                  <label
                    htmlFor="forgot-new-pass"
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    Nova senha (modo local)
                  </label>
                  <input
                    id="forgot-new-pass"
                    type="password"
                    minLength={6}
                    required
                    value={localResetPassword}
                    onChange={(e) => setLocalResetPassword(e.target.value)}
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="px-4 py-2.5 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  Voltar ao Login
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
                >
                  {isSubmitting ? 'Processando...' : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          )}
          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              {isRemoteSupabase
                ? 'Sincronizado com seu projeto Supabase'
                : 'Executando em persistência local'}
            </span>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="font-medium text-text-primary underline hover:opacity-80"
            >
              {isRemoteSupabase ? 'Configurar conexão' : 'Conectar Supabase'}
            </button>
          </div>
        </div>
      </div>

      <SupabaseConnectModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
