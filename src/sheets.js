// ============================================================
//  sheets.js  ·  All Google Sheets / Apps Script API calls
//  Replace SCRIPT_URL with your deployed Web App URL
// ============================================================

const SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
// Example: "https://script.google.com/macros/s/AKfy.../exec"

// ---------- ADD A LOG ENTRY ----------
async function addLog(entry) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addLog", ...entry })
  });
  return res.json();
}

// ---------- FETCH ALL LOGS ----------
async function getLogs(typeFilter = "") {
  const url = typeFilter
    ? `${SCRIPT_URL}?action=getLogs&type=${typeFilter}`
    : `${SCRIPT_URL}?action=getLogs`;

  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

// ---------- FETCH STATS SUMMARY ----------
async function getStats() {
  const res = await fetch(`${SCRIPT_URL}?action=getStats`);
  const json = await res.json();
  return json.stats || {};
}

// ---------- UPDATE STATUS ----------
async function updateStatus(id, status) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateLog", id, status })
  });
  return res.json();
}

// ---------- DELETE LOG ----------
async function deleteLog(id) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteLog", id })
  });
  return res.json();
}

// ---------- EXPORT LOGS AS CSV ----------
function downloadCSV(logs) {
  const headers = ["id","timestamp","type","patientName","date","time","title","notes","status","doctorName","dosage"];
  const rows = logs.map(l => headers.map(h => `"${(l[h]||"").replace(/"/g,'""')}"`).join(","));
  const csv  = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `health-logs-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- GENERATE GOOGLE CALENDAR LINK ----------
function makeGCalLink({ title, date, time, notes, doctorName }) {
  // date = "2026-06-15", time = "10:30"
  const dt    = new Date(`${date}T${time || "09:00"}:00`);
  const end   = new Date(dt.getTime() + 60 * 60 * 1000); // +1 hour

  const fmt   = d => d.toISOString().replace(/[-:]/g,"").slice(0,15) + "Z";
  const desc  = encodeURIComponent(`Doctor: ${doctorName || "N/A"}\nNotes: ${notes || "—"}`);
  const ttl   = encodeURIComponent(title || "Doctor Appointment");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${ttl}&dates=${fmt(dt)}/${fmt(end)}&details=${desc}`;
}
