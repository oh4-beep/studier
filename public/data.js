// ======= Persistence & Models =======
const STORAGE_KEY = "studier.v1";

// default subjects w/ colors & icons
const DEFAULT_SUBJECTS = [
  { name: "Math", color: "#3B82F6", icon: "📘" },
  { name: "Science", color: "#10B981", icon: "📗" },
  { name: "English", color: "#8B5CF6", icon: "📕" },
  { name: "History", color: "#F59E0B", icon: "📙" },
  { name: "Hebrew", color: "#06B6D4", icon: "📓" }
];

const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = iso => new Date(iso).toLocaleDateString();
const withinDays = (iso, days) => {
  const d = new Date(iso), now = new Date();
  const diff = (d - now) / (1000*60*60*24);
  return diff <= days && diff >= -365; // window
};
const isOverdue = iso => new Date(iso) < new Date() && !sameDay(iso, new Date());
const sameDay = (isoOrDate, date) => {
  const d1 = new Date(isoOrDate); const d2 = new Date(date);
  return d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();
};

function newYearTemplate() {
  const year = new Date().getFullYear();
  return {
    id: uid(),
    name: `8th Grade – ${year}`,
    gradeLevel: 8,
    startDate: `${year}-09-01`,
    endDate: `${year+1}-06-30`,
    subjects: JSON.parse(JSON.stringify(DEFAULT_SUBJECTS)),
    tasks: [],
    grades: [],
    reminders: [],
    achievements: { completedThisWeek: 0, totalCompleted: 0, streakDays: 0, lastDoneISO: null }
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const y = newYearTemplate();
    const sample = {
      currentYearId: y.id,
      years: { [y.id]: y },
      createdAt: new Date().toISOString(),
      version: 1
    };
    saveState(sample);
    return sample;
  }
  try { return JSON.parse(raw); } catch { localStorage.removeItem(STORAGE_KEY); return loadState(); }
}
function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let STORE = loadState();

function currentYear() { return STORE.years[STORE.currentYearId]; }
function setCurrentYear(id){ STORE.currentYearId = id; saveState(STORE); }

function upsertYear(y) { STORE.years[y.id] = y; saveState(STORE); populateYearSelect(); }
function addYear({name, gradeLevel, startDate, endDate}) {
  const y = newYearTemplate();
  y.name = name; y.gradeLevel = Number(gradeLevel);
  y.startDate = startDate; y.endDate = endDate;
  upsertYear(y); setCurrentYear(y.id); return y;
}

// ======= Subjects =======
function ensureSubject(name) {
  const y = currentYear();
  if (!y.subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    y.subjects.push({ name, color: "#06B6D4", icon:"📒" });
    saveState(STORE);
  }
}
function subjectMeta(name) {
  const y = currentYear();
  return y.subjects.find(s => s.name.toLowerCase() === name.toLowerCase()) || { name, color:"#06B6D4", icon:"📒" };
}

// ======= Tasks =======
function addTask(t) {
  const y = currentYear();
  const task = { id: uid(), createdAt: new Date().toISOString(), completed:false, ...t };
  y.tasks.push(task);
  ensureSubject(task.subject);
  saveState(STORE);
  return task;
}
function editTask(id, patch) {
  const y = currentYear();
  const i = y.tasks.findIndex(t => t.id === id);
  if (i >= 0) { y.tasks[i] = { ...y.tasks[i], ...patch }; saveState(STORE); }
}
function toggleDone(id, done=true) {
  const y = currentYear();
  const t = y.tasks.find(t => t.id===id);
  if (t) {
    t.completed = done;
    t.completedAt = done ? new Date().toISOString() : null;
    // Achievements
    if (done) {
      y.achievements.totalCompleted++;
      const today = new Date();
      const last = y.achievements.lastDoneISO ? new Date(y.achievements.lastDoneISO) : null;
      if (!last || !sameDay(last, today)) {
        // streak logic (simple)
        const yesterday = new Date(); yesterday.setDate(today.getDate()-1);
        y.achievements.streakDays = last && sameDay(last, yesterday) ? (y.achievements.streakDays+1) : 1;
        y.achievements.lastDoneISO = today.toISOString();
      }
    }
    saveState(STORE);
  }
}
function deleteTask(id){
  const y = currentYear();
  y.tasks = y.tasks.filter(t => t.id !== id);
  saveState(STORE);
}
function tasksUpcoming7() {
  return currentYear().tasks
    .filter(t => !t.completed && withinDays(t.dueISO, 7))
    .sort((a,b) => new Date(a.dueISO) - new Date(b.dueISO));
}

// ======= Grades =======
function addGrade({subject, type, score, dateISO}) {
  const y = currentYear();
  y.grades.push({ id: uid(), subject, type, score: Number(score), dateISO });
  ensureSubject(subject);
  saveState(STORE);
}
function gradesBySubject(year) {
  const g = (year||currentYear()).grades;
  const map = {};
  g.forEach(x => {
    map[x.subject] ||= [];
    map[x.subject].push(x.score);
  });
  const out = [];
  for (const k of Object.keys(map)) {
    const arr = map[k]; const avg = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    out.push({ subject:k, avg, count: arr.length });
  }
  return out.sort((a,b)=>b.avg-a.avg);
}
function overallAverage(year) {
  const g = (year||currentYear()).grades.map(x=>x.score);
  if (!g.length) return null;
  return Math.round(g.reduce((a,b)=>a+b,0)/g.length);
}

// ======= Reminders =======
function addReminder({text, whenISO}) {
  const y = currentYear();
  const r = { id: uid(), text, whenISO, enabled:true, createdAt:new Date().toISOString() };
  y.reminders.push(r);
  saveState(STORE);
  return r;
}
function toggleReminder(id, enabled){
  const y = currentYear();
  const r = y.reminders.find(r=>r.id===id);
  if (r){ r.enabled = enabled; saveState(STORE); }
}
function deleteReminder(id){
  const y = currentYear();
  y.reminders = y.reminders.filter(r => r.id !== id);
  saveState(STORE);
}

// ======= Yearly Breakdown =======
function allYearsAverages(){
  const arr = Object.values(STORE.years).map(y => {
    const avg = overallAverage(y);
    return { id:y.id, name:y.name, avg: avg ?? 0 };
  });
  return arr;
}

// ======= Export / Import =======
function exportJSON(){
  const blob = new Blob([JSON.stringify(STORE,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `studier-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}
async function importJSONFile(file){
  const text = await file.text();
  const obj = JSON.parse(text);
  if (!obj.years || !obj.currentYearId) throw new Error("Invalid backup file");
  STORE = obj; saveState(STORE);
}


// ======= LOGIN/SYNC =======
let CURRENT_USER = null;
const API = "https://studier-w78p.onrender.com";

async function signup(username, password){
  const res = await fetch(API+"/signup", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({username,password})
  });
  return res.json();
}

async function login(username, password){
  const res = await fetch(API+"/login", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({username,password})
  });
  const data = await res.json();
  if (data.success){
    CURRENT_USER = username;
    STORE = data.data || STORE; // load server data
    saveRemote();
  }
  return data;
}

function saveRemote(){
  if (!CURRENT_USER) return;
  fetch(API+"/save", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({username: CURRENT_USER, data: STORE})
  });
}


// ======= Summaries =======
function dailySummary(dateISO){
  const y = currentYear();
  const t = y.tasks.filter(t => t.dueISO === dateISO);
  return { dateISO, tasks: t, count: t.length };
}
function weeklySummary(anchorISO){
  const d = new Date(anchorISO);
  const start = new Date(d); start.setDate(d.getDate() - d.getDay()); // Sun
  const y = currentYear();
  const inWeek = t => {
    const dt = new Date(t.dueISO);
    return dt >= start && dt < new Date(start.getFullYear(), start.getMonth(), start.getDate()+7);
  };
  const arr = y.tasks.filter(inWeek);
  return { weekOf: start.toISOString().slice(0,10), tasks: arr, count: arr.length };
}

// ======= UI helpers for subjects =======
function populateYearSelect(){
  const sel = document.getElementById("yearSelect");
  if (!sel) return;
  sel.innerHTML = "";
  Object.values(STORE.years).forEach(y=>{
    const opt = document.createElement("option");
    opt.value = y.id; opt.textContent = y.name;
    if (y.id === STORE.currentYearId) opt.selected = true;
    sel.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", populateYearSelect);
