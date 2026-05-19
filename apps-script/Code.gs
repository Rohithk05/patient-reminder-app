// ============================================================
//  RK Health · Patient Reminder Assistant
//  Google Apps Script Backend · Code.gs · All 3 Phases
//
//  KEY DESIGN: Everything goes through doGet() using URL params.
//  This completely avoids CORS preflight issues from GitHub Pages.
//  No POST requests from the frontend at all.
//
//  DEPLOY:
//  1. Paste into Apps Script editor (Extensions → Apps Script)
//  2. Fill GROK_API_KEY and Twilio keys if needed
//  3. Deploy → New Deployment → Web App
//     Execute as: Me  |  Who has access: Anyone
//  4. The URL is already hardcoded in index.html — done!
// ============================================================

const GROK_API_KEY = "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";   // xai-...  from https://console.x.ai/
const TWILIO_SID   = "AC5d33ba020d91b8510f0cfbf5539608c9";   // ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const TWILIO_TOKEN = "4a118869ca37971914839566bfdfb735";   // your Twilio auth token
const TWILIO_FROM  = "+17624383957";   // +1XXXXXXXXXX  your Twilio number

const SHEET_NAME = "Logs";
const HEADERS    = ["id","timestamp","type","patientName","date","time",
                    "title","notes","status","doctorName","dosage",
                    "phone","summary","reminderSent"];

// ── ALL requests come through doGet ──────────────────────────
function doGet(e) {
  const p      = (e && e.parameter) ? e.parameter : {};
  const action = p.action || "getLogs";
  let result;
  try {
    switch(action) {
      case "getLogs":         result = getLogs(p);           break;
      case "getStats":        result = getStats();           break;
      case "addLog":          result = addLog(p);            break;
      case "updateLog":       result = updateLog(p);         break;
      case "deleteLog":       result = deleteLog(p);         break;
      case "generateSummary": result = generateSummary(p);  break;
      case "sendSMS":         result = sendSMS(p);           break;
      default: result = { status:"error", message:"Unknown action: "+action };
    }
  } catch(err) {
    result = { status:"error", message: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helper — auto-creates sheet + headers if missing ───
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── ADD LOG ──────────────────────────────────────────────────
function addLog(p) {
  const sheet = getSheet();
  const id    = "LOG-" + Date.now();
  const ts    = new Date().toISOString();

  // p.date comes as YYYY-MM-DD from input[type=date] — store as-is
  sheet.appendRow([
    id,
    ts,
    p.type        || "",
    p.patientName || "",
    p.date        || "",   // stored as plain YYYY-MM-DD string
    p.time        || "",
    p.title       || "",
    p.notes       || "",
    p.status      || "pending",
    p.doctorName  || "",
    p.dosage      || "",
    p.phone       || "",
    "",                    // summary (filled by generateSummary)
    "no"                   // reminderSent
  ]);

  return { status:"success", id:id, timestamp:ts };
}

// ── GET LOGS ─────────────────────────────────────────────────
function getLogs(p) {
  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { status:"success", data:[] };

  const headers = values[0];
  const logs = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      // Convert to plain string — avoids Date objects from Sheets
      const raw = row[idx];
      if (raw instanceof Date) {
        // Format as YYYY-MM-DD for date columns, HH:MM for time columns
        if (h === "date") {
          obj[h] = Utilities.formatDate(raw, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else if (h === "time") {
          obj[h] = Utilities.formatDate(raw, Session.getScriptTimeZone(), "HH:mm");
        } else {
          obj[h] = raw.toISOString();
        }
      } else {
        obj[h] = raw !== undefined && raw !== null ? String(raw) : "";
      }
    });
    logs.push(obj);
  }

  // Apply filters
  let filtered = logs;
  if (p.type)   filtered = filtered.filter(l => l.type   === p.type);
  if (p.status) filtered = filtered.filter(l => l.status === p.status);

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { status:"success", data:filtered };
}

// ── GET STATS ─────────────────────────────────────────────────
function getStats() {
  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();
  let total=0, appointments=0, medications=0, completed=0, pending=0, missed=0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    total++;
    if (String(r[2])==="appointment") appointments++;
    if (String(r[2])==="medication")  medications++;
    if (String(r[8])==="completed")   completed++;
    if (String(r[8])==="pending")     pending++;
    if (String(r[8])==="missed")      missed++;
  }
  return { status:"success", stats:{ total, appointments, medications, completed, pending, missed } };
}

// ── UPDATE LOG ────────────────────────────────────────────────
function updateLog(p) {
  if (!p.id) return { status:"error", message:"No id provided" };
  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== String(p.id)) continue;

    const setCol = (name, val) => {
      const c = headers.indexOf(name);
      if (c >= 0) sheet.getRange(i+1, c+1).setValue(val);
    };

    if (p.status       !== undefined) setCol("status",       p.status);
    if (p.summary      !== undefined) setCol("summary",      p.summary);
    if (p.reminderSent !== undefined) setCol("reminderSent", p.reminderSent);

    return { status:"success", updated:p.id };
  }
  return { status:"error", message:"Log not found: " + p.id };
}

// ── DELETE LOG ────────────────────────────────────────────────
function deleteLog(p) {
  if (!p.id) return { status:"error", message:"No id provided" };
  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(p.id)) {
      sheet.deleteRow(i+1);
      return { status:"success", deleted:p.id };
    }
  }
  return { status:"error", message:"Log not found: " + p.id };
}

// ── AI SUMMARY via Grok ───────────────────────────────────────
function generateSummary(p) {
  if (!GROK_API_KEY) {
    return { status:"error", message:"Grok API key not set. Add your xai-... key to GROK_API_KEY in Code.gs, then redeploy." };
  }

  const prompt =
    "You are a medical documentation assistant. Generate a clear, patient-friendly visit summary.\n\n" +
    "Patient: "  + (p.patientName || "N/A") + "\n" +
    "Doctor: "   + (p.doctorName  || "N/A") + "\n" +
    "Date: "     + (p.date        || "N/A") + "\n" +
    "Purpose: "  + (p.title       || "N/A") + "\n" +
    "Notes: "    + (p.notes       || "N/A") + "\n\n" +
    "Write a structured summary with:\n" +
    "1. Visit Overview\n" +
    "2. Key Discussion Points\n" +
    "3. Next Steps / Follow-up\n" +
    "4. Medication Notes (if any)\n\n" +
    "Be concise and warm.";

  const resp = UrlFetchApp.fetch("https://api.x.ai/v1/chat/completions", {
    method: "post",
    headers: {
      "Authorization": "Bearer " + GROK_API_KEY,
      "Content-Type":  "application/json"
    },
    payload: JSON.stringify({
      model:       "grok-3-mini",
      messages:    [{ role:"user", content:prompt }],
      max_tokens:  600,
      temperature: 0.7
    }),
    muteHttpExceptions: true
  });

  const json = JSON.parse(resp.getContentText());
  if (json.error) return { status:"error", message:"Grok error: " + (json.error.message || JSON.stringify(json.error)) };
  if (!json.choices || !json.choices[0]) return { status:"error", message:"Unexpected Grok response" };

  const summary = json.choices[0].message.content.trim();
  if (p.id) updateLog({ id:p.id, summary:summary });
  return { status:"success", summary:summary };
}

// ── SMS REMINDER via Twilio ───────────────────────────────────
function sendSMS(p) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { status:"error", message:"Twilio credentials not set in Code.gs" };
  }
  if (!p.phone) return { status:"error", message:"No phone number provided" };

  const msg = "RK Health Reminder: \"" + (p.title||"Appointment") + "\" on " + (p.date||"--") +
              " at " + (p.time||"--:--") + ". Dr. " + (p.doctorName||"N/A") + ". Carry your reports!";

  const resp = UrlFetchApp.fetch(
    "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_SID + "/Messages.json", {
    method: "post",
    headers: { "Authorization":"Basic " + Utilities.base64Encode(TWILIO_SID+":"+TWILIO_TOKEN) },
    payload: { From:TWILIO_FROM, To:p.phone, Body:msg },
    muteHttpExceptions: true
  });

  const json = JSON.parse(resp.getContentText());
  if (json.error_code) return { status:"error", message:json.message };
  if (p.id) updateLog({ id:p.id, reminderSent:"yes" });
  return { status:"success", sid:json.sid };
}
