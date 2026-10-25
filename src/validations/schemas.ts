import { z } from 'zod';
import { calculateDurationMinutes } from '@/lib/utils';

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Informe seu nome (mínimo 2 caracteres).'),
    email: z.string().trim().email('Informe um e-mail válido.'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirm_password: z.string().min(6, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'As senhas não coincidem.',
    path: ['confirm_password'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido para recuperação.'),
});

export const activityFormSchema = z
  .object({
    title: z.string().trim().min(2, 'O título deve ter pelo menos 2 caracteres.'),
    category_id: z.string().min(1, 'Selecione uma categoria.'),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inicial inválido.'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário final inválido.'),
    description: z.string().max(500, 'Máximo de 500 caracteres.').optional().or(z.literal('')),
    activity_type: z.enum(['fixed', 'flexible', 'habit']),
    is_recurring: z.boolean().default(false),
    days_of_week: z.array(z.number().min(0).max(6)).default([]),
    recurrence_end_date: z.string().optional().or(z.literal('')),
    reminder_enabled: z.boolean().default(false),
    reminder_minutes_before: z.coerce.number().min(0).max(1440).default(15),
  })
  .refine(
    (data) => {
      const duration = calculateDurationMinutes(data.start_time, data.end_time);
      return duration > 0;
    },
    {
      message: 'O horário de término deve ser posterior ao horário de início.',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      if (data.is_recurring) {
        return data.days_of_week.length > 0;
      }
      return true;
    },
    {
      message: 'Selecione pelo menos um dia da semana para a repetição.',
      path: ['days_of_week'],
    }
  );

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.'),
  icon: z.string().min(1, 'Selecione um ícone.'),
  visual_style: z.enum(['solid', 'outline', 'subtle', 'striped']),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const weeklyGoalSchema = z.object({
  title: z.string().trim().min(2, 'Informe um título para a meta.'),
  category_id: z.string().optional().or(z.literal('')),
  goal_type: z.enum(['frequency', 'duration', 'quantity']),
  target_value: z.coerce.number().positive('O valor da meta deve ser maior que zero.'),
  unit: z.string().trim().min(1, 'Informe a unidade (ex: vezes, horas, páginas).'),
  description: z.string().max(300).optional().or(z.literal('')),
});

export type WeeklyGoalFormValues = z.infer<typeof weeklyGoalSchema>;

export const notificationPrefSchema = z.object({
  phone_country_code: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, 'Informe o DDI com + (ex: +55).'),
  phone_number: z
    .string()
    .trim()
    .refine((val) => val === '' || /^\d{8,13}$/.test(val.replace(/\D/g, '')), {
      message: 'Informe apenas números com DDD (8 a 13 dígitos).',
    }),
  whatsapp_enabled: z.boolean(),
  consent_given: z.boolean(),
  opted_out: z.boolean(),
  default_reminder_minutes: z.coerce.number(),
  daily_summary_enabled: z.boolean(),
  daily_summary_time: z.string().regex(/^\d{2}:\d{2}$/),
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/),
});

export type NotificationPrefFormValues = z.infer<typeof notificationPrefSchema>;
