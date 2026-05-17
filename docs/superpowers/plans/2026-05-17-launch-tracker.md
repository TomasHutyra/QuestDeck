# Launch Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Node.js + HTML dashboard for tracking the QuestDeck launch campaign — task checkboxes, daily metric logging, and a metrics history table, all persisted to a JSON file on disk.

**Architecture:** A Node.js HTTP server (no npm) serves a single HTML file and handles two data endpoints (GET/POST `/data`) that read/write `tracker-data.json`. The frontend is a self-contained HTML page with inline CSS and JS that fetches state on load and auto-saves on every change. All task data is hard-coded in the HTML from the launch schedule.

**Tech Stack:** Node.js built-in `http` + `fs` modules only; vanilla HTML/CSS/JS; Google Fonts (Cinzel + Crimson Pro) loaded from CDN.

---

## File Map

| File | Responsibility |
|---|---|
| `docs/marketing/tracker/server.js` | HTTP server: serves HTML, read/write JSON data file |
| `docs/marketing/tracker/utils.js` | Pure functions: phase detection, T-minus, today string — shared between Node tests and browser |
| `docs/marketing/tracker/index.html` | Full frontend: CSS, task data, rendering, interactions |
| `docs/marketing/tracker/tracker-data.json` | Auto-created data file; optionally gitignored |
| `docs/marketing/tracker/test-server.js` | Integration tests for server endpoints |
| `docs/marketing/tracker/test-utils.js` | Unit tests for pure utility functions |

---

## Task 1: Server

**Files:**
- Create: `docs/marketing/tracker/server.js`
- Create: `docs/marketing/tracker/test-server.js`

- [ ] **Step 1: Create the tracker directory**

```bash
mkdir docs/marketing/tracker
```

- [ ] **Step 2: Write test-server.js (failing — server.js does not exist yet)**

Create `docs/marketing/tracker/test-server.js`:

```js
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_PORT = 3001;
const TEST_DATA_FILE = path.join(__dirname, '_test-data.json');

function req(method, urlPath, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = bodyObj !== undefined ? JSON.stringify(bodyObj) : null;
    const options = {
      hostname: 'localhost', port: TEST_PORT,
      path: urlPath, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function runTests() {
  if (fs.existsSync(TEST_DATA_FILE)) fs.unlinkSync(TEST_DATA_FILE);

  // Test 1: GET /data creates and returns default structure when file is absent
  let r = await req('GET', '/data');
  assert.strictEqual(r.status, 200, 'GET /data status');
  assert.deepStrictEqual(JSON.parse(r.body), { tasks: {}, routine: {}, metrics: {} });
  assert(fs.existsSync(TEST_DATA_FILE), 'data file was created');
  console.log('  ✓ GET /data returns default structure and creates file');

  // Test 2: POST /data saves and confirms
  const testData = { tasks: { 'w0-mon-0': true }, routine: {}, metrics: {} };
  r = await req('POST', '/data', testData);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(JSON.parse(r.body), { ok: true });
  console.log('  ✓ POST /data saves data and returns {ok:true}');

  // Test 3: GET /data returns what was saved
  r = await req('GET', '/data');
  assert.deepStrictEqual(JSON.parse(r.body), testData);
  console.log('  ✓ GET /data returns previously saved data');

  // Test 4: POST /data with invalid JSON returns 400
  const badReq = await new Promise((resolve, reject) => {
    const body = 'not-json';
    const opts = {
      hostname: 'localhost', port: TEST_PORT, path: '/data', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const r2 = http.request(opts, res => {
      let d = ''; res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r2.on('error', reject);
    r2.write(body);
    r2.end();
  });
  assert.strictEqual(badReq.status, 400);
  console.log('  ✓ POST /data with invalid JSON returns 400');
}

// Require server.js — this will fail until server.js exists
const { createRequestHandler, DEFAULT_DATA } = require('./server');
const server = http.createServer(createRequestHandler(TEST_DATA_FILE, path.join(__dirname, 'index.html')));
server.listen(TEST_PORT, async () => {
  try {
    await runTests();
    console.log('\nAll server tests passed ✓');
  } catch (e) {
    console.error('\n✗ Test failed:', e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    if (fs.existsSync(TEST_DATA_FILE)) fs.unlinkSync(TEST_DATA_FILE);
  }
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
node docs/marketing/tracker/test-server.js
```

Expected: `Cannot find module './server'`

- [ ] **Step 4: Create server.js**

Create `docs/marketing/tracker/server.js`:

```js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DEFAULT_DATA = { tasks: {}, routine: {}, metrics: {} };

function readData(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function createRequestHandler(dataFilePath, htmlFilePath) {
  return function handler(req, res) {
    if (req.method === 'GET' && req.url === '/') {
      try {
        const html = fs.readFileSync(htmlFilePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(404);
        res.end('index.html not found');
      }
    } else if (req.method === 'GET' && req.url === '/data') {
      const data = readData(dataFilePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } else if (req.method === 'POST' && req.url === '/data') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          writeData(dataFilePath, data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid JSON' }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  };
}

if (require.main === module) {
  const dataFilePath = path.join(__dirname, 'tracker-data.json');
  const htmlFilePath = path.join(__dirname, 'index.html');
  const server = http.createServer(createRequestHandler(dataFilePath, htmlFilePath));
  server.listen(PORT, () => {
    console.log(`QuestDeck Launch Tracker → http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.');
  });
}

module.exports = { readData, writeData, createRequestHandler, DEFAULT_DATA };
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
node docs/marketing/tracker/test-server.js
```

Expected output:
```
  ✓ GET /data returns default structure and creates file
  ✓ POST /data saves data and returns {ok:true}
  ✓ GET /data returns previously saved data
  ✓ POST /data with invalid JSON returns 400

All server tests passed ✓
```

- [ ] **Step 6: Commit**

```bash
git add docs/marketing/tracker/server.js docs/marketing/tracker/test-server.js
git commit -m "feat(tracker): add Node.js server with data persistence"
```

---

## Task 2: Utils

**Files:**
- Create: `docs/marketing/tracker/utils.js`
- Create: `docs/marketing/tracker/test-utils.js`

- [ ] **Step 1: Write test-utils.js (failing)**

Create `docs/marketing/tracker/test-utils.js`:

```js
const assert = require('assert');
const { getPhase, getTMinus, todayStr } = require('./utils');

function t(label, fn) {
  try { fn(); console.log('  ✓', label); }
  catch (e) { console.error('  ✗', label, '\n   ', e.message); process.exitCode = 1; }
}

t('getPhase: May 18 → Store & App Preparation', () => {
  assert.strictEqual(getPhase(new Date('2026-05-18')), 'Store & App Preparation');
  assert.strictEqual(getPhase(new Date('2026-05-31')), 'Store & App Preparation');
});
t('getPhase: Jun 1 → Pre-Registration Active', () => {
  assert.strictEqual(getPhase(new Date('2026-06-01')), 'Pre-Registration Active');
  assert.strictEqual(getPhase(new Date('2026-06-21')), 'Pre-Registration Active');
});
t('getPhase: Jun 22 → Go / No-Go: June 25', () => {
  assert.strictEqual(getPhase(new Date('2026-06-22')), 'Go / No-Go: June 25');
  assert.strictEqual(getPhase(new Date('2026-06-28')), 'Go / No-Go: June 25');
});
t('getPhase: Jun 29 → Production Review', () => {
  assert.strictEqual(getPhase(new Date('2026-06-29')), 'Production Review');
  assert.strictEqual(getPhase(new Date('2026-07-05')), 'Production Review');
});
t('getPhase: Jul 6 → Launch Week', () => {
  assert.strictEqual(getPhase(new Date('2026-07-06')), 'Launch Week');
  assert.strictEqual(getPhase(new Date('2026-07-12')), 'Launch Week');
});
t('getPhase: Jul 13 → Backup Launch', () => {
  assert.strictEqual(getPhase(new Date('2026-07-13')), 'Backup Launch');
  assert.strictEqual(getPhase(new Date('2026-07-16')), 'Backup Launch');
});
t('getPhase: Jul 17 → Post-Launch', () => {
  assert.strictEqual(getPhase(new Date('2026-07-17')), 'Post-Launch');
});
t('getTMinus: day before launch → 1', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-08')), 1);
});
t('getTMinus: launch day → 0', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-09')), 0);
});
t('getTMinus: day after launch → -1', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-10')), -1);
});
t('todayStr returns YYYY-MM-DD', () => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr()), `got: ${todayStr()}`);
});

if (!process.exitCode) console.log('\nAll utils tests passed ✓');
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
node docs/marketing/tracker/test-utils.js
```

Expected: `Cannot find module './utils'`

- [ ] **Step 3: Create utils.js**

Create `docs/marketing/tracker/utils.js`:

```js
function getPhase(today) {
  const d = today.toISOString().slice(0, 10);
  if (d >= '2026-07-17') return 'Post-Launch';
  if (d >= '2026-07-13') return 'Backup Launch';
  if (d >= '2026-07-06') return 'Launch Week';
  if (d >= '2026-06-29') return 'Production Review';
  if (d >= '2026-06-22') return 'Go / No-Go: June 25';
  if (d >= '2026-06-01') return 'Pre-Registration Active';
  return 'Store & App Preparation';
}

function getTMinus(today) {
  const launch = new Date('2026-07-09');
  const todayMidnight = new Date(today.toISOString().slice(0, 10));
  return Math.round((launch - todayMidnight) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPhase, getTMinus, todayStr };
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
node docs/marketing/tracker/test-utils.js
```

Expected output:
```
  ✓ getPhase: May 18 → Store & App Preparation
  ✓ getPhase: Jun 1 → Pre-Registration Active
  ✓ getPhase: Jun 22 → Go / No-Go: June 25
  ✓ getPhase: Jun 29 → Production Review
  ✓ getPhase: Jul 6 → Launch Week
  ✓ getPhase: Jul 13 → Backup Launch
  ✓ getPhase: Jul 17 → Post-Launch
  ✓ getTMinus: day before launch → 1
  ✓ getTMinus: launch day → 0
  ✓ getTMinus: day after launch → -1
  ✓ todayStr returns YYYY-MM-DD

All utils tests passed ✓
```

- [ ] **Step 5: Commit**

```bash
git add docs/marketing/tracker/utils.js docs/marketing/tracker/test-utils.js
git commit -m "feat(tracker): add utility functions with tests"
```

---

## Task 3: HTML Shell + Aesthetic CSS

**Files:**
- Create: `docs/marketing/tracker/index.html`

- [ ] **Step 1: Create index.html with full structure and CSS**

Create `docs/marketing/tracker/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuestDeck Launch Tracker</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f5f0e8;
      --text: #3d2b00;
      --accent: #5c4a1e;
      --muted: #8b7240;
      --green: #5c8a3c;
      --amber: #c4891a;
      --border: #d4c4a0;
      --today-bg: rgba(196,137,26,0.08);
      --past-bg: #faf8f3;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: repeating-linear-gradient(
        0deg, transparent, transparent 27px,
        rgba(180,155,100,0.18) 27px, rgba(180,155,100,0.18) 28px
      );
      background-attachment: fixed;
      color: var(--text);
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 16px;
      line-height: 1.6;
      min-height: 100vh;
    }

    /* ── Header ── */
    #site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(245,240,232,0.96);
      backdrop-filter: blur(4px);
      border-bottom: 2px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-wordmark { line-height: 1.2; }
    .header-title {
      font-family: 'Cinzel', serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 1.5px;
    }
    .header-sub {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 1.5px;
      color: var(--muted);
      text-transform: uppercase;
    }
    #header-phase {
      margin-left: auto;
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: var(--accent);
      color: #f5f0e8;
      padding: 4px 12px;
      border-radius: 2px;
    }
    #header-tminus {
      font-family: 'Cinzel', serif;
      font-size: 13px;
      color: var(--amber);
      white-space: nowrap;
      min-width: 90px;
      text-align: right;
    }

    /* ── Routine strip ── */
    #routine-strip {
      background: rgba(212,196,160,0.18);
      border-bottom: 1px solid var(--border);
      padding: 9px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .routine-label {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .routine-check {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 14px;
      cursor: pointer;
      user-select: none;
    }
    .routine-check input[type=checkbox] {
      accent-color: var(--amber);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    /* ── Main layout ── */
    main { max-width: 820px; margin: 0 auto; padding: 24px 24px 8px; }

    /* ── Week ── */
    .week {
      margin-bottom: 8px;
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .week-current { border-color: var(--accent); border-width: 2px; }
    .week-future { opacity: 0.45; pointer-events: none; }

    .week-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 16px;
      cursor: pointer;
      user-select: none;
      background: rgba(212,196,160,0.15);
    }
    .week-current .week-header { background: var(--accent); color: #f5f0e8; }
    .week-future .week-header { background: rgba(212,196,160,0.1); cursor: default; }

    .chevron { font-size: 10px; opacity: 0.6; flex-shrink: 0; }
    .week-title {
      font-family: 'Cinzel', serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .week-subtitle { font-size: 13px; opacity: 0.65; flex: 1; font-style: italic; }
    .week-badge {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      padding: 2px 9px;
      border-radius: 10px;
      background: rgba(0,0,0,0.1);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .week-current .week-badge { background: rgba(255,255,255,0.2); }
    .badge-done { background: var(--green) !important; color: #fff; }

    /* ── Day ── */
    .day { border-top: 1px solid var(--border); padding: 10px 16px 10px; }
    .day-past { background: var(--past-bg); }
    .day-today { background: var(--today-bg); }
    .day-future { background: #fff; }

    .day-header { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; flex-wrap: wrap; }
    .day-label {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 0.8px;
      color: var(--muted);
      width: 92px;
      flex-shrink: 0;
    }
    .day-today .day-label { color: var(--amber); font-weight: 600; }

    .day-badge {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 8px;
    }
    .badge-today { background: var(--amber); color: #fff; }
    .badge-early { background: rgba(196,137,26,0.12); color: var(--amber); border: 1px solid rgba(196,137,26,0.4); }
    .badge-done-day { background: rgba(92,138,60,0.12); color: var(--green); border: 1px solid rgba(92,138,60,0.4); }
    .day-hint { font-size: 11px; color: #bbb; font-style: italic; }

    /* ── Task ── */
    .task {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14.5px;
      line-height: 1.5;
      margin-bottom: 4px;
      cursor: pointer;
    }
    .task input[type=checkbox] {
      margin-top: 3px;
      flex-shrink: 0;
      accent-color: var(--green);
      width: 14px;
      height: 14px;
      cursor: pointer;
    }
    .task.done span { text-decoration: line-through; color: var(--muted); }

    /* ── Metric log ── */
    .metric-log {
      margin-top: 10px;
      padding: 9px 12px;
      background: rgba(255,255,255,0.65);
      border: 1px solid var(--border);
      border-radius: 3px;
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
    }
    .metric-field {
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .metric-field input {
      border: 1px solid var(--border);
      border-radius: 2px;
      padding: 3px 6px;
      font-family: 'Crimson Pro', serif;
      font-size: 14px;
      background: var(--bg);
      color: var(--text);
      width: 72px;
    }
    .metric-field input[type=text] { width: 180px; }
    .metric-field input:focus { outline: 1px solid var(--amber); border-color: var(--amber); }
    .metric-readonly { font-size: 13px; color: var(--muted); font-style: italic; margin-top: 6px; }

    /* ── History section ── */
    #history-section { max-width: 820px; margin: 0 auto 48px; padding: 0 24px 0; }
    #toggle-history {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      background: none;
      border: 1px solid var(--border);
      color: var(--accent);
      padding: 9px 16px;
      cursor: pointer;
      border-radius: 2px;
      width: 100%;
      text-align: left;
      margin-bottom: 2px;
    }
    #toggle-history:hover { background: rgba(212,196,160,0.2); }
    #history-table-wrap { margin-top: 10px; overflow-x: auto; }
    #history-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    #history-table th {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--muted);
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid var(--border);
    }
    #history-table td { padding: 7px 10px; border-bottom: 1px solid rgba(212,196,160,0.4); vertical-align: top; }
    #history-table tr:last-child td { border-bottom: none; }
    #history-table tr:hover td { background: rgba(212,196,160,0.1); }
  </style>
</head>
<body>

<header id="site-header">
  <div class="header-wordmark">
    <div class="header-title">QuestDeck</div>
    <div class="header-sub">Launch Chronicle · Season 2026</div>
  </div>
  <div id="header-phase">—</div>
  <div id="header-tminus">—</div>
</header>

<div id="routine-strip">
  <span class="routine-label">Daily</span>
  <label class="routine-check">
    <input type="checkbox" id="routine-prereg" onchange="onRoutineChange('preReg', this.checked)">
    <span id="routine-prereg-label">Check pre-reg count</span>
  </label>
  <label class="routine-check">
    <input type="checkbox" id="routine-replies" onchange="onRoutineChange('replies', this.checked)">
    <span>Reply to TikTok / Reddit comments</span>
  </label>
  <label class="routine-check">
    <input type="checkbox" id="routine-task" onchange="onRoutineChange('task', this.checked)">
    <span>Daily 20-min task done</span>
  </label>
</div>

<main id="week-list"></main>

<section id="history-section">
  <button id="toggle-history" onclick="toggleHistory()">▼ &nbsp;Metrics history</button>
  <div id="history-table-wrap" style="display:none">
    <table id="history-table">
      <thead>
        <tr>
          <th>Date</th><th>Pre-reg</th><th>TikTok views</th><th>Outreach sent</th><th>Notes</th>
        </tr>
      </thead>
      <tbody id="history-tbody"></tbody>
    </table>
  </div>
</section>

<script src="utils.js"></script>
<script>
  // Task data and app logic added in subsequent tasks
</script>
</body>
</html>
```

- [ ] **Step 2: Start the server and verify the shell loads**

```bash
node docs/marketing/tracker/server.js
```

Open `http://localhost:3000`. Verify:
- Page has parchment background with faint ruled lines
- Sticky header shows "QuestDeck" in serif, phase badge, T-minus placeholders
- Routine strip shows 3 checkboxes
- Body is otherwise empty (week-list is empty, history section shows button)

Stop server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): add HTML shell with Adventurer's Log aesthetic"
```

---

## Task 4: Task Data Array

**Files:**
- Modify: `docs/marketing/tracker/index.html` (add `TASK_DATA` constant to the `<script>` block)

- [ ] **Step 1: Replace the empty `<script>` block with the complete task data**

Replace the current `<script>` block (the one with the comment "Task data and app logic added in subsequent tasks") with:

```html
<script src="utils.js"></script>
<script>
const TASK_DATA = [
  {
    weekNum: 0, label: 'Week 0 — May 18–24', subtitle: 'Store, App & Infrastructure Preparation',
    days: [
      { date: '2026-05-18', dayLabel: 'Mon May 18', tasks: [
        { id: 'w0-mon-0', text: 'Check production access: confirm whether production track is available in Play Console. If not, identify requirements (closed testing 12+ testers, 14+ days).' }
      ]},
      { date: '2026-05-19', dayLabel: 'Tue May 19', tasks: [
        { id: 'w0-tue-0', text: 'Audit store listing: title, description, screenshots, icon, content rating. List everything missing or unfinished.' }
      ]},
      { date: '2026-05-20', dayLabel: 'Wed May 20', tasks: [
        { id: 'w0-wed-0', text: 'Write final store description with summer keywords: things to do, bored, weekend ideas, activity ideas, couple activities, offline, no account.' }
      ]},
      { date: '2026-05-21', dayLabel: 'Thu May 21', tasks: [
        { id: 'w0-thu-0', text: 'Create 6 screenshots in Canva with text overlays: "Pick your mood" / "Draw 3 quest cards" / "Tap to reveal" / "Choose your quest" / "Mark it done. Earn XP." / "Track your adventures"' }
      ]},
      { date: '2026-05-22', dayLabel: 'Fri May 22', tasks: [
        { id: 'w0-fri-0', text: 'Complete Data Safety form in Play Console. Publish privacy policy and link it in the store listing.' }
      ]},
      { date: '2026-05-23', dayLabel: 'Sat May 23', tasks: [
        { id: 'w0-sat-0', text: 'Create TikTok account. Set bio: "Real-life quest cards for bored moments 📲 Pre-register below". Film first screen recording.' }
      ]},
      { date: '2026-05-24', dayLabel: 'Sun May 24', tasks: [
        { id: 'w0-sun-0', text: 'Edit first TikTok in CapCut: add captions, pick trending audio. Save as draft. Write list of 20+ people for personal outreach.' }
      ]},
    ]
  },
  {
    weekNum: 1, label: 'Week 1 — May 25–31', subtitle: 'Final Prep (No Pre-Registration Yet)',
    days: [
      { date: '2026-05-25', dayLabel: 'Mon May 25', tasks: [
        { id: 'w1-mon-0', text: 'Final quest quality check: open every mood, read every quest. All 8 moods must have quests. Remove weak or repetitive ones.' }
      ]},
      { date: '2026-05-26', dayLabel: 'Tue May 26', tasks: [
        { id: 'w1-tue-0', text: 'Test app fully offline after first install: uninstall, reinstall without internet, verify all quests load.' }
      ]},
      { date: '2026-05-27', dayLabel: 'Wed May 27', tasks: [
        { id: 'w1-wed-0', text: 'Test notification permission request: does the copy feel natural? Test photo memory permission if included.' }
      ]},
      { date: '2026-05-28', dayLabel: 'Thu May 28', tasks: [
        { id: 'w1-thu-0', text: 'Final store listing review. Confirm screenshots, icon, and description are all final.' }
      ]},
      { date: '2026-05-29', dayLabel: 'Fri May 29', tasks: [
        { id: 'w1-fri-0', text: 'Prepare pre-registration setup steps for Monday (Play Console → Release → Pre-registration). Do not enable yet — wait for June 1.' }
      ]},
      { date: '2026-05-30', dayLabel: 'Sat May 30', tasks: [
        { id: 'w1-sat-0', text: 'Film TikTok videos #2 and #3 in one session. Draft #2 now, keep #3 for editing next week.' }
      ]},
      { date: '2026-05-31', dayLabel: 'Sun May 31', tasks: [
        { id: 'w1-sun-0', text: 'Set up launch tracking spreadsheet: date, pre-reg count, TikTok views, Reddit comments, outreach sent, testing issues. Final personal outreach list review.' }
      ]},
    ]
  },
  {
    weekNum: 2, label: 'Week 2 — Jun 1–7', subtitle: 'Pre-Registration Live (Week 1)',
    days: [
      { date: '2026-06-01', dayLabel: 'Mon Jun 1', tasks: [
        { id: 'w2-mon-0', text: 'Enable Google Play pre-registration. Verify "Pre-register" button appears in the Play Store. Update TikTok bio with pre-registration link.' }
      ]},
      { date: '2026-06-02', dayLabel: 'Tue Jun 2', tasks: [
        { id: 'w2-tue-0', text: 'Post TikTok video #1: quest reveal with overlay "Coming this summer — pre-register in bio".' }
      ]},
      { date: '2026-06-03', dayLabel: 'Wed Jun 3', tasks: [
        { id: 'w2-wed-0', text: 'Personal outreach batch 1: send to 10 people. "I\'m almost done with a real-life quest app. Would you pre-register? You\'ll get an automatic notification when it\'s live."' }
      ]},
      { date: '2026-06-04', dayLabel: 'Thu Jun 4', tasks: [
        { id: 'w2-thu-0', text: 'Post in r/SideProject: "I\'m building an offline quest card app for bored moments. Pre-registration is open. What would your first quest be?"' }
      ]},
      { date: '2026-06-05', dayLabel: 'Fri Jun 5', tasks: [
        { id: 'w2-fri-0', text: 'Review pre-registration count and testing feedback. Log both in dashboard.' }
      ]},
      { date: '2026-06-06', dayLabel: 'Sat Jun 6', tasks: [
        { id: 'w2-sat-0', text: 'Film TikTok videos #4 and #5. Summer boredom angle.' }
      ]},
    ]
  },
  {
    weekNum: 3, label: 'Week 3 — Jun 8–14', subtitle: 'Pre-Registration Active (Week 2)',
    days: [
      { date: '2026-06-08', dayLabel: 'Mon Jun 8', tasks: [
        { id: 'w3-mon-0', text: 'Post TikTok #2: summer quest reveal. CTA: "Would you do this quest?"' }
      ]},
      { date: '2026-06-09', dayLabel: 'Tue Jun 9', tasks: [
        { id: 'w3-tue-0', text: 'Personal outreach batch 2: 5–10 more people.' }
      ]},
      { date: '2026-06-10', dayLabel: 'Wed Jun 10', tasks: [
        { id: 'w3-wed-0', text: 'App testing: test on a different Android version or screen size if possible. Fix any issues.' }
      ]},
      { date: '2026-06-11', dayLabel: 'Thu Jun 11', tasks: [
        { id: 'w3-thu-0', text: 'Post in local city subreddit: "I built a free app that gives real-life quest ideas. Here\'s one: [quote a city quest]. Would you try this?"' }
      ]},
      { date: '2026-06-12', dayLabel: 'Fri Jun 12', tasks: [
        { id: 'w3-fri-0', text: 'Review pre-registration count. If under 20, double personal outreach next week. Log testing feedback.' }
      ]},
      { date: '2026-06-13', dayLabel: 'Sat Jun 13', tasks: [
        { id: 'w3-sat-0', text: 'Content batch: film 2 videos, create 5 Canva posts. Theme: couples and friends doing summer quests.' }
      ]},
    ]
  },
  {
    weekNum: 4, label: 'Week 4 — Jun 15–21', subtitle: 'Pre-Registration Active (Week 3) + Release Candidate',
    days: [
      { date: '2026-06-15', dayLabel: 'Mon Jun 15', tasks: [
        { id: 'w4-mon-0', text: 'Post TikTok #3: couples angle — "out of ideas for the weekend? draw a quest together"' }
      ]},
      { date: '2026-06-16', dayLabel: 'Tue Jun 16', tasks: [
        { id: 'w4-tue-0', text: 'Full regression test: all 8 moods, completion flow, streak reminder, photo memory, XP screen.' }
      ]},
      { date: '2026-06-17', dayLabel: 'Wed Jun 17', tasks: [
        { id: 'w4-wed-0', text: 'Personal outreach batch 3: 5–10 people.' }
      ]},
      { date: '2026-06-18', dayLabel: 'Thu Jun 18', tasks: [
        { id: 'w4-thu-0', text: 'Pack research: post on TikTok or Reddit — "If a themed quest pack existed, which would you want: Couples / City Explorer / Friends / Cozy Home?"' }
      ]},
      { date: '2026-06-19', dayLabel: 'Fri Jun 19', tasks: [
        { id: 'w4-fri-0', text: 'Release candidate decision: app stable? All quests polished? Store listing final? If yes: mark as RC. If no: list what is missing and schedule fixes.' }
      ]},
      { date: '2026-06-20', dayLabel: 'Sat Jun 20', tasks: [
        { id: 'w4-sat-0', text: 'Post TikTok #4. Update outreach tracking: how many pre-registered out of total outreach sent?' }
      ]},
    ]
  },
  {
    weekNum: 5, label: 'Week 5 — Jun 22–28', subtitle: 'Go / No-Go for June 25',
    days: [
      { date: '2026-06-22', dayLabel: 'Mon Jun 22', tasks: [
        { id: 'w5-mon-0', text: 'Make go/no-go decision for June 25. If going: confirm Day 1 testers, draft all launch day posts. If not going: note what is missing.' }
      ]},
      { date: '2026-06-23', dayLabel: 'Tue Jun 23', tasks: [
        { id: 'w5-tue-0', text: 'If launching Thu: brief Day 1 people — "Install Thursday, use the app, leave an honest review if you genuinely find it useful." Prepare Reddit launch post. Prepare TikTok launch video.' }
      ]},
      { date: '2026-06-24', dayLabel: 'Wed Jun 24', tasks: [
        { id: 'w5-wed-0', text: 'If launching Thu: final build check, final store listing review, confirm Managed Publishing is set up correctly.' }
      ]},
      { date: '2026-06-25', dayLabel: 'Thu Jun 25', tasks: [
        { id: 'w5-thu-0', text: '⚡ EARLIEST RELEASE — Jun 25. If launching: publish via Managed Publishing. Message all internal/closed testers manually (they will not receive the automatic pre-registration notification). Post r/androidapps. Post TikTok launch video. Reply to everything.' }
      ]},
      { date: '2026-06-26', dayLabel: 'Fri Jun 26', tasks: [
        { id: 'w5-fri-0', text: 'If launched: reply to all reviews and comments. Log Day 1 metrics. If not launched: continue pre-registration campaign.' }
      ]},
      { date: '2026-06-27', dayLabel: 'Sat Jun 27', tasks: [
        { id: 'w5-sat-0', text: 'Content batch for July launch push. Create "launching soon" style content.' }
      ]},
    ]
  },
  {
    weekNum: 6, label: 'Week 6 — Jun 29–Jul 5', subtitle: 'Production Review Submission + Final Push',
    days: [
      { date: '2026-06-29', dayLabel: 'Mon Jun 29', tasks: [
        { id: 'w6-mon-0', text: 'Final app build for production. Confirm Managed Publishing is enabled in Play Console.' }
      ]},
      { date: '2026-06-30', dayLabel: 'Tue Jun 30', tasks: [
        { id: 'w6-tue-0', text: 'Submit production release for Google Play review. 9-day review buffer before July 9. With Managed Publishing enabled, approval does not trigger automatic release.' }
      ]},
      { date: '2026-07-01', dayLabel: 'Wed Jul 1', tasks: [
        { id: 'w6-wed-0', text: 'Post TikTok #5: "launching this week" or summer boredom angle.' }
      ]},
      { date: '2026-07-02', dayLabel: 'Thu Jul 2', tasks: [
        { id: 'w6-thu-0', text: 'Personal outreach batch 5: final round of personal invites. Ask specifically to install around July 9.' }
      ]},
      { date: '2026-07-03', dayLabel: 'Fri Jul 3', tasks: [
        { id: 'w6-fri-0', text: 'Skip major posts — July 4 weekend, reduced USA engagement. Check Play Console for review status.' }
      ]},
      { date: '2026-07-04', dayLabel: 'Sat Jul 4', tasks: [
        { id: 'w6-sat-0', text: 'July 4th holiday (USA). No posts. Rest.' }
      ]},
      { date: '2026-07-05', dayLabel: 'Sun Jul 5', tasks: [
        { id: 'w6-sun-0', text: 'Check if production release is approved. If approved: it is waiting in Managed Publishing. Do not publish yet.' }
      ]},
    ]
  },
  {
    weekNum: 7, label: 'Week 7 — Jul 6–12', subtitle: 'Launch Week (Realistic Release July 9)',
    days: [
      { date: '2026-07-06', dayLabel: 'Mon Jul 6', tasks: [
        { id: 'w7-mon-0', text: 'Confirm July 9 launch. Verify production release is approved in Play Console. Confirm Day 1 people are ready. Draft all launch day posts if not done.' }
      ]},
      { date: '2026-07-07', dayLabel: 'Tue Jul 7', tasks: [
        { id: 'w7-tue-0', text: 'Final pre-launch checks. Prepare list of all internal/closed testers to message manually on Thursday.' }
      ]},
      { date: '2026-07-08', dayLabel: 'Wed Jul 8', tasks: [
        { id: 'w7-wed-0', text: 'Post TikTok: "Launching tomorrow 🗓 Real-life quest cards for bored summer days — pre-register link in bio." Reply to any comments.' }
      ]},
      { date: '2026-07-09', dayLabel: 'Thu Jul 9', tasks: [
        { id: 'w7-thu-0', text: '✅ LAUNCH DAY — Morning: Manually publish via Managed Publishing in Play Console.' },
        { id: 'w7-thu-1', text: '✅ LAUNCH DAY — Morning: Manually message all internal/closed testers (they will NOT receive the automatic pre-registration notification).' },
        { id: 'w7-thu-2', text: '✅ LAUNCH DAY — Morning: Message Day 1 people: "It\'s live! Use it for a few days, and if you genuinely find it useful an honest review helps a lot." (staggered, not all at once)' },
        { id: 'w7-thu-3', text: '✅ LAUNCH DAY — Afternoon: Post on r/androidapps: "I launched this — real-life quest cards for bored moments. Here\'s what it does: [description + link]"' },
        { id: 'w7-thu-4', text: '✅ LAUNCH DAY — Afternoon: Post TikTok launch video.' },
        { id: 'w7-thu-5', text: '✅ LAUNCH DAY — Evening: Reply to every comment, review, and message.' },
      ]},
      { date: '2026-07-10', dayLabel: 'Fri Jul 10', tasks: [
        { id: 'w7-fri-0', text: 'Monitor reviews. Reply to all. Check pre-registration conversion rate in Play Console. Log Day 1 metrics in dashboard.' }
      ]},
      { date: '2026-07-11', dayLabel: 'Sat Jul 11', tasks: [
        { id: 'w7-sat-0', text: 'Post TikTok: "It\'s live — here\'s a quest for your weekend."' }
      ]},
      { date: '2026-07-12', dayLabel: 'Sun Jul 12', tasks: [
        { id: 'w7-sun-0', text: 'Reply to any reviews or comments. Review first-week metrics. Start pack demand tally.' }
      ]},
    ]
  },
  {
    weekNum: 8, label: 'Week 8 — Jul 13–16', subtitle: 'Backup Release (if July 9 slipped)',
    days: [
      { date: '2026-07-13', dayLabel: 'Mon Jul 13', tasks: [
        { id: 'w8-mon-0', text: 'Backup go/no-go decision for July 16. If July 9 did not happen: confirm what was blocking and whether it is resolved.' }
      ]},
      { date: '2026-07-14', dayLabel: 'Tue Jul 14', tasks: [
        { id: 'w8-tue-0', text: 'Repeat launch prep from July 7–8. Re-confirm Day 1 people.' }
      ]},
      { date: '2026-07-15', dayLabel: 'Wed Jul 15', tasks: [
        { id: 'w8-wed-0', text: 'Final pre-launch TikTok: "Launching tomorrow."' }
      ]},
      { date: '2026-07-16', dayLabel: 'Thu Jul 16', tasks: [
        { id: 'w8-thu-0', text: '🔁 BACKUP RELEASE — July 16. Same launch day plan as July 9.' }
      ]},
    ]
  },
  {
    weekNum: 9, label: 'Post-Launch: Weeks 9+', subtitle: 'Phase 1 — Grow Downloads',
    days: [
      { date: null, dayLabel: 'Monday (recurring)', tasks: [
        { id: 'w9-mon-0', text: 'Choose 5 quests, create Canva posts.' }
      ]},
      { date: null, dayLabel: 'Tuesday (recurring)', tasks: [
        { id: 'w9-tue-0', text: '5–10 personal outreach messages.' }
      ]},
      { date: null, dayLabel: 'Wednesday (recurring)', tasks: [
        { id: 'w9-wed-0', text: 'Post 1 TikTok.' }
      ]},
      { date: null, dayLabel: 'Thursday (recurring)', tasks: [
        { id: 'w9-thu-0', text: 'Post 1 Reddit question only if there is a relevant subreddit not already used. Otherwise reply to existing discussions, collect feedback, or post an extra TikTok / Short.' }
      ]},
      { date: null, dayLabel: 'Friday (recurring)', tasks: [
        { id: 'w9-fri-0', text: 'Review feedback, update quest copy or store listing if needed.' }
      ]},
    ]
  },
];

// App logic added in subsequent tasks
</script>
```

- [ ] **Step 2: Verify the data loads without errors**

Start the server: `node docs/marketing/tracker/server.js`

Open `http://localhost:3000`, open browser DevTools console. Verify:
- No JS errors
- `TASK_DATA.length` in the console returns `10`
- `TASK_DATA[7].days[3].tasks.length` returns `6` (launch day has 6 sub-tasks)

Stop server.

- [ ] **Step 3: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): add complete task data for weeks 0-9"
```

---

## Task 5: Week + Day Rendering

**Files:**
- Modify: `docs/marketing/tracker/index.html` (replace `// App logic added in subsequent tasks` comment with rendering functions)

- [ ] **Step 1: Add rendering functions after the `TASK_DATA` array**

Replace the `// App logic added in subsequent tasks` comment with:

```js
// ── State ─────────────────────────────────────────────────────
let state = { tasks: {}, routine: {}, metrics: {} };

// ── Helpers ───────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function weekProgress(week) {
  let done = 0, total = 0;
  for (const day of week.days) {
    for (const task of day.tasks) {
      total++;
      if (state.tasks[task.id]) done++;
    }
  }
  return { done, total };
}

// ── Rendering ─────────────────────────────────────────────────

function renderWeeks() {
  const today = todayStr();
  document.getElementById('week-list').innerHTML =
    TASK_DATA.map(w => renderWeek(w, today)).join('');
}

function renderWeek(week, today) {
  const datedDays = week.days.filter(d => d.date);
  const firstDate = datedDays.length ? datedDays[0].date : null;
  const lastDate  = datedDays.length ? datedDays[datedDays.length - 1].date : null;

  // Post-launch week (no dates): visible only after Jul 16
  if (!firstDate) {
    const visible = today >= '2026-07-17';
    if (!visible) {
      return `<div class="week week-future">
        <div class="week-header">
          <span class="chevron">▶</span>
          <span class="week-title">${week.label}</span>
          <span class="week-subtitle">${week.subtitle}</span>
          <span class="week-badge">unlocks Jul 17</span>
        </div>
      </div>`;
    }
  }

  const isCurrent = firstDate && today >= firstDate && today <= lastDate;
  const isPast    = firstDate && today > lastDate;
  const isFuture  = firstDate && today < firstDate;

  if (isFuture) {
    return `<div class="week week-future">
      <div class="week-header">
        <span class="chevron">▶</span>
        <span class="week-title">${week.label}</span>
        <span class="week-subtitle">${week.subtitle}</span>
        <span class="week-badge">unlocks ${fmtDate(firstDate)}</span>
      </div>
    </div>`;
  }

  const { done, total } = weekProgress(week);
  const allDone = done === total;
  const expanded = isCurrent || !firstDate; // current week and post-launch are open by default

  return `<div class="week ${isCurrent || !firstDate ? 'week-current' : 'week-past'}" id="week-${week.weekNum}">
    <div class="week-header" onclick="toggleWeek(${week.weekNum})">
      <span class="chevron">${expanded ? '▼' : '▶'}</span>
      <span class="week-title">${week.label}</span>
      <span class="week-subtitle">${week.subtitle}</span>
      <span class="week-badge ${allDone ? 'badge-done' : ''}">${done} / ${total}${allDone ? ' ✓' : ''}</span>
    </div>
    <div class="week-body" id="week-body-${week.weekNum}" style="display:${expanded ? 'block' : 'none'}">
      ${week.days.map(day => renderDay(day, today)).join('')}
    </div>
  </div>`;
}

function renderDay(day, today) {
  const isToday  = day.date === today;
  const isPast   = day.date && day.date < today;
  const isFuture = day.date && day.date > today;
  const noDate   = !day.date;

  let cls = 'day-future';
  if (isToday) cls = 'day-today';
  else if (isPast) cls = 'day-past';
  else if (noDate) cls = 'day-future';

  const allDone = day.tasks.every(t => state.tasks[t.id]);
  const anyDone = day.tasks.some(t => state.tasks[t.id]);

  let badge = '';
  if (isToday) {
    badge = `<span class="day-badge badge-today">▶ Today</span>`;
  } else if (isPast && allDone) {
    badge = `<span class="day-badge badge-done-day">done</span>`;
  } else if (isFuture && anyDone) {
    badge = `<span class="day-badge badge-early">✓ done early</span>`;
  } else if (isFuture) {
    badge = `<span class="day-hint">complete early if ready</span>`;
  }

  const tasks = day.tasks.map(renderTask).join('');

  const metricHtml = renderMetricArea(day, today, isToday, isPast);

  const dayId = day.date || day.dayLabel.replace(/\W+/g, '-');
  return `<div class="day ${cls}" id="day-${dayId}">
    <div class="day-header">
      <span class="day-label">${day.dayLabel.toUpperCase()}</span>
      ${badge}
    </div>
    ${tasks}
    ${metricHtml}
  </div>`;
}

function renderTask(task) {
  const done = !!state.tasks[task.id];
  return `<label class="task${done ? ' done' : ''}">
    <input type="checkbox" id="task-${task.id}" ${done ? 'checked' : ''}
      onchange="onTaskChange('${task.id}', this.checked)">
    <span>${escHtml(task.text)}</span>
  </label>`;
}

function renderMetricArea(day, today, isToday, isPast) {
  if (isToday) {
    const m = state.metrics[today] || {};
    return `<div class="metric-log">
      <label class="metric-field">Pre-reg
        <input type="number" id="metric-prereg" value="${m.preReg != null ? m.preReg : ''}"
          placeholder="0" min="0" onchange="onMetricChange('preReg', this.value)">
      </label>
      <label class="metric-field">TikTok views
        <input type="number" id="metric-tiktok" value="${m.tiktok != null ? m.tiktok : ''}"
          placeholder="0" min="0" onchange="onMetricChange('tiktok', this.value)">
      </label>
      <label class="metric-field">Outreach sent
        <input type="number" id="metric-outreach" value="${m.outreach != null ? m.outreach : ''}"
          placeholder="0" min="0" onchange="onMetricChange('outreach', this.value)">
      </label>
      <label class="metric-field notes-field">Notes
        <input type="text" id="metric-notes" value="${escHtml(m.notes || '')}"
          placeholder="anything to note…" onchange="onMetricChange('notes', this.value)">
      </label>
    </div>`;
  }
  if (isPast && day.date && state.metrics[day.date]) {
    const m = state.metrics[day.date];
    const parts = [];
    if (m.preReg != null && m.preReg !== '') parts.push(`Pre-reg: <strong>${m.preReg}</strong>`);
    if (m.tiktok != null && m.tiktok !== '') parts.push(`TikTok: <strong>${m.tiktok.toLocaleString()}</strong>`);
    if (m.outreach != null && m.outreach !== '') parts.push(`Outreach: <strong>${m.outreach}</strong>`);
    if (m.notes) parts.push(`"${escHtml(m.notes)}"`);
    if (parts.length) return `<div class="metric-readonly">${parts.join(' · ')}</div>`;
  }
  return '';
}

// ── Week accordion toggle ──────────────────────────────────────

function toggleWeek(weekNum) {
  const body = document.getElementById(`week-body-${weekNum}`);
  if (!body) return;
  const chevron = body.previousElementSibling.querySelector('.chevron');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (chevron) chevron.textContent = open ? '▶' : '▼';
}

// ── Badge refresh (called after task change, no full re-render) ─

function updateBadges() {
  const today = todayStr();
  for (const week of TASK_DATA) {
    const badgeEl = document.querySelector(`#week-${week.weekNum} .week-badge`);
    if (!badgeEl) continue;
    const { done, total } = weekProgress(week);
    const allDone = done === total;
    badgeEl.textContent = `${done} / ${total}${allDone ? ' ✓' : ''}`;
    badgeEl.className = 'week-badge' + (allDone ? ' badge-done' : '');

    for (const day of week.days) {
      const dayId = day.date || day.dayLabel.replace(/\W+/g, '-');
      const dayEl = document.getElementById(`day-${dayId}`);
      if (!dayEl) continue;

      const allTasksDone = day.tasks.every(t => state.tasks[t.id]);
      const anyTaskDone  = day.tasks.some(t => state.tasks[t.id]);
      const isToday  = day.date === today;
      const isPast   = day.date && day.date < today;
      const isFuture = day.date && day.date > today;

      // Update day badge
      let badge = '';
      if (isToday) badge = `<span class="day-badge badge-today">▶ Today</span>`;
      else if (isPast && allTasksDone) badge = `<span class="day-badge badge-done-day">done</span>`;
      else if (isFuture && anyTaskDone) badge = `<span class="day-badge badge-early">✓ done early</span>`;
      else if (isFuture) badge = `<span class="day-hint">complete early if ready</span>`;

      const headerEl = dayEl.querySelector('.day-header');
      if (headerEl) {
        const old = headerEl.querySelector('.day-badge, .day-hint');
        if (old) old.remove();
        if (badge) headerEl.insertAdjacentHTML('beforeend', badge);
      }

      // Update task strikethrough
      for (const task of day.tasks) {
        const cb = document.getElementById(`task-${task.id}`);
        if (!cb) continue;
        const label = cb.closest('label');
        if (label) label.className = 'task' + (state.tasks[task.id] ? ' done' : '');
      }
    }
  }
}
```

- [ ] **Step 2: Call `renderWeeks()` on page load — add at the bottom of the `<script>` block, after all function definitions**

Add after all the function definitions, inside the same `<script>` tag:

```js
window.addEventListener('load', () => {
  renderWeeks();
});
```

- [ ] **Step 3: Verify rendering in browser**

Start server: `node docs/marketing/tracker/server.js`

Open `http://localhost:3000`. Verify:
- All weeks appear; current week (the week containing today's date) is expanded and has dark header
- Past weeks are collapsed with muted header
- Future weeks are greyed and non-interactive
- Today's row has amber "▶ Today" badge and amber day label
- Future days within the current week show "complete early if ready" hint
- Ticking any checkbox shows strikethrough on the task text and updates the week badge count
- Clicking a past or future week's header expands/collapses it
- Ticking a future day's checkbox changes its badge to "✓ done early"

Stop server.

- [ ] **Step 4: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): add week/day rendering and task checkboxes"
```

---

## Task 6: State Load / Save

**Files:**
- Modify: `docs/marketing/tracker/index.html` (add `loadState`, `saveState`, `onTaskChange`; update `window.addEventListener('load', ...)`)

- [ ] **Step 1: Add state functions before the `window.addEventListener('load', ...)` line**

Add these functions:

```js
// ── State persistence ──────────────────────────────────────────

async function loadState() {
  try {
    const res = await fetch('/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state = await res.json();
  } catch (e) {
    console.warn('Could not load state:', e.message);
  }
}

let _saveTimer = null;
function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      console.warn('Could not save state:', e.message);
    }
  }, 300);
}

// ── Interactions ───────────────────────────────────────────────

function onTaskChange(id, checked) {
  if (checked) state.tasks[id] = true;
  else delete state.tasks[id];
  saveState();
  updateBadges();
}
```

- [ ] **Step 2: Update the `window.addEventListener` to load state before rendering**

Replace:
```js
window.addEventListener('load', () => {
  renderWeeks();
});
```

With:
```js
window.addEventListener('load', async () => {
  await loadState();
  renderWeeks();
});
```

- [ ] **Step 3: Verify persistence in browser**

Start server: `node docs/marketing/tracker/server.js`

Open `http://localhost:3000`. Tick a task. Reload the page. Verify:
- The ticked task is still checked after reload
- `tracker-data.json` has been created in `docs/marketing/tracker/`
- Its `tasks` object contains the task ID you ticked

Stop server.

- [ ] **Step 4: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): persist task state to tracker-data.json via server"
```

---

## Task 7: Header + Routine Strip

**Files:**
- Modify: `docs/marketing/tracker/index.html` (add `renderHeader`, `applyRoutineState`, `onRoutineChange`; update init)

- [ ] **Step 1: Add header and routine functions before the `window.addEventListener` line**

```js
// ── Header ────────────────────────────────────────────────────

function renderHeader() {
  const now = new Date();
  const phase = getPhase(now);
  const tminus = getTMinus(now);

  document.getElementById('header-phase').textContent = phase;

  let tLabel;
  if (tminus > 0)      tLabel = `T−${tminus} days`;
  else if (tminus === 0) tLabel = '🚀 Launch Day!';
  else                 tLabel = `T+${Math.abs(tminus)} days`;
  document.getElementById('header-tminus').textContent = tLabel;

  const today = todayStr();
  const preRegLabel = document.getElementById('routine-prereg-label');
  if (preRegLabel) {
    preRegLabel.textContent = today < '2026-06-01'
      ? 'Check launch prep checklist'
      : 'Check pre-reg count';
  }
}

// ── Routine strip ──────────────────────────────────────────────

function applyRoutineState() {
  const today = todayStr();
  const r = state.routine[today] || {};
  document.getElementById('routine-prereg').checked  = !!r.preReg;
  document.getElementById('routine-replies').checked = !!r.replies;
  document.getElementById('routine-task').checked    = !!r.task;
}

function onRoutineChange(field, checked) {
  const today = todayStr();
  if (!state.routine[today]) state.routine[today] = {};
  state.routine[today][field] = checked;
  saveState();
}
```

- [ ] **Step 2: Update init to call renderHeader and applyRoutineState**

Replace:
```js
window.addEventListener('load', async () => {
  await loadState();
  renderWeeks();
});
```

With:
```js
window.addEventListener('load', async () => {
  renderHeader();
  await loadState();
  renderWeeks();
  applyRoutineState();
});
```

- [ ] **Step 3: Verify in browser**

Start server. Open `http://localhost:3000`. Verify:
- Header phase badge shows correct phase for today (e.g. "Store & App Preparation" if before Jun 1)
- T-minus shows a positive number (days until July 9) or "🚀 Launch Day!" if today is July 9
- Before June 1: first routine checkbox says "Check launch prep checklist"
- On or after June 1: first routine checkbox says "Check pre-reg count"
- Ticking a routine checkbox persists across page reloads

Stop server.

- [ ] **Step 4: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): add phase-aware header and routine strip"
```

---

## Task 8: Metric Log + History Table

**Files:**
- Modify: `docs/marketing/tracker/index.html` (add `onMetricChange`, `renderHistoryTable`, `toggleHistory`; update init)

- [ ] **Step 1: Add metric and history functions before the `window.addEventListener` line**

```js
// ── Metric log ────────────────────────────────────────────────

function onMetricChange(field, value) {
  const today = todayStr();
  if (!state.metrics[today]) state.metrics[today] = {};
  state.metrics[today][field] = field === 'notes'
    ? value
    : (value === '' ? null : Number(value));
  saveState();
  renderHistoryTable();
}

// ── History table ─────────────────────────────────────────────

function renderHistoryTable() {
  const tbody = document.getElementById('history-tbody');
  const entries = Object.entries(state.metrics)
    .filter(([, m]) => m && (
      (m.preReg != null && m.preReg !== '') ||
      (m.tiktok != null && m.tiktok !== '') ||
      (m.outreach != null && m.outreach !== '') ||
      m.notes
    ))
    .sort((a, b) => b[0].localeCompare(a[0]));

  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:16px">No metrics logged yet</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(([date, m]) => {
    const label = fmtDate(date);
    const preReg   = m.preReg   != null && m.preReg   !== '' ? m.preReg                    : '—';
    const tiktok   = m.tiktok   != null && m.tiktok   !== '' ? Number(m.tiktok).toLocaleString() : '—';
    const outreach = m.outreach != null && m.outreach !== '' ? m.outreach                  : '—';
    const notes    = m.notes ? escHtml(m.notes) : '—';
    return `<tr>
      <td>${label}</td>
      <td>${preReg}</td>
      <td>${tiktok}</td>
      <td>${outreach}</td>
      <td>${notes}</td>
    </tr>`;
  }).join('');
}

function toggleHistory() {
  const wrap = document.getElementById('history-table-wrap');
  const btn  = document.getElementById('toggle-history');
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : 'block';
  btn.textContent = (open ? '▼' : '▲') + '  Metrics history';
}
```

- [ ] **Step 2: Update init to call renderHistoryTable**

Replace:
```js
window.addEventListener('load', async () => {
  renderHeader();
  await loadState();
  renderWeeks();
  applyRoutineState();
});
```

With:
```js
window.addEventListener('load', async () => {
  renderHeader();
  await loadState();
  renderWeeks();
  applyRoutineState();
  renderHistoryTable();
});
```

- [ ] **Step 3: Verify metric log in browser**

Start server. Open `http://localhost:3000`. Find today's row. Verify:
- Four input fields appear: Pre-reg, TikTok views, Outreach sent, Notes
- Entering a number and tabbing away saves it (check `tracker-data.json`)
- Reload: values persist
- Click "▼ Metrics history" button at bottom: table expands showing the logged row
- Logged row shows correct values; pre-reg shows as a number, TikTok views formatted with comma separator

Stop server.

- [ ] **Step 4: Verify past-day read-only metrics**

In `tracker-data.json`, manually add an entry for a past date (any date before today) with test values:
```json
"metrics": {
  "2026-05-18": { "preReg": 3, "tiktok": 500, "outreach": 2, "notes": "test entry" }
}
```

Start server, open tracker. Expand Week 0. Find May 18 row. Verify:
- A read-only summary line appears: `Pre-reg: 3 · TikTok: 500 · Outreach: 2 · "test entry"`
- It is not editable

Remove the test entry from `tracker-data.json` and stop server.

- [ ] **Step 5: Commit**

```bash
git add docs/marketing/tracker/index.html
git commit -m "feat(tracker): add metric log, history table, and toggle"
```

---

## Task 9: Final Verification + Gitignore

**Files:**
- Modify: `.gitignore` (add tracker data file entry)

- [ ] **Step 1: Decide whether to gitignore tracker-data.json**

If you do NOT want daily state in git history, add this line to `.gitignore`:

```
docs/marketing/tracker/tracker-data.json
```

If you DO want it committed (as a backup), skip this step.

- [ ] **Step 2: Full end-to-end verification**

Start server: `node docs/marketing/tracker/server.js`

Open `http://localhost:3000`. Work through this checklist:

- [ ] Header shows correct phase and T-minus countdown
- [ ] Current week is expanded; today's row has amber highlight and "▶ Today" badge
- [ ] Tick a task in today's row → badge count updates, strikethrough appears
- [ ] Tick a task in a future day → "✓ done early" badge appears on that day
- [ ] Tick all tasks in today → week badge turns green with "✓"
- [ ] Tick the routine checkboxes → they stay checked after page reload
- [ ] Enter pre-reg, TikTok views, outreach, and notes in today's metric log → values persist after reload
- [ ] Click "▼ Metrics history" → table expands with logged row, sorted newest first
- [ ] Expand a past week → collapsed weeks expand/collapse correctly
- [ ] Future weeks are greyed and clicking their headers does nothing

Stop server.

- [ ] **Step 3: Run all tests one final time**

```bash
node docs/marketing/tracker/test-utils.js
node docs/marketing/tracker/test-server.js
```

Both should complete with all tests passing.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "feat(tracker): complete launch tracker with full persistence and metrics"
```

---

## Summary

After all 9 tasks are complete:

```
docs/marketing/tracker/
  server.js          ← run with: node docs/marketing/tracker/server.js
  utils.js           ← phase detection, T-minus, date helpers
  index.html         ← full Adventurer's Log UI
  test-server.js     ← run with: node docs/marketing/tracker/test-server.js
  test-utils.js      ← run with: node docs/marketing/tracker/test-utils.js
  tracker-data.json  ← auto-created; optionally gitignored
```

Daily usage: open a terminal, run `node docs/marketing/tracker/server.js`, open `http://localhost:3000`, use the tracker, close the terminal.
