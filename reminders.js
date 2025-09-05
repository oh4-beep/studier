// ======= REMINDERS & NOTIFICATIONS =======
let NOTIFY_OK = "unknown";

async function requestNotifyPermission(){
  if (!("Notification" in window)) { NOTIFY_OK = "unsupported"; updateNotifyStatus(); return; }
  if (Notification.permission === "granted"){ NOTIFY_OK = "granted"; updateNotifyStatus(); return; }
  if (Notification.permission === "denied"){ NOTIFY_OK = "denied"; updateNotifyStatus(); return; }
  const p = await Notification.requestPermission();
  NOTIFY_OK = p; updateNotifyStatus();
}

function updateNotifyStatus(){
  const el = document.getElementById("notifyStatus");
  if (el) el.textContent = "Status: " + NOTIFY_OK;
}

function scheduleOneReminder({text, whenISO, id}){
  // local scheduling (in-memory). Survives tab lifetime; persists in data but timers don't.
  const delay = new Date(whenISO) - new Date();
  if (delay <= 0) return; // past
  setTimeout(()=> {
    if (NOTIFY_OK === "granted") new Notification(text);
    else alert("Reminder: " + text);
  }, delay);
}

function bootScheduleExisting(){
  currentYear().reminders.filter(r=>r.enabled).forEach(r=>{
    scheduleOneReminder(r);
  });
}

function renderReminders(){
  const ul = document.getElementById("reminderList");
  const rs = [...currentYear().reminders].sort((a,b)=> new Date(a.whenISO) - new Date(b.whenISO));
  ul.innerHTML = rs.map(r=>`
    <li class="row-between" data-id="${r.id}">
      <div>
        <div><b>${r.text}</b></div>
        <div class="muted">${new Date(r.whenISO).toLocaleString()}</div>
      </div>
      <div class="row">
        <label class="muted">Enabled <input type="checkbox" data-act="toggle" ${r.enabled?"checked":""}></label>
        <button class="btn inline ghost" data-act="delete">Delete</button>
      </div>
    </li>
  `).join("") || `<div class="notice">No reminders yet.</div>`;

  // summaries
  const sum = document.getElementById("summaryBlocks");
  const today = todayISO();
  const daily = dailySummary(today);
  const weekly = weeklySummary(today);
  sum.innerHTML = `
    <div class="card">
      <h4>Today</h4>
      <div>${daily.count} tasks due</div>
      <ul class="list" style="margin-top:8px">${daily.tasks.map(t=>`<li>${t.title} <span class="muted">(${t.subject})</span></li>`).join("") || "<li class='muted'>None</li>"}</ul>
    </div>
    <div class="card">
      <h4>This Week</h4>
      <div>${weekly.count} tasks due</div>
      <ul class="list" style="margin-top:8px">${weekly.tasks.map(t=>`<li>${t.title} – ${fmtDate(t.dueISO)} <span class="muted">(${t.subject})</span></li>`).join("") || "<li class='muted'>None</li>"}</ul>
    </div>
  `;
}

function openReminderModal(){
  const dlg = document.getElementById("reminderModal");
  dlg.showModal();
  document.getElementById("reminderForm").reset();
  const dt = new Date(); dt.setHours(dt.getHours()+1);
  document.getElementById("reminderWhen").value = dt.toISOString().slice(0,16);
}

function handleReminderSave(e){
  e.preventDefault();
  const text = document.getElementById("reminderText").value.trim();
  const whenStr = document.getElementById("reminderWhen").value;
  const whenISO = new Date(whenStr).toISOString();
  const r = addReminder({ text, whenISO });
  scheduleOneReminder(r);
  document.getElementById("reminderModal").close();
  renderReminders();
}

function handleReminderListClick(e){
  const row = e.target.closest("li[data-id]");
  if (!row) return;
  const id = row.getAttribute("data-id");
  const act = e.target.getAttribute("data-act");
  if (act === "delete"){ deleteReminder(id); renderReminders(); }
  if (act === "toggle"){
    const enabled = e.target.checked;
    toggleReminder(id, enabled);
    if (enabled){
      const r = currentYear().reminders.find(x=>x.id===id);
      if (r) scheduleOneReminder(r);
    }
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("addReminderBtn")?.addEventListener("click", openReminderModal);
  document.getElementById("reminderForm")?.addEventListener("submit", handleReminderSave);
  document.getElementById("reminderList")?.addEventListener("click", handleReminderListClick);
  document.getElementById("askNotify")?.addEventListener("click", requestNotifyPermission);
  updateNotifyStatus();
});
