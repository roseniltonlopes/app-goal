import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  TrendingUp,
  Settings,
  Sun,
  Moon,
  Plus,
  LogOut,
  Database,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ActivityModal } from '@/components/ActivityModal';
import { ToastContainer } from '@/components/ToastContainer';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/planejamento', label: 'Planejamento', icon: CalendarDays, end: false },
  { to: '/meu-dia', label: 'Meu Dia', icon: CheckSquare, end: false },
  { to: '/evolucao', label: 'Evolução', icon: TrendingUp, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
];

export const AppLayout: React.FC = () => {
  const { user, isRemoteSupabase, signOut, updateUserProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  const handleToggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    try {
      await updateUserProfile({ theme: nextTheme });
    } catch {
      // Tema local já foi atualizado
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-primary text-text-primary overflow-x-hidden">
      {/* Sidebar Desktop (Compacta, Sofisticada e Monocromática) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-bg-secondary border-r border-border-subtle z-30">
        {/* Branding */}
        <div className="px-6 py-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-text-primary text-bg-primary flex items-center justify-center font-bold tracking-tighter text-lg">
              G
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-none">GOAL</span>
              <span className="text-[11px] text-text-secondary block mt-1">
                Viva com intenção.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleTheme}
            title={theme === 'dark' ? 'Mudar para Light Mode' : 'Mudar para Dark Mode'}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="p-2 rounded-xl border border-border-subtle bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Botão Criação Rápida */}
        <div className="px-4 pt-5 pb-2">
          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>

        {/* Links de navegação */}
        <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-bg-card text-text-primary border border-border-strong shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50 border border-transparent'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Status de Persistência + Usuário */}
        <div className="p-4 border-t border-border-subtle space-y-3 bg-bg-primary/40">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-subtle text-[11px] text-text-secondary">
            <Database className="w-3.5 h-3.5 text-text-primary shrink-0" />
            <span className="truncate">
              {isRemoteSupabase ? 'Conectado ao Supabase' : 'Persistência Local Ativa'}
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user?.full_name || 'Usuário'}
              </p>
              <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Header Mobile Compacto */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-bg-secondary/95 backdrop-blur border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-text-primary text-bg-primary flex items-center justify-center font-bold text-sm">
            G
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block leading-none">GOAL</span>
            <span className="text-[10px] text-text-secondary block">
              Planeje melhor. Viva com intenção.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            aria-label="Criar nova atividade"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-text-primary text-bg-primary text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Atividade</span>
          </button>

          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="p-2 rounded-lg border border-border-subtle bg-bg-card text-text-secondary hover:text-text-primary"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-10 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation Mobile (Compacta e acessível ao toque) */}
      <nav
        aria-label="Navegação mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-secondary/95 backdrop-blur border-t border-border-subtle px-2 py-1.5"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-bg-card text-text-primary border border-border-strong'
                      : 'text-text-secondary hover:text-text-primary'
                  )
                }
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-full">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Modal Global de Criação Rápida */}
      <ActivityModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
      />

      {/* Toasts de Feedback Visual */}
      <ToastContainer />
    </div>
  );
};

export { Compass };
