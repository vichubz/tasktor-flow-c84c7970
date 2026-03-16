

# Plano: Reuniões Detalhadas, Calendário Avançado, Configurações e Histórico de Tarefas

## Resumo

4 grandes blocos de trabalho:
1. **Nova aba "Reuniões"** — registro individual de reuniões com link a transcrições
2. **Calendário avançado** — edição/remarcação de eventos + exibir links de call
3. **Página de Configurações** — editar nome, resetar dados
4. **Histórico de tarefas editável** — editar tarefas concluídas (título, projeto, etc)

---

## 1. Nova Tabela `meetings` + Aba dedicada

### Database
Criar tabela `meetings`:
- `id` uuid PK
- `user_id` uuid NOT NULL
- `title` text NOT NULL
- `project_id` uuid nullable (FK projects)
- `duration_minutes` integer default 0
- `description` text nullable
- `meeting_date` date default CURRENT_DATE
- `summary_id` uuid nullable (FK meeting_summaries) — link com transcrição processada
- `created_at` timestamptz default now()

RLS: user_id = auth.uid() para todas as operações.

### Nova página `/meetings`
- Lista de reuniões do dia (e filtro por data)
- Formulário inline para adicionar reunião: título, projeto (select opcional), duração (hh:mm), descrição, data
- Ao salvar, incrementa automaticamente o contador no `meeting_logs` do dia (ou cria se não existe)
- Cada reunião mostra botão "Vincular Transcrição" que abre select com `meeting_summaries` existentes
- Quando vinculada, a reunião exibe preview do resumo e botão para ver completo
- Card no dashboard continua mostrando o total do dia (soma das reuniões individuais)

### Atualização do MeetingMetricsCard
- Em vez de +/- manual, o card mostra a contagem real de reuniões registradas na tabela `meetings` para o dia
- Clicar no card navega para `/meetings`

### Sidebar & Mobile Nav
- Adicionar link "Reuniões" (icon Video) entre Dashboard e Métricas

---

## 2. Calendário Avançado

### Edge Function `google-calendar-update-event`
Nova edge function para PATCH de eventos no Google Calendar API:
- Recebe `eventId`, `title`, `start`, `end`, `description`
- Faz PATCH em `https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}`

### Edge Function `google-calendar-delete-event`
- DELETE de evento

### CalendarPage melhorias
- Cada evento ganha botões de ação: "Editar" e "Excluir"
- "Editar" abre formulário inline pre-preenchido (título, data, horário início/fim, descrição)
- O link de call (meetLink) já é exibido — garantir que aparece de forma proeminente com ícone de câmera
- "Excluir" com confirmação
- Exibir descrição do evento expandível

---

## 3. Página de Configurações `/settings`

### Nova página
- **Perfil**: editar nome (update na tabela `profiles`)
- **Resetar dados**: botões individuais para limpar cada tipo de dado:
  - Tarefas (delete all tasks)
  - Reuniões (delete all meetings + meeting_logs)
  - Tempo trabalhado (delete all time_entries)
  - Transcrições (delete all meeting_summaries)
  - Resetar tudo (todos acima)
- Cada reset com AlertDialog de confirmação
- **Conta**: exibir email, botão de logout
- **Desconectar Google Calendar**: delete google_tokens

### Sidebar & Mobile Nav
- Adicionar ícone Settings no bottom da sidebar (antes do logout)
- No mobile, usar menu "mais" ou adicionar na nav

---

## 4. Histórico de Tarefas Editável

### CompletedTasks melhorias
- Cada tarefa concluída ganha botão "Editar" (ícone lápis)
- Edição inline: título, projeto (select), descrição
- Salva via update na tabela `tasks`
- Já tem restaurar e excluir — adicionar apenas edição

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `meetings` |
| `src/pages/MeetingsPage.tsx` | Nova página de reuniões individuais |
| `src/pages/SettingsPage.tsx` | Nova página de configurações |
| `src/pages/CalendarPage.tsx` | Adicionar edição/exclusão de eventos |
| `supabase/functions/google-calendar-update-event/index.ts` | Nova edge function |
| `supabase/functions/google-calendar-delete-event/index.ts` | Nova edge function |
| `src/App.tsx` | Rotas `/meetings` e `/settings` |
| `src/components/layout/AppSidebar.tsx` | Links Reuniões e Config |
| `src/components/layout/MobileBottomNav.tsx` | Links atualizados |
| `src/components/dashboard/MeetingMetricsCard.tsx` | Ler de `meetings` table |
| `src/components/dashboard/CompletedTasks.tsx` | Adicionar edição inline |
| `supabase/config.toml` | verify_jwt=false para novas functions |

