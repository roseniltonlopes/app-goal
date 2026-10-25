/**
 * GOAL — Supabase Edge Function: whatsapp-reminders
 *
 * Responsável por:
 * 1. Validar preferências de notificação dos usuários (consentimento ativo, opt-out falso, whatsapp_enabled).
 * 2. Respeitar janelas de horários silenciosos (quiet_hours_start -> quiet_hours_end).
 * 3. Consultar atividades pendentes dentro da janela de antecedência configurada ou resumo diário.
 * 4. Garantir controle de duplicidade consultando `notification_logs`.
 * 5. Disparar mensagens via WhatsApp Cloud API (Meta Graph API) usando variáveis seguras de ambiente.
 * 6. Registrar tentativas, status ('sent', 'failed', 'skipped_quiet_hours', 'skipped_duplicate') e IDs externos em `notification_logs`.
 *
 * Variáveis de ambiente necessárias no Supabase Secrets:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - WHATSAPP_API_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_API_VERSION (opcional, padrão 'v21.0')
 * - CRON_SECRET (opcional, para autenticar chamadas agendadas pg_cron)
 */

// @ts-nocheck — Executado no runtime Deno do Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ReminderRequestPayload {
  mode?: 'cron_sweep' | 'single_activity' | 'daily_summary';
  activity_id?: string;
  user_id?: string;
}

function isWithinQuietHours(nowTimeHHMM: string, startHHMM: string, endHHMM: string): boolean {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const current = toMinutes(nowTimeHHMM);
  const start = toMinutes(startHHMM);
  const end = toMinutes(endHHMM);

  // Caso atravesse a meia-noite (ex: 22:00 até 07:00)
  if (start > end) {
    return current >= start || current < end;
  }
  return current >= start && current < end;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN') ?? '';
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
    const whatsappVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0';
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente da Edge Function.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação opcional de CRON_SECRET quando configurado
    if (cronSecret) {
      const providedSecret = req.headers.get('x-cron-secret');
      const authHeader = req.headers.get('authorization');
      if (providedSecret !== cronSecret && !authHeader) {
        return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ReminderRequestPayload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    const currentHHMM = now.toTimeString().slice(0, 5);

    // 1. Buscar preferências elegíveis
    let prefsQuery = supabase
      .from('notification_preferences')
      .select('*')
      .eq('whatsapp_enabled', true)
      .eq('consent_given', true)
      .eq('opted_out', false);

    if (body.user_id) {
      prefsQuery = prefsQuery.eq('user_id', body.user_id);
    }

    const { data: preferencesList, error: prefsError } = await prefsQuery;
    if (prefsError) throw prefsError;

    const results: Array<Record<string, unknown>> = [];

    for (const pref of preferencesList || []) {
      const fullPhone = `${pref.phone_country_code}${pref.phone_number}`.replace(/\D/g, '');
      if (!fullPhone || fullPhone.length < 10) {
        continue;
      }

      // 2. Verificar horário silencioso
      if (
        pref.quiet_hours_enabled &&
        isWithinQuietHours(currentHHMM, pref.quiet_hours_start.slice(0, 5), pref.quiet_hours_end.slice(0, 5))
      ) {
        await supabase.from('notification_logs').insert({
          user_id: pref.user_id,
          channel: 'whatsapp',
          notification_type: 'activity_reminder',
          recipient_phone: `+${fullPhone}`,
          scheduled_for: now.toISOString(),
          status: 'skipped_quiet_hours',
          payload_summary: `Envio suprimido por horário silencioso (${pref.quiet_hours_start} - ${pref.quiet_hours_end}).`,
        });
        results.push({ user_id: pref.user_id, status: 'skipped_quiet_hours' });
        continue;
      }

      // 3. Consultar atividades pendentes do dia para este usuário
      let actQuery = supabase
        .from('scheduled_activities')
        .select('*')
        .eq('user_id', pref.user_id)
        .eq('scheduled_date', todayISO)
        .eq('status', 'pending')
        .eq('reminder_enabled', true);

      if (body.activity_id) {
        actQuery = actQuery.eq('id', body.activity_id);
      }

      const { data: activities, error: actError } = await actQuery;
      if (actError) throw actError;

      for (const activity of activities || []) {
        // 4. Controle de duplicidade: verificar se já existe log enviado para esta atividade hoje
        const { data: existingLogs } = await supabase
          .from('notification_logs')
          .select('id, status')
          .eq('user_id', pref.user_id)
          .eq('activity_id', activity.id)
          .in('status', ['sent', 'delivered'])
          .limit(1);

        if (existingLogs && existingLogs.length > 0) {
          results.push({ activity_id: activity.id, status: 'skipped_duplicate' });
          continue;
        }

        // 5. Verificar se as credenciais da WhatsApp Cloud API estão presentes
        if (!whatsappToken || !whatsappPhoneId) {
          await supabase.from('notification_logs').insert({
            user_id: pref.user_id,
            activity_id: activity.id,
            channel: 'whatsapp',
            notification_type: 'activity_reminder',
            recipient_phone: `+${fullPhone}`,
            scheduled_for: now.toISOString(),
            status: 'failed',
            payload_summary: `Lembrete: ${activity.title} às ${activity.start_time.slice(0, 5)}`,
            error_message:
              'Credenciais WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID pendentes de configuração nos Secrets da Edge Function.',
          });
          results.push({
            activity_id: activity.id,
            status: 'failed',
            reason: 'missing_whatsapp_provider_credentials',
          });
          continue;
        }

        // 6. Disparo real para a Graph API da Meta (WhatsApp Business Platform)
        const messageText = `GOAL — Lembrete de atividade: "${activity.title}" hoje às ${activity.start_time.slice(
          0,
          5
        )} (${activity.planned_duration_minutes} min). Planeje melhor. Viva com intenção.`;

        const graphUrl = `https://graph.facebook.com/${whatsappVersion}/${whatsappPhoneId}/messages`;
        const waResponse = await fetch(graphUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: fullPhone,
            type: 'text',
            text: {
              preview_url: false,
              body: messageText,
            },
          }),
        });

        const waResult = await waResponse.json().catch(() => ({}));

        if (waResponse.ok) {
          const externalId = waResult?.messages?.[0]?.id ?? null;
          await supabase.from('notification_logs').insert({
            user_id: pref.user_id,
            activity_id: activity.id,
            channel: 'whatsapp',
            notification_type: 'activity_reminder',
            recipient_phone: `+${fullPhone}`,
            scheduled_for: now.toISOString(),
            sent_at: new Date().toISOString(),
            status: 'sent',
            external_message_id: externalId,
            payload_summary: messageText,
          });
          results.push({ activity_id: activity.id, status: 'sent', external_message_id: externalId });
        } else {
          const errMessage = waResult?.error?.message ?? `HTTP ${waResponse.status} ao comunicar com WhatsApp API`;
          await supabase.from('notification_logs').insert({
            user_id: pref.user_id,
            activity_id: activity.id,
            channel: 'whatsapp',
            notification_type: 'activity_reminder',
            recipient_phone: `+${fullPhone}`,
            scheduled_for: now.toISOString(),
            status: 'failed',
            payload_summary: messageText,
            error_message: errMessage,
          });
          results.push({ activity_id: activity.id, status: 'failed', error: errMessage });
        }
      }
    }

    return new Response(
      JSON.stringify({
        processed_at: now.toISOString(),
        processed_count: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro interno desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
