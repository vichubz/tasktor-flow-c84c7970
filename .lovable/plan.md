

## Plan: 3 Changes

### 1. Sync project_id when creating bookmark from task link
In `TaskCard.tsx`, the `handleAddLink` function currently inserts into `bookmarks` without `project_id`. Add `project_id: task.project_id` to the bookmark insert so the task's project carries over to the bookmarks panel.

### 2. Bookmarks panel: bigger project tag, double-click to edit, reorder date/project
In `BookmarksPage.tsx` display mode (lines 521-533):
- Move the project tag **before** the date, make it larger (text-xs instead of text-[10px], slightly bigger color dot, bolder font)
- Add `onDoubleClick={() => startEdit(b)}` to the bookmark card's outer `motion.div` so double-clicking opens edit mode
- Keep card size unchanged

### 3. Better task completion sound and bigger motivational toast
In `src/lib/sounds.ts`:
- Replace the current 3-note chime with a more celebratory 4-note fanfare (C5 → E5 → G5 → C6) with slightly longer sustain and a subtle harmonic overlay for richness

In `TaskCard.tsx`:
- Update `SUCCESS_MESSAGES` with short, punchy motivational phrases
- Increase the toast size by using a custom `toast()` call with a larger style/className (bigger font, more padding)

### Technical details

**File: `src/components/dashboard/TaskCard.tsx`**
- Line ~265: Add `project_id: task.project_id` to the bookmarks insert
- Update SUCCESS_MESSAGES with better motivational phrases
- Update the toast call on completion to use larger styling (`className` with bigger text and padding)

**File: `src/pages/BookmarksPage.tsx`**
- Line ~411: Add `onDoubleClick={() => startEdit(b)}` to the card div
- Lines 521-533: Swap order — project tag first (bigger: `text-xs`, `w-2.5 h-2.5` dot, `font-semibold`), then date after
- Cursor style `cursor-default` on card to hint interactivity

**File: `src/lib/sounds.ts`**
- Rewrite `playCompletionSound` with a 4-note ascending fanfare (C5→E5→G5→C6) with harmonic overtones for a more celebratory feel

