# QuestDeck Launch Tracker — Design Spec

> Created: 2026-05-17
> Status: Approved

---

## Overview

A local web-based daily check-in dashboard for tracking the QuestDeck launch campaign. It displays all tasks from `docs/marketing/launch-schedule.md` as interactive checkboxes, logs daily metrics, and shows a metrics history table. Data is stored on disk in a JSON file via a local Node.js server.

---

## Files

```
docs/marketing/tracker/
  server.js           ← Node.js server, no npm dependencies
  index.html          ← Adventurer's Log frontend
  tracker-data.json   ← auto-created on first run, persists all state
```

### To run

```bash
node docs/marketing/tracker/server.js
```

Open `http://localhost:3000` in Chrome or Edge. Close the terminal when done for the day.

---

## Server (`server.js`)

Pure Node.js, no external dependencies. Uses the built-in `http` and `fs` modules only.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET /` | — | Serves `index.html` |
| `GET /data` | — | Returns contents of `tracker-data.json` as JSON |
| `POST /data` | — | Writes request body to `tracker-data.json` |

On `GET /data`, if `tracker-data.json` does not exist, the server creates it with an empty default structure and returns that.

Auto-saves fire on every checkbox tick and every blur/change of a metric input field.

---

## Data File (`tracker-data.json`)

Plain JSON file on disk. Can optionally be committed to git as a backup. If daily state changes in version history are unwanted, add `docs/marketing/tracker/tracker-data.json` to `.gitignore`. Structure:

```json
{
  "tasks": {
    "w4-tue": true,
    "w0-mon": true
  },
  "routine": {
    "2026-06-16": {
      "preReg": true,
      "replies": false,
      "task": true
    }
  },
  "metrics": {
    "2026-06-16": {
      "preReg": 47,
      "tiktok": 1240,
      "outreach": 5,
      "notes": "regression test done, all 8 moods pass"
    }
  }
}
```

- `tasks` — keyed by task ID using the format `w{weekNum}-{dayAbbrev}-{index}` (e.g. `w4-tue-0`, `w7-thu-0`, `w7-thu-1`). Index is always present (zero-based) to keep the format consistent. Value is `true` when completed.
- `routine` — keyed by ISO date string. Three boolean fields per day, reset naturally because each new date gets its own key.
- `metrics` — keyed by ISO date string. Four fields: `preReg` (number), `tiktok` (number), `outreach` (number), `notes` (string).

---

## Frontend (`index.html`)

### Aesthetic: Adventurer's Log

| Property | Value |
|----------|-------|
| Background | `#f5f0e8` (warm parchment) |
| Texture | CSS `repeating-linear-gradient` horizontal ruled lines |
| Display font | Cinzel (Google Fonts) — headers, week labels, badges |
| Body font | Crimson Pro (Google Fonts) — task text, notes, body copy |
| Primary text | `#3d2b00` |
| Accent / headers | `#5c4a1e` |
| Muted text | `#8b7240` |
| Completed (green) | `#5c8a3c` |
| Today / amber | `#c4891a` |
| Border | `#d4c4a0` |
| Today row bg | `rgba(196, 137, 26, 0.08)` |

### Layout — top to bottom

#### 1. Sticky header

- Left: "QuestDeck" in Cinzel, "Launch Chronicle · Season 2026" subtitle
- Center: current phase label (derived from today's date against phase boundaries)
- Right: T-minus countdown to July 9, 2026 (e.g. "T−23 days")

#### 2. Daily routine strip

Three checkboxes below the header, visually separated:

- Before June 1: "Check launch prep checklist"
- From June 1: "Check pre-reg count"
- Always: "Reply to TikTok / Reddit comments"
- Always: "Daily 20-min task done"

Stored under `routine[today]`. Resets naturally each day (new date key).

#### 3. Week accordion

Weeks displayed in order from current to past, future weeks below:

**Current week:**
- Expanded by default
- Header shows week title and `X / Y tasks done` badge

**Past weeks:**
- Collapsed by default, clickable to expand
- Header shows `X / Y ✓` in earthy green

**Future weeks:**
- Collapsed, not interactive
- Header shows unlock date (e.g. "unlocks Jun 22")
- Visually greyed out

#### 4. Day rows (within expanded week)

Each day has:
- Day label (e.g. "MON Jun 15") in Cinzel
- Status badge:
  - Past day: "done" (green) if all tasks checked, or nothing
  - Today: "▶ Today" (amber)
  - Future day: "complete early if ready" (muted) or "✓ done early" (amber) if any task is checked
- Task list — one checkbox per task, always interactive regardless of whether the day is past, present, or future

**Today's row additionally shows the metric log:**

```
Pre-reg: [____]   TikTok views: [____]   Outreach sent: [____]   Notes: [_____________]
```

All four fields. Stored to `metrics[today]` on change. Pre-reg and TikTok views and outreach sent are number inputs; notes is a text input.

Past days that have logged metrics show the metric log as read-only text (not inputs), so history is visible when a past week is expanded. Past days with no logged metrics show nothing in the metric area.

#### 5. Metrics history table

Collapsible section at the bottom of the page. Toggled by a button: "Show metrics history / Hide metrics history".

| Date | Pre-reg | TikTok views | Outreach sent | Notes |
|------|---------|--------------|---------------|-------|
| Jun 16 | 47 | 1,240 | 5 | regression done |
| Jun 15 | 41 | 890 | 3 | — |

Rows sorted newest first. Populated from all entries in `metrics`. Blank cells show "—".

---

## Task Data

All tasks from `docs/marketing/launch-schedule.md` are hard-coded into `index.html` as a JavaScript array. Each task:

```js
{ id: "w0-mon", week: 0, date: "2026-05-18", label: "Check production access..." }
```

Week 0 through Week 8 are included, plus a post-launch week (Week 9+) with the recurring weekly routine.

---

## Phase Detection

The sticky header shows the current phase, derived from today's date:

| Date range | Phase label |
|---|---|
| Before Jun 1 | Store & App Preparation |
| Jun 1 – Jun 21 | Pre-Registration Active |
| Jun 22 – Jun 28 | Go / No-Go: June 25 |
| Jun 29 – Jul 5 | Production Review |
| Jul 6 – Jul 12 | Launch Week |
| Jul 13 – Jul 16 | Backup Launch |
| After Jul 16 | Post-Launch |

---

## What This Does Not Include

- No charts or sparklines (table is sufficient for trend visibility)
- No multi-device sync
- No authentication
- No notifications
- No npm dependencies — `server.js` uses Node built-ins only
