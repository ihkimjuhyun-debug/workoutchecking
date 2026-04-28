let selectedCategories = [];
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;
let pendingDalleB64 = "";

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkActiveGoal();
  document.getElementById('openai-key').value = localStorage.getItem('pr_openai_key') || '';
  
  // 카테고리 다중 선택 바인딩
  document.querySelectorAll('#category-selection .cat-btn').forEach(btn => {
    btn.onclick = function() {
      const cat = this.dataset.cat;
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat);
        this.classList.remove('selected');
      } else {
        selectedCategories.push(cat);
        this.classList.add('selected');
      }
    };
  });
});

function initStorage() {
  if (!localStorage.getItem('pr_sessions')) localStorage.setItem('pr_sessions', JSON.stringify({}));
  if (!localStorage.getItem('pr_exercises')) {
    const defaultDB = {
      "겟업": { category: "케틀벨", target: "전신", history: [] },
      "데드리프트": { category: "등", target: "후면", history: [] }
    };
    localStorage.setItem('pr_exercises', JSON.stringify(defaultDB));
  }
}

async function callOpenAI(type, bodyData) {
  const localKey = localStorage.getItem('pr_openai_key');
  const url = localKey ? 
    (type === 'chat' ? "https://api.openai.com/v1/chat/completions" : "https://api.openai.com/v1/images/generations") :
    (type === 'chat' ? "/api/generateRoutine" : "/api/generateImage");

  const headers = { "Content-Type": "application/json" };
  if (localKey) headers["Authorization"] = `Bearer ${localKey}`;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(bodyData) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// 🔥 루틴 생성 (파싱 버그 차단 및 전문성 강화)
async function generateAIRoutines() {
  const name = document.getElementById('goal-name').value.trim();
  const tw = document.getElementById('goal-target-weight').value;
  const tr = document.getElementById('goal-target-reps').value;
  const cw = document.getElementById('goal-current-weight').value;
  const cr = document.getElementById('goal-current-reps').value;
  const dur = document.getElementById('goal-duration').value;

  if (!name || !tw || !tr || !cw || !cr) return alert("모든 항목을 입력해주세요.");

  document.getElementById('btn-generate-routine').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-routines-area').style.display = 'none';

  const systemPrompt = `You are a Master Strength Coach (SFG, Powerlifting Elite).
Analyze 1RM using Epley: Weight * (1 + Reps/30).
Current: ${cw}kg x ${cr} reps. Target: ${tw}kg x ${tr} reps.

CRITICAL INSTRUCTIONS:
1. PEAKING: The program MUST scale up to the target weight. Week 1 is accumulation, Week 12 is the final attempt at ${tw}kg.
2. ANTAGONIST SYNERGY: Explain rationale (e.g. why Rows for Press) using professional Korean biomechanics like "Platform building", "Irradiation", and "Antagonist co-contraction".
3. FORMAT: Suffix numbers with "회"(reps) and "세트"(sets). Example: "130kg 1회 3세트".
4. NO GENERIC TERMS: Use specific strength science terms.

Return JSON EXACTLY:
{"routines": [{"title": "Name", "desc": "Short", "sessions": [{"title": "Week X", "detail": "Exercises here", "rationale": "Deep reason here"}]}]}`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate a ${dur}-month peaking routine for ${name}.` }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(data.choices[0].message.content);
    
    // 🔥 배열 추출 로직 강화
    generatedRoutinesTemp = parsed.routines || parsed.routine || Object.values(parsed).find(Array.isArray) || [];

    if (!Array.isArray(generatedRoutinesTemp) || generatedRoutinesTemp.length === 0) throw new Error("형식이 올바르지 않습니다.");

    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div class="mt-10" style="font-size:0.8rem; color:var(--primary); font-weight:bold;">총 ${r.sessions.length}개 세션 설계</div>
      </div>`).join('');

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';

  } catch (err) {
    alert("오류: " + err.message);
    document.getElementById('btn-generate-routine').style.display = 'block';
    document.getElementById('ai-loading').style.display = 'none';
  }
}

function selectRoutine(index) {
  selectedRoutineIndex = index;
  document.querySelectorAll('.ai-routine-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`routine-card-${index}`).classList.add('selected');
}

function startSelectedRoutine() {
  if (selectedRoutineIndex === null) return alert("루틴을 선택해주세요.");
  const routine = generatedRoutinesTemp[selectedRoutineIndex];
  const name = document.getElementById('goal-name').value;
  const tw = document.getElementById('goal-target-weight').value;
  const tr = document.getElementById('goal-target-reps').value;
  const dur = document.getElementById('goal-duration').value;

  const goalData = {
    title: `${name} ${tw}kg ${tr}회 달성 프로젝트`,
    target: `${tw}kg ${tr}회`,
    sessions: routine.sessions.map(s => ({ ...s, done: false })),
    total: routine.sessions.length,
    completed: 0,
    endDate: Date.now() + (dur * 30 * 24 * 60 * 60 * 1000)
  };

  localStorage.setItem('pr_active_goal', JSON.stringify(goalData));
  checkActiveGoal();
}

function renderActiveGoal(goal) {
  document.getElementById('active-goal-title').innerText = goal.title;
  document.getElementById('active-goal-desc').innerText = `목표: ${goal.target}`;
  const percent = Math.round((goal.completed / goal.total) * 100);
  document.getElementById('goal-progress-bar').style.width = percent + '%';
  document.getElementById('goal-progress-text').innerText = `${percent}% 완료 (${goal.completed}/${goal.total})`;

  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => `
    <div class="session-item ${s.done ? 'done' : ''}">
      <div style="flex:1">
        <div class="session-name">${s.title}</div>
        <div style="font-weight:bold; color:#ddd; margin: 8px 0; font-size: 1rem;">${s.detail}</div>
        <button class="btn-rationale" onclick="toggleSessionRationale(${idx})">💡 코치 분석 보기</button>
        <div id="active-rationale-${idx}" class="rationale-box" style="display:none; margin-top:10px;">${s.rationale}</div>
      </div>
      <button class="check-btn" onclick="completeSession(${idx})">${s.done ? '완료' : '달성'}</button>
    </div>`).join('');
}

function toggleSessionRationale(idx) {
  const box = document.getElementById(`active-rationale-${idx}`);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function completeSession(idx) {
  let goal = JSON.parse(localStorage.getItem('pr_active_goal'));
  if (goal.sessions[idx].done) return;
  goal.sessions[idx].done = true;
  goal.completed++;
  localStorage.setItem('pr_active_goal', JSON.stringify(goal));
  showToast("세션 완료!");
  renderActiveGoal(goal);
}

function resetGoal() {
  if (confirm("현재 목표를 초기화하시겠습니까?")) {
    localStorage.removeItem('pr_active_goal');
    checkActiveGoal();
  }
}

// 기타 UI 헬퍼
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0, 0);
  if (viewId === 'hof-view') renderHallOfFame();
}

function checkActiveGoal() {
  const goal = JSON.parse(localStorage.getItem('pr_active_goal'));
  if (goal) {
    document.getElementById('goal-setup-area').style.display = 'none';
    document.getElementById('active-goal-area').style.display = 'block';
    renderActiveGoal(goal);
  } else {
    document.getElementById('goal-setup-area').style.display = 'block';
    document.getElementById('active-goal-area').style.display = 'none';
  }
}

async function generateDalleIcon() {
  const name = document.getElementById('custom-ex-name').value.trim();
  if (!name) return alert("종목명을 입력하세요.");
  const btn = document.getElementById('btn-gen-img');
  btn.innerText = "🎨 생성 중..."; btn.disabled = true;
  try {
    const data = await callOpenAI('image', { model: "dall-e-2", prompt: `Flat minimalist fitness icon of ${name}, dark grey background, orange accent`, n: 1, size: "256x256", response_format: "b64_json" });
    pendingDalleB64 = data.data[0].b64_json;
    document.getElementById('generated-img').src = `data:image/png;base64,${pendingDalleB64}`;
    document.getElementById('ai-img-preview').style.display = 'block';
  } catch (err) { alert(err.message); }
  finally { btn.innerText = "🎨 AI 썸네일 생성"; btn.disabled = false; }
}

function saveApiKey() {
  localStorage.setItem('pr_openai_key', document.getElementById('openai-key').value);
  alert('저장되었습니다.');
}

function showToast(m) {
  const t = document.getElementById('toast-msg');
  t.innerText = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
