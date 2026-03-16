# Plan: Daily Rotating Inspirational Quotes

## What changes

Replace the fixed quote on the Home page with a rotating "quote of the day" system using a hardcoded bank of 30+ quotes from business leaders, movies, and series (Peaky Blinders, Iron Man, Monsters Inc., Minecraft, etc.). The quote rotates daily based on the day of the year — no API call needed, keeping it simple and fast.

## Why not use Claude API

Using the Anthropic API for this would add latency on every Home page load and unnecessary API costs for something that can be a static list. A bank of 30+ curated quotes rotating by day is more reliable, instant, and free. The quotes are deterministic so the user sees the same quote all day.

## Implementation

### 1. Create `src/lib/quotes.ts`

A new file with an array of ~35 quote objects `{ text: string; author: string }` covering:

- **Business/hustle**: quotes from Steve Jobs, Elon Musk, Jeff Bezos, Gary Vee
- **Peaky Blinders**: Tommy Shelby lines ("Big fucks small", "Everyone's a whore, Grace. We just sell different parts of ourselves.", etc.)
- **Iron Man / Tony Stark**: "I am Iron Man", "Sometimes you gotta run before you can walk"
- **Monsters Inc.**: "I wouldn't have nothing if I didn't have you", Mike Wazowski lines
- **Minecraft**: "The only limit is your imagination"
- **Other series/movies**: Breaking Bad, The Wolf of Wall Street, Suits, etc.

A helper function `getDailyQuote()` that picks a quote based on `dayOfYear % quotes.length`. e todas as frases em portugues brasileiro

### 2. Update `src/pages/HomePage.tsx`

- Import `getDailyQuote` from the new file
- Replace the hardcoded quote with `const quote = getDailyQuote()`
- Render `quote.text` and `quote.author`

### Files


| File                     | Change                                            |
| ------------------------ | ------------------------------------------------- |
| `src/lib/quotes.ts`      | **New** — quote bank + daily selector             |
| `src/pages/HomePage.tsx` | Use `getDailyQuote()` instead of hardcoded string |
