// ======= NAVIGATION =======
function showSection(id){
    document.querySelectorAll(".nav-item").forEach(b=> b.classList.toggle("active", b.dataset.section===id));
    document.querySelectorAll(".page").forEach(p=> p.classList.toggle("active", p.id===id));
    document.getElementById("sectionTitle").textContent = id.charAt(0).toUpperCase()+id.slice(1);
    if (id==="dashboard") renderDashboard();
    if (id==="tasks") renderTasks();
    if (id==="grades"){ renderGradeBars(); renderYearBreakdown(); }
    if (id==="reminders") renderReminders();
    if (id==="journal") renderJournal();
    if (id==="settings"){} // nothing extra
  }
  
  document.addEventListener("DOMContentLoaded", ()=>{
    document.querySelectorAll(".nav-item").forEach(b=>{
      b.addEventListener("click", ()=> showSection(b.dataset.section));
    });
    document.getElementById("quickSeeGrades")?.addEventListener("click", ()=> showSection("grades"));
    document.getElementById("quickReminders")?.addEventListener("click", ()=> showSection("reminders"));
  });
  
  // ======= DASHBOARD =======
  function setRing(percent){
    document.getElementById("ringProgress").style.strokeDashoffset = String(100 - percent);
    document.getElementById("completionPct").textContent = `${percent}%`;
  }
  
  function renderCalendar(year, month){ // 0-based month
    const grid = document.getElementById("calendarGrid");
    const title = document.getElementById("calendarTitle");
    const d = new Date(year, month, 1);
    title.textContent = d.toLocaleString(undefined, { month:"long", year:"numeric" });
  
    const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    grid.innerHTML = dow.map(x=>`<div class="cell dow">${x}</div>`).join("");
  
    const startIdx = d.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
  
    for (let i=0;i<startIdx;i++) grid.innerHTML += `<div class="cell"></div>`;
  
    const items = currentYear().tasks;
    for (let day=1; day<=daysInMonth; day++){
      const iso = new Date(year, month, day).toISOString().slice(0,10);
      const due = items.filter(t=>t.dueISO===iso && !t.completed);
      const overdue = due.some(t=>isOverdue(t.dueISO));
      const soon = due.some(t=>!isOverdue(t.dueISO) && withinDays(t.dueISO,2));
      const badge = overdue ? `<span class="badge red">Overdue</span>` : soon ? `<span class="badge yellow">Soon</span>` : (due.length? `<span class="badge green">${due.length}</span>`:"");
  
      grid.innerHTML += `
        <div class="cell">
          <div class="num">${day}</div>
          ${badge}
          ${due.slice(0,3).map(t=>`<div class="muted" title="${t.title}">${subjectMeta(t.subject).icon} ${t.title.slice(0,16)}</div>`).join("")}
        </div>`;
    }
  }
  
  let CAL_Y = new Date().getFullYear();
  let CAL_M = new Date().getMonth();
  
  function renderDashboard(){
    const y = currentYear();
    // completion
    const totalActive = y.tasks.filter(t=>!t.completed).length;
    const total = y.tasks.length || 0;
    const completed = y.tasks.filter(t=>t.completed).length;
    const pct = total ? Math.round((completed/total)*100) : 0;
    setRing(pct);
    document.getElementById("pendingCount").textContent = totalActive;
  
    // avg grade
    const avg = overallAverage();
    document.getElementById("avgGradeRing").textContent = avg ? `${avg}%` : "–";
  
    // upcoming
    const up = tasksUpcoming7();
    const list = document.getElementById("upcomingList");
    list.innerHTML = up.map(t=>{
      const dot = isOverdue(t.dueISO) ? "red" : withinDays(t.dueISO,2) ? "yellow" : "green";
      return `<li>${subjectMeta(t.subject).icon} <b>${t.title}</b> <span class="muted">(${t.subject})</span> — <span class="tag ${dot}">${fmtDate(t.dueISO)}</span></li>`;
    }).join("") || `<li class="muted">Nothing due in the next 7 days 🎉</li>`;
  
    // achievements (simple demo)
    const a = y.achievements;
    const ach = document.getElementById("achievementsList");
    const allDoneThisWeek = (()=>{
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate()-now.getDay());
      const doneThisWeek = y.tasks.filter(t=>t.completed && new Date(t.completedAt)>=start).length;
      return doneThisWeek >= 5; // milestone example
    })();
    const items = [
      { ok: a.streakDays >= 3, text:`Streak ${a.streakDays} day${a.streakDays===1?"":"s"}` },
      { ok: a.totalCompleted >= 10, text:`10 tasks completed total` },
      { ok: allDoneThisWeek, text:`All Homework Completed This Week (5+)` }
    ];
    ach.innerHTML = items.map(i=>`<li>${i.ok?'✅':'⬜️'} ${i.text}</li>`).join("") || `<li class="muted">No milestones yet — you got this!</li>`;
  
    // calendar
    renderCalendar(CAL_Y, CAL_M);
    document.getElementById("plannerSummary").textContent =
      `This month: ${y.tasks.filter(t=> new Date(t.dueISO).getMonth()===CAL_M && new Date(t.dueISO).getFullYear()===CAL_Y).length} tasks due`;
  }
  
  document.addEventListener("DOMContentLoaded", ()=>{
    // calendar nav
    document.getElementById("prevMonth")?.addEventListener("click", ()=>{ CAL_M--; if (CAL_M<0){ CAL_M=11; CAL_Y--; } renderDashboard(); });
    document.getElementById("nextMonth")?.addEventListener("click", ()=>{ CAL_M++; if (CAL_M>11){ CAL_M=0; CAL_Y++; } renderDashboard(); });
  });
  
  // ======= JOURNAL =======
  function renderJournal(){
    const ul = document.getElementById("journalList");
    const years = Object.values(STORE.years).sort((a,b)=> a.startDate.localeCompare(b.startDate));
    ul.innerHTML = years.map(y=>{
      const avg = overallAverage(y);
      return `<li class="row-between">
        <div>
          <div><b>${y.name}</b> <span class="muted">Grade ${y.gradeLevel}</span></div>
          <div class="muted">${fmtDate(y.startDate)} → ${fmtDate(y.endDate)}</div>
        </div>
        <div><span class="tag">Avg: ${avg ?? "–"}${avg? "%":""}</span></div>
      </li>`;
    }).join("");
  }
  
  // ======= YEAR SWITCHER & MODAL =======
  function openYearModal(){
    const dlg = document.getElementById("yearModal");
    dlg.showModal();
    const now = new Date();
    document.getElementById("yearForm").reset();
    document.getElementById("yearLevel").value = 8;
    document.getElementById("yearStart").value = `${now.getFullYear()}-09-01`;
    document.getElementById("yearEnd").value = `${now.getFullYear()+1}-06-30`;
    document.getElementById("yearName").value = `8th Grade – ${now.getFullYear()}`;
  }
  
  function handleYearSave(e){
    e.preventDefault();
    const name = document.getElementById("yearName").value.trim();
    const gradeLevel = document.getElementById("yearLevel").value;
    const startDate = document.getElementById("yearStart").value;
    const endDate = document.getElementById("yearEnd").value;
    addYear({name, gradeLevel, startDate, endDate});
    document.getElementById("yearModal").close();
    populateYearSelect();
    showSection("dashboard");
  }
  
  document.addEventListener("DOMContentLoaded", ()=>{
    document.getElementById("addYearBtn")?.addEventListener("click", openYearModal);
    document.getElementById("addYearBtn2")?.addEventListener("click", openYearModal);
    document.getElementById("yearForm")?.addEventListener("submit", handleYearSave);
    document.getElementById("yearSelect")?.addEventListener("change", (e)=>{
      setCurrentYear(e.target.value);
      renderTasks(); renderDashboard(); renderGradeBars(); renderYearBreakdown(); renderReminders(); renderJournal();
      bootScheduleExisting();
    });
  });
  
  // ======= SETTINGS =======
  document.addEventListener("DOMContentLoaded", ()=>{
    document.getElementById("exportBtn")?.addEventListener("click", exportJSON);
    document.getElementById("importBtn")?.addEventListener("click", async ()=>{
      const f = document.getElementById("importFile").files[0];
      if (!f) return alert("Choose a file first.");
      try{
        await importJSONFile(f);
        populateYearSelect();
        showSection("dashboard");
        renderTasks(); renderDashboard(); renderGradeBars(); renderYearBreakdown(); renderReminders(); renderJournal();
        bootScheduleExisting();
        alert("Import successful!");
      } catch(e){ alert("Import failed: " + e.message); }
    });
  });
  
  // ======= QUICK ROUTES =======
  document.addEventListener("DOMContentLoaded", ()=>{
    showSection("dashboard"); // initial
    bootScheduleExisting();
  });
  
  // expose for other modules
  window.renderDashboard = renderDashboard;
  window.renderReminders = renderReminders;
  

  document.addEventListener("DOMContentLoaded", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js")
        .then(() => console.log("SW registered"))
        .catch(err => console.error("SW failed", err));
    }
  });
  