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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { goalRepository } from '@/services/goalRepository';
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
    <div className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary px-4 py-6 sm:px-8">
      {/* Topo Minimalista: Logo + Alternância de Tema */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-text-primary text-bg-primary flex items-center justify-center font-bold text-lg">
            G
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-none">GOAL</span>
            <span className="text-[11px] text-text-secondary">
              Planeje melhor. Viva com intenção.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="p-2 rounded-xl border border-border-subtle bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Centro: Resumo Curto + Card Único de Login / Cadastro */}
      <main className="w-full max-w-md mx-auto my-8 space-y-5">
        <div className="text-center space-y-1.5 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Planeje melhor. Viva com intenção.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Organize sua rotina semanal, acompanhe hábitos e metas e evolua com equilíbrio em um
            único lugar.
          </p>
        </div>

        <div className="w-full bg-bg-card border border-border-strong rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl">
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
            <h2 className="text-lg font-bold text-text-primary">
              {mode === 'login' && 'Acesse sua conta'}
              {mode === 'register' && 'Crie sua conta gratuita'}
              {mode === 'forgot' && 'Recuperar senha'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {mode === 'login' && 'Informe seu e-mail e senha para continuar.'}
              {mode === 'register' && 'Preencha seus dados para iniciar seu planejamento.'}
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
                <span>{isSubmitting ? 'Autenticando...' : 'Entrar'}</span>
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
        </div>
      </main>

      <footer className="w-full max-w-md mx-auto text-center text-[11px] text-text-secondary">
        GOAL © {new Date().getFullYear()} — Planejamento Semanal Pessoal
      </footer>
    </div>
  );
};
