# Patient Appointment & Medication Reminder Assistant
## Master Plan · GitHub Pages + Google Sheets

**Assignee:** Rohith Karthikeya  
**Assigned by:** Vishnu Vardhan  
**Date:** 18 May 2026  
**Stack:** Vanilla HTML/CSS/JS → GitHub Pages · Google Sheets (via Apps Script)

---

## Assumptions Made

1. **No real backend** — Google Apps Script acts as the serverless middleware.
2. **No real authentication** — a passphrase-based lock screen is the MVP "access control."
3. **WhatsApp/SMS (Twilio) and OpenAI API** are Phase 3 stretch goals that require a paid account; MVP skips them.
4. **Framework:** Plain JS (no React) — easiest for GitHub Pages deployment, no build step needed.
5. **Google Sheets** stores all data; Google Calendar integration uses the GCal link-trick (not full OAuth) for MVP; full OAuth is Phase 3.
6. **Students (B.Com/BBA)** are the target — UI must be clean, not technical. Mobile-friendly is required.

---

## MVP Scope (Phase 1) — 2 Weeks

These four features ship first:

| # | Feature | Description |
|---|---------|-------------|
| 1 | Dashboard | Health compliance overview: upcoming appointments, medication schedule |
| 2 | Log Form | Add appointment or medication entry → saves to Google Sheets |
| 3 | View & Search | Read all logs from Sheets, filter by date/type/status |
| 4 | Passphrase Lock | Simple PIN/passphrase gating before the app loads |

**Success Criteria (Phase 1):**
- A new entry submitted on mobile appears in Google Sheets within 3 seconds.
- All logs load and render within 2 seconds on a 4G connection.
- 0 CORS errors from the Apps Script Web App endpoint.
- App passes Lighthouse accessibility score ≥ 80.

---

## Phased Roadmap

### Phase 1 — Core MVP (Weeks 1–2)
- [x] Project scaffold + GitHub Pages deployment
- [x] Google Sheets log sheet + Apps Script Web App
- [x] Dashboard UI with health compliance summary
- [x] Add-Entry form (Appointment / Medication)
- [x] View/Search/Filter logs
- [x] Passphrase lock screen

### Phase 2 — Calendar & UX Polish (Weeks 3–4)
- [ ] Google Calendar link-trick ("Add to Calendar" button per appointment)
- [ ] Status update (mark medication as taken / appointment as completed)
- [ ] Prescription upload UI (stores file URL/notes in Sheets)
- [ ] Export data as CSV download
- [ ] Toast notifications + loading skeletons
- [ ] PWA manifest + offline splash screen

### Phase 3 — AI & Integrations (Weeks 5–6, needs paid APIs)
- [ ] ChatGPT visit summary generator (OpenAI API key required)
- [ ] Twilio SMS/WhatsApp reminder integration
- [ ] Full Google OAuth 2.0 + Calendar API write access
- [ ] PDF health report export
- [ ] Doctor Visit Summary modal

---

## Directory Structure

```
patient-reminder-app/
├── index.html              ← Single-page app shell
├── style.css               ← Design system + component styles
├── app.js                  ← Main JS: routing, state, event handlers
├── sheets.js               ← All Google Sheets / Apps Script API calls
├── ui.js                   ← DOM rendering helpers
├── manifest.json           ← PWA manifest
├── icons/
│   └── icon-192.png        ← App icon
├── docs/
│   └── MASTER_PLAN.md      ← This file
├── apps-script/
│   └── Code.gs             ← Paste into Google Apps Script editor
└── .github/
    └── workflows/
        └── deploy.yml      ← GitHub Actions → GitHub Pages
```

---

## Google Sheets Setup (Step-by-Step)

### Step 1 — Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → New spreadsheet
2. Rename it: **PatientReminderLogs**
3. Sheet 1 name: **Logs** — set these exact column headers in Row 1:

```
A: id | B: timestamp | C: type | D: patientName | E: date
F: time | G: title | H: notes | I: status | J: doctorName | K: dosage
```

### Step 2 — Open Apps Script

1. In your Sheet → **Extensions → Apps Script**
2. Delete the default `myFunction()` code
3. Paste the full contents of `apps-script/Code.gs` (provided below)
4. Click **Save** (disk icon)

### Step 3 — Deploy as Web App

1. Click **Deploy → New Deployment**
2. Click the gear icon → **Web app**
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone (so your GitHub Pages site can call it)
4. Click **Deploy**
5. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```
6. Paste this URL into `sheets.js` as `SCRIPT_URL`

### Step 4 — CORS Note

Apps Script automatically adds CORS headers when deployed as "Anyone" access.
You do **not** need to set `mode: 'no-cors'` — use plain `fetch()`.
If you see CORS errors, redeploy the script (create a **new deployment**, not "manage existing").

---

## GitHub Pages Deployment

### Step 1 — Create Repository

```bash
git init
git add .
git commit -m "Initial commit: Patient Reminder App"
gh repo create patient-reminder-app --public --push
```

### Step 2 — Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings → Pages**
3. Source: **Deploy from a branch** → branch: `main` → folder: `/ (root)`
4. Save. Your app will be live at: `https://yourusername.github.io/patient-reminder-app`

### Step 3 — GitHub Actions (Auto-deploy on push)

The file `.github/workflows/deploy.yml` is pre-configured. Every push to `main`
auto-deploys. No build step needed — pure static files.

---

## Design System

### Colors
```css
--primary:     #0EA5E9   /* Sky blue — trust, medical */
--primary-dk:  #0284C7   /* Hover states */
--accent:      #10B981   /* Green — success, taken */
--warn:        #F59E0B   /* Amber — upcoming, pending */
--danger:      #EF4444   /* Red — missed, urgent */
--bg:          #F8FAFC   /* Page background */
--surface:     #FFFFFF   /* Cards */
--border:      #E2E8F0   /* Subtle borders */
--text-1:      #0F172A   /* Headings */
--text-2:      #475569   /* Body */
--text-3:      #94A3B8   /* Muted/labels */
```

### Typography
- Headings: `Nunito` (Google Fonts) — friendly, readable
- Body: `Inter` — clean, medical feel
- Monospace: `JetBrains Mono` — IDs, timestamps

### Components
- Cards: `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Buttons: `border-radius: 10px`, min height 44px (touch-friendly)
- Inputs: `border-radius: 10px`, `border: 1.5px solid var(--border)`
- Status badges: pill shape, colored bg with matching text

### Accessibility
- All form inputs have `<label>` elements
- Color is never the only indicator (icons + text accompany color)
- Focus rings on all interactive elements
- ARIA roles: `role="main"`, `role="navigation"`, `aria-live` on log list

---

## Data Flow Diagram

```
User fills form (index.html)
        ↓
  sheets.js: fetch POST to Apps Script URL
        ↓
  Apps Script (Code.gs): validates & appends row to Sheets
        ↓
  Response: { status: "success", id: "LOG-001" }
        ↓
  ui.js: shows toast, re-fetches and re-renders log list

User opens View tab
        ↓
  sheets.js: fetch GET to Apps Script URL
        ↓
  Apps Script: reads all rows, returns JSON array
        ↓
  ui.js: renders filterable table / card list
```

---

## Security Notes

- The Apps Script URL is public — anyone with the URL can write to your Sheet.
- The passphrase lock is **client-side only** — it deters casual access, not determined attackers.
- For real security in Phase 3, switch to Google OAuth 2.0.
- Never commit an OpenAI API key or Twilio credentials to GitHub — use GitHub Secrets + a proxy.
- Set `SHEET_ID` inside Apps Script (server-side), not in the frontend JS.
