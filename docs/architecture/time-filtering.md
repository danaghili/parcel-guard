# Architecture Decision: Time-of-Day Event Filtering

**Date:** 2025-12-10
**Status:** Proposed

## Context

Users need the ability to filter motion events by time of day, independent of the date. This is useful for scenarios like:

- Viewing all events during "business hours" (9:00-17:00)
- Monitoring nighttime activity (22:00-06:00)
- Analyzing patterns during specific time windows

The backend already supports `startTime` and `endTime` filters in "HH:mm" format (see `apps/api/src/services/events.ts:201-219`). The frontend types already include these fields (`packages/shared/src/types/event.ts:17-18`, `apps/web/src/lib/api.ts:589-590`), and the API client already passes them to the backend (`apps/web/src/lib/api.ts:458-459`).

**Gap:** The UI components (`EventFilters.tsx`) and URL state management (`Events.tsx`) do not yet surface this capability.

## Decision

Implement a collapsible time filter section in `EventFilters` that:

1. Uses native `<input type="time">` for cross-browser compatibility
2. Includes quick presets for common time ranges
3. Persists time filters in URL query parameters for shareability
4. Handles the overnight time range case (e.g., 22:00-06:00) with a UI warning + backend fix

## Component Structure

No new files are required. This feature extends existing components:

```
apps/web/src/
├── components/events/
│   └── EventFilters.tsx    # MODIFY: Add time filter section
├── pages/
│   └── Events.tsx          # MODIFY: Add URL param handling
└── lib/
    └── api.ts              # ALREADY DONE: startTime/endTime in API client
```

## Data Flow

```
URL Query Parameters
     │
     │ startTime=09:00&endTime=17:00
     ▼
Events.tsx (parseFiltersFromUrl)
     │
     │ EventFiltersType { startTime, endTime }
     ▼
EventFilters.tsx (renders time inputs)
     │
     │ User changes time
     ▼
EventFilters.tsx (onFiltersChange)
     │
     ▼
Events.tsx (handleFiltersChange → setSearchParams)
     │
     ▼
eventsApi.list(filters) → /api/events?startTime=...&endTime=...
     │
     ▼
Backend events.ts (getEvents) → SQL time filtering
```

## API Design

No API changes required. The backend already supports:

```typescript
// GET /api/events?startTime=09:00&endTime=17:00
interface EventFilters {
  cameraId?: string
  startDate?: number // Unix timestamp
  endDate?: number // Unix timestamp
  startTime?: string // "HH:mm" format (already supported)
  endTime?: string // "HH:mm" format (already supported)
  isImportant?: boolean
  isFalseAlarm?: boolean
}
```

## Key Interfaces

```typescript
// Time filter preset definition
interface TimePreset {
  id: string
  label: string
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  isOvernight?: boolean // For UI indication
}

// Predefined presets
const TIME_PRESETS: TimePreset[] = [
  { id: 'business', label: 'Business Hours', startTime: '09:00', endTime: '17:00' },
  { id: 'evening', label: 'Evening', startTime: '17:00', endTime: '22:00' },
  { id: 'night', label: 'Night', startTime: '22:00', endTime: '06:00', isOvernight: true },
]
```

## URL Parameter Design

```
/events?startTime=09:00&endTime=17:00
/events?camera=cam1&startTime=22:00&endTime=06:00&startDate=1702166400
```

**Parameters:**

- `startTime`: "HH:mm" format (24-hour)
- `endTime`: "HH:mm" format (24-hour)

**Validation:**

- Both `startTime` and `endTime` must be present together (or neither)
- Format validation: regex `/^([01]\d|2[0-3]):([0-5]\d)$/`

## Overnight Time Range Handling

**Problem:** The backend currently uses `BETWEEN` for time comparison, which fails for overnight ranges (22:00-06:00):

```sql
-- Current (broken for overnight):
WHERE (strftime('%H', timestamp, 'unixepoch') * 60 + strftime('%M', timestamp, 'unixepoch'))
      BETWEEN 1320 AND 360  -- 22:00 (1320 min) to 06:00 (360 min) - WRONG!
```

**Solution:** Backend modification to use OR condition for overnight ranges:

```sql
-- For startMinutes > endMinutes (overnight range):
WHERE (
  (strftime('%H', timestamp, 'unixepoch') * 60 + strftime('%M', timestamp, 'unixepoch')) >= 1320
  OR
  (strftime('%H', timestamp, 'unixepoch') * 60 + strftime('%M', timestamp, 'unixepoch')) <= 360
)
```

**Frontend indication:** Display "(overnight)" badge next to time range when startTime > endTime.

## UI Component Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Camera ▼] [All Time] [Today] [7 Days] [30 Days] [Custom] [All Events ▼] │
│                                                                          │
│ ☑ Filter by time of day                                                  │
│ ┌─ Quick: [Business Hours] [Evening] [Night] ────────────────────────┐   │
│ │                                                                    │   │
│ │  From: [ 09 : 00 ]    To: [ 17 : 00 ]                              │   │
│ │                                                                    │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ [Clear Filters]                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**States:**

1. **Collapsed (default):** Checkbox "Filter by time of day" unchecked
2. **Expanded:** Checkbox checked, reveals presets + time inputs
3. **Active:** Time range set, inputs show values

## Timezone Considerations

**Current behavior:** Events are stored as Unix timestamps (UTC). The backend uses `strftime` with `'unixepoch'` which returns UTC time.

**Decision:** Apply time filtering in the **user's local timezone**.

**Implementation:**

- Frontend converts local time inputs to "HH:mm" strings (no timezone conversion needed - it's just the local hour/minute)
- Backend compares against UTC-extracted hours - **this is a bug**

**Recommended fix:** Modify backend to use `'localtime'` modifier:

```sql
-- CHANGE FROM:
strftime('%H', timestamp, 'unixepoch')
-- TO:
strftime('%H', timestamp, 'unixepoch', 'localtime')
```

**Caveat:** SQLite's `localtime` uses the server's timezone. If the server and users are in different timezones, this won't work correctly. For a DIY home system, this is acceptable since the Pi hub and users are typically in the same timezone.

**Alternative (more robust):** Pass the user's timezone offset from the frontend and apply it in the backend. Not recommended for this project due to added complexity.

## Patterns Used

- **Collapsible sections:** Matches existing "Custom dates" pattern in EventFilters
- **Preset buttons + manual inputs:** Common pattern for time selection
- **URL state persistence:** Already established pattern in Events.tsx
- **Native HTML5 inputs:** `<input type="time">` for consistent cross-browser experience

## Trade-offs

| Option                                | Pros                                                   | Cons                                             |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Native `<input type="time">` (chosen) | Cross-browser, accessible, mobile-friendly, no library | Inconsistent styling across browsers             |
| Custom time picker component          | Full styling control, consistent UX                    | More code, accessibility challenges, maintenance |
| Dropdown with preset ranges only      | Simpler UI, no edge cases                              | Less flexible for users                          |

## Integration Points

1. **EventFilters.tsx** (`apps/web/src/components/events/EventFilters.tsx:150-156`)
   - Add `startTime`/`endTime` to `hasActiveFilters` check
   - Add time values to `clearFilters()`

2. **Events.tsx** (`apps/web/src/pages/Events.tsx:19-40, 45-55`)
   - Extract `startTime`/`endTime` in `parseFiltersFromUrl()`
   - Include in `filtersToSearchParams()`

3. **events.ts backend** (`apps/api/src/services/events.ts:201-219`)
   - Fix overnight time range handling
   - Consider timezone modifier

## ARCHITECTURE.md Updates Required

Update the "Frontend Pages" section to mention time filtering:

```markdown
| Route     | Component | Description                                                                            |
| --------- | --------- | -------------------------------------------------------------------------------------- |
| `/events` | Events    | Event list with filtering (camera, date range, time of day, importance) and pagination |
```

Add to "URL Query Params" section in Data Lineage:

```markdown
URL Query Params
└── /events?cameraId=X&startDate=Y&startTime=HH:mm&endTime=HH:mm ──► EventFilters ──► eventsApi.list()
```

## Open Questions

1. Should overnight time ranges show a visual indicator (e.g., moon icon or "(overnight)" text)?
2. Should the time filter default to hidden or visible? (Recommendation: hidden, matching current custom date behavior)
3. Should we validate that startTime < endTime and show a warning for overnight ranges, or silently accept both?
