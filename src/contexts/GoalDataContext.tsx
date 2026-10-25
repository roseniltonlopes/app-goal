import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { goalRepository } from '@/services/goalRepository';
import {
  formatDateISO,
  startOfWeek,
  endOfWeek,
  addDays,
  formatHoursDecimal,
} from '@/lib/utils';
import type {
  ActivityCategory,
  ActivityTemplate,
  ScheduledActivity,
  WeeklyGoal,
  WeeklyGoalProgress,
  NotificationPreference,
  NotificationLog,
  DashboardIndicators,
  ActivityStatus,
  ActivityType,
  CategoryVisualStyle,
  GoalType,
} from '@/types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface GoalDataContextValue {
  // Datas selecionadas
  selectedWeekDate: Date;
  setSelectedWeekDate: (date: Date) => void;
  selectedDayDate: Date;
  setSelectedDayDate: (date: Date) => void;
  weekStartISO: string;
  weekEndISO: string;
  // Dados carregados
  categories: ActivityCategory[];
  templates: ActivityTemplate[];
  weekActivities: ScheduledActivity[];
  historyActivities: ScheduledActivity[];
  weeklyGoals: WeeklyGoal[];
  goalsProgress: WeeklyGoalProgress[];
  indicators: DashboardIndicators;
  notificationPreferences: NotificationPreference | null;
  notificationLogs: NotificationLog[];
  isLoadingData: boolean;
  // Toasts de feedback visual
  toasts: ToastMessage[];
  notify: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  // Ações de dados
  refreshAll: () => Promise<void>;
  createActivity: (payload: {
    title: string;
    category_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    description?: string;
    activity_type: ActivityType;
    is_recurring: boolean;
    days_of_week: number[];
    recurrence_end_date?: string;
    reminder_enabled: boolean;
    reminder_minutes_before: number;
  }) => Promise<ScheduledActivity>;
  updateActivity: (
    activityId: string,
    payload: {
      title: string;
      category_id: string;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      description?: string;
      activity_type: ActivityType;
      days_of_week?: number[];
      recurrence_end_date?: string;
      reminder_enabled: boolean;
      reminder_minutes_before: number;
    },
    scope?: 'single' | 'series'
  ) => Promise<ScheduledActivity>;
  deleteActivity: (activityId: string, scope?: 'single' | 'series') => Promise<void>;
  setActivityStatus: (
    activityId: string,
    status: ActivityStatus,
    actualDurationMinutes?: number
  ) => Promise<void>;
  rescheduleActivity: (
    activityId: string,
    newSchedule: {
      scheduled_date: string;
      start_time: string;
      end_time: string;
      reason?: string;
    }
  ) => Promise<void>;
  createCategory: (payload: {
    name: string;
    icon: string;
    visual_style: CategoryVisualStyle;
  }) => Promise<ActivityCategory>;
  updateCategory: (
    categoryId: string,
    payload: { name: string; icon: string; visual_style: CategoryVisualStyle }
  ) => Promise<ActivityCategory>;
  deleteCategory: (categoryId: string) => Promise<void>;
  createWeeklyGoal: (payload: {
    title: string;
    category_id?: string;
    goal_type: GoalType;
    target_value: number;
    unit: string;
    description?: string;
  }) => Promise<void>;
  updateWeeklyGoal: (
    goalId: string,
    payload: {
      title: string;
      category_id?: string;
      goal_type: GoalType;
      target_value: number;
      unit: string;
      description?: string;
    }
  ) => Promise<void>;
  deleteWeeklyGoal: (goalId: string) => Promise<void>;
  saveNotificationPreferences: (updates: Partial<NotificationPreference>) => Promise<void>;
  triggerWhatsAppCheck: () => Promise<void>;
}

const GoalDataContext = createContext<GoalDataContextValue | undefined>(undefined);

export const GoalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(() => new Date());

  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [weekActivities, setWeekActivities] = useState<ScheduledActivity[]>([]);
  const [historyActivities, setHistoryActivities] = useState<ScheduledActivity[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreference | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const weekStartsOn: 0 | 1 = profile?.week_starts_on ?? 1;

  const weekStartISO = useMemo(
    () => formatDateISO(startOfWeek(selectedWeekDate, { weekStartsOn })),
    [selectedWeekDate, weekStartsOn]
  );

  const weekEndISO = useMemo(
    () => formatDateISO(endOfWeek(selectedWeekDate, { weekStartsOn })),
    [selectedWeekDate, weekStartsOn]
  );

  const notify = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setTemplates([]);
      setWeekActivities([]);
      setHistoryActivities([]);
      setWeeklyGoals([]);
      setNotificationPreferences(null);
      setNotificationLogs([]);
      return;
    }

    setIsLoadingData(true);
    try {
      // Janela ampliada de 5 semanas anteriores até 1 semana futura para os gráficos de evolução semanal/mensal
      const historyStartISO = formatDateISO(
        addDays(startOfWeek(selectedWeekDate, { weekStartsOn }), -28)
      );
      const historyEndISO = formatDateISO(
        addDays(endOfWeek(selectedWeekDate, { weekStartsOn }), 7)
      );

      const [cats, tpls, rangeActs, goals, notifPref, notifLogs] = await Promise.all([
        goalRepository.getCategories(user.id),
        goalRepository.getTemplates(user.id),
        goalRepository.getActivitiesForRange(user.id, historyStartISO, historyEndISO),
        goalRepository.getWeeklyGoals(user.id),
        goalRepository.getNotificationPreferences(user.id),
        goalRepository.getNotificationLogs(user.id),
      ]);

      setCategories(cats);
      setTemplates(tpls);
      setHistoryActivities(rangeActs);
      setWeekActivities(
        rangeActs.filter(
          (a) => a.scheduled_date >= weekStartISO && a.scheduled_date <= weekEndISO
        )
      );
      setWeeklyGoals(goals);
      setNotificationPreferences(notifPref);
      setNotificationLogs(notifLogs);
    } catch (e) {
      console.error('Erro ao sincronizar dados:', e);
      notify({
        type: 'error',
        title: 'Falha ao carregar dados',
        description: e instanceof Error ? e.message : 'Verifique sua conexão.',
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, selectedWeekDate, weekStartsOn, weekStartISO, weekEndISO, notify]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Cálculo em tempo real do progresso das metas semanais a partir das atividades concluídas na semana
  const goalsProgress: WeeklyGoalProgress[] = useMemo(() => {
    const completedInWeek = weekActivities.filter((a) => a.status === 'completed');

    return weeklyGoals.map((goal) => {
      const cat = categories.find((c) => c.id === goal.category_id);
      const matchingActivities = goal.category_id
        ? completedInWeek.filter((a) => a.category_id === goal.category_id)
        : completedInWeek;

      let currentValue = 0;
      if (goal.goal_type === 'frequency' || goal.goal_type === 'quantity') {
        currentValue = matchingActivities.length;
      } else if (goal.goal_type === 'duration') {
        const totalMin = matchingActivities.reduce(
          (acc, item) => acc + (item.actual_duration_minutes ?? item.planned_duration_minutes),
          0
        );
        currentValue = formatHoursDecimal(totalMin);
      }

      const target = Number(goal.target_value) || 1;
      const percentage = Math.min(100, Math.round((currentValue / target) * 100));

      return {
        goal,
        category: cat,
        current_value: currentValue,
        target_value: target,
        percentage,
        is_achieved: currentValue >= target,
      };
    });
  }, [weeklyGoals, weekActivities, categories]);

  // Cálculo dinâmico dos 7 indicadores principais do Dashboard (sem valores fixos, sem penalizar reagendamentos)
  const indicators: DashboardIndicators = useMemo(() => {
    const plannedCount = weekActivities.length;
    const completedList = weekActivities.filter((a) => a.status === 'completed');
    const missedList = weekActivities.filter((a) => a.status === 'missed');
    const pendingList = weekActivities.filter((a) => a.status === 'pending');
    const rescheduledCount = weekActivities.filter((a) => a.rescheduled_count > 0).length;

    // Atividades reagendadas permanecem com status 'pending' até sua realização, não penalizando a taxa.
    const eligibleCount = weekActivities.filter(
      (a) => a.status === 'completed' || a.status === 'missed' || a.status === 'pending'
    ).length;

    const completionRate =
      eligibleCount > 0 ? Math.round((completedList.length / eligibleCount) * 100) : 0;

    const plannedMinutes = weekActivities.reduce(
      (acc, a) => acc + a.planned_duration_minutes,
      0
    );
    const actualMinutes = completedList.reduce(
      (acc, a) => acc + (a.actual_duration_minutes ?? a.planned_duration_minutes),
      0
    );

    const achievedGoalsCount = goalsProgress.filter((g) => g.is_achieved).length;
    const totalGoalsCount = goalsProgress.length;

    // Próxima atividade pendente a partir do momento atual (ou primeira pendente da semana)
    const now = new Date();
    const todayISO = formatDateISO(now);
    const nowHHMM = now.toTimeString().slice(0, 5);

    const upcomingPending = [...historyActivities]
      .filter((a) => a.status === 'pending')
      .filter(
        (a) =>
          a.scheduled_date > todayISO ||
          (a.scheduled_date === todayISO && a.end_time.slice(0, 5) >= nowHHMM)
      )
      .sort(
        (a, b) =>
          a.scheduled_date.localeCompare(b.scheduled_date) ||
          a.start_time.localeCompare(b.start_time)
      );

    const nextActivity =
      upcomingPending[0] ||
      pendingList.sort(
        (a, b) =>
          a.scheduled_date.localeCompare(b.scheduled_date) ||
          a.start_time.localeCompare(b.start_time)
      )[0] ||
      null;

    return {
      plannedCount,
      completedCount: completedList.length,
      missedCount: missedList.length,
      pendingCount: pendingList.length,
      rescheduledCount,
      completionRate,
      plannedHours: formatHoursDecimal(plannedMinutes),
      actualHours: formatHoursDecimal(actualMinutes),
      achievedGoalsCount,
      totalGoalsCount,
      nextActivity,
    };
  }, [weekActivities, historyActivities, goalsProgress]);

  // Wrappers de mutação com tratamento de erros e feedback visual
  const createActivity = async (
    payload: Parameters<GoalDataContextValue['createActivity']>[0]
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const created = await goalRepository.createActivityOrRecurringSeries(user.id, payload, {
        startISO: weekStartISO,
        endISO: weekEndISO,
      });
      await refreshAll();
      notify({
        type: 'success',
        title: payload.is_recurring ? 'Série recorrente criada' : 'Atividade agendada',
        description: `"${payload.title}" foi adicionada ao seu planejamento.`,
      });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar atividade.';
      notify({ type: 'error', title: 'Não foi possível salvar', description: msg });
      throw err;
    }
  };

  const updateActivity = async (
    activityId: string,
    payload: Parameters<GoalDataContextValue['updateActivity']>[1],
    scope: 'single' | 'series' = 'single'
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const updated = await goalRepository.updateActivity(user.id, activityId, payload, scope);
      await refreshAll();
      notify({
        type: 'success',
        title: scope === 'series' ? 'Série recorrente atualizada' : 'Atividade atualizada',
        description: `As alterações em "${payload.title}" foram salvas.`,
      });
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar atividade.';
      notify({ type: 'error', title: 'Falha ao atualizar', description: msg });
      throw err;
    }
  };

  const deleteActivity = async (activityId: string, scope: 'single' | 'series' = 'single') => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      await goalRepository.deleteActivity(user.id, activityId, scope);
      await refreshAll();
      notify({
        type: 'info',
        title: scope === 'series' ? 'Série recorrente removida' : 'Atividade excluída',
        description:
          scope === 'series'
            ? 'O modelo recorrente e as ocorrências pendentes foram removidos.'
            : 'Apenas esta ocorrência foi removida.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir atividade.';
      notify({ type: 'error', title: 'Falha na exclusão', description: msg });
      throw err;
    }
  };

  const setActivityStatus = async (
    activityId: string,
    status: ActivityStatus,
    actualDurationMinutes?: number
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const updated = await goalRepository.updateActivityStatus(
        user.id,
        activityId,
        status,
        actualDurationMinutes
      );
      await refreshAll();
      const statusLabels: Record<ActivityStatus, string> = {
        completed: 'Atividade concluída',
        missed: 'Marcada como não realizada',
        pending: 'Retornada para pendente',
        rescheduled: 'Atividade reagendada',
      };
      notify({
        type: 'success',
        title: statusLabels[status],
        description: `"${updated.title}" foi atualizada.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
      notify({ type: 'error', title: 'Erro ao salvar status', description: msg });
      throw err;
    }
  };

  const rescheduleActivity = async (
    activityId: string,
    newSchedule: {
      scheduled_date: string;
      start_time: string;
      end_time: string;
      reason?: string;
    }
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const updated = await goalRepository.rescheduleActivity(user.id, activityId, newSchedule);
      await refreshAll();
      notify({
        type: 'success',
        title: 'Atividade reagendada',
        description: `"${updated.title}" movida para ${newSchedule.scheduled_date} às ${newSchedule.start_time}. Histórico preservado.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao reagendar.';
      notify({ type: 'error', title: 'Falha no reagendamento', description: msg });
      throw err;
    }
  };

  const createCategory = async (payload: {
    name: string;
    icon: string;
    visual_style: CategoryVisualStyle;
  }) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const created = await goalRepository.createCategory(user.id, payload);
      await refreshAll();
      notify({
        type: 'success',
        title: 'Categoria criada',
        description: `A categoria "${created.name}" já está disponível.`,
      });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar categoria.';
      notify({ type: 'error', title: 'Falha ao salvar categoria', description: msg });
      throw err;
    }
  };

  const updateCategory = async (
    categoryId: string,
    payload: { name: string; icon: string; visual_style: CategoryVisualStyle }
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const updated = await goalRepository.updateCategory(user.id, categoryId, payload);
      await refreshAll();
      notify({
        type: 'success',
        title: 'Categoria atualizada',
        description: `As preferências de "${updated.name}" foram salvas.`,
      });
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar categoria.';
      notify({ type: 'error', title: 'Erro ao salvar categoria', description: msg });
      throw err;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      await goalRepository.deleteCategory(user.id, categoryId);
      await refreshAll();
      notify({
        type: 'info',
        title: 'Categoria removida',
        description: 'Atividades vinculadas foram preservadas com segurança.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir categoria.';
      notify({ type: 'error', title: 'Erro na exclusão', description: msg });
      throw err;
    }
  };

  const createWeeklyGoal = async (
    payload: Parameters<GoalDataContextValue['createWeeklyGoal']>[0]
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      await goalRepository.createWeeklyGoal(user.id, payload);
      await refreshAll();
      notify({
        type: 'success',
        title: 'Meta semanal criada',
        description: `"${payload.title}" adicionada ao acompanhamento semanal.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar meta.';
      notify({ type: 'error', title: 'Erro ao salvar meta', description: msg });
      throw err;
    }
  };

  const updateWeeklyGoal = async (
    goalId: string,
    payload: Parameters<GoalDataContextValue['updateWeeklyGoal']>[1]
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      await goalRepository.updateWeeklyGoal(user.id, goalId, payload);
      await refreshAll();
      notify({
        type: 'success',
        title: 'Meta atualizada',
        description: `"${payload.title}" foi atualizada.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar meta.';
      notify({ type: 'error', title: 'Erro ao salvar meta', description: msg });
      throw err;
    }
  };

  const deleteWeeklyGoal = async (goalId: string) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      await goalRepository.deleteWeeklyGoal(user.id, goalId);
      await refreshAll();
      notify({
        type: 'info',
        title: 'Meta removida',
        description: 'A meta semanal foi excluída.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir meta.';
      notify({ type: 'error', title: 'Erro na exclusão', description: msg });
      throw err;
    }
  };

  const saveNotificationPreferences = async (updates: Partial<NotificationPreference>) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const updated = await goalRepository.updateNotificationPreferences(user.id, updates);
      setNotificationPreferences(updated);
      notify({
        type: 'success',
        title: 'Preferências de WhatsApp salvas',
        description: updated.opted_out
          ? 'Você interrompeu o recebimento de mensagens.'
          : 'Configurações de lembretes atualizadas.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar preferências.';
      notify({ type: 'error', title: 'Falha ao salvar', description: msg });
      throw err;
    }
  };

  const triggerWhatsAppCheck = async () => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const logEntry = await goalRepository.triggerReminderCheck(user.id);
      await refreshAll();
      notify({
        type: logEntry.status === 'sent' ? 'success' : 'info',
        title: 'Verificação de lembretes executada',
        description: logEntry.error_message || logEntry.payload_summary || 'Registro gravado em notification_logs.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar verificação.';
      notify({ type: 'error', title: 'Aviso do motor de lembretes', description: msg });
    }
  };

  return (
    <GoalDataContext.Provider
      value={{
        selectedWeekDate,
        setSelectedWeekDate,
        selectedDayDate,
        setSelectedDayDate,
        weekStartISO,
        weekEndISO,
        categories,
        templates,
        weekActivities,
        historyActivities,
        weeklyGoals,
        goalsProgress,
        indicators,
        notificationPreferences,
        notificationLogs,
        isLoadingData,
        toasts,
        notify,
        dismissToast,
        refreshAll,
        createActivity,
        updateActivity,
        deleteActivity,
        setActivityStatus,
        rescheduleActivity,
        createCategory,
        updateCategory,
        deleteCategory,
        createWeeklyGoal,
        updateWeeklyGoal,
        deleteWeeklyGoal,
        saveNotificationPreferences,
        triggerWhatsAppCheck,
      }}
    >
      {children}
    </GoalDataContext.Provider>
  );
};

export function useGoalData() {
  const ctx = useContext(GoalDataContext);
  if (!ctx) {
    throw new Error('useGoalData deve ser utilizado dentro de um GoalDataProvider');
  }
  return ctx;
}
