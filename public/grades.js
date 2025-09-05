// ======= GRADES UI =======
const gradeModal = () => document.getElementById("gradeModal");

function renderGradeBars(){
  const view = document.getElementById("gradeViewMode").value;
  const bars = document.getElementById("gradeBars");
  bars.innerHTML = "";

  if (view === "year"){
    const data = gradesBySubject();
    if (!data.length){ bars.innerHTML = `<div class="notice">No grades yet.</div>`; return; }
    data.forEach(({subject, avg, count})=>{
      const s = subjectMeta(subject);
      const wrap = document.createElement("div");
      wrap.className = "bar";
      wrap.style.margin = "10px 0";
      wrap.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <div>${s.icon} <b>${subject}</b> <span class="muted">(${count})</span></div>
          <div><b>${avg}%</b></div>
        </div>
        <div style="height:14px; border-radius:999px; background:#0f0f0f; border:1px solid #262626; overflow:hidden;">
          <div style="height:100%; width:${avg}%; background:linear-gradient(90deg, #06B6D4, #3B82F6);"></div>
        </div>`;
      bars.appendChild(wrap);
    });
  } else {
    // all time per year
    const list = allYearsAverages();
    if (!list.length){ bars.innerHTML = `<div class="notice">No data.</div>`; return; }
    list.forEach(({name, avg})=>{
      const wrap = document.createElement("div");
      wrap.style.margin = "10px 0";
      wrap.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <div><b>${name}</b></div><div><b>${avg || "–"}${avg? "%":""}</b></div>
        </div>
        <div style="height:14px; border-radius:999px; background:#0f0f0f; border:1px solid #262626; overflow:hidden;">
          <div style="height:100%; width:${avg||0}%; background:linear-gradient(90deg, #06B6D4, #3B82F6);"></div>
        </div>`;
      bars.appendChild(wrap);
    });
  }
}

function renderYearBreakdown(){
  const el = document.getElementById("yearBreakdown");
  const y = currentYear();
  const avg = overallAverage() ?? "–";
  const perSubj = gradesBySubject();
  el.innerHTML = `
    <div><b>${y.name}</b></div>
    <div class="muted">Overall average: <b>${avg}${avg==="–"?"":"%"}</b></div>
    <div style="margin-top:8px;">${perSubj.map(s=>`${s.subject}: <b>${s.avg}%</b>`).join(" • ") || "No grades yet"}</div>
  `;
}

function openGradeModal(){
  gradeModal().showModal();
  document.getElementById("gradeForm").reset();
  document.getElementById("gradeDate").value = todayISO();
}

function handleGradeSave(e){
  e.preventDefault();
  const subject = document.getElementById("gradeSubject").value.trim();
  const type = document.getElementById("gradeType").value;
  const score = Number(document.getElementById("gradeValue").value);
  const dateISO = document.getElementById("gradeDate").value;
  addGrade({subject, type, score, dateISO});
  gradeModal().close();
  renderGradeBars(); renderYearBreakdown(); window.renderDashboard?.();
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("addGradeBtn")?.addEventListener("click", openGradeModal);
  document.getElementById("gradeForm")?.addEventListener("submit", handleGradeSave);
  document.getElementById("gradeViewMode")?.addEventListener("change", ()=>{
    renderGradeBars(); renderYearBreakdown();
  });
});
