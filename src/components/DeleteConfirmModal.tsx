import React, { useState } from 'react';
import { Trash2, Repeat, X } from 'lucide-react';
import { useGoalData } from '@/contexts/GoalDataContext';
import type { ScheduledActivity } from '@/types';

interface DeleteConfirmModalProps {
  activity: ScheduledActivity | null;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ activity, onClose }) => {
  const { deleteActivity } = useGoalData();
  const [scope, setScope] = useState<'single' | 'series'>('single');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!activity) return null;

  const isRecurring = Boolean(activity.template_id);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteActivity(activity.id, isRecurring ? scope : 'single');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-bg-card border border-border-strong rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-bg-secondary border border-border-subtle">
              <Trash2 className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-semibold text-text-primary">
                Confirmar Exclusão
              </h2>
              <p className="text-xs text-text-secondary">
                {activity.title} ({activity.scheduled_date} às {activity.start_time.slice(0, 5)})
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

        {isRecurring ? (
          <div className="space-y-2.5 p-3.5 rounded-xl bg-bg-secondary border border-border-subtle">
            <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
              <Repeat className="w-4 h-4" />
              <span>Esta atividade faz parte de uma série recorrente:</span>
            </div>
            <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer">
              <input
                type="radio"
                name="delete-scope"
                checked={scope === 'single'}
                onChange={() => setScope('single')}
                className="mt-0.5 accent-current"
              />
              <span>
                <strong>Excluir apenas esta ocorrência</strong>
                <span className="block text-text-secondary">
                  As demais semanas e o modelo recorrente serão preservados.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer pt-1">
              <input
                type="radio"
                name="delete-scope"
                checked={scope === 'series'}
                onChange={() => setScope('series')}
                className="mt-0.5 accent-current"
              />
              <span>
                <strong>Encerrar toda a série recorrente</strong>
                <span className="block text-text-secondary">
                  Remove o modelo de repetição e todas as ocorrências pendentes.
                </span>
              </span>
            </label>
          </div>
        ) : (
          <p className="text-xs text-text-secondary leading-relaxed">
            Tem certeza que deseja excluir esta atividade do seu planejamento? Esta ação não pode ser desfeita.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
};
