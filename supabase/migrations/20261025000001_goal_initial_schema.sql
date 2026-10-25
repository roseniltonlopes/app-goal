-- ============================================================================
-- GOAL — Planeje melhor. Viva com intenção.
-- Migração Inicial: Estrutura completa do banco de dados PostgreSQL + Supabase
-- Tabelas:
--   1. profiles
--   2. activity_categories
--   3. activity_templates
--   4. scheduled_activities
--   5. weekly_goals
--   6. notification_preferences
--   7. notification_logs
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. TABELA: profiles
-- Armazena o perfil vinculado ao usuário autenticado, preferências de tema,
-- fuso horário e informações de configuração.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  week_starts_on SMALLINT NOT NULL DEFAULT 1 CHECK (week_starts_on IN (0, 1)),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. TABELA: activity_categories
-- Armazena categorias padrão e personalizadas, com identificação do usuário
-- proprietário.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Circle',
  visual_style TEXT NOT NULL DEFAULT 'solid' CHECK (visual_style IN ('solid', 'outline', 'subtle', 'striped')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_activity_categories_user_slug UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_activity_categories_user_id ON public.activity_categories(user_id);

CREATE TRIGGER set_activity_categories_updated_at
  BEFORE UPDATE ON public.activity_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. TABELA: activity_templates
-- Armazena modelos de atividades recorrentes, incluindo horários padrão,
-- dias de repetição (0=Dom..6=Sáb), categoria e configurações da série.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.activity_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'fixed' CHECK (activity_type IN ('fixed', 'flexible', 'habit')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  days_of_week SMALLINT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  excluded_dates DATE[] NOT NULL DEFAULT '{}',
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 15 CHECK (reminder_minutes_before >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_templates_user_id ON public.activity_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_templates_category_id ON public.activity_templates(category_id);

CREATE TRIGGER set_activity_templates_updated_at
  BEFORE UPDATE ON public.activity_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. TABELA: scheduled_activities
-- Armazena as ocorrências programadas, com título, categoria, data, horário de
-- início, término, status e vínculo opcional com o modelo recorrente.
-- Preserva alterações individuais, histórico de reagendamento e conclusão.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.activity_categories(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.activity_templates(id) ON DELETE SET NULL,
  occurrence_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'fixed' CHECK (activity_type IN ('fixed', 'flexible', 'habit')),
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes > 0),
  actual_duration_minutes INTEGER CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'rescheduled')),
  is_recurring_override BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 15 CHECK (reminder_minutes_before >= 0),
  rescheduled_from_date DATE,
  rescheduled_from_start_time TIME,
  rescheduled_count INTEGER NOT NULL DEFAULT 0,
  reschedule_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Impede geração duplicada da mesma ocorrência de série recorrente na mesma data base
CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_template_occurrence
  ON public.scheduled_activities(user_id, template_id, occurrence_date)
  WHERE template_id IS NOT NULL AND occurrence_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_user_date
  ON public.scheduled_activities(user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_status
  ON public.scheduled_activities(user_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_category
  ON public.scheduled_activities(category_id);

CREATE TRIGGER set_scheduled_activities_updated_at
  BEFORE UPDATE ON public.scheduled_activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. TABELA: weekly_goals
-- Armazena metas e frequências desejadas por usuário, com período de validade
-- e categoria relacionada.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.activity_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('frequency', 'duration', 'quantity')),
  target_value NUMERIC(10, 2) NOT NULL CHECK (target_value > 0),
  unit TEXT NOT NULL DEFAULT 'vezes',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON public.weekly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_category_id ON public.weekly_goals(category_id);

CREATE TRIGGER set_weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. TABELA: notification_preferences
-- Armazena telefone, consentimento, canais disponíveis, antecedência dos
-- lembretes, resumo diário, horários silenciosos e opt-out.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_country_code TEXT NOT NULL DEFAULT '+55',
  phone_number TEXT NOT NULL DEFAULT '',
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out_timestamp TIMESTAMPTZ,
  default_reminder_minutes INTEGER NOT NULL DEFAULT 15 CHECK (default_reminder_minutes IN (5, 10, 15, 30, 60, 120)),
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_summary_time TIME NOT NULL DEFAULT '07:00',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. TABELA: notification_logs
-- Registra notificações previstas, tentativas de envio, resultados,
-- identificadores externos e erros relevantes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.scheduled_activities(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  notification_type TEXT NOT NULL DEFAULT 'activity_reminder' CHECK (notification_type IN ('activity_reminder', 'daily_summary', 'test_message')),
  recipient_phone TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'skipped_quiet_hours', 'skipped_no_consent', 'skipped_duplicate')),
  Attempt_count INTEGER NOT NULL DEFAULT 1,
  external_message_id TEXT,
  payload_summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_activity_id ON public.notification_logs(activity_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Políticas de Isolamento por Usuário
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas: activity_categories
CREATE POLICY "activity_categories_select_own" ON public.activity_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_categories_insert_own" ON public.activity_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_categories_update_own" ON public.activity_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_categories_delete_own" ON public.activity_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: activity_templates
CREATE POLICY "activity_templates_select_own" ON public.activity_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_templates_insert_own" ON public.activity_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_templates_update_own" ON public.activity_templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_templates_delete_own" ON public.activity_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: scheduled_activities
CREATE POLICY "scheduled_activities_select_own" ON public.scheduled_activities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scheduled_activities_insert_own" ON public.scheduled_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scheduled_activities_update_own" ON public.scheduled_activities
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scheduled_activities_delete_own" ON public.scheduled_activities
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: weekly_goals
CREATE POLICY "weekly_goals_select_own" ON public.weekly_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_goals_insert_own" ON public.weekly_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_goals_update_own" ON public.weekly_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_goals_delete_own" ON public.weekly_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: notification_preferences
CREATE POLICY "notification_preferences_select_own" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert_own" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update_own" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas: notification_logs
CREATE POLICY "notification_logs_select_own" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_logs_insert_own" ON public.notification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER AUTOMÁTICO DE ONBOARDING (Perfil + 9 Categorias Iniciais + Preferências)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Cria perfil padrão (Dark Mode padrão conforme especificação GOAL)
  INSERT INTO public.profiles (id, email, full_name, theme, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Usuário'), '@', 1)),
    'dark',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/Sao_Paulo')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Cria as 9 categorias oficiais iniciais do GOAL
  INSERT INTO public.activity_categories (user_id, name, slug, icon, visual_style, is_default, sort_order)
  VALUES
    (NEW.id, 'Trabalho', 'trabalho', 'Briefcase', 'solid', TRUE, 1),
    (NEW.id, 'Academia e saúde', 'academia-saude', 'Dumbbell', 'outline', TRUE, 2),
    (NEW.id, 'Estudos', 'estudos', 'GraduationCap', 'subtle', TRUE, 3),
    (NEW.id, 'Família', 'familia', 'Heart', 'solid', TRUE, 4),
    (NEW.id, 'Renda extra', 'renda-extra', 'TrendingUp', 'outline', TRUE, 5),
    (NEW.id, 'Leitura', 'leitura', 'BookOpen', 'subtle', TRUE, 6),
    (NEW.id, 'Igreja e espiritualidade', 'igreja-espiritualidade', 'Sparkles', 'outline', TRUE, 7),
    (NEW.id, 'Pessoal', 'pessoal', 'User', 'subtle', TRUE, 8),
    (NEW.id, 'Outros', 'outros', 'Layers', 'outline', TRUE, 9)
  ON CONFLICT (user_id, slug) DO NOTHING;

  -- 3. Inicializa preferências de notificação
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
