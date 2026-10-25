# GOAL — Planeje melhor. Viva com intenção.

Aplicação web responsiva mobile-first para planejamento semanal pessoal, organização de horários, acompanhamento de hábitos, metas semanais e análise de execução de atividades.

## 1. Identidade Visual & Temas
- **Paleta Monocromática Oficial:**
  - Preto: `#000000`
  - Branco: `#FFFFFF`
  - Cinza-claro: `#C9CAC5`
  - Cinza-escuro: `#272726`
  - Preto-suave: `#171716`
- **Dark Mode (Padrão):** configurado inicialmente para novos usuários, com prevenção de FOUC no `index.html`.
- **Light Mode:** tema claro completo, compartilhando a mesma identidade tipográfica e estrutural, sincronizado com `localStorage` e com o perfil do usuário (`profiles.theme`).

## 2. Stack Tecnológica & Arquitetura
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, date-fns, React Router v7, React Hook Form + Zod.
- **Backend & Banco de Dados:** Supabase JS v2 (`@supabase/supabase-js`), PostgreSQL com Row Level Security (RLS) nas 7 tabelas e Supabase Edge Functions (`whatsapp-reminders`).
- **Camada de Persistência Resiliente (`src/services/goalRepository.ts`):**
  - Conecta automaticamente ao Supabase real quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configurados no arquivo `.env`.
  - Quando executada sem credenciais externas, ativa automaticamente o adaptador persistente local completo (suportando autenticação, perfis, 9 categorias padrão, modelos recorrentes sem duplicação, histórico de reagendamento, metas semanais e logs de notificação).

## 3. Como Executar Localmente
```bash
npm install
npm run dev
```

Para validar compilação TypeScript, build de produção e testes automatizados:
```bash
npm run lint
npm run test
npm run build
```

## 4. Banco de Dados Supabase & Migrações
A migração SQL versionada encontra-se em:
- `supabase/migrations/20261025000001_goal_initial_schema.sql`

Ela cria e protege com políticas RLS (`auth.uid()`) as 7 tabelas do sistema:
1. `profiles`
2. `activity_categories`
3. `activity_templates`
4. `scheduled_activities`
5. `weekly_goals`
6. `notification_preferences`
7. `notification_logs`

## 5. Lembretes por WhatsApp (Edge Function)
A função de backend encontra-se em:
- `supabase/functions/whatsapp-reminders/index.ts`

Para ativar o envio externo real via WhatsApp Business Cloud API (Meta Graph API), configure os seguintes secrets no Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION` (opcional, padrão `v21.0`)
- `CRON_SECRET` (opcional)
