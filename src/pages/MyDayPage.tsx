import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Clock,
  Repeat,
  RotateCcw,
  Edit3,
  Trash2,
  History,
  CheckSquare,
} from 'lucide-react';
import { useGoalData } from '@/contexts/GoalDataContext';
import { CategoryBadge } from '@/components/CategoryIcon';
import { ActivityModal } from '@/components/ActivityModal';
import { RescheduleModal } from '@/components/RescheduleModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  addDays,
  formatDateISO,
  formatDisplayDate,
  formatDuration,
  cn,
} from '@/lib/utils';
import type { ScheduledActivity } from '@/types';

export const MyDayPage: React.FC = () => {
  const {
    selectedDayDate,
    setSelectedDayDate,
    setSelectedWeekDate,
    categories,
    historyActivities,
    setActivityStatus,
  } = useGoalData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ScheduledActivity | null>(null);
  const [reschedulingActivity, setReschedulingActivity] = useState<ScheduledActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ScheduledActivity | null>(null);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);

  const selectedDayISO = formatDateISO(selectedDayDate);

  const handleChangeDay = (nextDate: Date) => {
    setSelectedDayDate(nextDate);
    setSelectedWeekDate(nextDate);
  };

  const dayActivities = useMemo(() => {
    return historyActivities
      .filter((a) => a.scheduled_date === selectedDayISO)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [historyActivities, selectedDayISO]);

  const summary = useMemo(() => {
    const total = dayActivities.length;
    const completed = dayActivities.filter((a) => a.status === 'completed').length;
    const pending = dayActivities.filter((a) => a.status === 'pending').length;
    const missed = dayActivities.filter((a) => a.status === 'missed').length;
    const totalMinutes = dayActivities.reduce((acc, a) => acc + a.planned_duration_minutes, 0);
    return { total, completed, pending, missed, totalMinutes };
  }, [dayActivities]);

  const handleQuickStatus = async (
    act: ScheduledActivity,
    status: 'completed' | 'missed' | 'pending'
  ) => {
    setBusyActivityId(act.id);
    try {
      await setActivityStatus(act.id, status);
    } finally {
      setBusyActivityId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Meu Dia */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            Execução Diária & Foco
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">Meu Dia</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 capitalize">
            {formatDisplayDate(selectedDayISO, "EEEE, dd 'de' MMMM 'de' yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-bg-card border border-border-subtle p-1">
            <button
              type="button"
              onClick={() => handleChangeDay(addDays(selectedDayDate, -1))}
              aria-label="Dia anterior"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeDay(new Date())}
              className="px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary rounded-lg"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => handleChangeDay(addDays(selectedDayDate, 1))}
              aria-label="Próximo dia"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            aria-label="Selecionar data específica"
            value={selectedDayISO}
            onChange={(e) => {
              if (e.target.value) {
                handleChangeDay(new Date(`${e.target.value}T12:00:00`));
              }
            }}
            className="px-3 py-2 rounded-xl bg-bg-card border border-border-subtle text-xs text-text-primary"
          />

          <button
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar ao Dia</span>
          </button>
        </div>
      </div>

      {/* Resumo Rápido do Dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle">
          <span className="text-xs text-text-secondary">Programadas no dia</span>
          <p className="text-2xl font-bold font-mono mt-1">{summary.total}</p>
          <span className="text-[11px] text-text-secondary">
            Tempo total: {formatDuration(summary.totalMinutes)}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle">
          <span className="text-xs text-text-secondary">Concluídas</span>
          <p className="text-2xl font-bold font-mono mt-1">{summary.completed}</p>
          <span className="text-[11px] text-text-secondary">Realizadas com sucesso</span>
        </div>
        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle">
          <span className="text-xs text-text-secondary">Pendentes</span>
          <p className="text-2xl font-bold font-mono mt-1">{summary.pending}</p>
          <span className="text-[11px] text-text-secondary">Aguardando execução</span>
        </div>
        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle">
          <span className="text-xs text-text-secondary">Não realizadas</span>
          <p className="text-2xl font-bold font-mono mt-1">{summary.missed}</p>
          <span className="text-[11px] text-text-secondary">Registradas no histórico</span>
        </div>
      </div>

      {/* Lista Cronológica de Atividades */}
      {dayActivities.length === 0 ? (
        <div className="p-10 rounded-2xl bg-bg-card border border-border-subtle text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-subtle flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6 text-text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-text-primary">
              Nenhuma atividade para esta data
            </h2>
            <p className="text-xs text-text-secondary">
              Adicione compromissos para organizar seu dia e acompanhar a execução em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Atividade para Este Dia</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayActivities.map((act) => {
            const cat = categories.find((c) => c.id === act.category_id);
            const isBusy = busyActivityId === act.id;
            const statusLabel =
              act.status === 'completed'
                ? 'Concluída'
                : act.status === 'missed'
                ? 'Não realizada'
                : 'Pendente';

            return (
              <div
                key={act.id}
                className={cn(
                  'p-4 sm:p-5 rounded-2xl bg-bg-card border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4',
                  act.status === 'completed'
                    ? 'border-border-strong bg-bg-secondary/50'
                    : act.status === 'missed'
                    ? 'border-border-subtle opacity-70'
                    : 'border-border-subtle hover:border-border-strong'
                )}
              >
                {/* Bloco Esquerdo: Horário, Título, Categoria, Status */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-center shrink-0 min-w-[78px]">
                    <span className="text-sm font-bold font-mono block text-text-primary">
                      {act.start_time.slice(0, 5)}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary block">
                      {act.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={cn(
                          'text-base font-bold text-text-primary',
                          act.status === 'completed' && 'line-through'
                        )}
                      >
                        {act.title}
                      </h3>
                      <CategoryBadge category={cat} />
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium border',
                          act.status === 'completed'
                            ? 'bg-text-primary text-bg-primary border-text-primary'
                            : 'bg-bg-secondary text-text-secondary border-border-subtle'
                        )}
                      >
                        {statusLabel}
                      </span>
                      {act.template_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                          <Repeat className="w-3 h-3" /> Recorrente
                        </span>
                      )}
                    </div>

                    {act.description && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Duração: {formatDuration(act.planned_duration_minutes)}
                      </span>
                      {act.rescheduled_count > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />
                          Reagendada {act.rescheduled_count}x (original:{' '}
                          {act.rescheduled_from_date})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloco Direito: Três Ações Principais (Concluir, Não realizada, Reagendar) + Editar/Excluir */}
                <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border-subtle shrink-0">
                  {act.status !== 'completed' ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickStatus(act, 'completed')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Concluir</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickStatus(act, 'pending')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle bg-bg-secondary text-xs font-medium text-text-secondary hover:text-text-primary"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Desfazer</span>
                    </button>
                  )}

                  {act.status !== 'missed' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickStatus(act, 'missed')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle bg-bg-secondary text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Não realizada</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setReschedulingActivity(act)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-strong bg-bg-card text-xs font-medium text-text-primary hover:bg-bg-secondary"
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span>Reagendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(act);
                      setIsModalOpen(true);
                    }}
                    title="Editar atividade"
                    aria-label={`Editar ${act.title}`}
                    className="p-2 rounded-xl border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingActivity(act)}
                    title="Excluir atividade"
                    aria-label={`Excluir ${act.title}`}
                    className="p-2 rounded-xl border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        initialDateISO={selectedDayISO}
      />

      <RescheduleModal
        activity={reschedulingActivity}
        onClose={() => setReschedulingActivity(null)}
      />

      <DeleteConfirmModal
        activity={deletingActivity}
        onClose={() => setDeletingActivity(null)}
      />
    </div>
  );
};
