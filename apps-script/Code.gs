// ============================================================
//  RK Health · Patient Reminder Assistant
//  Google Apps Script Backend  ·  Code.gs  ·  All 3 Phases
//
//  HOW TO DEPLOY:
//  1. Paste this entire file into Apps Script editor
//  2. Fill in your keys below (GROK_API_KEY, TWILIO_*)
//  3. Deploy → New Deployment → Web App
//     Execute as: Me  |  Who has access: Anyone
//  4. Copy the Web App URL → paste into the app on first launch
// ============================================================

const GROK_API_KEY  = "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";   // xai-...  Get from: https://console.x.ai/
const TWILIO_SID    = "AC5d33ba020d91b8510f0cfbf5539608c9";   // ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const TWILIO_TOKEN  = "02cef07f69ccc595855e80c66cd8fa0a";   // your auth token
const TWILIO_FROM   = "+17624383957";   // +1XXXXXXXXXX

const SHEET_NAME = "Logs";

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "getLogs";
  let result;
  try {
    if      (action === "getLogs")  result = getLogs(e);
    else if (action === "getStats") result = getStats();
    else result = { status: "error", message: "Unknown action" };
  } catch(err) { result = { status: "error", message: err.toString() }; }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonOut({ status: "error", message: "Invalid JSON" }); }
  const action = data.action || "addLog";
  let result;
  try {
    if      (action === "addLog")          result = addLog(data);
    else if (action === "updateLog")       result = updateLog(data);
    else if (action === "deleteLog")       result = deleteLog(data);
    else if (action === "generateSummary") result = generateSummary(data);
    else if (action === "sendSMS")         result = sendSMS(data);
    else result = { status: "error", message: "Unknown action" };
  } catch(err) { result = { status: "error", message: err.toString() }; }
  return jsonOut(result);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id","timestamp","type","patientName","date","time","title","notes","status","doctorName","dosage","phone","summary","reminderSent"]);
  }
  return sheet;
}

function addLog(data) {
  const sheet = getSheet();
  const id = "LOG-" + Date.now();
  const ts = new Date().toISOString();
  sheet.appendRow([id, ts, data.type||"", data.patientName||"", data.date||"", data.time||"", data.title||"", data.notes||"", data.status||"pending", data.doctorName||"", data.dosage||"", data.phone||"", "", "no"]);
  return { status: "success", id: id, timestamp: ts };
}

function getLogs(e) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { status: "success", data: [] };
  const headers = values[0];
  const logs = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[i][idx] !== undefined ? String(values[i][idx]) : ""; });
    logs.push(obj);
  }
  let filtered = logs;
  if (e && e.parameter) {
    if (e.parameter.type)   filtered = filtered.filter(l => l.type === e.parameter.type);
    if (e.parameter.status) filtered = filtered.filter(l => l.status === e.parameter.status);
  }
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { status: "success", data: filtered };
}

function getStats() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  let total=0, appointments=0, medications=0, completed=0, pending=0, missed=0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    total++;
    if (r[2]==="appointment") appointments++;
    if (r[2]==="medication")  medications++;
    if (r[8]==="completed")   completed++;
    if (r[8]==="pending")     pending++;
    if (r[8]==="missed")      missed++;
  }
  return { status: "success", stats: { total, appointments, medications, completed, pending, missed } };
}

function updateLog(data) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== String(data.id)) continue;
    const setCol = (name, val) => {
      const c = headers.indexOf(name) + 1;
      if (c > 0) sheet.getRange(i+1, c).setValue(val);
    };
    if (data.status      !== undefined) setCol("status", data.status);
    if (data.summary     !== undefined) setCol("summary", data.summary);
    if (data.reminderSent!== undefined) setCol("reminderSent", data.reminderSent);
    return { status: "success", updated: data.id };
  }
  return { status: "error", message: "Not found: " + data.id };
}

function deleteLog(data) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.id)) {
      sheet.deleteRow(i+1);
      return { status: "success", deleted: data.id };
    }
  }
  return { status: "error", message: "Not found: " + data.id };
}

// ============================================================
//  PHASE 3 — AI VISIT SUMMARY via Grok (xAI)
//  Endpoint : https://api.x.ai/v1/chat/completions
//  Model    : grok-3-mini  (fast + cheap, great for summaries)
//  Docs     : https://docs.x.ai/docs/overview
// ============================================================
function generateSummary(data) {
  if (!GROK_API_KEY) {
    return { status: "error", message: "Grok API key not set. Add your xai-... key to GROK_API_KEY in Code.gs, then redeploy." };
  }

  const prompt =
    "You are a medical documentation assistant. Generate a clear, patient-friendly visit summary.\n\n" +
    "Patient: "  + (data.patientName || "N/A") + "\n" +
    "Doctor: "   + (data.doctorName  || "N/A") + "\n" +
    "Date: "     + (data.date        || "N/A") + "\n" +
    "Purpose: "  + (data.title       || "N/A") + "\n" +
    "Notes: "    + (data.notes       || "N/A") + "\n\n" +
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
      model: "grok-3-mini",          // or "grok-3" for max quality
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.7
    }),
    muteHttpExceptions: true
  });

  const json = JSON.parse(resp.getContentText());

  // Handle xAI error response
  if (json.error) {
    return { status: "error", message: "Grok error: " + (json.error.message || JSON.stringify(json.error)) };
  }
  if (!json.choices || !json.choices[0]) {
    return { status: "error", message: "Unexpected Grok response: " + resp.getContentText().slice(0, 200) };
  }

  const summary = json.choices[0].message.content.trim();

  // Save summary back to the Sheet
  if (data.id) updateLog({ id: data.id, summary: summary });

  return { status: "success", summary: summary };
}

// ============================================================
//  PHASE 3 — SMS REMINDER via Twilio
// ============================================================
function sendSMS(data) {
  if (!TWILIO_SID||!TWILIO_TOKEN||!TWILIO_FROM) {
    return { status: "error", message: "Twilio credentials not set in Code.gs" };
  }
  if (!data.phone) return { status: "error", message: "No phone number provided" };

  const msg = "RK Health: Appointment \"" + data.title + "\" on " + data.date +
              " at " + (data.time||"--:--") + ". Dr. " + (data.doctorName||"N/A") +
              ". Have your reports ready!";

  const resp = UrlFetchApp.fetch(
    "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_SID + "/Messages.json", {
    method: "post",
    headers: { "Authorization": "Basic " + Utilities.base64Encode(TWILIO_SID+":"+TWILIO_TOKEN) },
    payload: { From: TWILIO_FROM, To: data.phone, Body: msg },
    muteHttpExceptions: true
  });

  const json = JSON.parse(resp.getContentText());
  if (json.error_code) return { status: "error", message: json.message };
  if (data.id) updateLog({ id: data.id, reminderSent: "yes" });
  return { status: "success", sid: json.sid };
}