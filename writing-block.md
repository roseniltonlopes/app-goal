# GOAL — Desenvolvimento de uma aplicação web para planejamento semanal

## Instruções para o agente de desenvolvimento

Você está trabalhando no projeto GOAL dentro do Google Antigravity. Sua responsabilidade é atuar como desenvolvedor full-stack sênior, com experiência em UX/UI, arquitetura de software, React, TypeScript, PostgreSQL e Supabase.

Trabalhe diretamente no workspace aberto do projeto. Analise os arquivos existentes, compreenda a arquitetura e implemente as funcionalidades solicitadas. Não se limite a apresentar sugestões, protótipos visuais ou código de exemplo: desenvolva uma aplicação funcional, integrada e pronta para ser executada localmente.

Antes de modificar arquivos, inspecione a estrutura do projeto, identifique as tecnologias utilizadas, verifique as dependências e determine quais funcionalidades já existem.

Se o projeto estiver vazio, configure uma estrutura adequada. Se já houver código, preserve o que estiver funcionando, adapte a implementação à arquitetura existente e evite reescrever componentes sem necessidade.

Organize o trabalho em etapas, valide cada etapa e corrija os problemas encontrados antes de considerar a implementação concluída.

# 1. Visão geral do produto

**Nome:** GOAL

**Slogan:** Planeje melhor. Viva com intenção.

**Objetivo:** desenvolver uma aplicação web responsiva para planejamento semanal pessoal, organização de horários, acompanhamento de hábitos e análise de execução de atividades.

O GOAL deve permitir que o usuário organize diferentes áreas da vida em um único ambiente:

- Trabalho.
- Academia e saúde.
- Estudos.
- Tempo em família.
- Renda extra.
- Leitura.
- Igreja e espiritualidade.
- Atividades pessoais.
- Outras categorias personalizadas.

O aplicativo deve ajudar o usuário a planejar a semana, acompanhar as atividades realizadas, visualizar a distribuição do próprio tempo e identificar oportunidades de melhoria na rotina.

A experiência deve transmitir clareza, organização, equilíbrio e progresso pessoal. Evite transformar o produto em um gerenciador de tarefas corporativo tradicional.

# 2. Stack tecnológica

Primeiro, identifique a stack já existente no workspace e mantenha-a quando estiver adequada.

Caso o projeto ainda não possua uma estrutura definida, utilize preferencialmente:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui para componentes visuais.
- Lucide React para ícones.
- Supabase JS v2 para autenticação, banco de dados e acesso aos serviços.
- React Router para navegação, caso necessário.
- React Hook Form e Zod para formulários e validação, quando adequados.
- Recharts para gráficos.
- date-fns para manipulação e formatação de datas.

Utilize versões compatíveis das dependências. Não adicione bibliotecas redundantes quando o projeto já possuir alternativas adequadas.

A arquitetura deve separar responsabilidades entre páginas, componentes, hooks, serviços, validações, tipos e integrações externas.

Não concentre toda a aplicação em um único componente.

# 3. Identidade visual

A identidade visual do GOAL deve utilizar uma paleta monocromática, minimalista e sofisticada.

## Paleta oficial

- Preto: #000000
- Branco: #FFFFFF
- Cinza-claro: #C9CAC5
- Cinza-escuro: #272726
- Preto-suave: #171716

Não introduza cores vibrantes como elementos decorativos predominantes. Toda a interface deve manter a identidade da marca.

## Dark Mode — tema padrão

O tema escuro deve ser a configuração inicial para novos usuários.

Utilize:
- Fundo principal: #000000.
- Áreas secundárias: #171716.
- Cards: #272726.
- Texto principal: #FFFFFF.
- Texto secundário: #C9CAC5.
- Bordas discretas: variações de #272726 e #C9CAC5.

Use contraste, hierarquia tipográfica, espaçamento e ícones para destacar informações, evitando excesso de bordas, sombras e efeitos decorativos.

## Light Mode — tema alternativo

Implemente um tema claro completo, utilizando a mesma identidade visual.

Utilize:
- Fundo principal: #FFFFFF.
- Cards e superfícies: #FFFFFF.
- Áreas secundárias: cinzas derivados de #C9CAC5.
- Texto principal: #000000.
- Texto secundário: #272726.
- Bordas: #C9CAC5.

A alternância entre os temas deve atualizar toda a aplicação, incluindo calendário, formulários, menus, gráficos, modais, tooltips, estados vazios e componentes de navegação.

Criar um controle de alternância de tema em Configurações e disponibilizar acesso rápido a partir da interface principal quando houver espaço adequado.

Persistir a preferência do usuário entre sessões. Utilizar uma estratégia consistente que funcione também antes da autenticação e sincronizar com o perfil quando apropriado.

Não criar duas identidades diferentes. O Light Mode deve ser a versão clara do mesmo produto.

## Referências de design

Utilize o Dribbble para pesquisar referências visuais de:
- Minimalist productivity dashboard.
- Weekly planner calendar UI.
- Dark mode task management.
- Personal habit tracker.
- Monochrome SaaS dashboard.
- Modern calendar application.

Use as referências para orientar espaçamentos, tipografia, composição dos cards, navegação e hierarquia visual. Não copie interfaces existentes.

A experiência deve parecer um produto digital premium, com visual limpo, componentes bem alinhados e excelente legibilidade.

# 4. Estrutura de navegação

Implementar as seguintes áreas:

## Dashboard

Visão geral da semana, com indicadores, progresso, distribuição do tempo, metas e próximas atividades.

## Planejamento semanal

Calendário com os sete dias da semana, horários, atividades recorrentes e possibilidade de edição e reagendamento.

## Meu dia

Lista cronológica das atividades de uma data selecionada, priorizando ações rápidas.

## Evolução

Histórico semanal e mensal, gráficos e análise de execução das atividades.

## Configurações

Perfil, categorias, metas, tema visual, fuso horário e preferências de notificação.

No desktop, utilizar navegação lateral e uma área principal ampla. No celular, adaptar a navegação para um formato compacto, com acesso rápido às funções essenciais.

# 5. Dashboard e indicadores

Criar um dashboard com os seguintes elementos:

### Cards principais

**Atividades planejadas:** total de atividades previstas para a semana selecionada.

**Atividades concluídas:** quantidade de atividades concluídas no período.

**Taxa de conclusão:** percentual de atividades concluídas em relação às atividades elegíveis do período.

**Horas planejadas:** soma das durações previstas.

**Horas realizadas:** soma das durações efetivamente registradas, quando disponíveis.

**Metas semanais:** quantidade de metas atingidas em relação às metas configuradas.

**Próxima atividade:** nome, categoria e horário da próxima atividade pendente.

### Gráficos

**Distribuição do tempo por categoria:** apresentar a distribuição das horas dedicadas a trabalho, estudos, academia, família, leitura e demais categorias.

**Planejado versus realizado:** permitir comparar a execução das atividades ao longo da semana.

**Evolução semanal:** apresentar a evolução da taxa de conclusão ao longo do tempo.

Os gráficos devem ser responsivos e respeitar os filtros aplicados.

Não utilizar valores fixos como se fossem dados reais. Os indicadores devem ser calculados a partir dos registros existentes no banco de dados.

Quando o usuário ainda não possuir dados suficientes, mostrar estados vazios com orientações para cadastrar atividades.

Tratar corretamente atividades pendentes, concluídas, não realizadas e reagendadas, sem penalizar automaticamente uma atividade apenas por ter sido reagendada.

Diferenciar claramente horas planejadas de horas efetivamente realizadas.

# 6. Planejamento semanal

Desenvolver uma agenda semanal que permita visualizar e organizar compromissos.

Funcionalidades obrigatórias:
- Navegar entre semanas anteriores e futuras.
- Identificar claramente a semana selecionada.
- Criar uma atividade.
- Editar uma atividade.
- Excluir uma atividade com confirmação.
- Reagendar uma atividade para outro dia ou horário.
- Visualizar início, término e duração.
- Filtrar por categoria e status.
- Identificar sobreposições de horários.
- Acessar rapidamente a visualização de um dia.
- Criar atividades recorrentes.
- Visualizar atividades concluídas e pendentes.

O usuário deve conseguir clicar em um horário ou utilizar um botão de criação rápida para cadastrar uma atividade.

Criar um formulário consistente com os campos:
- Título.
- Categoria.
- Data.
- Horário de início.
- Horário de término.
- Descrição opcional.
- Tipo de atividade.
- Recorrência.
- Preferências de lembrete.

Calcular a duração a partir dos horários e validar intervalos inválidos.

Quando existir sobreposição de compromissos, mostrar um aviso claro sem impedir automaticamente toda gravação.

## Recorrência

Permitir repetição por dias da semana.

Exemplo: academia às segundas, terças, quintas e sextas às 06h.

Uma atividade recorrente deve possuir um modelo de repetição e ocorrências individuais programadas.

Ao editar uma ocorrência, permitir alterar apenas aquela ocorrência ou a série correspondente, quando aplicável.

Ao excluir uma ocorrência, não apagar automaticamente todo o modelo recorrente.

Não gerar registros duplicados ao avançar ou retroceder semanas.

# 7. Meu dia e execução das atividades

A página Meu dia deve apresentar uma lista cronológica simples e funcional.

Cada atividade deve mostrar:
- Título.
- Categoria.
- Horário.
- Duração.
- Status.
- Ações disponíveis.

Disponibilizar três ações principais:

**Concluir:** registrar a atividade como realizada.

**Não realizada:** registrar que a atividade não aconteceu.

**Reagendar:** selecionar outra data ou horário, preservando o histórico necessário.

As atualizações devem ser persistidas no Supabase e refletidas imediatamente na interface.

Implementar feedback visual de sucesso e tratamento de erros. Se a gravação falhar, informar o usuário e não apresentar uma alteração como definitivamente salva.

# 8. Categorias, hábitos e metas

Criar categorias iniciais:
- Trabalho.
- Academia e saúde.
- Estudos.
- Família.
- Renda extra.
- Leitura.
- Igreja e espiritualidade.
- Pessoal.
- Outros.

Permitir criar e editar categorias personalizadas, com nome, ícone e preferências visuais.

O usuário deve poder organizar sua rotina em três modalidades:

**Compromissos fixos:** atividades com horários definidos.

**Atividades flexíveis:** tarefas que podem ser movidas ao longo da semana.

**Hábitos e metas:** objetivos definidos por frequência, duração ou quantidade.

Exemplos:
- Academia quatro vezes na semana.
- Leitura cinco vezes por semana.
- Estudar seis horas por semana.
- Reservar períodos para a família.

Permitir criar metas semanais configuráveis e acompanhar a evolução com base nas atividades efetivamente registradas.

# 9. Banco de dados Supabase

Conectar o projeto a uma instância Supabase real.

Antes de configurar a integração, inspecione o workspace e verifique se já existem variáveis de ambiente, arquivos de configuração, cliente Supabase ou migrações.

Se a conexão ainda não estiver configurada:
- Criar a estrutura de integração.
- Preparar um arquivo `.env.example`.
- Documentar as variáveis necessárias.
- Solicitar ou utilizar as credenciais disponibilizadas pelo desenvolvedor de forma segura.

Não inventar credenciais e não incluir segredos no código.

Utilizar Supabase Auth e PostgreSQL.

Criar as seguintes tabelas, adaptando os nomes caso já exista uma convenção de nomenclatura adequada no projeto.

### profiles

Armazenar o perfil vinculado ao usuário autenticado, preferências de tema, fuso horário e informações de configuração.

### activity_categories

Armazenar categorias padrão e personalizadas, com identificação do usuário proprietário quando aplicável.

### activity_templates

Armazenar modelos de atividades recorrentes, incluindo horários padrão, dias de repetição, categoria e configurações da série.

### scheduled_activities

Armazenar as ocorrências programadas, com título, categoria, data, horário de início, horário de término, status e vínculo opcional com o modelo recorrente.

Estruturar os campos para preservar alterações individuais, histórico de reagendamento e informações de conclusão quando aplicável.

### weekly_goals

Armazenar metas e frequências desejadas por usuário, com período de validade e categoria relacionada quando aplicável.

### notification_preferences

Armazenar telefone, consentimento, canais disponíveis, antecedência dos lembretes e horários silenciosos.

### notification_logs

Registrar notificações previstas, tentativas de envio, resultados, identificadores externos e erros relevantes.

## Segurança e integridade

Implementar políticas RLS para garantir que cada usuário só acesse e modifique os próprios registros.

Validar a propriedade dos dados no backend, sem depender exclusivamente dos filtros implementados no React.

Criar relacionamentos, chaves estrangeiras, restrições e índices apropriados.

Garantir que a exclusão de categorias não deixe atividades existentes em estado inconsistente.

Armazenar datas e horários de forma consistente, levando em consideração o fuso horário do usuário.

Preparar migrações SQL versionadas para reproduzir a estrutura do banco.

Se o projeto possuir Supabase CLI configurado, utilizar o fluxo de migrações existente. Não executar alterações destrutivas ou modificar um banco de produção sem verificar o destino e a segurança da operação.

# 10. Autenticação

Implementar:
- Cadastro.
- Login.
- Logout.
- Persistência da sessão.
- Recuperação de senha.
- Estados de carregamento e erro.
- Proteção das páginas privadas.
- Redirecionamento adequado após autenticação.

Associar todos os registros ao usuário autenticado.

Após o login, apresentar o dashboard com os dados daquele usuário.

Não expor informações de um usuário a outro, nem permitir que alterações de URL ou requisições manuais contornem as políticas de segurança.

# 11. Lembretes por WhatsApp

Preparar uma integração real com a WhatsApp Business Platform ou um provedor compatível.

A interface deve permitir:
- Cadastrar o número de telefone com código do país.
- Registrar o consentimento para recebimento.
- Escolher a antecedência dos lembretes.
- Configurar resumo diário.
- Definir horários silenciosos.
- Interromper o recebimento de mensagens.

A arquitetura deverá utilizar funções de backend, como Supabase Edge Functions, e um mecanismo apropriado para agendar e executar os lembretes no horário correto.

Implementar, na etapa correspondente:
- Validação das preferências.
- Consulta às atividades pendentes.
- Controle de duplicidade.
- Registro de tentativas e resultados.
- Tratamento de falhas.
- Respeito às regras aplicáveis da plataforma de mensagens.

Não armazenar tokens no frontend. Não simular envio de mensagens como se a integração externa estivesse funcionando.

Se as credenciais do provedor ainda não estiverem disponíveis, construir a estrutura de integração e documentar exatamente o que falta para ativá-la.

# 12. Responsividade e acessibilidade

Desenvolver uma aplicação mobile-first, com experiência adequada em desktop, tablet e celular.

No desktop:
- Sidebar compacta.
- Dashboard em grid.
- Agenda semanal com horários.
- Cards de indicadores.
- Gráficos com boa área de visualização.

No celular:
- Navegação compacta.
- Agenda diária em formato cronológico.
- Cards organizados verticalmente.
- Formulários adequados a telas pequenas.
- Botões fáceis de tocar.
- Acesso rápido para concluir e reagendar atividades.
- Ausência de rolagem horizontal desnecessária.

Garantir acessibilidade por teclado, rótulos de formulários, contraste adequado e estados de foco visíveis.

Testar a interface nos temas Dark e Light.

# 13. Organização e qualidade do código

Organize o código em módulos com responsabilidades claras, respeitando a estrutura do projeto.

Quando adequado, utilizar uma organização semelhante a:

- `src/components`
- `src/pages`
- `src/layouts`
- `src/hooks`
- `src/services`
- `src/lib`
- `src/types`
- `src/contexts`
- `src/validations`

Organize também as migrações de banco e as funções de backend nos diretórios apropriados do projeto Supabase.

Utilize componentes reutilizáveis, tipagem consistente e tratamento padronizado de erros.

Evite:
- Componentes gigantes.
- Código duplicado.
- Dados fictícios em produção.
- Credenciais expostas.
- Botões sem funcionalidade.
- Dependências desnecessárias.
- Alterações destrutivas sem validação.
- Implementações que apenas pareçam funcionais visualmente.

# 14. Execução e validação pelo Antigravity

O desenvolvimento deve acontecer diretamente nos arquivos do workspace.

Antes de iniciar:
1. Inspecione os arquivos e a arquitetura existente.
2. Verifique dependências, scripts, variáveis de ambiente e integrações.
3. Identifique o que pode ser aproveitado e o que precisa ser criado.
4. Apresente um plano técnico curto no acompanhamento da tarefa.

Depois, implemente o projeto por etapas.

Ao terminar cada etapa:
- Execute as verificações disponíveis.
- Rode o linter e os testes existentes.
- Corrija erros de TypeScript e compilação.
- Verifique as consultas e gravações no Supabase, quando conectado.
- Inicie a aplicação e valide as telas no navegador, utilizando os recursos disponíveis no Antigravity.
- Verifique a interface em resoluções de desktop e celular.
- Teste a alternância Dark/Light.
- Verifique os principais fluxos e trate falhas observadas.

Não afirme que algo foi testado se a verificação não foi executada.

Caso alguma etapa dependa de credenciais ou configuração externa não disponível, prossiga com as demais funcionalidades possíveis e documente claramente a pendência.

Ao concluir, informe:
- O que foi implementado.
- Arquivos e módulos principais criados ou modificados.
- Configurações necessárias para execução.
- Migrações que precisam ser aplicadas.
- Testes executados e resultados.
- Integrações externas ainda pendentes.

# 15. Ordem de implementação

## Fase 1 — Fundação e identidade visual

- Inspecionar o workspace.
- Configurar ou adaptar a stack.
- Criar a identidade visual GOAL.
- Implementar Dark Mode padrão.
- Implementar Light Mode.
- Desenvolver layout responsivo.
- Configurar Supabase.
- Criar autenticação e políticas de segurança.

## Fase 2 — Planejamento semanal

- Cadastro de categorias.
- Cadastro e edição de atividades.
- Calendário semanal.
- Atividades recorrentes.
- Página Meu dia.
- Conclusão e reagendamento.
- Histórico de ocorrências.

## Fase 3 — Dashboard e metas

- Indicadores reais.
- Gráficos.
- Metas semanais.
- Distribuição do tempo.
- Comparação entre períodos.

## Fase 4 — Lembretes

- Preferências de notificação.
- Cadastro de telefone.
- Backend de lembretes.
- Integração com WhatsApp.
- Logs e tratamento de falhas.

Implemente as fases na ordem proposta, sem bloquear o funcionamento do núcleo do produto pela ausência de integrações externas.

# Critério final de aceitação

O GOAL deve ser uma aplicação web funcional, não apenas um protótipo visual.

O usuário deve conseguir autenticar-se, cadastrar atividades, planejar sua semana, acompanhar horários, concluir e reagendar tarefas, visualizar indicadores calculados a partir dos próprios dados e alternar entre os temas Dark e Light.

Os dados devem ser persistidos com segurança no Supabase, e a interface deve funcionar em diferentes tamanhos de tela.

**Inicie inspecionando o workspace atual do Antigravity e, em seguida, implemente a primeira fase. Não se limite a descrever o que seria necessário fazer.**