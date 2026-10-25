import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  isSameDay,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ScheduledActivity, OverlapWarning } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeToMinutes(time: string): number {
  const clean = time.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function formatHoursDecimal(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(dateStrOrDate: string | Date, pattern = "dd 'de' MMM"): string {
  const date = typeof dateStrOrDate === 'string' ? parseISO(dateStrOrDate) : dateStrOrDate;
  return format(date, pattern, { locale: ptBR });
}

export function getWeekDays(referenceDate: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(referenceDate, { weekStartsOn });
  const end = endOfWeek(referenceDate, { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

export function detectTimeOverlaps(
  candidate: {
    id?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
  },
  existingActivities: ScheduledActivity[]
): OverlapWarning[] {
  const candStart = timeToMinutes(candidate.start_time);
  const candEnd = timeToMinutes(candidate.end_time);
  if (candEnd <= candStart) return [];

  const warnings: OverlapWarning[] = [];

  for (const act of existingActivities) {
    if (act.id === candidate.id) continue;
    if (act.scheduled_date !== candidate.scheduled_date) continue;
    if (act.status === 'missed') continue;

    const actStart = timeToMinutes(act.start_time);
    const actEnd = timeToMinutes(act.end_time);

    const overlapStart = Math.max(candStart, actStart);
    const overlapEnd = Math.min(candEnd, actEnd);

    if (overlapEnd > overlapStart) {
      warnings.push({
        conflictingActivity: act,
        overlapMinutes: overlapEnd - overlapStart,
      });
    }
  }

  return warnings;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const WEEKDAY_LABELS: Array<{ value: number; short: string; full: string }> = [
  { value: 1, short: 'Seg', full: 'Segunda-feira' },
  { value: 2, short: 'Ter', full: 'Terça-feira' },
  { value: 3, short: 'Qua', full: 'Quarta-feira' },
  { value: 4, short: 'Qui', full: 'Quinta-feira' },
  { value: 5, short: 'Sex', full: 'Sexta-feira' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 0, short: 'Dom', full: 'Domingo' },
];

export { parseISO, startOfWeek, endOfWeek, addDays, isSameDay, getDay, ptBR, format };
