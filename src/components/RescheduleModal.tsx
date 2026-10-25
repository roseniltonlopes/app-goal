import React, { useState, useEffect } from 'react';
import { X, CalendarClock, History, AlertTriangle } from 'lucide-react';
import { useGoalData } from '@/contexts/GoalDataContext';
import { calculateDurationMinutes, formatDuration, detectTimeOverlaps } from '@/lib/utils';
import type { ScheduledActivity } from '@/types';

interface RescheduleModalProps {
  activity: ScheduledActivity | null;
  onClose: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ activity, onClose }) => {
  const { rescheduleActivity, historyActivities } = useGoalData();
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activity) {
      setScheduledDate(activity.scheduled_date);
      setStartTime(activity.start_time.slice(0, 5));
      setEndTime(activity.end_time.slice(0, 5));
      setReason('');
      setError(null);
    }
  }, [activity]);

  if (!activity) return null;

  const duration = calculateDurationMinutes(startTime, endTime);
  const overlaps = detectTimeOverlaps(
    {
      id: activity.id,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
    },
    historyActivities
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) {
      setError('O horário de término deve ser posterior ao horário de início.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await rescheduleActivity(activity.id, {
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reagendar atividade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
    >
      <div className="bg-bg-card border border-border-strong rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-text-primary" />
            <div>
              <h2 id="reschedule-title" className="text-base font-semibold text-text-primary">
                Reagendar Atividade
              </h2>
              <p className="text-xs text-text-secondary truncate max-w-[260px]">
                {activity.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Reagendar move a atividade para um novo horário mantendo seu status elegível (sem penalizar sua taxa de conclusão) e preserva o registro histórico.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="res-date" className="block text-xs font-medium text-text-secondary mb-1">
                Nova data
              </label>
              <input
                id="res-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
              />
            </div>

            <div>
              <label htmlFor="res-start" className="block text-xs font-medium text-text-secondary mb-1">
                Início
              </label>
              <input
                id="res-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
              />
            </div>

            <div>
              <label htmlFor="res-end" className="block text-xs font-medium text-text-secondary mb-1">
                Término
              </label>
              <input
                id="res-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-secondary text-xs">
            <span className="text-text-secondary">Nova duração:</span>
            <span className="font-mono font-semibold text-text-primary">
              {duration > 0 ? formatDuration(duration) : 'Intervalo inválido'}
            </span>
          </div>

          {overlaps.length > 0 && (
            <div className="p-3 rounded-xl bg-bg-secondary border border-text-primary text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Conflito detectado com {overlaps[0].conflictingActivity.title}</span>
              </div>
              <p className="text-text-secondary">
                Sobreposição de {overlaps[0].overlapMinutes} min. Você ainda pode confirmar o reagendamento.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="res-reason" className="block text-xs font-medium text-text-secondary mb-1">
              Motivo / Observação (opcional)
            </label>
            <input
              id="res-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reunião estendida, ajuste de prioridade..."
              className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
            />
          </div>

          {/* Histórico anterior se houver */}
          {activity.reschedule_history && activity.reschedule_history.length > 0 && (
            <div className="p-3 rounded-xl bg-bg-secondary border border-border-subtle space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                <History className="w-3.5 h-3.5" />
                <span>Histórico de reagendamentos ({activity.reschedule_history.length})</span>
              </div>
              <ul className="space-y-1 text-[11px] text-text-secondary max-h-24 overflow-y-auto">
                {activity.reschedule_history.map((h, i) => (
                  <li key={i}>
                    De {h.from_date} ({h.from_start_time}) → Para {h.to_date} ({h.to_start_time})
                    {h.reason ? ` — "${h.reason}"` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-xs font-medium text-text-primary">⚠ {error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar Reagendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
