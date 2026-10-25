# GOAL

> **Planeje melhor. Viva com intenção.**

O **GOAL** é uma aplicação web responsiva (*mobile-first*) para planejamento semanal pessoal, organização de horários, acompanhamento de hábitos, gestão de metas semanais e análise de execução de atividades.

---

## Sumário

1. [Visão Geral e Funcionalidades](#1-visão-geral-e-funcionalidades)
2. [Identidade Visual e Temas](#2-identidade-visual-e-temas)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Estrutura do Projeto](#4-estrutura-do-projeto)
5. [Banco de Dados e Segurança (RLS)](#5-banco-de-dados-e-segurança-rls)
6. [Como Executar Localmente](#6-como-executar-localmente)
7. [Configuração de Variáveis de Ambiente](#7-configuração-de-variáveis-de-ambiente)
8. [Lembretes por WhatsApp (Edge Function)](#8-lembretes-por-whatsapp-edge-function)
9. [Scripts Disponíveis](#9-scripts-disponíveis)
10. [Licença](#10-licença)

---

## 1. Visão Geral e Funcionalidades

- **Autenticação e Perfil:** Cadastro, login, logout, recuperação de senha e isolamento total dos dados por usuário.
- **Planejamento Semanal (Agenda 7 Dias):**
  - Grade semanal de Segunda a Domingo com navegação fluida entre semanas.
  - Criação rápida de atividades ou clique direto no horário desejado.
  - Cálculo automático de duração em minutos (`duration_minutes`) e validação de horário.
  - Detecção automática de conflitos/sobreposições de horários no mesmo dia.
  - Filtros por categoria e status.
- **Atividades Recorrentes:**
  - Definição de séries recorrentes por dias da semana (`activity_templates`).
  - Geração e sincronização inteligente de ocorrências sem duplicação ao navegar entre semanas.
  - Edição ou exclusão individual (apenas a ocorrência) ou de toda a série futura.
- **Meu Dia (Execução Diária):**
  - Visão cronológica focada nas atividades do dia atual.
  - Ações rápidas de um toque: **Concluir**, **Não realizada** e **Reagendar** (preservando o histórico original via `rescheduled_from_id` sem penalizar métricas de conclusão).
- **Dashboard Analítico:**
  - **7 Indicadores em Tempo Real:** Atividades planejadas, Atividades concluídas, Taxa de conclusão, Horas planejadas, Horas realizadas, Metas semanais e Próxima atividade do dia.
  - **3 Gráficos Responsivos (Recharts):**
    1. Distribuição do tempo por categoria.
    2. Planejado vs. Realizado por dia da semana.
    3. Evolução semanal da taxa de conclusão e horas realizadas.
- **Metas Semanais e Evolução:**
  - Metas configuráveis por **frequência** (vezes/semana), **duração** (horas ou minutos/semana) ou **quantidade** de atividades concluídas.
  - Página dedicada de **Evolução** com histórico consolidado semanal/mensal e indicadores de consistência.
- **Categorias Personalizáveis:**
  - 9 categorias iniciais padrão (*Trabalho, Academia e saúde, Estudos, Família, Renda extra, Leitura, Igreja e espiritualidade, Pessoal, Outros*) + criação/edição de categorias personalizadas com ícones.
- **Lembretes por WhatsApp:**
  - Gestão de número com DDI, consentimento explícito (*opt-in* / *opt-out*), tempo de antecedência (`15`, `30` ou `60` min), resumo matinal diário, horários silenciosos (*quiet hours*) e histórico auditável de envios (`notification_logs`).

---

## 2. Identidade Visual e Temas

O sistema segue uma estética minimalista, editorial e monocromática de alto contraste:

| Token | Hex | Aplicação Principal |
| :--- | :--- | :--- |
| **Preto** | `#000000` | Fundo principal (Dark Mode) / Textos e destaques (Light Mode) |
| **Preto-suave** | `#171716` | Superfícies elevadas, cards, modais e sidebar (Dark Mode) |
| **Cinza-escuro** | `#272726` | Bordas sutis, divisores e estados secundários |
| **Cinza-claro** | `#C9CAC5` | Textos secundários, legendas e superfícies suaves (Light Mode) |
| **Branco** | `#FFFFFF` | Textos principais e CTAs (Dark Mode) / Fundo principal (Light Mode) |

- **Dark Mode (Padrão):** Ativo por padrão com script anti-FOUC no `index.html`.
- **Light Mode:** Tema claro completo com alternância instantânea e sincronização no `localStorage` e no perfil do banco (`profiles.theme`).

---

## 3. Stack Tecnológica

- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 6](https://vite.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) (ícones)
- **Visualização de Dados:** [Recharts](https://recharts.org/)
- **Formulários e Validação:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Datas e Roteamento:** [date-fns](https://date-fns.org/) + [React Router v7](https://reactrouter.com/)
- **Backend / BaaS:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Row Level Security e Edge Functions)
- **Testes Automatizados:** [Vitest](https://vitest.dev/)

---

## 4. Estrutura do Projeto

```text
goal/
├── src/
│   ├── components/          # Modais de atividades, reagendamento, exclusão, ícones e toasts
│   ├── contexts/            # Contextos globais (AuthContext, ThemeContext, GoalDataContext)
│   ├── layouts/             # AppLayout responsivo (Sidebar desktop + Bottom nav mobile)
│   ├── lib/                 # Cliente Supabase e utilitários de formatação/datas
│   ├── pages/               # AuthPage, DashboardPage, WeeklyPlannerPage, MyDayPage, EvolutionPage, SettingsPage
│   ├── services/            # Camada de repositório híbrida (Supabase + Persistência Local resiliente)
│   ├── test/                # Testes unitários e de regras de negócio (Vitest)
│   ├── types/               # Contratos e interfaces TypeScript
│   └── validations/         # Schemas de validação com Zod
├── supabase/
│   ├── functions/
│   │   └── whatsapp-reminders/  # Edge Function para envio de lembretes via WhatsApp Cloud API
│   └── migrations/
│       └── 20261025000001_goal_initial_schema.sql  # Schema completo + índices + RLS
├── .env.example             # Modelo documentado de variáveis de ambiente
└── writing-block.md         # Especificação funcional e técnica detalhada do projeto
```

---

## 5. Banco de Dados e Segurança (RLS)

A migração [`supabase/migrations/20261025000001_goal_initial_schema.sql`](supabase/migrations/20261025000001_goal_initial_schema.sql) estrutura as **7 tabelas** do sistema com chaves estrangeiras, índices de performance e **Row Level Security (RLS)** restrito por `auth.uid() = user_id`:

1. `profiles` — Dados do perfil, fuso horário e preferência de tema (`dark` | `light`).
2. `activity_categories` — Categorias padrão do sistema e categorias personalizadas do usuário.
3. `activity_templates` — Modelos de atividades e regras de recorrência semanal.
4. `scheduled_activities` — Ocorrências agendadas por data, horários, status e rastreio de reagendamento.
5. `weekly_goals` — Metas semanais por categoria e tipo de meta (`frequency`, `duration`, `quantity`).
6. `notification_preferences` — Configurações de WhatsApp, consentimento, antecedência e *quiet hours*.
7. `notification_logs` — Registro auditável de notificações enviadas, pendentes, falhas ou ignoradas.

> **Arquitetura Resiliente:** Caso as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ainda não estejam preenchidas no `.env`, o repositório (`src/services/goalRepository.ts`) utiliza automaticamente um adaptador de persistência local completo para permitir uso e testes de ponta a ponta imediatamente.

---

## 6. Como Executar Localmente

### Pré-requisitos
- **Node.js** `>= 18.x`
- **npm** `>= 9.x`

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/roseniltonlopes/app-goal.git
cd app-goal

# 2. Instale as dependências
npm install

# 3. (Opcional) Configure as variáveis de ambiente do Supabase
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## 7. Configuração de Variáveis de Ambiente

Copie o arquivo [`.env.example`](.env.example) para `.env` na raiz do projeto:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

---

## 8. Lembretes por WhatsApp (Edge Function)

A Edge Function [`supabase/functions/whatsapp-reminders/index.ts`](supabase/functions/whatsapp-reminders/index.ts) processa os lembretes individuais e o resumo matinal respeitando:
- Consentimento ativo (`whatsapp_opt_in = true`);
- Janela de horário silencioso (*quiet hours*);
- Prevenção de envios duplicados via `notification_logs`.

Para ativar o disparo via **WhatsApp Business Cloud API (Meta Graph API)** em produção no Supabase, configure os seguintes *Secrets*:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION` *(opcional, padrão `v21.0`)*
- `CRON_SECRET` *(opcional, para proteger chamadas agendadas)*

---

## 9. Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite com HMR |
| `npm run build` | Executa a checagem de tipos (`tsc -b`) e gera o bundle de produção em `dist/` |
| `npm run lint` | Valida a tipagem estática do TypeScript (`tsc --noEmit`) |
| `npm run test` | Executa a suíte de testes automatizados com Vitest |
| `npm run preview` | Visualiza localmente o build de produção |

---

## 10. Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais informações.
