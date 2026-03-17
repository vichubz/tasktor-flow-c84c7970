

## Kanban View for Tasks by Project

### Overview
Add a view toggle (list vs kanban) to the Dashboard. The kanban view displays tasks grouped into columns by project, each column showing its tasks in order. Tasks without a project go into an "Unassigned" column.

### Design Decisions

- **View toggle**: A simple icon toggle (List/Columns) next to the "Tasks" heading. Preference saved in `localStorage`.
- **Columns**: One column per project (colored header matching project color) + one "No Project" column. Columns are horizontally scrollable.
- **Drag & drop**: Reuse `@hello-pangea/dnd` with horizontal droppables per project. Dragging between columns updates `project_id` + `position`.
- **Task cards**: Reuse the existing `TaskCard` component in a compact mode (no drag handle grip visible in kanban, card itself is draggable).
- **Filters**: Difficulty filter still applies. Project filter hides/shows columns instead of filtering a flat list.
- **Mobile**: Columns scroll horizontally with snap behavior.

### Changes

1. **`src/pages/Dashboard.tsx`**
   - Add `viewMode` state (`"list" | "kanban"`) persisted to `localStorage`
   - Add toggle button next to "Tasks" heading
   - Conditionally render list view (current) or new `KanbanBoard` component
   - Pass shared props (tasks, projects, handlers) to both views

2. **`src/components/dashboard/KanbanBoard.tsx`** (new)
   - Groups `filteredTasks` by `project_id`
   - Renders horizontal scrollable container with one `Droppable` column per project
   - Each column: colored header with project name + task count, vertical list of `Draggable` task cards
   - "No Project" column for tasks with `project_id === null`
   - `onDragEnd` handles both reorder within column and cross-column moves (updates `project_id` via Supabase)
   - Uses existing `TaskCard` with all current functionality intact

3. **`src/components/dashboard/TaskCard.tsx`**
   - Add optional `compact` prop to hide drag grip and reduce padding slightly for kanban cards
   - No other changes needed — all existing features (difficulty, subtasks, copy/paste, highlight) work as-is

### Kanban Layout (ASCII)

```text
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ ● Project A │ │ ● Project B │ │ No Project  │
│  (3 tasks)  │ │  (2 tasks)  │ │  (1 task)   │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ [Task Card] │ │ [Task Card] │ │ [Task Card] │
│ [Task Card] │ │ [Task Card] │ │             │
│ [Task Card] │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
      ← horizontal scroll →
```

### Cross-column drag logic
When a task is dragged to a different project column:
- Update `project_id` in Supabase
- Recalculate positions in both source and destination columns
- Optimistic UI update with rollback on error

No database changes needed — all columns are derived from existing `project_id` field.

