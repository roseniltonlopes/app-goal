import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { calculateDurationMinutes, formatDateISO, getDay, parseISO, slugify } from '@/lib/utils';
import type {
  Profile,
  ActivityCategory,
  ActivityTemplate,
  ScheduledActivity,
  WeeklyGoal,
  NotificationPreference,
  NotificationLog,
  ThemeMode,
  ActivityStatus,
  CategoryVisualStyle,
  ActivityType,
  GoalType,
} from '@/types';
import { eachDayOfInterval } from 'date-fns';

// ============================================================================
// Categorias Iniciais Oficiais do GOAL (Item 8 do writing-block.md)
// ============================================================================
export const DEFAULT_CATEGORIES_SEED: Array<{
  name: string;
  slug: string;
  icon: string;
  visual_style: CategoryVisualStyle;
  sort_order: number;
}> = [
  { name: 'Trabalho', slug: 'trabalho', icon: 'Briefcase', visual_style: 'solid', sort_order: 1 },
  { name: 'Academia e saúde', slug: 'academia-saude', icon: 'Dumbbell', visual_style: 'outline', sort_order: 2 },
  { name: 'Estudos', slug: 'estudos', icon: 'GraduationCap', visual_style: 'subtle', sort_order: 3 },
  { name: 'Família', slug: 'familia', icon: 'Heart', visual_style: 'solid', sort_order: 4 },
  { name: 'Renda extra', slug: 'renda-extra', icon: 'TrendingUp', visual_style: 'outline', sort_order: 5 },
  { name: 'Leitura', slug: 'leitura', icon: 'BookOpen', visual_style: 'subtle', sort_order: 6 },
  {
    name: 'Igreja e espiritualidade',
    slug: 'igreja-espiritualidade',
    icon: 'Sparkles',
    visual_style: 'outline',
    sort_order: 7,
  },
  { name: 'Pessoal', slug: 'pessoal', icon: 'User', visual_style: 'subtle', sort_order: 8 },
  { name: 'Outros', slug: 'outros', icon: 'Layers', visual_style: 'outline', sort_order: 9 },
];

// ============================================================================
// Estruturas do Adaptador Persistente Local (quando Supabase não está configurado)
// ============================================================================
interface LocalAuthUser {
  id: string;
  email: string;
  passwordHash: string;
  full_name: string;
  created_at: string;
}

interface LocalDatabase {
  users: LocalAuthUser[];
  currentSessionUserId: string | null;
  profiles: Profile[];
  activity_categories: ActivityCategory[];
  activity_templates: ActivityTemplate[];
  scheduled_activities: ScheduledActivity[];
  weekly_goals: WeeklyGoal[];
  notification_preferences: NotificationPreference[];
  notification_logs: NotificationLog[];
}

const LOCAL_DB_KEY = 'goal_persistent_database_v1';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
      return {
        users: parsed.users ?? [],
        currentSessionUserId: parsed.currentSessionUserId ?? null,
        profiles: parsed.profiles ?? [],
        activity_categories: parsed.activity_categories ?? [],
        activity_templates: parsed.activity_templates ?? [],
        scheduled_activities: parsed.scheduled_activities ?? [],
        weekly_goals: parsed.weekly_goals ?? [],
        notification_preferences: parsed.notification_preferences ?? [],
        notification_logs: parsed.notification_logs ?? [],
      };
    }
  } catch (e) {
    console.error('Erro ao ler banco persistente local:', e);
  }
  return {
    users: [],
    currentSessionUserId: null,
    profiles: [],
    activity_categories: [],
    activity_templates: [],
    scheduled_activities: [],
    weekly_goals: [],
    notification_preferences: [],
    notification_logs: [],
  };
}

function saveLocalDb(db: LocalDatabase): void {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Erro ao salvar banco persistente local:', e);
  }
}

function ensureUserSeedLocal(db: LocalDatabase, userId: string, email: string, fullName: string): void {
  const now = new Date().toISOString();

  let profile = db.profiles.find((p) => p.id === userId);
  if (!profile) {
    const storedTheme = (localStorage.getItem('goal_theme') as ThemeMode) || 'dark';
    profile = {
      id: userId,
      email,
      full_name: fullName || email.split('@')[0],
      avatar_url: null,
      theme: storedTheme === 'light' ? 'light' : 'dark',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      week_starts_on: 1,
      onboarding_completed: true,
      created_at: now,
      updated_at: now,
    };
    db.profiles.push(profile);
  }

  const userCategories = db.activity_categories.filter((c) => c.user_id === userId);
  if (userCategories.length === 0) {
    for (const seed of DEFAULT_CATEGORIES_SEED) {
      db.activity_categories.push({
        id: generateId(),
        user_id: userId,
        name: seed.name,
        slug: seed.slug,
        icon: seed.icon,
        visual_style: seed.visual_style,
        is_default: true,
        is_archived: false,
        sort_order: seed.sort_order,
        created_at: now,
        updated_at: now,
      });
    }
  }

  let notifPref = db.notification_preferences.find((n) => n.user_id === userId);
  if (!notifPref) {
    notifPref = {
      id: generateId(),
      user_id: userId,
      phone_country_code: '+55',
      phone_number: '',
      whatsapp_enabled: false,
      consent_given: false,
      consent_timestamp: null,
      opted_out: false,
      opted_out_timestamp: null,
      default_reminder_minutes: 15,
      daily_summary_enabled: false,
      daily_summary_time: '07:00',
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      created_at: now,
      updated_at: now,
    };
    db.notification_preferences.push(notifPref);
  }
}

// ============================================================================
// Repositório Unificado (Supabase Real + Adaptador Persistente Local)
// ============================================================================
export const goalRepository = {
  isRemote(): boolean {
    return isSupabaseConfigured && supabase !== null;
  },

  // --------------------------------------------------------------------------
  // AUTENTICAÇÃO E SESSÃO
  // --------------------------------------------------------------------------
  async getCurrentSessionUser(): Promise<{ id: string; email: string; full_name: string } | null> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) return null;
      const u = data.session.user;
      return {
        id: u.id,
        email: u.email || '',
        full_name: (u.user_metadata?.full_name as string) || u.email?.split('@')[0] || 'Usuário',
      };
    }

    const db = loadLocalDb();
    if (!db.currentSessionUserId) return null;
    const user = db.users.find((u) => u.id === db.currentSessionUserId);
    if (!user) return null;
    ensureUserSeedLocal(db, user.id, user.email, user.full_name);
    saveLocalDb(db);
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    };
  },

  async signUp(input: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<{ id: string; email: string; full_name: string }> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.full_name.trim();

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: input.password,
        options: {
          data: {
            full_name: cleanName,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Não foi possível concluir o cadastro.');
      await this.ensureRemoteSeed(data.user.id, cleanEmail, cleanName);
      return {
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanName,
      };
    }

    const db = loadLocalDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const newUser: LocalAuthUser = {
      id: generateId(),
      email: cleanEmail,
      passwordHash: btoa(encodeURIComponent(input.password)),
      full_name: cleanName,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.currentSessionUserId = newUser.id;
    ensureUserSeedLocal(db, newUser.id, newUser.email, newUser.full_name);
    saveLocalDb(db);

    return {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
    };
  },

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<{ id: string; email: string; full_name: string }> {
    const cleanEmail = input.email.trim().toLowerCase();

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: input.password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Credenciais inválidas.');
      const fullName =
        (data.user.user_metadata?.full_name as string) || cleanEmail.split('@')[0] || 'Usuário';
      await this.ensureRemoteSeed(data.user.id, cleanEmail, fullName);
      return {
        id: data.user.id,
        email: cleanEmail,
        full_name: fullName,
      };
    }

    const db = loadLocalDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('E-mail não encontrado. Crie sua conta primeiro.');
    }
    const encodedPass = btoa(encodeURIComponent(input.password));
    if (user.passwordHash !== encodedPass) {
      throw new Error('Senha incorreta. Verifique suas credenciais.');
    }

    db.currentSessionUserId = user.id;
    ensureUserSeedLocal(db, user.id, user.email, user.full_name);
    saveLocalDb(db);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    };
  },

  async signOut(): Promise<void> {
    if (this.isRemote() && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      return;
    }
    const db = loadLocalDb();
    db.currentSessionUserId = null;
    saveLocalDb(db);
  },

  async resetPassword(email: string, newPasswordForLocal?: string): Promise<string> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.isRemote() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw new Error(error.message);
      return 'Enviamos um link de redefinição de senha para o seu e-mail.';
    }

    const db = loadLocalDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Nenhuma conta encontrada com este e-mail.');
    }
    if (newPasswordForLocal && newPasswordForLocal.length >= 6) {
      user.passwordHash = btoa(encodeURIComponent(newPasswordForLocal));
      saveLocalDb(db);
      return 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.';
    }
    return 'Conta localizada. Informe sua nova senha abaixo para concluir a redefinição.';
  },

  async ensureRemoteSeed(userId: string, email: string, fullName: string): Promise<void> {
    if (!this.isRemote() || !supabase) return;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: userId,
        email,
        full_name: fullName,
        theme: 'dark',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        week_starts_on: 1,
        onboarding_completed: true,
      });
    }

    const { data: existingCats } = await supabase
      .from('activity_categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingCats || existingCats.length === 0) {
      const rows = DEFAULT_CATEGORIES_SEED.map((s) => ({
        user_id: userId,
        name: s.name,
        slug: s.slug,
        icon: s.icon,
        visual_style: s.visual_style,
        is_default: true,
        is_archived: false,
        sort_order: s.sort_order,
      }));
      await supabase.from('activity_categories').insert(rows);
    }

    const { data: existingPref } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingPref) {
      await supabase.from('notification_preferences').insert({ user_id: userId });
    }
  },

  // --------------------------------------------------------------------------
  // PERFIL (profiles)
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<Profile> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    }

    const db = loadLocalDb();
    const user = db.users.find((u) => u.id === userId);
    ensureUserSeedLocal(db, userId, user?.email || '', user?.full_name || 'Usuário');
    saveLocalDb(db);
    const profile = db.profiles.find((p) => p.id === userId);
    if (!profile) throw new Error('Perfil não encontrado.');
    return profile;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'full_name' | 'theme' | 'timezone' | 'week_starts_on'>>
  ): Promise<Profile> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    }

    const db = loadLocalDb();
    const idx = db.profiles.findIndex((p) => p.id === userId);
    if (idx === -1) throw new Error('Perfil não localizado.');
    db.profiles[idx] = {
      ...db.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const userIdx = db.users.findIndex((u) => u.id === userId);
    if (userIdx !== -1 && updates.full_name) {
      db.users[userIdx].full_name = updates.full_name;
    }
    saveLocalDb(db);
    return db.profiles[idx];
  },

  // --------------------------------------------------------------------------
  // CATEGORIAS (activity_categories)
  // --------------------------------------------------------------------------
  async getCategories(userId: string): Promise<ActivityCategory[]> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as ActivityCategory[];
    }

    const db = loadLocalDb();
    return db.activity_categories
      .filter((c) => c.user_id === userId && !c.is_archived)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  },

  async createCategory(
    userId: string,
    payload: { name: string; icon: string; visual_style: CategoryVisualStyle }
  ): Promise<ActivityCategory> {
    const cleanName = payload.name.trim();
    const slug = `${slugify(cleanName)}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('activity_categories')
        .insert({
          user_id: userId,
          name: cleanName,
          slug,
          icon: payload.icon,
          visual_style: payload.visual_style,
          is_default: false,
          is_archived: false,
          sort_order: 50,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as ActivityCategory;
    }

    const db = loadLocalDb();
    const newCat: ActivityCategory = {
      id: generateId(),
      user_id: userId,
      name: cleanName,
      slug,
      icon: payload.icon,
      visual_style: payload.visual_style,
      is_default: false,
      is_archived: false,
      sort_order: db.activity_categories.filter((c) => c.user_id === userId).length + 1,
      created_at: now,
      updated_at: now,
    };
    db.activity_categories.push(newCat);
    saveLocalDb(db);
    return newCat;
  },

  async updateCategory(
    userId: string,
    categoryId: string,
    payload: { name: string; icon: string; visual_style: CategoryVisualStyle }
  ): Promise<ActivityCategory> {
    const cleanName = payload.name.trim();
    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('activity_categories')
        .update({
          name: cleanName,
          icon: payload.icon,
          visual_style: payload.visual_style,
          updated_at: now,
        })
        .eq('id', categoryId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as ActivityCategory;
    }

    const db = loadLocalDb();
    const idx = db.activity_categories.findIndex((c) => c.id === categoryId && c.user_id === userId);
    if (idx === -1) throw new Error('Categoria não encontrada.');
    db.activity_categories[idx] = {
      ...db.activity_categories[idx],
      name: cleanName,
      icon: payload.icon,
      visual_style: payload.visual_style,
      updated_at: now,
    };
    saveLocalDb(db);
    return db.activity_categories[idx];
  },

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    // Exclusão segura: transfere atividades para a categoria 'Outros' ou NULL, evitando inconsistência (Item 9)
    if (this.isRemote() && supabase) {
      const { data: fallbackCat } = await supabase
        .from('activity_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('slug', 'outros')
        .maybeSingle();

      const fallbackId = fallbackCat?.id && fallbackCat.id !== categoryId ? fallbackCat.id : null;

      await supabase
        .from('scheduled_activities')
        .update({ category_id: fallbackId })
        .eq('user_id', userId)
        .eq('category_id', categoryId);

      await supabase
        .from('activity_templates')
        .update({ category_id: fallbackId })
        .eq('user_id', userId)
        .eq('category_id', categoryId);

      const { error } = await supabase
        .from('activity_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDb();
    const fallbackCat = db.activity_categories.find(
      (c) => c.user_id === userId && c.slug === 'outros' && c.id !== categoryId
    );
    const fallbackId = fallbackCat ? fallbackCat.id : null;

    db.scheduled_activities = db.scheduled_activities.map((a) =>
      a.user_id === userId && a.category_id === categoryId ? { ...a, category_id: fallbackId } : a
    );
    db.activity_templates = db.activity_templates.map((t) =>
      t.user_id === userId && t.category_id === categoryId ? { ...t, category_id: fallbackId } : t
    );
    db.weekly_goals = db.weekly_goals.map((g) =>
      g.user_id === userId && g.category_id === categoryId ? { ...g, category_id: fallbackId } : g
    );
    db.activity_categories = db.activity_categories.filter(
      (c) => !(c.id === categoryId && c.user_id === userId)
    );
    saveLocalDb(db);
  },

  // --------------------------------------------------------------------------
  // MODELOS RECORRENTES (activity_templates) & MATERIALIZAÇÃO SEM DUPLICAÇÃO
  // --------------------------------------------------------------------------
  async getTemplates(userId: string): Promise<ActivityTemplate[]> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('activity_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as ActivityTemplate[];
    }

    const db = loadLocalDb();
    return db.activity_templates.filter((t) => t.user_id === userId && t.is_active);
  },

  /**
   * Sincroniza ocorrências de modelos recorrentes para um intervalo [startDateISO, endDateISO]
   * garantindo que NÃO sejam criados registros duplicados ao avançar ou retroceder semanas,
   * e respeitando datas excluídas (excluded_dates) ou ocorrências já personalizadas/reagendadas.
   */
  async syncRecurringOccurrencesForRange(
    userId: string,
    startDateISO: string,
    endDateISO: string
  ): Promise<void> {
    const start = parseISO(startDateISO);
    const end = parseISO(endDateISO);
    const daysInInterval = eachDayOfInterval({ start, end });

    if (this.isRemote() && supabase) {
      const { data: templates } = await supabase
        .from('activity_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!templates || templates.length === 0) return;

      const { data: existingOccurrences } = await supabase
        .from('scheduled_activities')
        .select('id, template_id, occurrence_date, scheduled_date')
        .eq('user_id', userId)
        .not('template_id', 'is', null)
        .gte('occurrence_date', startDateISO)
        .lte('occurrence_date', endDateISO);

      const existingKeys = new Set(
        (existingOccurrences || []).map((o) => `${o.template_id}_${o.occurrence_date}`)
      );

      const toInsert: Array<Record<string, unknown>> = [];

      for (const tpl of templates as ActivityTemplate[]) {
        for (const dayDate of daysInInterval) {
          const dayISO = formatDateISO(dayDate);
          const weekday = getDay(dayDate);

          if (!tpl.days_of_week.includes(weekday)) continue;
          if (dayISO < tpl.start_date) continue;
          if (tpl.end_date && dayISO > tpl.end_date) continue;
          if ((tpl.excluded_dates || []).includes(dayISO)) continue;

          const key = `${tpl.id}_${dayISO}`;
          if (existingKeys.has(key)) continue;

          existingKeys.add(key);
          toInsert.push({
            user_id: userId,
            category_id: tpl.category_id,
            template_id: tpl.id,
            occurrence_date: dayISO,
            title: tpl.title,
            description: tpl.description || null,
            activity_type: tpl.activity_type,
            scheduled_date: dayISO,
            start_time: tpl.start_time.slice(0, 5),
            end_time: tpl.end_time.slice(0, 5),
            planned_duration_minutes: tpl.duration_minutes,
            status: 'pending',
            is_recurring_override: false,
            reminder_enabled: tpl.reminder_enabled,
            reminder_minutes_before: tpl.reminder_minutes_before,
            rescheduled_count: 0,
            reschedule_history: [],
          });
        }
      }

      if (toInsert.length > 0) {
        await supabase.from('scheduled_activities').upsert(toInsert, {
          onConflict: 'user_id,template_id,occurrence_date',
          ignoreDuplicates: true,
        });
      }
      return;
    }

    // Modo Local
    const db = loadLocalDb();
    const activeTemplates = db.activity_templates.filter(
      (t) => t.user_id === userId && t.is_active
    );
    if (activeTemplates.length === 0) return;

    const existingKeys = new Set(
      db.scheduled_activities
        .filter((a) => a.user_id === userId && a.template_id && a.occurrence_date)
        .map((a) => `${a.template_id}_${a.occurrence_date}`)
    );

    let changed = false;
    const now = new Date().toISOString();

    for (const tpl of activeTemplates) {
      for (const dayDate of daysInInterval) {
        const dayISO = formatDateISO(dayDate);
        const weekday = getDay(dayDate);

        if (!tpl.days_of_week.includes(weekday)) continue;
        if (dayISO < tpl.start_date) continue;
        if (tpl.end_date && dayISO > tpl.end_date) continue;
        if ((tpl.excluded_dates || []).includes(dayISO)) continue;

        const key = `${tpl.id}_${dayISO}`;
        if (existingKeys.has(key)) continue;

        existingKeys.add(key);
        db.scheduled_activities.push({
          id: generateId(),
          user_id: userId,
          category_id: tpl.category_id,
          template_id: tpl.id,
          occurrence_date: dayISO,
          title: tpl.title,
          description: tpl.description || null,
          activity_type: tpl.activity_type,
          scheduled_date: dayISO,
          start_time: tpl.start_time.slice(0, 5),
          end_time: tpl.end_time.slice(0, 5),
          planned_duration_minutes: tpl.duration_minutes,
          actual_duration_minutes: null,
          status: 'pending',
          is_recurring_override: false,
          reminder_enabled: tpl.reminder_enabled,
          reminder_minutes_before: tpl.reminder_minutes_before,
          rescheduled_from_date: null,
          rescheduled_from_start_time: null,
          rescheduled_count: 0,
          reschedule_history: [],
          completed_at: null,
          notes: null,
          created_at: now,
          updated_at: now,
        });
        changed = true;
      }
    }

    if (changed) {
      saveLocalDb(db);
    }
  },

  // --------------------------------------------------------------------------
  // ATIVIDADES PROGRAMADAS (scheduled_activities)
  // --------------------------------------------------------------------------
  async getActivitiesForRange(
    userId: string,
    startDateISO: string,
    endDateISO: string
  ): Promise<ScheduledActivity[]> {
    // 1. Garante que qualquer série recorrente tenha suas ocorrências geradas para o período
    await this.syncRecurringOccurrencesForRange(userId, startDateISO, endDateISO);

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', startDateISO)
        .lte('scheduled_date', endDateISO)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data || []) as ScheduledActivity[]).map((a) => ({
        ...a,
        start_time: a.start_time.slice(0, 5),
        end_time: a.end_time.slice(0, 5),
        reschedule_history: Array.isArray(a.reschedule_history) ? a.reschedule_history : [],
      }));
    }

    const db = loadLocalDb();
    return db.scheduled_activities
      .filter(
        (a) =>
          a.user_id === userId &&
          a.scheduled_date >= startDateISO &&
          a.scheduled_date <= endDateISO
      )
      .sort(
        (a, b) =>
          a.scheduled_date.localeCompare(b.scheduled_date) ||
          a.start_time.localeCompare(b.start_time)
      );
  },

  async createActivityOrRecurringSeries(
    userId: string,
    payload: {
      title: string;
      category_id: string;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      description?: string;
      activity_type: ActivityType;
      is_recurring: boolean;
      days_of_week: number[];
      recurrence_end_date?: string;
      reminder_enabled: boolean;
      reminder_minutes_before: number;
    },
    currentWeekRange?: { startISO: string; endISO: string }
  ): Promise<ScheduledActivity> {
    const duration = calculateDurationMinutes(payload.start_time, payload.end_time);
    if (duration <= 0) {
      throw new Error('O horário de término deve ser maior que o horário de início.');
    }

    const now = new Date().toISOString();

    // Caso recorrente: cria primeiro o modelo em `activity_templates` e sincroniza ocorrências
    if (payload.is_recurring && payload.days_of_week.length > 0) {
      const selectedWeekday = getDay(parseISO(payload.scheduled_date));
      const daysSet = Array.from(new Set([...payload.days_of_week, selectedWeekday])).sort();

      if (this.isRemote() && supabase) {
        const { data: tpl, error: tplErr } = await supabase
          .from('activity_templates')
          .insert({
            user_id: userId,
            category_id: payload.category_id,
            title: payload.title.trim(),
            description: payload.description?.trim() || null,
            activity_type: payload.activity_type,
            start_time: payload.start_time,
            end_time: payload.end_time,
            duration_minutes: duration,
            days_of_week: daysSet,
            start_date: payload.scheduled_date,
            end_date: payload.recurrence_end_date || null,
            excluded_dates: [],
            reminder_enabled: payload.reminder_enabled,
            reminder_minutes_before: payload.reminder_minutes_before,
            is_active: true,
          })
          .select('*')
          .single();

        if (tplErr) throw new Error(tplErr.message);

        const syncStart = currentWeekRange?.startISO || payload.scheduled_date;
        const syncEnd = currentWeekRange?.endISO || payload.scheduled_date;
        await this.syncRecurringOccurrencesForRange(userId, syncStart, syncEnd);

        const { data: createdOcc } = await supabase
          .from('scheduled_activities')
          .select('*')
          .eq('user_id', userId)
          .eq('template_id', (tpl as ActivityTemplate).id)
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        return (createdOcc as ScheduledActivity) || ({} as ScheduledActivity);
      }

      const db = loadLocalDb();
      const newTemplate: ActivityTemplate = {
        id: generateId(),
        user_id: userId,
        category_id: payload.category_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        activity_type: payload.activity_type,
        start_time: payload.start_time,
        end_time: payload.end_time,
        duration_minutes: duration,
        days_of_week: daysSet,
        start_date: payload.scheduled_date,
        end_date: payload.recurrence_end_date || null,
        excluded_dates: [],
        reminder_enabled: payload.reminder_enabled,
        reminder_minutes_before: payload.reminder_minutes_before,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      db.activity_templates.push(newTemplate);
      saveLocalDb(db);

      const syncStart = currentWeekRange?.startISO || payload.scheduled_date;
      const syncEnd = currentWeekRange?.endISO || payload.scheduled_date;
      await this.syncRecurringOccurrencesForRange(userId, syncStart, syncEnd);

      const updatedDb = loadLocalDb();
      const occ = updatedDb.scheduled_activities.find(
        (a) => a.user_id === userId && a.template_id === newTemplate.id
      );
      return occ!;
    }

    // Atividade avulsa
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('scheduled_activities')
        .insert({
          user_id: userId,
          category_id: payload.category_id,
          template_id: null,
          occurrence_date: null,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          activity_type: payload.activity_type,
          scheduled_date: payload.scheduled_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          planned_duration_minutes: duration,
          status: 'pending',
          is_recurring_override: false,
          reminder_enabled: payload.reminder_enabled,
          reminder_minutes_before: payload.reminder_minutes_before,
          rescheduled_count: 0,
          reschedule_history: [],
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as ScheduledActivity;
    }

    const db = loadLocalDb();
    const newActivity: ScheduledActivity = {
      id: generateId(),
      user_id: userId,
      category_id: payload.category_id,
      template_id: null,
      occurrence_date: null,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      activity_type: payload.activity_type,
      scheduled_date: payload.scheduled_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      planned_duration_minutes: duration,
      actual_duration_minutes: null,
      status: 'pending',
      is_recurring_override: false,
      reminder_enabled: payload.reminder_enabled,
      reminder_minutes_before: payload.reminder_minutes_before,
      rescheduled_from_date: null,
      rescheduled_from_start_time: null,
      rescheduled_count: 0,
      reschedule_history: [],
      completed_at: null,
      notes: null,
      created_at: now,
      updated_at: now,
    };
    db.scheduled_activities.push(newActivity);
    saveLocalDb(db);
    return newActivity;
  },

  /**
   * Edita uma atividade programada:
   * - scope === 'single': altera apenas esta ocorrência (e marca is_recurring_override = true)
   * - scope === 'series': atualiza o modelo recorrente (activity_templates) e todas as ocorrências pendentes não sobrepostas
   */
  async updateActivity(
    userId: string,
    activityId: string,
    payload: {
      title: string;
      category_id: string;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      description?: string;
      activity_type: ActivityType;
      days_of_week?: number[];
      recurrence_end_date?: string;
      reminder_enabled: boolean;
      reminder_minutes_before: number;
    },
    scope: 'single' | 'series' = 'single'
  ): Promise<ScheduledActivity> {
    const duration = calculateDurationMinutes(payload.start_time, payload.end_time);
    if (duration <= 0) {
      throw new Error('O horário de término deve ser posterior ao horário de início.');
    }

    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data: currentAct, error: fetchErr } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !currentAct) throw new Error('Atividade não encontrada.');

      if (scope === 'series' && currentAct.template_id) {
        await supabase
          .from('activity_templates')
          .update({
            title: payload.title.trim(),
            category_id: payload.category_id,
            description: payload.description?.trim() || null,
            activity_type: payload.activity_type,
            start_time: payload.start_time,
            end_time: payload.end_time,
            duration_minutes: duration,
            days_of_week:
              payload.days_of_week && payload.days_of_week.length > 0
                ? payload.days_of_week
                : undefined,
            end_date: payload.recurrence_end_date || null,
            reminder_enabled: payload.reminder_enabled,
            reminder_minutes_before: payload.reminder_minutes_before,
            updated_at: now,
          })
          .eq('id', currentAct.template_id)
          .eq('user_id', userId);

        // Atualiza ocorrências pendentes da série que não foram customizadas individualmente
        await supabase
          .from('scheduled_activities')
          .update({
            title: payload.title.trim(),
            category_id: payload.category_id,
            description: payload.description?.trim() || null,
            activity_type: payload.activity_type,
            start_time: payload.start_time,
            end_time: payload.end_time,
            planned_duration_minutes: duration,
            reminder_enabled: payload.reminder_enabled,
            reminder_minutes_before: payload.reminder_minutes_before,
            updated_at: now,
          })
          .eq('template_id', currentAct.template_id)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .eq('is_recurring_override', false);
      }

      const { data: updated, error: updErr } = await supabase
        .from('scheduled_activities')
        .update({
          title: payload.title.trim(),
          category_id: payload.category_id,
          scheduled_date: payload.scheduled_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          planned_duration_minutes: duration,
          description: payload.description?.trim() || null,
          activity_type: payload.activity_type,
          reminder_enabled: payload.reminder_enabled,
          reminder_minutes_before: payload.reminder_minutes_before,
          is_recurring_override: scope === 'single' && Boolean(currentAct.template_id),
          updated_at: now,
        })
        .eq('id', activityId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updErr) throw new Error(updErr.message);
      return updated as ScheduledActivity;
    }

    // Modo Local
    const db = loadLocalDb();
    const idx = db.scheduled_activities.findIndex(
      (a) => a.id === activityId && a.user_id === userId
    );
    if (idx === -1) throw new Error('Atividade não encontrada.');

    const currentAct = db.scheduled_activities[idx];

    if (scope === 'series' && currentAct.template_id) {
      const tplIdx = db.activity_templates.findIndex(
        (t) => t.id === currentAct.template_id && t.user_id === userId
      );
      if (tplIdx !== -1) {
        db.activity_templates[tplIdx] = {
          ...db.activity_templates[tplIdx],
          title: payload.title.trim(),
          category_id: payload.category_id,
          description: payload.description?.trim() || null,
          activity_type: payload.activity_type,
          start_time: payload.start_time,
          end_time: payload.end_time,
          duration_minutes: duration,
          days_of_week:
            payload.days_of_week && payload.days_of_week.length > 0
              ? payload.days_of_week
              : db.activity_templates[tplIdx].days_of_week,
          end_date: payload.recurrence_end_date || null,
          reminder_enabled: payload.reminder_enabled,
          reminder_minutes_before: payload.reminder_minutes_before,
          updated_at: now,
        };
      }

      db.scheduled_activities = db.scheduled_activities.map((a) => {
        if (
          a.user_id === userId &&
          a.template_id === currentAct.template_id &&
          a.status === 'pending' &&
          !a.is_recurring_override
        ) {
          return {
            ...a,
            title: payload.title.trim(),
            category_id: payload.category_id,
            description: payload.description?.trim() || null,
            activity_type: payload.activity_type,
            start_time: payload.start_time,
            end_time: payload.end_time,
            planned_duration_minutes: duration,
            reminder_enabled: payload.reminder_enabled,
            reminder_minutes_before: payload.reminder_minutes_before,
            updated_at: now,
          };
        }
        return a;
      });
    }

    db.scheduled_activities[idx] = {
      ...db.scheduled_activities[idx],
      title: payload.title.trim(),
      category_id: payload.category_id,
      scheduled_date: payload.scheduled_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      planned_duration_minutes: duration,
      description: payload.description?.trim() || null,
      activity_type: payload.activity_type,
      reminder_enabled: payload.reminder_enabled,
      reminder_minutes_before: payload.reminder_minutes_before,
      is_recurring_override:
        scope === 'single' ? Boolean(currentAct.template_id) : currentAct.is_recurring_override,
      updated_at: now,
    };

    saveLocalDb(db);
    return db.scheduled_activities[idx];
  },

  /**
   * Exclui uma ocorrência ou toda a série recorrente:
   * - scope === 'single': exclui apenas a ocorrência e registra a data em `excluded_dates` do template para que não seja recriada ao navegar entre semanas.
   * - scope === 'series': desativa/remove o modelo recorrente e remove ocorrências pendentes.
   */
  async deleteActivity(
    userId: string,
    activityId: string,
    scope: 'single' | 'series' = 'single'
  ): Promise<void> {
    if (this.isRemote() && supabase) {
      const { data: currentAct } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!currentAct) return;

      if (scope === 'series' && currentAct.template_id) {
        await supabase
          .from('scheduled_activities')
          .delete()
          .eq('template_id', currentAct.template_id)
          .eq('user_id', userId)
          .eq('status', 'pending');

        await supabase
          .from('activity_templates')
          .update({ is_active: false })
          .eq('id', currentAct.template_id)
          .eq('user_id', userId);

        await supabase
          .from('scheduled_activities')
          .delete()
          .eq('id', activityId)
          .eq('user_id', userId);
        return;
      }

      if (currentAct.template_id && currentAct.occurrence_date) {
        const { data: tpl } = await supabase
          .from('activity_templates')
          .select('excluded_dates')
          .eq('id', currentAct.template_id)
          .eq('user_id', userId)
          .maybeSingle();

        const currentExcluded: string[] = Array.isArray(tpl?.excluded_dates)
          ? tpl.excluded_dates
          : [];
        if (!currentExcluded.includes(currentAct.occurrence_date)) {
          await supabase
            .from('activity_templates')
            .update({ excluded_dates: [...currentExcluded, currentAct.occurrence_date] })
            .eq('id', currentAct.template_id)
            .eq('user_id', userId);
        }
      }

      const { error } = await supabase
        .from('scheduled_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return;
    }

    // Modo Local
    const db = loadLocalDb();
    const target = db.scheduled_activities.find(
      (a) => a.id === activityId && a.user_id === userId
    );
    if (!target) return;

    if (scope === 'series' && target.template_id) {
      db.activity_templates = db.activity_templates.map((t) =>
        t.id === target.template_id && t.user_id === userId ? { ...t, is_active: false } : t
      );
      db.scheduled_activities = db.scheduled_activities.filter(
        (a) =>
          !(
            a.user_id === userId &&
            (a.id === activityId || (a.template_id === target.template_id && a.status === 'pending'))
          )
      );
      saveLocalDb(db);
      return;
    }

    if (target.template_id && target.occurrence_date) {
      const tplIdx = db.activity_templates.findIndex(
        (t) => t.id === target.template_id && t.user_id === userId
      );
      if (tplIdx !== -1) {
        const excluded = new Set(db.activity_templates[tplIdx].excluded_dates || []);
        excluded.add(target.occurrence_date);
        db.activity_templates[tplIdx].excluded_dates = Array.from(excluded);
      }
    }

    db.scheduled_activities = db.scheduled_activities.filter(
      (a) => !(a.id === activityId && a.user_id === userId)
    );
    saveLocalDb(db);
  },

  /**
   * Atualiza o status da atividade (Concluir, Não realizada, Pendente)
   */
  async updateActivityStatus(
    userId: string,
    activityId: string,
    status: ActivityStatus,
    actualDurationMinutes?: number
  ): Promise<ScheduledActivity> {
    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data: currentAct, error: fetchErr } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !currentAct) throw new Error('Atividade não localizada.');

      const resolvedActualDuration =
        status === 'completed'
          ? actualDurationMinutes ?? currentAct.planned_duration_minutes
          : null;

      const { data, error } = await supabase
        .from('scheduled_activities')
        .update({
          status,
          actual_duration_minutes: resolvedActualDuration,
          completed_at: status === 'completed' ? now : null,
          updated_at: now,
        })
        .eq('id', activityId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data as ScheduledActivity;
    }

    const db = loadLocalDb();
    const idx = db.scheduled_activities.findIndex(
      (a) => a.id === activityId && a.user_id === userId
    );
    if (idx === -1) throw new Error('Atividade não localizada.');

    const currentAct = db.scheduled_activities[idx];
    const resolvedActualDuration =
      status === 'completed'
        ? actualDurationMinutes ?? currentAct.planned_duration_minutes
        : null;

    db.scheduled_activities[idx] = {
      ...currentAct,
      status,
      actual_duration_minutes: resolvedActualDuration,
      completed_at: status === 'completed' ? now : null,
      updated_at: now,
    };

    saveLocalDb(db);
    return db.scheduled_activities[idx];
  },

  /**
   * Reagenda uma atividade para nova data/horário preservando todo o histórico
   * de reagendamento e mantendo a atividade elegível (status 'pending', sem penalizar).
   */
  async rescheduleActivity(
    userId: string,
    activityId: string,
    newSchedule: {
      scheduled_date: string;
      start_time: string;
      end_time: string;
      reason?: string;
    }
  ): Promise<ScheduledActivity> {
    const duration = calculateDurationMinutes(newSchedule.start_time, newSchedule.end_time);
    if (duration <= 0) {
      throw new Error('O novo horário de término deve ser posterior ao horário de início.');
    }

    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data: currentAct, error: fetchErr } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !currentAct) throw new Error('Atividade não encontrada.');

      const history = Array.isArray(currentAct.reschedule_history)
        ? [...currentAct.reschedule_history]
        : [];
      history.push({
        from_date: currentAct.scheduled_date,
        from_start_time: currentAct.start_time.slice(0, 5),
        from_end_time: currentAct.end_time.slice(0, 5),
        to_date: newSchedule.scheduled_date,
        to_start_time: newSchedule.start_time,
        to_end_time: newSchedule.end_time,
        reason: newSchedule.reason,
        rescheduled_at: now,
      });

      const { data, error } = await supabase
        .from('scheduled_activities')
        .update({
          scheduled_date: newSchedule.scheduled_date,
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time,
          planned_duration_minutes: duration,
          status: 'pending',
          is_recurring_override: Boolean(currentAct.template_id),
          rescheduled_from_date: currentAct.rescheduled_from_date || currentAct.scheduled_date,
          rescheduled_from_start_time:
            currentAct.rescheduled_from_start_time || currentAct.start_time,
          rescheduled_count: (currentAct.rescheduled_count || 0) + 1,
          reschedule_history: history,
          updated_at: now,
        })
        .eq('id', activityId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data as ScheduledActivity;
    }

    const db = loadLocalDb();
    const idx = db.scheduled_activities.findIndex(
      (a) => a.id === activityId && a.user_id === userId
    );
    if (idx === -1) throw new Error('Atividade não encontrada.');

    const currentAct = db.scheduled_activities[idx];
    const history = Array.isArray(currentAct.reschedule_history)
      ? [...currentAct.reschedule_history]
      : [];
    history.push({
      from_date: currentAct.scheduled_date,
      from_start_time: currentAct.start_time.slice(0, 5),
      from_end_time: currentAct.end_time.slice(0, 5),
      to_date: newSchedule.scheduled_date,
      to_start_time: newSchedule.start_time,
      to_end_time: newSchedule.end_time,
      reason: newSchedule.reason,
      rescheduled_at: now,
    });

    db.scheduled_activities[idx] = {
      ...currentAct,
      scheduled_date: newSchedule.scheduled_date,
      start_time: newSchedule.start_time,
      end_time: newSchedule.end_time,
      planned_duration_minutes: duration,
      status: 'pending',
      is_recurring_override: Boolean(currentAct.template_id),
      rescheduled_from_date: currentAct.rescheduled_from_date || currentAct.scheduled_date,
      rescheduled_from_start_time:
        currentAct.rescheduled_from_start_time || currentAct.start_time,
      rescheduled_count: (currentAct.rescheduled_count || 0) + 1,
      reschedule_history: history,
      updated_at: now,
    };

    saveLocalDb(db);
    return db.scheduled_activities[idx];
  },

  // --------------------------------------------------------------------------
  // METAS SEMANAIS (weekly_goals)
  // --------------------------------------------------------------------------
  async getWeeklyGoals(userId: string): Promise<WeeklyGoal[]> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data || []) as WeeklyGoal[]).map((g) => ({
        ...g,
        target_value: Number(g.target_value),
      }));
    }

    const db = loadLocalDb();
    return db.weekly_goals.filter((g) => g.user_id === userId && g.is_active);
  },

  async createWeeklyGoal(
    userId: string,
    payload: {
      title: string;
      category_id?: string;
      goal_type: GoalType;
      target_value: number;
      unit: string;
      description?: string;
    }
  ): Promise<WeeklyGoal> {
    const now = new Date().toISOString();
    const todayISO = formatDateISO(new Date());

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('weekly_goals')
        .insert({
          user_id: userId,
          category_id: payload.category_id || null,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          goal_type: payload.goal_type,
          target_value: payload.target_value,
          unit: payload.unit.trim(),
          start_date: todayISO,
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return { ...(data as WeeklyGoal), target_value: Number(data.target_value) };
    }

    const db = loadLocalDb();
    const newGoal: WeeklyGoal = {
      id: generateId(),
      user_id: userId,
      category_id: payload.category_id || null,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      goal_type: payload.goal_type,
      target_value: Number(payload.target_value),
      unit: payload.unit.trim(),
      start_date: todayISO,
      end_date: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.weekly_goals.push(newGoal);
    saveLocalDb(db);
    return newGoal;
  },

  async updateWeeklyGoal(
    userId: string,
    goalId: string,
    payload: {
      title: string;
      category_id?: string;
      goal_type: GoalType;
      target_value: number;
      unit: string;
      description?: string;
    }
  ): Promise<WeeklyGoal> {
    const now = new Date().toISOString();

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('weekly_goals')
        .update({
          title: payload.title.trim(),
          category_id: payload.category_id || null,
          goal_type: payload.goal_type,
          target_value: payload.target_value,
          unit: payload.unit.trim(),
          description: payload.description?.trim() || null,
          updated_at: now,
        })
        .eq('id', goalId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return { ...(data as WeeklyGoal), target_value: Number(data.target_value) };
    }

    const db = loadLocalDb();
    const idx = db.weekly_goals.findIndex((g) => g.id === goalId && g.user_id === userId);
    if (idx === -1) throw new Error('Meta não localizada.');
    db.weekly_goals[idx] = {
      ...db.weekly_goals[idx],
      title: payload.title.trim(),
      category_id: payload.category_id || null,
      goal_type: payload.goal_type,
      target_value: Number(payload.target_value),
      unit: payload.unit.trim(),
      description: payload.description?.trim() || null,
      updated_at: now,
    };
    saveLocalDb(db);
    return db.weekly_goals[idx];
  },

  async deleteWeeklyGoal(userId: string, goalId: string): Promise<void> {
    if (this.isRemote() && supabase) {
      const { error } = await supabase
        .from('weekly_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = loadLocalDb();
    db.weekly_goals = db.weekly_goals.filter((g) => !(g.id === goalId && g.user_id === userId));
    saveLocalDb(db);
  },

  // --------------------------------------------------------------------------
  // PREFERÊNCIAS DE NOTIFICAÇÃO E LOGS (notification_preferences & notification_logs)
  // --------------------------------------------------------------------------
  async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) {
        return {
          ...(data as NotificationPreference),
          daily_summary_time: data.daily_summary_time.slice(0, 5),
          quiet_hours_start: data.quiet_hours_start.slice(0, 5),
          quiet_hours_end: data.quiet_hours_end.slice(0, 5),
        };
      }
      const { data: created, error: createErr } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId })
        .select('*')
        .single();
      if (createErr) throw new Error(createErr.message);
      return created as NotificationPreference;
    }

    const db = loadLocalDb();
    const user = db.users.find((u) => u.id === userId);
    ensureUserSeedLocal(db, userId, user?.email || '', user?.full_name || '');
    saveLocalDb(db);
    return db.notification_preferences.find((n) => n.user_id === userId)!;
  },

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const now = new Date().toISOString();

    const payloadToApply: Partial<NotificationPreference> = {
      ...updates,
      consent_timestamp: updates.consent_given ? updates.consent_timestamp || now : null,
      opted_out_timestamp: updates.opted_out ? now : null,
      whatsapp_enabled: updates.opted_out ? false : Boolean(updates.whatsapp_enabled),
      updated_at: now,
    };

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(payloadToApply)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return {
        ...(data as NotificationPreference),
        daily_summary_time: data.daily_summary_time.slice(0, 5),
        quiet_hours_start: data.quiet_hours_start.slice(0, 5),
        quiet_hours_end: data.quiet_hours_end.slice(0, 5),
      };
    }

    const db = loadLocalDb();
    const idx = db.notification_preferences.findIndex((n) => n.user_id === userId);
    if (idx === -1) throw new Error('Preferências de notificação não encontradas.');
    db.notification_preferences[idx] = {
      ...db.notification_preferences[idx],
      ...payloadToApply,
    };
    saveLocalDb(db);
    return db.notification_preferences[idx];
  },

  async getNotificationLogs(userId: string): Promise<NotificationLog[]> {
    if (this.isRemote() && supabase) {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return (data || []) as NotificationLog[];
    }

    const db = loadLocalDb();
    return db.notification_logs
      .filter((l) => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 30);
  },

  /**
   * Aciona a verificação real da fila de lembretes (ou invoca a Edge Function whatsapp-reminders)
   * Nunca simula envio externo falso: se a Edge Function / credenciais WhatsApp Cloud API
   * não estiverem configuradas, registra status transparente no log informando a pendência.
   */
  async triggerReminderCheck(userId: string): Promise<NotificationLog> {
    const prefs = await this.getNotificationPreferences(userId);
    const now = new Date();
    const currentHHMM = now.toTimeString().slice(0, 5);
    const recipient = `${prefs.phone_country_code}${prefs.phone_number}`.replace(/\s+/g, '');

    if (this.isRemote() && supabase) {
      const { data, error } = await supabase.functions.invoke('whatsapp-reminders', {
        body: { mode: 'cron_sweep', user_id: userId },
      });

      if (error) {
        const { data: insertedLog } = await supabase
          .from('notification_logs')
          .insert({
            user_id: userId,
            channel: 'whatsapp',
            notification_type: 'test_message',
            recipient_phone: recipient || 'Não informado',
            scheduled_for: now.toISOString(),
            status: 'failed',
            attempt_count: 1,
            payload_summary: 'Verificação de conectividade com Edge Function whatsapp-reminders',
            error_message: `Edge Function indisponível ou credenciais WhatsApp pendentes: ${error.message}`,
          })
          .select('*')
          .single();
        return insertedLog as NotificationLog;
      }

      const logs = await this.getNotificationLogs(userId);
      if (logs.length > 0) return logs[0];
      throw new Error(
        `Verificação concluída (${data?.processed_count ?? 0} lembretes processados).`
      );
    }

    // Validação local honesta (sem fingir disparo externo)
    const db = loadLocalDb();

    let status: NotificationLog['status'] = 'queued';
    let errorMessage: string | null = null;
    let summary = 'Validação de regras de lembrete WhatsApp';

    if (prefs.opted_out || !prefs.consent_given || !prefs.whatsapp_enabled) {
      status = 'skipped_no_consent';
      errorMessage =
        'Envio bloqueado: consentimento não concedido, canal desativado ou recebimento interrompido (opt-out).';
    } else if (!prefs.phone_number || prefs.phone_number.replace(/\D/g, '').length < 8) {
      status = 'failed';
      errorMessage = 'Número de telefone inválido ou não cadastrado.';
    } else if (prefs.quiet_hours_enabled) {
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const cur = toMin(currentHHMM);
      const st = toMin(prefs.quiet_hours_start);
      const en = toMin(prefs.quiet_hours_end);
      const inQuiet = st > en ? cur >= st || cur < en : cur >= st && cur < en;
      if (inQuiet) {
        status = 'skipped_quiet_hours';
        errorMessage = `Horário atual (${currentHHMM}) está dentro da janela silenciosa (${prefs.quiet_hours_start} às ${prefs.quiet_hours_end}).`;
      }
    }

    if (status === 'queued') {
      status = 'failed';
      summary = `Disparo preparado para ${recipient} (antecedência padrão: ${prefs.default_reminder_minutes} min)`;
      errorMessage =
        'Integração externa pendente: configure SUPABASE_URL e WHATSAPP_API_TOKEN na Edge Function `whatsapp-reminders` para envio externo real via WhatsApp Cloud API.';
    }

    const logEntry: NotificationLog = {
      id: generateId(),
      user_id: userId,
      activity_id: null,
      channel: 'whatsapp',
      notification_type: 'test_message',
      recipient_phone: recipient || 'Não informado',
      scheduled_for: now.toISOString(),
      sent_at: null,
      status,
      attempt_count: 1,
      external_message_id: null,
      payload_summary: summary,
      error_message: errorMessage,
      created_at: now.toISOString(),
    };

    db.notification_logs.unshift(logEntry);
    saveLocalDb(db);
    return logEntry;
  },
};
