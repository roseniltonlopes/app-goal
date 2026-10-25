import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Percent,
  Clock,
  Timer,
  Target,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { useGoalData } from '@/contexts/GoalDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CategoryBadge } from '@/components/CategoryIcon';
import { ActivityModal } from '@/components/ActivityModal';
import { GoalSelect } from '@/components/GoalSelect';
import {
  addDays,
  formatDisplayDate,
  formatDateISO,
  formatDuration,
  getWeekDays,
  formatHoursDecimal,
  startOfWeek,
  endOfWeek,
} from '@/lib/utils';

export const DashboardPage: React.FC = () => {
  const {
    selectedWeekDate,
    setSelectedWeekDate,
    weekStartISO,
    weekEndISO,
    categories,
    weekActivities,
    historyActivities,
    goalsProgress,
    indicators,
    setActivityStatus,
  } = useGoalData();
  const { theme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Cores monocromáticas dos gráficos conforme tema Dark ou Light
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

  const filteredWeekActivities = useMemo(() => {
    if (categoryFilter === 'all') return weekActivities;
    return weekActivities.filter((a) => a.category_id === categoryFilter);
  }, [weekActivities, categoryFilter]);

  // Gráfico 1: Distribuição do tempo por categoria (Planejado vs Realizado em horas)
  const categoryDistributionData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; planejadoHoras: number; realizadoHoras: number }
    >();

    for (const act of filteredWeekActivities) {
      const cat = categories.find((c) => c.id === act.category_id);
      const catName = cat?.name || 'Outros';
      const entry = map.get(catName) || {
        name: catName,
        planejadoHoras: 0,
        realizadoHoras: 0,
      };
      entry.planejadoHoras += act.planned_duration_minutes;
      if (act.status === 'completed') {
        entry.realizadoHoras += act.actual_duration_minutes ?? act.planned_duration_minutes;
      }
      map.set(catName, entry);
    }

    return Array.from(map.values())
      .map((item) => ({
        name: item.name,
        Planejado: formatHoursDecimal(item.planejadoHoras),
        Realizado: formatHoursDecimal(item.realizadoHoras),
      }))
      .sort((a, b) => b.Planejado - a.Planejado);
  }, [filteredWeekActivities, categories]);

  // Gráfico 2: Planejado versus Realizado por dia da semana
  const dailyComparisonData = useMemo(() => {
    const days = getWeekDays(selectedWeekDate, 1);
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return days.map((d) => {
      const iso = formatDateISO(d);
      const acts = filteredWeekActivities.filter((a) => a.scheduled_date === iso);
      const plannedMin = acts.reduce((acc, a) => acc + a.planned_duration_minutes, 0);
      const completedMin = acts
        .filter((a) => a.status === 'completed')
        .reduce((acc, a) => acc + (a.actual_duration_minutes ?? a.planned_duration_minutes), 0);

      return {
        day: `${dayNames[d.getDay()]} (${iso.slice(8, 10)})`,
        Planejado: formatHoursDecimal(plannedMin),
        Realizado: formatHoursDecimal(completedMin),
      };
    });
  }, [selectedWeekDate, filteredWeekActivities]);

  // Gráfico 3: Evolução semanal da taxa de conclusão (últimas 5 semanas)
  const weeklyEvolutionData = useMemo(() => {
    const points: Array<{ semana: string; taxa: number; concluidas: number; planejadas: number }> =
      [];

    for (let offset = -4; offset <= 0; offset++) {
      const ref = addDays(selectedWeekDate, offset * 7);
      const st = formatDateISO(startOfWeek(ref, { weekStartsOn: 1 }));
      const en = formatDateISO(endOfWeek(ref, { weekStartsOn: 1 }));

      const acts = historyActivities.filter(
        (a) =>
          a.scheduled_date >= st &&
          a.scheduled_date <= en &&
          (categoryFilter === 'all' || a.category_id === categoryFilter)
      );

      const completed = acts.filter((a) => a.status === 'completed').length;
      const eligible = acts.length;
      const rate = eligible > 0 ? Math.round((completed / eligible) * 100) : 0;

      points.push({
        semana: `${st.slice(8, 10)}/${st.slice(5, 7)}`,
        taxa: rate,
        concluidas: completed,
        planejadas: eligible,
      });
    }

    return points;
  }, [selectedWeekDate, historyActivities, categoryFilter]);

  const nextActCategory = indicators.nextActivity
    ? categories.find((c) => c.id === indicators.nextActivity?.category_id)
    : null;

  return (
    <div className="space-y-8">
      {/* Cabeçalho e Seletor de Semana */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            Visão Geral da Semana
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">Dashboard</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Semana de {formatDisplayDate(weekStartISO, "dd 'de' MMM")} a{' '}
            {formatDisplayDate(weekEndISO, "dd 'de' MMM 'de' yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              Semana Atual
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

          <GoalSelect
            ariaLabel="Filtrar indicadores e gráficos por categoria"
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            className="min-w-[210px]"
            options={[
              { value: 'all', label: 'Todas as categorias', icon: 'Layers' },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
                icon: c.icon,
              })),
            ]}
          />

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* 7 Cards de Indicadores Reais (Seção 5 do writing-block.md) */}
      <section aria-label="Indicadores da semana" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Atividades planejadas */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Atividades planejadas</span>
            <CalendarCheck className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono">{indicators.plannedCount}</p>
            <p className="text-xs text-text-secondary mt-1">
              {indicators.pendingCount} pendentes · {indicators.rescheduledCount} reagendadas
            </p>
          </div>
        </div>

        {/* 2. Atividades concluídas */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Atividades concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-text-primary" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono">{indicators.completedCount}</p>
            <p className="text-xs text-text-secondary mt-1">
              de {indicators.plannedCount} previstas no período
            </p>
          </div>
        </div>

        {/* 3. Taxa de conclusão */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Taxa de conclusão</span>
            <Percent className="w-4 h-4 text-text-primary" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono">{indicators.completionRate}%</p>
            <div className="w-full h-1.5 bg-bg-secondary rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-text-primary transition-all duration-300"
                style={{ width: `${indicators.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. Horas planejadas & 5. Horas realizadas */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Horas Planejadas vs Realizadas
            </span>
            <Clock className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-2xl font-bold font-mono">{indicators.plannedHours}h</p>
              <span className="text-[11px] text-text-secondary">Planejadas</span>
            </div>
            <div className="border-l border-border-subtle pl-3">
              <p className="text-2xl font-bold font-mono">{indicators.actualHours}h</p>
              <span className="text-[11px] text-text-secondary">Realizadas</span>
            </div>
          </div>
        </div>

        {/* Card separado 5. Detalhe Horas Realizadas */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Horas realizadas</span>
            <Timer className="w-4 h-4 text-text-primary" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono">{indicators.actualHours}h</p>
            <p className="text-xs text-text-secondary mt-1">
              Tempo efetivo dedicado na semana
            </p>
          </div>
        </div>

        {/* 6. Metas semanais */}
        <div className="p-5 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Metas semanais</span>
            <Target className="w-4 h-4 text-text-primary" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono">
              {indicators.achievedGoalsCount}/{indicators.totalGoalsCount}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {indicators.totalGoalsCount === 0
                ? 'Configure metas em Evolução ou Configurações'
                : 'Metas atingidas nesta semana'}
            </p>
          </div>
        </div>

        {/* 7. Próxima atividade (ocupa 2 colunas no desktop) */}
        <div className="sm:col-span-2 p-5 rounded-2xl bg-bg-card border border-border-strong flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Próxima atividade pendente
            </span>
            <Link
              to="/meu-dia"
              className="inline-flex items-center gap-1 text-xs font-medium text-text-primary hover:underline"
            >
              <span>Ir para Meu Dia</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {indicators.nextActivity ? (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-text-primary">
                    {indicators.nextActivity.title}
                  </h3>
                  <CategoryBadge category={nextActCategory} />
                </div>
                <p className="text-xs text-text-secondary font-mono">
                  {formatDisplayDate(indicators.nextActivity.scheduled_date, "EEEE, dd/MM")} ·{' '}
                  {indicators.nextActivity.start_time.slice(0, 5)} às{' '}
                  {indicators.nextActivity.end_time.slice(0, 5)} (
                  {formatDuration(indicators.nextActivity.planned_duration_minutes)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivityStatus(indicators.nextActivity!.id, 'completed')}
                className="px-3.5 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90 shrink-0"
              >
                Concluir Agora
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-text-secondary">
                Nenhuma atividade pendente programada. Planeje seu próximo compromisso com intenção.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-border-strong text-xs font-medium text-text-primary hover:bg-bg-secondary shrink-0"
              >
                Agendar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Estado vazio orientativo quando ainda não há atividades na semana */}
      {weekActivities.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-bg-card border border-border-subtle text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-subtle flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-text-primary">
              Sua semana ainda está em branco
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              O GOAL calcula todos os indicadores e gráficos em tempo real a partir das suas
              atividades registradas. Comece adicionando seus compromissos fixos (como trabalho ou
              estudos) e seus hábitos recorrentes (como academia, leitura e tempo em família).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text-primary text-bg-primary text-xs font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeira Atividade</span>
            </button>
            <Link
              to="/planejamento"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-strong text-xs font-medium text-text-primary hover:bg-bg-secondary"
            >
              <span>Abrir Calendário Semanal</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Seção dos 3 Gráficos Responsivos Recharts */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Distribuição do tempo por categoria */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Distribuição do Tempo por Categoria (Horas)
              </h2>
              <p className="text-xs text-text-secondary">
                Equilíbrio entre áreas da vida: horas planejadas vs realizadas na semana
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryDistributionData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" stroke={chartColors.text} fontSize={11} unit="h" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={chartColors.text}
                    fontSize={11}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      borderColor: chartColors.tooltipBorder,
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Planejado" fill={chartColors.secondary} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Realizado" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Planejado versus Realizado por Dia */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Planejado vs Realizado ao Longo da Semana
              </h2>
              <p className="text-xs text-text-secondary">
                Comparativo diário de horas programadas e efetivamente concluídas
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyComparisonData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="day" stroke={chartColors.text} fontSize={11} />
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
                  <Bar dataKey="Planejado" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizado" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Evolução Semanal + Resumo de Metas Semanais */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Evolução Semanal da Taxa de Conclusão (%)
                </h2>
                <p className="text-xs text-text-secondary">
                  Progresso histórico das últimas 5 semanas
                </p>
              </div>
              <Link
                to="/evolucao"
                className="text-xs font-medium text-text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Ver análise completa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyEvolutionData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="semana" stroke={chartColors.text} fontSize={11} />
                  <YAxis domain={[0, 100]} stroke={chartColors.text} fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      borderColor: chartColors.tooltipBorder,
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="taxa"
                    name="Taxa de Conclusão (%)"
                    stroke={chartColors.primary}
                    fill={chartColors.secondary}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Acompanhamento de Metas Semanais no Dashboard */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-card border border-border-subtle flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">Metas e Hábitos da Semana</h2>
                <p className="text-xs text-text-secondary">
                  Progresso calculado sobre atividades concluídas
                </p>
              </div>
              <Link
                to="/evolucao"
                className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-medium text-text-primary hover:bg-bg-secondary"
              >
                Gerenciar Metas
              </Link>
            </div>

            {goalsProgress.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-bg-secondary border border-border-subtle space-y-2">
                <AlertCircle className="w-5 h-5 text-text-secondary" />
                <p className="text-xs text-text-secondary max-w-xs">
                  Você ainda não definiu metas semanais (ex: Academia 4x na semana ou Estudar 6h).
                </p>
                <Link
                  to="/evolucao"
                  className="text-xs font-semibold text-text-primary underline pt-1"
                >
                  Criar primeira meta semanal
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {goalsProgress.map((item) => (
                  <div
                    key={item.goal.id}
                    className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {item.goal.title}
                        </span>
                        {item.category && <CategoryBadge category={item.category} />}
                      </div>
                      <span className="text-xs font-mono font-semibold text-text-primary shrink-0">
                        {item.current_value} / {item.target_value} {item.goal.unit} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-bg-card overflow-hidden">
                      <div
                        className="h-full bg-text-primary transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
