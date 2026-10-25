import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDurationMinutes,
  formatDuration,
  detectTimeOverlaps,
  formatHoursDecimal,
} from '@/lib/utils';
import { goalRepository, DEFAULT_CATEGORIES_SEED } from '@/services/goalRepository';
import type { ScheduledActivity } from '@/types';

// Mock simples de localStorage caso o ambiente node do vitest não tenha inicializado
const storageMap = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
    },
  });
}

describe('GOAL — Utilitários e Cálculos de Horário', () => {
  it('calcula corretamente a duração em minutos e formata exibição', () => {
    expect(calculateDurationMinutes('06:00', '07:30')).toBe(90);
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatHoursDecimal(90)).toBe(1.5);
    expect(calculateDurationMinutes('10:00', '09:00')).toBe(-60);
  });

  it('detecta sobreposição de horários no mesmo dia ignorando atividades não realizadas', () => {
    const existing: ScheduledActivity[] = [
      {
        id: 'act-1',
        user_id: 'u1',
        category_id: 'c1',
        title: 'Reunião de Trabalho',
        activity_type: 'fixed',
        scheduled_date: '2026-10-26',
        start_time: '09:00',
        end_time: '10:30',
        planned_duration_minutes: 90,
        status: 'pending',
        is_recurring_override: false,
        reminder_enabled: false,
        reminder_minutes_before: 15,
        rescheduled_count: 0,
        reschedule_history: [],
        created_at: '',
        updated_at: '',
      },
    ];

    const conflicts = detectTimeOverlaps(
      {
        scheduled_date: '2026-10-26',
        start_time: '10:00',
        end_time: '11:00',
      },
      existing
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });
});

describe('GOAL — Repositório Persistente, Categorias Padrão e Recorrência Sem Duplicação', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('cria usuário, inicializa as 9 categorias oficiais e gera ocorrências recorrentes sem duplicar ao navegar semanas', async () => {
    const user = await goalRepository.signUp({
      full_name: 'Nilton Teste',
      email: 'nilton@goal.app',
      password: 'password123',
    });

    const categories = await goalRepository.getCategories(user.id);
    expect(categories).toHaveLength(DEFAULT_CATEGORIES_SEED.length);

    const academiaCat = categories.find((c) => c.slug === 'academia-saude')!;
    expect(academiaCat).toBeDefined();

    // Cria série recorrente (Seg=1, Qua=3, Sex=5)
    await goalRepository.createActivityOrRecurringSeries(
      user.id,
      {
        title: 'Academia 06h',
        category_id: academiaCat.id,
        scheduled_date: '2026-10-26', // Segunda-feira
        start_time: '06:00',
        end_time: '07:00',
        activity_type: 'habit',
        is_recurring: true,
        days_of_week: [1, 3, 5],
        reminder_enabled: true,
        reminder_minutes_before: 15,
      },
      { startISO: '2026-10-26', endISO: '2026-11-01' }
    );

    // Primeira consulta da semana
    const firstRead = await goalRepository.getActivitiesForRange(
      user.id,
      '2026-10-26',
      '2026-11-01'
    );
    expect(firstRead).toHaveLength(3);

    // Segunda consulta da mesma semana (não deve duplicar registros)
    const secondRead = await goalRepository.getActivitiesForRange(
      user.id,
      '2026-10-26',
      '2026-11-01'
    );
    expect(secondRead).toHaveLength(3);

    // Excluir apenas uma ocorrência não apaga o modelo nem recria a ocorrência excluída
    await goalRepository.deleteActivity(user.id, secondRead[0].id, 'single');
    const afterSingleDelete = await goalRepository.getActivitiesForRange(
      user.id,
      '2026-10-26',
      '2026-11-01'
    );
    expect(afterSingleDelete).toHaveLength(2);
  });
});
