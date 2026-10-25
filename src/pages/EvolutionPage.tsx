import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Target,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useGoalData } from '@/contexts/GoalDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CategoryBadge } from '@/components/CategoryIcon';
import { GoalSelect } from '@/components/GoalSelect';
import { weeklyGoalSchema, type WeeklyGoalFormValues } from '@/validations/schemas';
import {
  addDays,
  formatDateISO,
  formatHoursDecimal,
  startOfWeek,
  endOfWeek,
} from '@/lib/utils';
import type { WeeklyGoal } from '@/types';

export const EvolutionPage: React.FC = () => {
  const {
    selectedWeekDate,
    categories,
    historyActivities,
    goalsProgress,
    createWeeklyGoal,
    updateWeeklyGoal,
    deleteWeeklyGoal,
  } = useGoalData();
  const { theme } = useTheme();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WeeklyGoal | null>(null);

  const chartColors = useMemo(() => {
    const isDark = theme === 'dark';
    return {
      primary: isDark ? '#FFFFFF' : '#000000',
      secondary: isDark ? '#C9CAC5' : '#272726',
      grid: isDark ? '#272726' : '#C9CAC5',
      tooltipBg: isDark ? '#171716' : '#FFFFFF',
      tooltipBorder: isDark ? '#C9CAC5' : '#272726',
      text: isDark ? '#C9CAC5' : '#272726',
    };
  }, [theme]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WeeklyGoalFormValues>({
    resolver: zodResolver(weeklyGoalSchema),
    defaultValues: {
      title: '',
      category_id: '',
      goal_type: '',
      target_value: undefined as unknown as number,
      unit: '',
      description: '',
    },
  });

  const watchedGoalType = watch('goal_type');
  const watchedGoalCategoryId = watch('category_id') || '';

  const openNewGoalModal = () => {
    setEditingGoal(null);
    reset({
      title: '',
      category_id: '',
      goal_type: '',
      target_value: '' as unknown as number,
      unit: '',
      description: '',
    });
    setIsGoalModalOpen(true);
  };

  const openEditGoalModal = (goal: WeeklyGoal) => {
    setEditingGoal(goal);
    reset({
      title: goal.title,
      category_id: goal.category_id || '',
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      unit: goal.unit,
      description: goal.description || '',
    });
    setIsGoalModalOpen(true);
  };

  const onSubmitGoal = async (values: WeeklyGoalFormValues) => {
    const resolvedGoalType = (values.goal_type || 'frequency') as
      | 'frequency'
      | 'duration'
      | 'quantity';
    if (editingGoal) {
      await updateWeeklyGoal(editingGoal.id, {
        title: values.title,
        category_id: values.category_id || undefined,
        goal_type: resolvedGoalType,
        target_value: values.target_value,
        unit: values.unit,
        description: values.description,
      });
    } else {
      await createWeeklyGoal({
        title: values.title,
        category_id: values.category_id || undefined,
        goal_type: resolvedGoalType,
        target_value: values.target_value,
        unit: values.unit,
        description: values.description,
      });
    }
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  // Análise de 5 semanas (Histórico semanal e mensal)
  const multiWeekAnalysis = useMemo(() => {
    const weeks: Array<{
      label: string;
      Planejadas: number;
      Concluidas: number;
      HorasPlanejadas: number;
      HorasRealizadas: number;
      TaxaConclusao: number;
    }> = [];

    for (let offset = -4; offset <= 0; offset++) {
      const ref = addDays(selectedWeekDate, offset * 7);
      const st = formatDateISO(startOfWeek(ref, { weekStartsOn: 1 }));
      const en = formatDateISO(endOfWeek(ref, { weekStartsOn: 1 }));

      const acts = historyActivities.filter(
        (a) => a.scheduled_date >= st && a.scheduled_date <= en
      );
      const completed = acts.filter((a) => a.status === 'completed');

      const plannedMin = acts.reduce((acc, a) => acc + a.planned_duration_minutes, 0);
      const actualMin = completed.reduce(
        (acc, a) => acc + (a.actual_duration_minutes ?? a.planned_duration_minutes),
        0
      );

      weeks.push({
        label: `${st.slice(8, 10)}/${st.slice(5, 7)}`,
        Planejadas: acts.length,
        Concluidas: completed.length,
        HorasPlanejadas: formatHoursDecimal(plannedMin),
        HorasRealizadas: formatHoursDecimal(actualMin),
        TaxaConclusao: acts.length > 0 ? Math.round((completed.length / acts.length) * 100) : 0,
      });
    }

    return weeks;
  }, [selectedWeekDate, historyActivities]);

  // Estatísticas consolidadas do período histórico carregado
  const periodStats = useMemo(() => {
    const totalActs = historyActivities.length;
    const completedActs = historyActivities.filter((a) => a.status === 'completed');
    const totalActualMin = completedActs.reduce(
      (acc, a) => acc + (a.actual_duration_minutes ?? a.planned_duration_minutes),
      0
    );
    const rate = totalActs > 0 ? Math.round((completedActs.length / totalActs) * 100) : 0;

    return {
      totalActs,
      completedCount: completedActs.length,
      totalHours: formatHoursDecimal(totalActualMin),
      rate,
    };
  }, [historyActivities]);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            Constância, Hábitos & Histórico
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
            Evolução & Metas Semanais
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Acompanhe seu histórico de execução e configure metas por frequência, duração ou quantidade
          </p>
        </div>

        <button
          type="button"
          onClick={openNewGoalModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Meta Semanal</span>
        </button>
      </div>

      {/* Resumo Acumulado do Histórico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary">Atividades Concluídas (Período)</span>
            <p className="text-3xl font-bold font-mono mt-1">
              {periodStats.completedCount}{' '}
              <span className="text-sm font-normal text-text-secondary">
                / {periodStats.totalActs}
              </span>
            </p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-text-primary" />
        </div>

        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary">Horas Realizadas Acumuladas</span>
            <p className="text-3xl font-bold font-mono mt-1">{periodStats.totalHours}h</p>
          </div>
          <Clock className="w-6 h-6 text-text-primary" />
        </div>

        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary">Média Geral de Execução</span>
            <p className="text-3xl font-bold font-mono mt-1">{periodStats.rate}%</p>
          </div>
          <Award className="w-6 h-6 text-text-primary" />
        </div>
      </div>

      {/* Gestão de Metas Semanais */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Metas Semanais Configuradas</h2>
            <p className="text-xs text-text-secondary">
              Exemplos: Academia 4x na semana, Leitura 5x por semana, Estudar 6 horas por semana
            </p>
          </div>
        </div>

        {goalsProgress.length === 0 ? (
          <div className="p-8 rounded-2xl bg-bg-card border border-border-subtle text-center space-y-3">
            <Target className="w-8 h-8 text-text-secondary mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text-primary">
                Nenhuma meta semanal cadastrada
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Defina objetivos semanais vinculados às suas categorias para acompanhar sua
                constância automaticamente conforme conclui atividades.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewGoalModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Meta Semanal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalsProgress.map(({ goal, category, current_value, target_value, percentage, is_achieved }) => (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-text-secondary mt-0.5">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditGoalModal(goal)}
                        aria-label={`Editar meta ${goal.title}`}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWeeklyGoal(goal.id)}
                        aria-label={`Excluir meta ${goal.title}`}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CategoryBadge category={category} />
                    {is_achieved && (
                      <span className="px-2 py-0.5 rounded bg-text-primary text-bg-primary text-[10px] font-bold uppercase">
                        Meta Atingida
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary">Progresso na semana:</span>
                    <span className="font-bold text-text-primary">
                      {current_value} / {target_value} {goal.unit} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-text-primary transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gráficos de Evolução Histórica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-text-primary" />
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Comparativo de Horas entre Semanas
              </h2>
              <p className="text-xs text-text-secondary">
                Horas planejadas vs horas efetivamente realizadas nas últimas 5 semanas
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={multiWeekAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.text} fontSize={11} />
                <YAxis stroke={chartColors.text} fontSize={11} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="HorasPlanejadas"
                  name="Horas Planejadas"
                  fill={chartColors.secondary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="HorasRealizadas"
                  name="Horas Realizadas"
                  fill={chartColors.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Curva de Consistência (Atividades Concluídas vs Planejadas)
            </h2>
            <p className="text-xs text-text-secondary">
              Volume de compromissos concluídos por semana
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={multiWeekAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.text} fontSize={11} />
                <YAxis stroke={chartColors.text} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Planejadas"
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Concluidas"
                  name="Concluídas"
                  stroke={chartColors.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição de Meta Semanal */}
      {isGoalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-modal-title"
        >
          <div className="bg-bg-card border border-border-strong rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 id="goal-modal-title" className="text-base font-bold text-text-primary">
                {editingGoal ? 'Editar Meta Semanal' : 'Nova Meta Semanal'}
              </h2>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitGoal)} className="space-y-4">
              <div>
                <label htmlFor="goal-title" className="block text-xs font-medium text-text-secondary mb-1">
                  Título da meta *
                </label>
                <input
                  id="goal-title"
                  type="text"
                  placeholder="Ex: Academia 4x na semana, Estudar 6h..."
                  {...register('title')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-sm text-text-primary"
                />
                {errors.title && (
                  <p className="text-xs text-text-primary mt-1">⚠ {errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="goal-cat" className="block text-xs font-medium text-text-secondary mb-1">
                  Categoria vinculada
                </label>
                <GoalSelect
                  id="goal-cat"
                  placeholder="Selecione uma categoria (ou deixe em branco para geral)..."
                  value={watchedGoalCategoryId}
                  onChange={(val) => setValue('category_id', val)}
                  options={[
                    ...(watchedGoalCategoryId
                      ? [{ value: '', label: 'Limpar seleção (Geral)', icon: 'Layers' }]
                      : []),
                    ...categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      icon: c.icon,
                    })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="goal-type" className="block text-xs font-medium text-text-secondary mb-1">
                    Tipo de meta *
                  </label>
                  <GoalSelect
                    id="goal-type"
                    placeholder="Selecione..."
                    value={watchedGoalType}
                    onChange={(val) => {
                      setValue('goal_type', val, { shouldValidate: true });
                      if (val === 'frequency') setValue('unit', 'vezes');
                      if (val === 'duration') setValue('unit', 'horas');
                      if (val === 'quantity') setValue('unit', 'sessões');
                    }}
                    options={[
                      { value: 'frequency', label: 'Frequência' },
                      { value: 'duration', label: 'Duração (Horas)' },
                      { value: 'quantity', label: 'Quantidade' },
                    ]}
                  />
                  {errors.goal_type && (
                    <p className="text-xs text-text-primary mt-1">⚠ {errors.goal_type.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="goal-target" className="block text-xs font-medium text-text-secondary mb-1">
                    Alvo semanal *
                  </label>
                  <input
                    id="goal-target"
                    type="number"
                    placeholder="Ex: 4"
                    step={watchedGoalType === 'duration' ? '0.5' : '1'}
                    {...register('target_value')}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
                  />
                  {errors.target_value && (
                    <p className="text-xs text-text-primary mt-1">
                      ⚠ {errors.target_value.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="goal-unit" className="block text-xs font-medium text-text-secondary mb-1">
                    Unidade *
                  </label>
                  <input
                    id="goal-unit"
                    type="text"
                    placeholder="Ex: vezes, horas"
                    {...register('unit')}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
                  />
                  {errors.unit && (
                    <p className="text-xs text-text-primary mt-1">⚠ {errors.unit.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="goal-desc" className="block text-xs font-medium text-text-secondary mb-1">
                  Observação (opcional)
                </label>
                <input
                  id="goal-desc"
                  type="text"
                  placeholder="Motivação ou critério para esta meta..."
                  {...register('description')}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
