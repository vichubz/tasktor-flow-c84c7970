

# Tasktor — Optimization & Visual Upgrade Plan

## Current Issues Found

### Data & Performance Bugs
1. **todayCompleted counter is always 0** — Dashboard filters `tasks` (which only has `is_completed: false`), so `completed_at` is never set on those items. Need to fetch completed count separately.
2. **Drag reorder is sequential** — Updates positions one by one with `await` in a loop. Should batch into a single Promise.all or use a database function.
3. **WorkTimer pause/resume is broken** — Clicking pause then play creates a new time entry instead of resuming the existing one. Need a proper pause/resume flow.
4. **No optimistic updates** — `handleComplete` and `handleDelete` await the DB call before updating local state. Should update UI first, then persist.
5. **Duplicate project fetches** — Both Sidebar and Dashboard fetch projects independently. No shared state.

### Visual Gaps
- No skeleton loading states
- No confetti animation on task completion
- Empty states are plain text
- Timer lacks visual punch
- Auth page particles are basic CSS `animate-pulse`
- Task cards hover effects are minimal

---

## Plan

### 1. Fix Data Flow & Optimize Performance

**Dashboard.tsx:**
- Fix `todayCompleted`: fetch count from DB with a separate query for completed tasks today
- Make `handleComplete` and `handleDelete` optimistic: update local state immediately, then persist
- Batch drag-and-drop position updates with `Promise.all` instead of sequential loop
- Add realtime subscription for tasks table to keep data in sync

**WorkTimer.tsx:**
- Add `isPaused` state separate from `isRunning`
- Pause: save `duration_seconds` to DB but keep `activeEntryId` — don't null it out
- Resume: recalculate elapsed from `started_at + duration_seconds` offset, set running again
- Only create new entry on fresh Start (no active entry)

**CompletedTasks.tsx:**
- Pass `todayCompleted` count up to Dashboard header via callback or shared fetch

### 2. Visual Upgrade — Enhanced Effects & Animations

**index.css — New effects:**
- Floating particles animation (CSS-based, lightweight)
- Shimmer/skeleton loading keyframes
- Enhanced glow effects with multiple color stops
- Neon text shadow utility
- Card hover lift effect with gradient border reveal

**tailwind.config.ts:**
- Add `shimmer`, `float`, `glow-pulse` keyframes
- Add `backdrop-blur-xl` utilities

**AuthPage.tsx:**
- Add animated floating orbs (3-4 circles with CSS animation, different sizes/delays)
- Input fields with animated border glow on focus
- Button with shimmer sweep effect on hover

**TaskCard.tsx:**
- Hover: subtle scale(1.005) + shadow increase + border glow
- Top 3 cards: animated gradient border (rotating gradient)
- Completion: confetti burst using framer-motion particles (spawn 12-15 small colored dots that explode outward and fade)
- Overdue badge with subtle pulse animation

**DashboardHeader.tsx:**
- Clock digits with subtle text-shadow glow
- Mini stat cards with hover lift effect
- Active timer: pulsing ring animation around the timer display

**WorkTimer.tsx:**
- Active state: animated gradient ring around timer
- Project color reflected in timer glow
- Digit transitions with framer-motion number flip

**AppSidebar.tsx:**
- Active nav item with animated left border indicator
- Logo icon with subtle rotation on hover
- Smooth width transition with content fade

**MetricsPage.tsx:**
- Stat cards with staggered entrance + count-up animation for numbers
- Chart containers with fade-in on scroll/mount
- Add gradient fills to charts

**Loading States:**
- Create `SkeletonTaskCard` component with shimmer effect
- Show 3 skeleton cards while loading in Dashboard
- Skeleton stat cards in Metrics page

### 3. Files to Create/Modify

| File | Action |
|------|--------|
| `src/index.css` | Add new animations, particle effects, shimmer |
| `tailwind.config.ts` | Add new keyframes and animation utilities |
| `src/pages/AuthPage.tsx` | Floating orbs, enhanced input effects |
| `src/pages/Dashboard.tsx` | Fix todayCompleted, optimistic updates, batch drag, skeleton loading |
| `src/components/dashboard/TaskCard.tsx` | Confetti on complete, enhanced hover, animated top3 border |
| `src/components/dashboard/WorkTimer.tsx` | Fix pause/resume, animated timer display |
| `src/components/dashboard/DashboardHeader.tsx` | Glow clock, hover effects on stat cards |
| `src/components/dashboard/DigitalClock.tsx` | Neon glow text effect |
| `src/components/dashboard/CompletedTasks.tsx` | Pass count to parent |
| `src/components/layout/AppSidebar.tsx` | Animated active indicator, hover effects |
| `src/pages/MetricsPage.tsx` | Count-up numbers, gradient chart fills, staggered animations |

No database changes needed — all fixes are frontend logic and visual.

