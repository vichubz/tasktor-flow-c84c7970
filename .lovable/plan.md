

## Changes

### 1. Increase vertical padding inside task cards
In `TaskCard.tsx`, change the main row padding from `py-1` to `py-2 sm:py-2.5` to add more breathing room top and bottom.

### 2. Adapt TaskCard for Kanban mode
When `compact` is true (kanban mode), show more task information in a card-like layout instead of a single compressed line:
- Show the title prominently
- Show description preview below title
- Show project badge, deadline badge, difficulty, and subtask count in a footer row
- Hide the position badge (`#1`, `#2`) since kanban columns already provide context
- Keep completion circle, highlight star, and delete button

The card will have a slightly different structure when `compact=true`: a vertical layout with title on top, optional description, and metadata row at the bottom.

### 3. Add inline project creation inside each Kanban column
In `KanbanBoard.tsx`, add a `+` button at the bottom of each column header (or a dedicated "Add Project" column at the end) that lets users quickly create a new project. This will:
- Show an inline input field with a color picker (reusing the COLORS array from ProjectManager)
- Call `supabase.from("projects").insert(...)` on submit
- Trigger `onUpdate` to refresh data

The KanbanBoard will receive an `onProjectCreated` callback (or reuse `onUpdate`) and the `user` from `useAuth`.

### Files to modify
- **`src/components/dashboard/TaskCard.tsx`**: Increase `py` padding; restructure layout when `compact=true` to show title, description, and metadata vertically
- **`src/components/dashboard/KanbanBoard.tsx`**: Add inline project creation UI (input + color picker + submit) as a new column or button at the end of the columns list

