

# Plan: Quick Meeting Creator on Dashboard + Rename Everything to English + Reorder Nav

## What changes

### 1. Quick Meeting Creator on MeetingMetricsCard
Expand the Meetings card in the dashboard header to include a "+" button that opens an inline quick-create form right there. The form will have:
- Title (text input)
- Duration (hours + minutes selects)
- Project (optional select from user's projects)
- Link to Meet Agent transcription (optional select from `meeting_summaries`)
- Save button that inserts into `meetings` table and refreshes the card count

The card will receive `projects` as a prop (already available from DashboardHeader). Summaries will be fetched on-demand when the form opens.

### 2. Rename all labels to English
All UI text across sidebar, mobile nav, dashboard header, metric cards, and page titles will be translated:
- "Início" → "Home"
- "Dashboard" → "Dashboard" (same)
- "Agenda" → "Calendar"
- "Reuniões IA" → "Meet Agent"
- "Reuniões" → "Meetings"
- "Projetos" → "Projects"
- "Métricas" → "Metrics"
- "Configurações" → "Settings"
- "Sair" → "Sign Out"
- "Concluídas" → "Completed"
- "Histórico" → "History"
- "Reuniões Hoje" → "Meetings Today"
- "reuniões" → "meetings"
- Error/success toasts updated to English

### 3. Reorder navigation
New order in sidebar and mobile nav:
1. Home
2. Dashboard
3. Calendar
4. Meet Agent
5. Meetings
6. Projects (sidebar dropdown only)

### Files to modify

| File | Changes |
|------|---------|
| `AppSidebar.tsx` | Rename labels, reorder links array |
| `MobileBottomNav.tsx` | Rename labels, reorder links array |
| `MeetingMetricsCard.tsx` | Add quick-create form with "+" button, accept `projects` prop, fetch summaries, English labels |
| `DashboardHeader.tsx` | Pass `projects` to MeetingMetricsCard, English labels |
| `Dashboard.tsx` | English toast messages |
| `CompletedTasks.tsx` | English labels if any Portuguese remains |

