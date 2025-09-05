// ======= TASKS UI =======
const taskListEl = () => document.getElementById("taskList");
const historyListEl = () => document.getElementById("historyList");
const subjectListEl = () => document.getElementById("subjectList");
const taskModal = () => document.getElementById("taskModal");

function subjectChipHTML(s){
  return `<span class="subject-chip"><span class="subject-color" style="background:${s.color}"></span>${s.icon} ${s.name}</span>`;
}

function colorForDue(t){
  if (t.completed) return "green";
  if (isOverdue(t.dueISO)) return "red";
  const days = Math.ceil((new Date(t.dueISO) - new Date())/(1000*60*60*24));
  return days <= 2 ? "yellow" : "green";
}

function renderSubjectList(){
  const y = currentYear();
  subjectListEl().innerHTML = y.subjects.map(subjectChipHTML).join("");
  const datalist = document.getElementById("subjectDatalist");
  datalist.innerHTML = y.subjects.map(s=>`<option value="${s.name}"></option>`).join("");
}

function taskHTML(t){
  const s = subjectMeta(t.subject);
  const urgency = colorForDue(t);
  const resources = (t.resources||[]).map(u=>`<a href="${u}" target="_blank" class="tag">${new URL(u).hostname}</a>`).join("");

  return `
<li class="task" data-id="${t.id}">
  <div class="icon">${s.icon}</div>
  <div>
    <div class="title">${t.title}</div>
    <div class="meta">
      <span class="tag subject" style="background:${s.color}">${t.subject}</span>
      <span class="tag ${urgency}">${t.completed ? "Done" : (isOverdue(t.dueISO) ? "Overdue" : "Due " + fmtDate(t.dueISO))}</span>
      <span class="tag">${t.type}</span>
      <span class="tag">Priority: ${t.priority}</span>
      ${t.notes ? `<span class="tag">${t.notes.slice(0,40)}</span>` : ""}
      ${resources}
    </div>
  </div>
  <div class="actions">
    ${!t.completed ? `<button class="btn inline" data-act="done">✔</button>` : ""}
    <button class="btn inline ghost" data-act="edit">Edit</button>
    <button class="btn inline ghost" data-act="delete">Delete</button>
  </div>
</li>`;
}

function renderTasks(){
  const sortBy = document.getElementById("taskSort").value;
  const filter = document.getElementById("taskFilter").value;
  const q = (document.getElementById("taskSearch").value||"").toLowerCase();

  let arr = [...currentYear().tasks];

  if (filter !== "all"){
    if (filter === "overdue") arr = arr.filter(t=>!t.completed && isOverdue(t.dueISO));
    else if (filter === "done") arr = arr.filter(t=>t.completed);
    else arr = arr.filter(t=>t.type === filter);
  }

  if (q) arr = arr.filter(t => (t.title+t.notes).toLowerCase().includes(q));

  if (sortBy === "urgency"){
    arr.sort((a,b)=> new Date(a.dueISO)-new Date(b.dueISO));
  } else if (sortBy === "subject"){
    arr.sort((a,b)=> a.subject.localeCompare(b.subject));
  } else {
    arr.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  }

  taskListEl().innerHTML = arr.filter(t=>!t.completed).map(taskHTML).join("") || `<div class="notice">No active tasks. Add one!</div>`;

  const history = currentYear().tasks.filter(t=>t.completed).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,20);
  historyListEl().innerHTML = history.map(taskHTML).join("") || `<div class="notice">No completed tasks yet.</div>`;

  renderSubjectList();
}

function openTaskModal(editId=null){
  const m = taskModal();
  m.showModal();
  document.getElementById("taskFormTitle").textContent = editId ? "Edit Task" : "Add Task";
  document.getElementById("taskEditingId").value = editId || "";
  if (editId){
    const t = currentYear().tasks.find(x=>x.id===editId);
    document.getElementById("taskTitle").value = t.title;
    document.getElementById("taskType").value = t.type;
    document.getElementById("taskSubject").value = t.subject;
    document.getElementById("taskDue").value = t.dueISO;
    document.getElementById("taskPriority").value = t.priority||"normal";
    document.getElementById("taskNotes").value = t.notes||"";
    document.getElementById("taskReminder").value = t.reminderISO ? t.reminderISO.slice(0,16) : "";
    document.getElementById("taskResources").value = (t.resources||[]).join(", ");
  } else {
    document.getElementById("taskForm").reset();
    document.getElementById("taskReminder").value = "";
  }
}

function handleTaskSave(e){
  e.preventDefault();
  const id = document.getElementById("taskEditingId").value || null;
  const title = document.getElementById("taskTitle").value.trim();
  const type = document.getElementById("taskType").value;
  const subject = document.getElementById("taskSubject").value.trim();
  const dueISO = document.getElementById("taskDue").value;
  const priority = document.getElementById("taskPriority").value;
  const notes = document.getElementById("taskNotes").value.trim();
  const reminderInput = document.getElementById("taskReminder").value;
  const reminderISO = reminderInput ? new Date(reminderInput).toISOString() : null;
  const resources = (document.getElementById("taskResources").value||"")
    .split(",")
    .map(s=>s.trim())
    .filter(s=>s && /^https?:\/\//.test(s));

  const payload = { title, type, subject, dueISO, priority, notes, resources };
  if (reminderISO) payload.reminderISO = reminderISO;

  if (id){
    editTask(id, payload);
  } else {
    const t = addTask(payload);
    if (reminderISO) {
      // also add a reminder entry
      addReminder({ text: `Study: ${t.title}`, whenISO: reminderISO });
      scheduleOneReminder({ text: `Study: ${t.title}`, whenISO: reminderISO, id: "task-"+t.id });
    }
  }
  taskModal().close();
  renderTasks();
  window.renderDashboard?.();
  window.renderReminders?.();
}

function handleTaskListClick(e){
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const li = e.target.closest("li.task");
  const id = li?.getAttribute("data-id");
  if (!id) return;

  const act = btn.getAttribute("data-act");
  if (act === "done"){ toggleDone(id, true); renderTasks(); window.renderDashboard?.(); }
  if (act === "edit"){ openTaskModal(id); }
  if (act === "delete"){ deleteTask(id); renderTasks(); window.renderDashboard?.(); }
}

// Filters/search
document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("addTaskBtn")?.addEventListener("click", ()=> openTaskModal());
  document.getElementById("quickAddTask")?.addEventListener("click", ()=> openTaskModal());
  document.getElementById("taskForm")?.addEventListener("submit", handleTaskSave);
  document.getElementById("taskList")?.addEventListener("click", handleTaskListClick);
  ["taskSort","taskFilter","taskSearch"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", renderTasks);
  });
});
