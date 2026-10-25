import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarClock,
  Edit3,
  Trash2,
  Eye,
  Filter,
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
  getWeekDays,
  detectTimeOverlaps,
  cn,
} from '@/lib/utils';
import type { ScheduledActivity } from '@/types';

const QUICK_HOURS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

export const WeeklyPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedWeekDate,
    setSelectedWeekDate,
    setSelectedDayDate,
    weekStartISO,
    weekEndISO,
    categories,
    weekActivities,
    setActivityStatus,
  } = useGoalData();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'columns' | 'timegrid'>('columns');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ScheduledActivity | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [modalInitialStart, setModalInitialStart] = useState<string>('08:00');
  const [modalInitialEnd, setModalInitialEnd] = useState<string>('09:00');

  const [reschedulingActivity, setReschedulingActivity] = useState<ScheduledActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ScheduledActivity | null>(null);

  const weekDays = useMemo(() => getWeekDays(selectedWeekDate, 1), [selectedWeekDate]);
  const todayISO = formatDateISO(new Date());

  const filteredActivities = useMemo(() => {
    return weekActivities.filter((act) => {
      if (categoryFilter !== 'all' && act.category_id !== categoryFilter) return false;
      if (statusFilter !== 'all' && act.status !== statusFilter) return false;
      return true;
    });
  }, [weekActivities, categoryFilter, statusFilter]);

  // Mapa de conflitos de horários na semana
  const overlapIds = useMemo(() => {
    const set = new Set<string>();
    for (const act of weekActivities) {
      const conflicts = detectTimeOverlaps(act, weekActivities);
      if (conflicts.length > 0) {
        set.add(act.id);
      }
    }
    return set;
  }, [weekActivities]);

  const openCreateAtSlot = (dateISO: string, startHHMM = '08:00') => {
    const [h, m] = startHHMM.split(':').map(Number);
    const endHour = Math.min(23, h + 1);
    const endHHMM = `${String(endHour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

    setEditingActivity(null);
    setModalInitialDate(dateISO);
    setModalInitialStart(startHHMM);
    setModalInitialEnd(endHHMM);
    setIsModalOpen(true);
  };

  const openEditActivity = (act: ScheduledActivity) => {
    setEditingActivity(act);
    setIsModalOpen(true);
  };

  const goToMyDay = (dayDate: Date) => {
    setSelectedDayDate(dayDate);
    navigate('/meu-dia');
  };

  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Controles de Semana */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            Agenda & Rotina
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
            Planejamento Semanal
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Semana selecionada: {formatDisplayDate(weekStartISO, "dd 'de' MMM")} até{' '}
            {formatDisplayDate(weekEndISO, "dd 'de' MMM 'de' yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navegação entre semanas */}
          <div className="inline-flex items-center rounded-xl bg-bg-card border border-border-subtle p-1">
            <button
              type="button"
              onClick={() => setSelectedWeekDate(addDays(selectedWeekDate, -7))}
              aria-label="Semana anterior"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeekDate(new Date())}
              className="px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary rounded-lg"
            >
              Hoje / Semana Atual
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeekDate(addDays(selectedWeekDate, 7))}
              aria-label="Próxima semana"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Alternador de Visualização (Colunas vs Grade de Horários) */}
          <div className="inline-flex items-center rounded-xl bg-bg-card border border-border-subtle p-1">
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'columns'
                  ? 'bg-text-primary text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Visão 7 Dias
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timegrid')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'timegrid'
                  ? 'bg-text-primary text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Grade de Horários
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateAtSlot(todayISO, '08:00')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros (Categoria e Status) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-bg-card border border-border-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Concluídas</option>
            <option value="missed">Não realizadas</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>
            Exibindo <strong>{filteredActivities.length}</strong> atividades na semana
          </span>
          {overlapIds.size > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-text-primary">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overlapIds.size} em conflito de horário
            </span>
          )}
        </div>
      </div>

      {/* MODO 1: Colunas dos 7 Dias da Semana (Mobile-First Cards / Desktop Grid) */}
      {viewMode === 'columns' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map((dayDate) => {
            const dayISO = formatDateISO(dayDate);
            const isToday = dayISO === todayISO;
            const dayActs = filteredActivities.filter((a) => a.scheduled_date === dayISO);
            const totalMinutes = dayActs.reduce((acc, a) => acc + a.planned_duration_minutes, 0);

            return (
              <div
                key={dayISO}
                className={cn(
                  'rounded-2xl bg-bg-card border flex flex-col min-h-[280px] transition-colors',
                  isToday ? 'border-border-strong ring-1 ring-border-strong' : 'border-border-subtle'
                )}
              >
                {/* Cabeçalho do Dia */}
                <div className="p-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-secondary/50 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {dayNamesShort[dayDate.getDay()]}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded bg-text-primary text-bg-primary text-[10px] font-bold">
                          HOJE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary font-mono block mt-0.5">
                      {formatDisplayDate(dayISO, 'dd/MM')} · {formatDuration(totalMinutes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => goToMyDay(dayDate)}
                      title="Ver este dia em Meu Dia"
                      aria-label={`Ver dia ${dayISO} em Meu Dia`}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateAtSlot(dayISO, '08:00')}
                      title="Adicionar atividade neste dia"
                      aria-label={`Adicionar atividade em ${dayISO}`}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lista de Atividades do Dia */}
                <div className="p-2.5 flex-1 space-y-2">
                  {dayActs.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openCreateAtSlot(dayISO, '09:00')}
                      className="w-full h-32 rounded-xl border border-dashed border-border-subtle hover:border-border-strong flex flex-col items-center justify-center gap-1 text-text-secondary hover:text-text-primary transition-colors text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agendar horário</span>
                    </button>
                  ) : (
                    dayActs.map((act) => {
                      const cat = categories.find((c) => c.id === act.category_id);
                      const hasConflict = overlapIds.has(act.id);
                      const isCompleted = act.status === 'completed';
                      const isMissed = act.status === 'missed';

                      return (
                        <div
                          key={act.id}
                          className={cn(
                            'p-3 rounded-xl border transition-all space-y-2',
                            isCompleted
                              ? 'bg-bg-secondary/60 border-border-subtle opacity-80'
                              : isMissed
                              ? 'bg-bg-secondary/30 border-border-subtle opacity-60'
                              : 'bg-bg-secondary border-border-subtle hover:border-border-strong'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span
                              className={cn(
                                'text-xs font-semibold text-text-primary leading-snug break-words',
                                isCompleted && 'line-through'
                              )}
                            >
                              {act.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {act.template_id && (
                                <span title="Série recorrente">
                                  <Repeat className="w-3 h-3 text-text-secondary" />
                                </span>
                              )}
                              {hasConflict && (
                                <span title="Sobreposição de horário">
                                  <AlertTriangle className="w-3.5 h-3.5 text-text-primary" />
                                </span>
                              )}
                            </div>
                          </div>

                          <CategoryBadge category={cat} />

                          <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {act.start_time.slice(0, 5)}–{act.end_time.slice(0, 5)}
                            </span>
                            <span>{formatDuration(act.planned_duration_minutes)}</span>
                          </div>

                          {/* Barra de ações rápidas no card */}
                          <div className="pt-1.5 border-t border-border-subtle flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActivityStatus(
                                  act.id,
                                  isCompleted ? 'pending' : 'completed'
                                )
                              }
                              className={cn(
                                'px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors',
                                isCompleted
                                  ? 'bg-text-primary text-bg-primary'
                                  : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-subtle'
                              )}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isCompleted ? 'Feita' : 'Concluir'}</span>
                            </button>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setReschedulingActivity(act)}
                                title="Reagendar"
                                aria-label={`Reagendar ${act.title}`}
                                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-card"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditActivity(act)}
                                title="Editar"
                                aria-label={`Editar ${act.title}`}
                                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-card"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingActivity(act)}
                                title="Excluir"
                                aria-label={`Excluir ${act.title}`}
                                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO 2: Grade de Horários Clicável (Clique em um horário para criar atividade) */
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[720px]">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary">
                  <th className="py-3 px-3 text-xs font-mono text-text-secondary w-20">Horário</th>
                  {weekDays.map((dayDate) => {
                    const dayISO = formatDateISO(dayDate);
                    const isToday = dayISO === todayISO;
                    return (
                      <th
                        key={dayISO}
                        className={cn(
                          'py-3 px-2.5 text-xs font-semibold border-l border-border-subtle',
                          isToday ? 'text-text-primary bg-bg-card' : 'text-text-secondary'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {dayNamesShort[dayDate.getDay()]} {dayISO.slice(8, 10)}
                          </span>
                          <button
                            type="button"
                            onClick={() => goToMyDay(dayDate)}
                            className="text-[10px] underline hover:text-text-primary"
                          >
                            Ver dia
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {QUICK_HOURS.map((hourStr) => {
                  const hourPrefix = hourStr.slice(0, 2);
                  return (
                    <tr key={hourStr} className="border-b border-border-subtle group">
                      <td className="py-2.5 px-3 text-xs font-mono text-text-secondary align-top bg-bg-secondary/30">
                        {hourStr}
                      </td>
                      {weekDays.map((dayDate) => {
                        const dayISO = formatDateISO(dayDate);
                        const slotActs = filteredActivities.filter(
                          (a) =>
                            a.scheduled_date === dayISO &&
                            a.start_time.slice(0, 2) === hourPrefix
                        );

                        return (
                          <td
                            key={`${dayISO}-${hourStr}`}
                            onClick={() => {
                              if (slotActs.length === 0) {
                                openCreateAtSlot(dayISO, hourStr);
                              }
                            }}
                            className="p-1.5 border-l border-border-subtle align-top min-h-[48px] hover:bg-bg-secondary/50 cursor-pointer transition-colors"
                          >
                            {slotActs.length === 0 ? (
                              <div className="h-7 flex items-center justify-center opacity-0 hover:opacity-100 text-[10px] text-text-secondary">
                                + Agendar {hourStr}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {slotActs.map((act) => (
                                  <div
                                    key={act.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditActivity(act);
                                    }}
                                    className="p-2 rounded-lg bg-bg-secondary border border-border-strong text-xs space-y-0.5 hover:opacity-90"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-text-primary truncate">
                                        {act.title}
                                      </span>
                                      {act.template_id && <Repeat className="w-3 h-3 shrink-0" />}
                                    </div>
                                    <span className="text-[10px] font-mono text-text-secondary block">
                                      {act.start_time.slice(0, 5)} - {act.end_time.slice(0, 5)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      <ActivityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        initialDateISO={modalInitialDate}
        initialStartTime={modalInitialStart}
        initialEndTime={modalInitialEnd}
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
