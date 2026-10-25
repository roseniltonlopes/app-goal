import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Clock,
  AlertTriangle,
  Repeat,
  Bell,
  Calendar as CalendarIcon,
  Check,
} from 'lucide-react';
import { activityFormSchema, type ActivityFormValues } from '@/validations/schemas';
import { useGoalData } from '@/contexts/GoalDataContext';
import { GoalSelect } from '@/components/GoalSelect';
import {
  calculateDurationMinutes,
  formatDuration,
  detectTimeOverlaps,
  WEEKDAY_LABELS,
  getDay,
  parseISO,
  cn,
} from '@/lib/utils';
import type { ScheduledActivity } from '@/types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingActivity?: ScheduledActivity | null;
  initialDateISO?: string;
  initialStartTime?: string;
  initialEndTime?: string;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  editingActivity,
  initialDateISO,
  initialStartTime = '08:00',
  initialEndTime = '09:00',
}) => {
  const {
    categories,
    templates,
    historyActivities,
    notificationPreferences,
    createActivity,
    updateActivity,
  } = useGoalData();

  const [editScope, setEditScope] = useState<'single' | 'series'>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCategoryId = categories[0]?.id || '';
  const defaultReminderMinutes = notificationPreferences?.default_reminder_minutes ?? 15;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      category_id: defaultCategoryId,
      scheduled_date: initialDateISO || new Date().toISOString().slice(0, 10),
      start_time: initialStartTime,
      end_time: initialEndTime,
      description: '',
      activity_type: 'fixed',
      is_recurring: false,
      days_of_week: [],
      recurrence_end_date: '',
      reminder_enabled: false,
      reminder_minutes_before: defaultReminderMinutes,
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editingActivity) {
      const parentTemplate = editingActivity.template_id
        ? templates.find((t) => t.id === editingActivity.template_id)
        : null;

      reset({
        title: editingActivity.title,
        category_id: editingActivity.category_id || defaultCategoryId,
        scheduled_date: editingActivity.scheduled_date,
        start_time: editingActivity.start_time.slice(0, 5),
        end_time: editingActivity.end_time.slice(0, 5),
        description: editingActivity.description || '',
        activity_type: editingActivity.activity_type,
        is_recurring: Boolean(editingActivity.template_id),
        days_of_week: parentTemplate?.days_of_week || [
          getDay(parseISO(editingActivity.scheduled_date)),
        ],
        recurrence_end_date: parentTemplate?.end_date || '',
        reminder_enabled: editingActivity.reminder_enabled,
        reminder_minutes_before: editingActivity.reminder_minutes_before,
      });
      setEditScope('single');
    } else {
      const targetDate = initialDateISO || new Date().toISOString().slice(0, 10);
      reset({
        title: '',
        category_id: categories[0]?.id || '',
        scheduled_date: targetDate,
        start_time: initialStartTime,
        end_time: initialEndTime,
        description: '',
        activity_type: 'fixed',
        is_recurring: false,
        days_of_week: [getDay(parseISO(targetDate))],
        recurrence_end_date: '',
        reminder_enabled: Boolean(notificationPreferences?.whatsapp_enabled),
        reminder_minutes_before: defaultReminderMinutes,
      });
    }
  }, [
    isOpen,
    editingActivity,
    initialDateISO,
    initialStartTime,
    initialEndTime,
    categories,
    templates,
    defaultCategoryId,
    defaultReminderMinutes,
    notificationPreferences,
    reset,
  ]);

  if (!isOpen) return null;

  const watchedCategoryId = watch('category_id');
  const watchedActivityType = watch('activity_type');
  const watchedDate = watch('scheduled_date');
  const watchedStart = watch('start_time');
  const watchedEnd = watch('end_time');
  const watchedRecurring = watch('is_recurring');
  const watchedDays = watch('days_of_week') || [];
  const watchedReminder = watch('reminder_enabled');
  const watchedReminderMinutes = watch('reminder_minutes_before');

  const durationMinutes = calculateDurationMinutes(watchedStart || '00:00', watchedEnd || '00:00');

  const overlaps = detectTimeOverlaps(
    {
      id: editingActivity?.id,
      scheduled_date: watchedDate,
      start_time: watchedStart || '00:00',
      end_time: watchedEnd || '00:00',
    },
    historyActivities
  );

  const toggleDayOfWeek = (dayValue: number) => {
    const current = new Set(watchedDays);
    if (current.has(dayValue)) {
      current.delete(dayValue);
    } else {
      current.add(dayValue);
    }
    setValue('days_of_week', Array.from(current), { shouldValidate: true });
  };

  const onSubmit = async (values: ActivityFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingActivity) {
        await updateActivity(
          editingActivity.id,
          {
            title: values.title,
            category_id: values.category_id,
            scheduled_date: values.scheduled_date,
            start_time: values.start_time,
            end_time: values.end_time,
            description: values.description,
            activity_type: values.activity_type,
            days_of_week: values.days_of_week,
            recurrence_end_date: values.recurrence_end_date,
            reminder_enabled: values.reminder_enabled,
            reminder_minutes_before: values.reminder_minutes_before,
          },
          editScope
        );
      } else {
        await createActivity({
          title: values.title,
          category_id: values.category_id,
          scheduled_date: values.scheduled_date,
          start_time: values.start_time,
          end_time: values.end_time,
          description: values.description,
          activity_type: values.activity_type,
          is_recurring: values.is_recurring,
          days_of_week: values.days_of_week,
          recurrence_end_date: values.recurrence_end_date,
          reminder_enabled: values.reminder_enabled,
          reminder_minutes_before: values.reminder_minutes_before,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
    >
      <div className="bg-bg-card border border-border-strong rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle sticky top-0 bg-bg-card z-10">
          <div>
            <h2 id="activity-modal-title" className="text-lg font-semibold text-text-primary">
              {editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
            </h2>
            <p className="text-xs text-text-secondary">
              Planeje seus horários com clareza e intenção
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Escopo de edição quando faz parte de série recorrente */}
          {editingActivity?.template_id && (
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                <Repeat className="w-4 h-4" />
                <span>Esta é uma atividade recorrente. O que deseja atualizar?</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditScope('single')}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left',
                    editScope === 'single'
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-card text-text-secondary border-border-subtle hover:text-text-primary'
                  )}
                >
                  Apenas esta ocorrência
                </button>
                <button
                  type="button"
                  onClick={() => setEditScope('series')}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left',
                    editScope === 'series'
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-card text-text-secondary border-border-subtle hover:text-text-primary'
                  )}
                >
                  Toda a série recorrente
                </button>
              </div>
            </div>
          )}

          {/* Título */}
          <div>
            <label htmlFor="act-title" className="block text-xs font-medium text-text-secondary mb-1">
              Título da atividade *
            </label>
            <input
              id="act-title"
              type="text"
              placeholder="Ex: Treino de força, Bloco de foco, Leitura noturna..."
              {...register('title')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
            />
            {errors.title && (
              <p className="text-xs text-text-primary mt-1 font-medium">⚠ {errors.title.message}</p>
            )}
          </div>

          {/* Categoria e Modalidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="act-category" className="block text-xs font-medium text-text-secondary mb-1">
                Categoria *
              </label>
              <GoalSelect
                id="act-category"
                value={watchedCategoryId}
                onChange={(val) => setValue('category_id', val, { shouldValidate: true })}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  icon: cat.icon,
                }))}
              />
              {errors.category_id && (
                <p className="text-xs text-text-primary mt-1">⚠ {errors.category_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="act-type" className="block text-xs font-medium text-text-secondary mb-1">
                Modalidade de rotina *
              </label>
              <GoalSelect
                id="act-type"
                value={watchedActivityType}
                onChange={(val) =>
                  setValue('activity_type', val as 'fixed' | 'flexible' | 'habit', {
                    shouldValidate: true,
                  })
                }
                options={[
                  { value: 'fixed', label: 'Compromisso fixo' },
                  { value: 'flexible', label: 'Atividade flexível' },
                  { value: 'habit', label: 'Hábito / Meta' },
                ]}
              />
            </div>
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="act-date" className="block text-xs font-medium text-text-secondary mb-1">
                <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                Data *
              </label>
              <input
                id="act-date"
                type="date"
                {...register('scheduled_date')}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="act-start" className="block text-xs font-medium text-text-secondary mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Início *
              </label>
              <input
                id="act-start"
                type="time"
                {...register('start_time')}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="act-end" className="block text-xs font-medium text-text-secondary mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Término *
              </label>
              <input
                id="act-end"
                type="time"
                {...register('end_time')}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary focus:border-text-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Cálculo automático de duração e validação de intervalo */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs">
            <span className="text-text-secondary">Duração calculada:</span>
            {durationMinutes > 0 ? (
              <span className="font-mono font-semibold text-text-primary">
                {formatDuration(durationMinutes)} ({durationMinutes} min)
              </span>
            ) : (
              <span className="font-medium text-text-primary">
                ⚠ Intervalo inválido (término deve ser após o início)
              </span>
            )}
          </div>
          {errors.end_time && (
            <p className="text-xs text-text-primary font-medium">⚠ {errors.end_time.message}</p>
          )}

          {/* Aviso de sobreposição de horários (sem bloquear gravação) */}
          {overlaps.length > 0 && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-bg-secondary border border-text-primary text-xs space-y-1.5"
            >
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Aviso de sobreposição de horário</span>
              </div>
              <p className="text-text-secondary">
                Este horário coincide com {overlaps.length}{' '}
                {overlaps.length === 1 ? 'atividade programada' : 'atividades programadas'}:
              </p>
              <ul className="space-y-1 pl-4 list-disc text-text-primary">
                {overlaps.map((o) => (
                  <li key={o.conflictingActivity.id}>
                    <strong>{o.conflictingActivity.title}</strong> ({o.conflictingActivity.start_time.slice(0, 5)} –{' '}
                    {o.conflictingActivity.end_time.slice(0, 5)}, {o.overlapMinutes} min de conflito)
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-text-secondary pt-0.5">
                Você ainda pode salvar caso deseje manter os dois compromissos no mesmo período.
              </p>
            </div>
          )}

          {/* Recorrência por dias da semana */}
          {(!editingActivity || editScope === 'series') && (
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="act-recurring"
                  className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer"
                >
                  <Repeat className="w-4 h-4 text-text-secondary" />
                  <span>Repetir semanalmente (Atividade recorrente)</span>
                </label>
                {!editingActivity && (
                  <input
                    id="act-recurring"
                    type="checkbox"
                    {...register('is_recurring')}
                    className="w-4 h-4 accent-current rounded cursor-pointer"
                  />
                )}
              </div>

              {(watchedRecurring || editScope === 'series') && (
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="block text-xs text-text-secondary mb-1.5">
                      Dias da semana de repetição:
                    </span>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAY_LABELS.map((day) => {
                        const selected = watchedDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDayOfWeek(day.value)}
                            aria-pressed={selected}
                            className={cn(
                              'py-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center justify-center gap-0.5',
                              selected
                                ? 'bg-text-primary text-bg-primary border-text-primary'
                                : 'bg-bg-card text-text-secondary border-border-subtle hover:text-text-primary'
                            )}
                          >
                            <span>{day.short}</span>
                            {selected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                    {errors.days_of_week && (
                      <p className="text-xs text-text-primary mt-1">
                        ⚠ {errors.days_of_week.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="act-rec-end"
                      className="block text-xs text-text-secondary mb-1"
                    >
                      Repetir até (opcional):
                    </label>
                    <input
                      id="act-rec-end"
                      type="date"
                      {...register('recurrence_end_date')}
                      className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-subtle text-xs text-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descrição opcional */}
          <div>
            <label htmlFor="act-desc" className="block text-xs font-medium text-text-secondary mb-1">
              Descrição / Intenção (opcional)
            </label>
            <textarea
              id="act-desc"
              rows={2}
              placeholder="Anotações importantes, foco da sessão ou preparação necessária..."
              {...register('description')}
              className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none resize-none"
            />
          </div>

          {/* Preferências de lembrete */}
          <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="act-reminder"
                className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer"
              >
                <Bell className="w-4 h-4 text-text-secondary" />
                <span>Enviar lembrete por WhatsApp antes da atividade</span>
              </label>
              <input
                id="act-reminder"
                type="checkbox"
                {...register('reminder_enabled')}
                className="w-4 h-4 accent-current rounded cursor-pointer"
              />
            </div>

            {watchedReminder && (
              <div className="flex items-center justify-between pt-1 gap-3">
                <label htmlFor="act-rem-min" className="text-xs text-text-secondary">
                  Antecedência do lembrete:
                </label>
                <GoalSelect
                  id="act-rem-min"
                  size="sm"
                  className="min-w-[175px]"
                  value={watchedReminderMinutes}
                  onChange={(val) =>
                    setValue('reminder_minutes_before', Number(val), { shouldValidate: true })
                  }
                  options={[
                    { value: 5, label: '5 minutos antes' },
                    { value: 10, label: '10 minutos antes' },
                    { value: 15, label: '15 minutos antes' },
                    { value: 30, label: '30 minutos antes' },
                    { value: 60, label: '1 hora antes' },
                    { value: 120, label: '2 horas antes' },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting
                ? 'Salvando...'
                : editingActivity
                ? 'Salvar Alterações'
                : 'Agendar Atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
