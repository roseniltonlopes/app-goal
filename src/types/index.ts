export type ThemeMode = 'dark' | 'light';

export type ActivityType = 'fixed' | 'flexible' | 'habit';

export type ActivityStatus = 'pending' | 'completed' | 'missed' | 'rescheduled';

export type CategoryVisualStyle = 'solid' | 'outline' | 'subtle' | 'striped';

export type GoalType = 'frequency' | 'duration' | 'quantity';

export type NotificationStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'skipped_quiet_hours'
  | 'skipped_no_consent'
  | 'skipped_duplicate';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  theme: ThemeMode;
  timezone: string;
  week_starts_on: 0 | 1;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string;
  visual_style: CategoryVisualStyle;
  is_default: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityTemplate {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description?: string | null;
  activity_type: ActivityType;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  duration_minutes: number;
  days_of_week: number[]; // 0 (Dom) a 6 (Sáb)
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  excluded_dates: string[]; // YYYY-MM-DD[]
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RescheduleHistoryEntry {
  from_date: string;
  from_start_time: string;
  from_end_time: string;
  to_date: string;
  to_start_time: string;
  to_end_time: string;
  reason?: string;
  rescheduled_at: string;
}

export interface ScheduledActivity {
  id: string;
  user_id: string;
  category_id: string | null;
  template_id?: string | null;
  occurrence_date?: string | null;
  title: string;
  description?: string | null;
  activity_type: ActivityType;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string;     // HH:mm
  end_time: string;       // HH:mm
  planned_duration_minutes: number;
  actual_duration_minutes?: number | null;
  status: ActivityStatus;
  is_recurring_override: boolean;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  rescheduled_from_date?: string | null;
  rescheduled_from_start_time?: string | null;
  rescheduled_count: number;
  reschedule_history: RescheduleHistoryEntry[];
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description?: string | null;
  goal_type: GoalType;
  target_value: number;
  unit: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoalProgress {
  goal: WeeklyGoal;
  category?: ActivityCategory;
  current_value: number;
  target_value: number;
  percentage: number;
  is_achieved: boolean;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  phone_country_code: string;
  phone_number: string;
  whatsapp_enabled: boolean;
  consent_given: boolean;
  consent_timestamp?: string | null;
  opted_out: boolean;
  opted_out_timestamp?: string | null;
  default_reminder_minutes: number;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  activity_id?: string | null;
  channel: 'whatsapp';
  notification_type: 'activity_reminder' | 'daily_summary' | 'test_message';
  recipient_phone: string;
  scheduled_for: string;
  sent_at?: string | null;
  status: NotificationStatus;
  attempt_count: number;
  external_message_id?: string | null;
  payload_summary?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface OverlapWarning {
  conflictingActivity: ScheduledActivity;
  overlapMinutes: number;
}

export interface DashboardIndicators {
  plannedCount: number;
  completedCount: number;
  missedCount: number;
  pendingCount: number;
  rescheduledCount: number;
  completionRate: number; // 0-100
  plannedHours: number;
  actualHours: number;
  achievedGoalsCount: number;
  totalGoalsCount: number;
  nextActivity: ScheduledActivity | null;
}
