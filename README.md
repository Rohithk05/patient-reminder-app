# 🏥 RK Health — Patient Appointment & Medication Reminder Assistant

**Assignee:** Rohith Karthikeya · **Stack:** HTML / CSS / JS + Google Sheets

---

## ⚡ Quick Start (5 Steps)

### Step 1 — Clone & open locally
```bash
git clone https://github.com/YOUR_USERNAME/patient-reminder-app.git
cd patient-reminder-app
# Open index.html in a browser — works locally without a server
```

### Step 2 — Set up Google Sheet
1. Create a new Google Sheet named **PatientReminderLogs**
2. Rename Sheet 1 → **Logs**
3. Add these headers in Row 1, exactly:
   ```
   id | timestamp | type | patientName | date | time | title | notes | status | doctorName | dosage
   ```

### Step 3 — Deploy Apps Script
1. Open your Sheet → **Extensions → Apps Script**
2. Paste the full contents of `apps-script/Code.gs`
3. **Deploy → New Deployment → Web App**
4. Set: Execute as **Me**, Who has access: **Anyone**
5. Copy the Web App URL

### Step 4 — Connect the URL
In `index.html`, find this line near the bottom and replace it:
```js
const SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
```
with your actual URL, e.g.:
```js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfy.../exec";
```

Also change the passphrase (optional):
```js
const PASSPHRASE = "health2026";  // ← change this
```

### Step 5 — Deploy to GitHub Pages
```bash
git add .
git commit -m "Add Apps Script URL"
git push origin main
# → GitHub Actions auto-deploys
# → Live at: https://YOUR_USERNAME.github.io/patient-reminder-app
```

---

## 📁 File Structure

```
patient-reminder-app/
├── index.html          ← Entire frontend (lock screen + dashboard + forms)
├── style.css           ← Full design system
├── manifest.json       ← PWA config
├── apps-script/
│   └── Code.gs         ← Paste into Apps Script editor
├── docs/
│   └── MASTER_PLAN.md  ← Full phased plan + architecture notes
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto-deploy on push to main
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error on fetch | Redeploy Apps Script as a **new** deployment (not "manage existing") |
| Data not showing | Check browser console; verify SCRIPT_URL is pasted correctly |
| "Script URL" in console | You forgot to replace `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` |
| GitHub Pages not updating | Check Actions tab → workflow should show green ✅ |
| Mobile layout broken | Clear browser cache, hard-refresh |

---

## 🚀 Phase Roadmap

- **Phase 1 (Now):** Dashboard · Add Entry · View/Search · Passphrase lock
- **Phase 2 (Next):** Google Calendar links · Status updates · CSV export · PWA
- **Phase 3 (Stretch):** ChatGPT visit summaries · Twilio SMS · Full OAuth

---

## 🛡️ Security Note

The passphrase is client-side only — it deters casual access but is not cryptographically secure.
For production, implement Google OAuth 2.0 in Phase 3.
Never commit API keys (OpenAI, Twilio) to GitHub — use GitHub Secrets + a proxy.

---

*Built by Rohith Karthikeya · JNTUH R22 · Samskruti College of Engineering*
