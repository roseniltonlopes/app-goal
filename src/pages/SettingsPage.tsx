import React, { useState, useEffect } from 'react';
import {
  User,
  Tags,
  Sun,
  Moon,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  ShieldCheck,
  Send,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useGoalData } from '@/contexts/GoalDataContext';
import {
  AVAILABLE_CATEGORY_ICONS,
  CategoryBadge,
  CategoryIcon,
} from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import type { ActivityCategory, CategoryVisualStyle, ThemeMode } from '@/types';

type SettingsTab = 'profile' | 'categories' | 'whatsapp';

export const SettingsPage: React.FC = () => {
  const { profile, updateUserProfile, isRemoteSupabase } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    categories,
    notificationPreferences,
    notificationLogs,
    createCategory,
    updateCategory,
    deleteCategory,
    saveNotificationPreferences,
    triggerWhatsAppCheck,
    notify,
  } = useGoalData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Estado Perfil
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Sao_Paulo');
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(profile?.week_starts_on ?? 1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Estado Categorias
  const [editingCategory, setEditingCategory] = useState<ActivityCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Briefcase');
  const [catStyle, setCatStyle] = useState<CategoryVisualStyle>('solid');

  // Estado WhatsApp
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(15);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false);
  const [dailySummaryTime, setDailySummaryTime] = useState('07:00');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [isTriggeringCheck, setIsTriggeringCheck] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setTimezone(profile.timezone || 'America/Sao_Paulo');
      setWeekStartsOn(profile.week_starts_on ?? 1);
    }
  }, [profile]);

  useEffect(() => {
    if (notificationPreferences) {
      setPhoneCountryCode(notificationPreferences.phone_country_code || '+55');
      setPhoneNumber(notificationPreferences.phone_number || '');
      setWhatsappEnabled(notificationPreferences.whatsapp_enabled);
      setConsentGiven(notificationPreferences.consent_given);
      setOptedOut(notificationPreferences.opted_out);
      setDefaultReminderMinutes(notificationPreferences.default_reminder_minutes || 15);
      setDailySummaryEnabled(notificationPreferences.daily_summary_enabled);
      setDailySummaryTime(notificationPreferences.daily_summary_time || '07:00');
      setQuietHoursEnabled(notificationPreferences.quiet_hours_enabled);
      setQuietHoursStart(notificationPreferences.quiet_hours_start || '22:00');
      setQuietHoursEnd(notificationPreferences.quiet_hours_end || '07:00');
    }
  }, [notificationPreferences]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        timezone,
        week_starts_on: weekStartsOn,
        theme,
      });
      notify({
        type: 'success',
        title: 'Perfil atualizado',
        description: 'Suas preferências de perfil, tema e fuso horário foram salvas.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Erro ao salvar perfil',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSelectTheme = async (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    try {
      await updateUserProfile({ theme: nextTheme });
    } catch {
      // Tema local já persistido
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: catName,
        icon: catIcon,
        visual_style: catStyle,
      });
      setEditingCategory(null);
    } else {
      await createCategory({
        name: catName,
        icon: catIcon,
        visual_style: catStyle,
      });
    }
    setCatName('');
    setCatIcon('Briefcase');
    setCatStyle('solid');
  };

  const startEditCategory = (cat: ActivityCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatStyle(cat.visual_style);
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    try {
      await saveNotificationPreferences({
        phone_country_code: phoneCountryCode.startsWith('+')
          ? phoneCountryCode
          : `+${phoneCountryCode}`,
        phone_number: phoneNumber.replace(/\D/g, ''),
        whatsapp_enabled: optedOut ? false : whatsappEnabled,
        consent_given: consentGiven,
        opted_out: optedOut,
        default_reminder_minutes: Number(defaultReminderMinutes),
        daily_summary_enabled: dailySummaryEnabled,
        daily_summary_time: dailySummaryTime,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
      });
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleOptOutImmediately = async () => {
    setOptedOut(true);
    setWhatsappEnabled(false);
    await saveNotificationPreferences({
      opted_out: true,
      whatsapp_enabled: false,
    });
  };

  const handleTestReminderEngine = async () => {
    setIsTriggeringCheck(true);
    try {
      await triggerWhatsAppCheck();
    } finally {
      setIsTriggeringCheck(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-border-subtle pb-5">
        <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
          Preferências & Personalização
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">Configurações</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Gerencie seu perfil, tema Dark/Light, categorias personalizadas e lembretes por WhatsApp
        </p>
      </div>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'profile'
              ? 'bg-text-primary text-bg-primary'
              : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-subtle'
          )}
        >
          <User className="w-4 h-4" />
          <span>Perfil, Tema & Fuso Horário</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'categories'
              ? 'bg-text-primary text-bg-primary'
              : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-subtle'
          )}
        >
          <Tags className="w-4 h-4" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'whatsapp'
              ? 'bg-text-primary text-bg-primary'
              : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-subtle'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Lembretes por WhatsApp</span>
        </button>
      </div>

      {/* ABA 1: PERFIL, TEMA E FUSO HORÁRIO */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-text-primary">Dados do Perfil</h2>
              <p className="text-xs text-text-secondary">
                Suas preferências pessoais sincronizadas na sua conta
              </p>
            </div>

            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-text-secondary mb-1">
                Nome de exibição
              </label>
              <input
                id="prof-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
              />
            </div>

            <div>
              <label htmlFor="prof-tz" className="block text-xs font-medium text-text-secondary mb-1">
                Fuso horário (Timezone)
              </label>
              <select
                id="prof-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília - GMT-3)</option>
                <option value="America/Manaus">America/Manaus (Amazonas - GMT-4)</option>
                <option value="America/Fortaleza">America/Fortaleza (Nordeste - GMT-3)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/Lisbon">Europe/Lisbon (Lisboa)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label htmlFor="prof-week" className="block text-xs font-medium text-text-secondary mb-1">
                Início da semana no calendário
              </label>
              <select
                id="prof-week"
                value={weekStartsOn}
                onChange={(e) => setWeekStartsOn(Number(e.target.value) as 0 | 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
              >
                <option value={1}>Segunda-feira (Padrão)</option>
                <option value={0}>Domingo</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </form>

          {/* Controle de Tema Visual (Dark Mode Padrão / Light Mode) */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-5">
            <div>
              <h2 className="text-base font-bold text-text-primary">Identidade Visual & Tema</h2>
              <p className="text-xs text-text-secondary">
                Paleta monocromática oficial GOAL (#000000, #FFFFFF, #C9CAC5, #272726, #171716)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectTheme('dark')}
                className={cn(
                  'p-4 rounded-2xl border text-left transition-all space-y-2',
                  theme === 'dark'
                    ? 'border-text-primary ring-1 ring-text-primary bg-bg-secondary'
                    : 'border-border-subtle bg-bg-secondary/40 hover:border-border-strong'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">Dark Mode</span>
                  <Moon className="w-4 h-4 text-text-primary" />
                </div>
                <p className="text-xs text-text-secondary">
                  Tema padrão do GOAL. Fundo #000000, superfícies #171716 e cards #272726.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('light')}
                className={cn(
                  'p-4 rounded-2xl border text-left transition-all space-y-2',
                  theme === 'light'
                    ? 'border-text-primary ring-1 ring-text-primary bg-bg-secondary'
                    : 'border-border-subtle bg-bg-secondary/40 hover:border-border-strong'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">Light Mode</span>
                  <Sun className="w-4 h-4 text-text-primary" />
                </div>
                <p className="text-xs text-text-secondary">
                  Versão clara do mesmo produto. Fundo #FFFFFF, texto #000000 e bordas #C9CAC5.
                </p>
              </button>
            </div>

            {/* Demonstração das amostras da paleta oficial */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle space-y-2">
              <span className="text-xs font-medium text-text-secondary">
                Amostras da Paleta Oficial:
              </span>
              <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-center">
                <div className="space-y-1">
                  <div className="h-8 rounded-lg bg-[#000000] border border-[#272726]" />
                  <span>#000000</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 rounded-lg bg-[#171716] border border-[#272726]" />
                  <span>#171716</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 rounded-lg bg-[#272726] border border-[#C9CAC5]" />
                  <span>#272726</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 rounded-lg bg-[#C9CAC5] border border-[#272726]" />
                  <span>#C9CAC5</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 rounded-lg bg-[#FFFFFF] border border-[#272726]" />
                  <span>#FFFFFF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CATEGORIAS INICIAIS E PERSONALIZADAS */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário Criar/Editar Categoria */}
          <form
            onSubmit={handleSaveCategory}
            className="p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4 h-fit"
          >
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria Personalizada'}
              </h2>
              <p className="text-xs text-text-secondary">
                Personalize nome, ícone e estilo monocromático
              </p>
            </div>

            <div>
              <label htmlFor="cat-name" className="block text-xs font-medium text-text-secondary mb-1">
                Nome da categoria *
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Idiomas, Meditação, Voluntariado..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-text-secondary mb-1.5">
                Ícone representativo
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {AVAILABLE_CATEGORY_ICONS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setCatIcon(item.name)}
                    className={cn(
                      'p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] transition-colors',
                      catIcon === item.name
                        ? 'bg-text-primary text-bg-primary border-text-primary'
                        : 'bg-bg-secondary text-text-secondary border-border-subtle hover:text-text-primary'
                    )}
                  >
                    <CategoryIcon name={item.name} className="w-4 h-4" />
                    <span className="truncate max-w-full">{item.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="cat-style" className="block text-xs font-medium text-text-secondary mb-1">
                Preferência visual (Monocromática)
              </label>
              <select
                id="cat-style"
                value={catStyle}
                onChange={(e) => setCatStyle(e.target.value as CategoryVisualStyle)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
              >
                <option value="solid">Sólido (Alto contraste)</option>
                <option value="outline">Contorno (Minimalista)</option>
                <option value="subtle">Suave (Superfície discreta)</option>
                <option value="striped">Listrado sutil</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName('');
                  }}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs text-text-secondary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                <span>{editingCategory ? 'Atualizar Categoria' : 'Criar Categoria'}</span>
              </button>
            </div>
          </form>

          {/* Lista de Categorias Ativas */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Categorias Disponíveis ({categories.length})
              </h2>
              <p className="text-xs text-text-secondary">
                A exclusão de uma categoria preserva automaticamente todas as atividades existentes,
                transferindo-as com segurança para "Outros".
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryBadge category={cat} size="md" />
                    {cat.is_default && (
                      <span className="text-[10px] text-text-secondary font-mono">Padrão</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      aria-label={`Editar categoria ${cat.name}`}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {cat.slug !== 'outros' && (
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.id)}
                        aria-label={`Excluir categoria ${cat.name}`}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: LEMBRETES POR WHATSAPP & LOGS DE BACKEND */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveWhatsApp}
            className="p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Preferências de Lembretes por WhatsApp
                </h2>
                <p className="text-xs text-text-secondary">
                  Integração via Supabase Edge Function (`whatsapp-reminders`) e WhatsApp Business
                  Cloud API
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-text-primary shrink-0" />
            </div>

            {/* Telefone com código do país */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="wa-ddi" className="block text-xs font-medium text-text-secondary mb-1">
                  Código do País (DDI)
                </label>
                <input
                  id="wa-ddi"
                  type="text"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  placeholder="+55"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm font-mono text-text-primary"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="wa-phone" className="block text-xs font-medium text-text-secondary mb-1">
                  DDD + Número do WhatsApp
                </label>
                <input
                  id="wa-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="11999999999"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm font-mono text-text-primary"
                />
              </div>
            </div>

            {/* Consentimento e Ativação */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (e.target.checked) setOptedOut(false);
                  }}
                  className="mt-0.5 w-4 h-4 accent-current"
                />
                <span>
                  <strong>Autorizo o recebimento de mensagens via WhatsApp (Opt-in)</strong>
                  <span className="block text-text-secondary mt-0.5">
                    Concordo em receber lembretes das minhas atividades planejadas e resumos diários
                    no número informado acima.
                  </span>
                </span>
              </label>

              <label className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs text-text-primary cursor-pointer">
                <span>Ativar envio automático de lembretes por WhatsApp</span>
                <input
                  type="checkbox"
                  checked={whatsappEnabled && !optedOut}
                  disabled={!consentGiven}
                  onChange={(e) => {
                    setWhatsappEnabled(e.target.checked);
                    if (e.target.checked) setOptedOut(false);
                  }}
                  className="w-4 h-4 accent-current"
                />
              </label>
            </div>

            {/* Antecedência e Resumo Diário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="wa-advance"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Antecedência padrão dos lembretes
                </label>
                <select
                  id="wa-advance"
                  value={defaultReminderMinutes}
                  onChange={(e) => setDefaultReminderMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
                >
                  <option value={5}>5 minutos antes</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={120}>2 horas antes</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wa-summary-time"
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Resumo diário da agenda
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="Ativar resumo diário"
                    checked={dailySummaryEnabled}
                    onChange={(e) => setDailySummaryEnabled(e.target.checked)}
                    className="w-4 h-4 accent-current"
                  />
                  <input
                    id="wa-summary-time"
                    type="time"
                    value={dailySummaryTime}
                    onChange={(e) => setDailySummaryTime(e.target.value)}
                    disabled={!dailySummaryEnabled}
                    className="flex-1 px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Horários Silenciosos */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Horários silenciosos (Não perturbe)
                </span>
                <input
                  type="checkbox"
                  aria-label="Ativar horários silenciosos"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="w-4 h-4 accent-current"
                />
              </div>

              {quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="wa-quiet-start"
                      className="block text-[11px] text-text-secondary mb-1"
                    >
                      Silenciar a partir de:
                    </label>
                    <input
                      id="wa-quiet-start"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-subtle text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wa-quiet-end"
                      className="block text-[11px] text-text-secondary mb-1"
                    >
                      Retomar envios às:
                    </label>
                    <input
                      id="wa-quiet-end"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-subtle text-xs text-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ações Salvar e Opt-Out */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleOptOutImmediately}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Interromper Mensagens (Opt-out)</span>
              </button>

              <button
                type="submit"
                disabled={isSavingWhatsApp}
                className="px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
              >
                {isSavingWhatsApp ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </form>

          {/* Coluna Direita: Status de Backend, Documentação e Logs de Notificação */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Motor de Lembretes & Auditoria (`notification_logs`)
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Nenhum token é armazenado no frontend. Os disparos ocorrem via Edge Function.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isTriggeringCheck}
                  onClick={handleTestReminderEngine}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTriggeringCheck ? 'Verificando...' : 'Verificar Fila Agora'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs space-y-1.5">
                <p className="font-semibold text-text-primary">
                  Status da Integração WhatsApp Business Platform:
                </p>
                <p className="text-text-secondary leading-relaxed">
                  A Edge Function <code className="font-mono">supabase/functions/whatsapp-reminders/index.ts</code> está implementada com validação de consentimento, horários silenciosos, controle de duplicidade e chamada para a Graph API da Meta. Para ativar o disparo externo real em produção, configure os secrets <code className="font-mono">WHATSAPP_API_TOKEN</code> e <code className="font-mono">WHATSAPP_PHONE_NUMBER_ID</code> no projeto Supabase ({isRemoteSupabase ? 'Supabase conectado' : 'Atualmente em modo local'}).
                </p>
              </div>

              {/* Lista de Logs */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notificationLogs.length === 0 ? (
                  <p className="text-xs text-text-secondary py-6 text-center">
                    Nenhum registro em <code className="font-mono">notification_logs</code> até o
                    momento. Clique em "Verificar Fila Agora" para validar suas regras.
                  </p>
                ) : (
                  notificationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-bg-secondary border border-border-subtle text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-text-primary">
                          {log.recipient_phone} · {log.status}
                        </span>
                        <span className="text-[11px] font-mono text-text-secondary">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {log.payload_summary && (
                        <p className="text-text-primary">{log.payload_summary}</p>
                      )}
                      {log.error_message && (
                        <p className="text-text-secondary flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{log.error_message}</span>
                        </p>
                      )}
                      {log.external_message_id && (
                        <p className="text-[11px] font-mono text-text-secondary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ID Externo: {log.external_message_id}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
