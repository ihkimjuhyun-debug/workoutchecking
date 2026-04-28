let selectedCategories = [];
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;
let pendingDalleB64 = "";

// 초기화 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkActiveGoal();
  document.getElementById('openai-key').value = localStorage.getItem('pr_openai_key') || '';
  
  // 카테고리 선택 이벤트 (버그 방지를 위해 JS에서 직접 바인딩)
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
  if (!localStorage.getItem('pr_exercises')) localStorage.setItem('pr_exercises', JSON.stringify(defaultExercisesDB));
}

// 🔥 무적의 OpenAI 호출 함수 (에러 핸들링 강화)
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

// 🔥 루틴 생성 메인 함수 (반응 없음 문제 해결)
async function generateAIRoutines() {
  // 1. 입력값 검증
  const name = document.getElementById('goal-name').value.trim();
  const tw = document.getElementById('goal-target-weight').value;
  const tr = document.getElementById('goal-target-reps').value;
  const cw = document.getElementById('goal-current-weight').value;
  const cr = document.getElementById('goal-current-reps').value;
  const dur = document.getElementById('goal-duration').value;

  if (!name || !tw || !tr || !cw || !cr) return alert("모든 항목을 입력해주세요.");

  // 2. UI 상태 변경 (로딩 시작)
  document.getElementById('btn-generate-routine').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-routines-area').style.display = 'none';

  // 3. 전문 프롬프트 구성
  const systemPrompt = `You are an Elite Strength Coach. 
Analyze the user's 1RM using the Epley formula: Weight * (1 + Reps/30).
Current: ${cw}kg x ${cr} reps. Target: ${tw}kg x ${tr} reps.
Generate 3 routines (1. Peaking, 2. Hypertrophy Base, 3. Conjugate).

CRITICAL RULES:
1. Suffix all numbers with "회"(reps) and "세트"(sets). Example: "100kg 5회 5세트".
2. Explain 'Rationale' in Korean focusing on Biomechanics (e.g. "광배근은 프레스의 발사대 역할").
3. Final sessions MUST reach or exceed the target workload.

Return JSON in this exact structure:
{"routines": [{"title": "Name", "desc": "Short", "sessions": [{"title": "Day 1", "detail": "Weight 회 세트", "rationale": "Reason"}]}]}`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Goal: ${name} ${tw}kg ${tr}reps in ${dur} months.` }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(data.choices[0].message.content);
    
    // 🔥 데이터 파싱 안전망: 배열이 아닐 경우를 대비한 무조건적 배열화
    generatedRoutinesTemp = parsed.routines || parsed.routine || Object.values(parsed).find(Array.isArray) || [];

    if (generatedRoutinesTemp.length === 0) throw new Error("유효한 루틴 데이터를 받지 못했습니다.");

    // 4. UI 렌더링
    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div class="mt-10" style="font-size:0.8rem; color:var(--primary); font-weight:bold;">총 ${r.sessions.length}개 세션 설계됨</div>
      </div>`).join('');

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';

  } catch (err) {
    alert("오류 발생: " + err.message);
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
    title: `${name} ${tw}kg ${tr}회 도전`,
    target: `${tw}kg ${tr}회`,
    endDate: Date.now() + (dur * 30 * 24 * 60 * 60 * 1000),
    sessions: routine.sessions.map(s => ({ ...s, done: false })),
    total: routine.sessions.length,
    completed: 0
  };

  localStorage.setItem('pr_active_goal', JSON.stringify(goalData));
  checkActiveGoal();
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

function renderActiveGoal(goal) {
  document.getElementById('active-goal-title').innerText = goal.title;
  document.getElementById('active-goal-desc').innerText = `목표: ${goal.target} | 기간 내 달성률`;
  const percent = Math.round((goal.completed / goal.total) * 100);
  document.getElementById('goal-progress-bar').style.width = percent + '%';
  document.getElementById('goal-progress-text').innerText = `${percent}% (${goal.completed}/${goal.total} 완료)`;

  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => `
    <div class="session-item ${s.done ? 'done' : ''}">
      <div style="flex:1">
        <div class="session-name">${s.title}</div>
        <div style="font-weight:bold; color:#ddd; margin: 5px 0;">${s.detail}</div>
        <button class="btn-rationale" onclick="this.nextElementSibling.style.display='block'">코치 분석 보기</button>
        <div class="rationale-box" style="display:none; font-size:0.8rem; background:#333; padding:10px; border-radius:5px; margin-top:5px;">${s.rationale}</div>
      </div>
      <button class="check-btn" onclick="completeSession(${idx})">${s.done ? '완료' : '달성'}</button>
    </div>`).join('');
}

function completeSession(idx) {
  let goal = JSON.parse(localStorage.getItem('pr_active_goal'));
  if (goal.sessions[idx].done) return;
  goal.sessions[idx].done = true;
  goal.completed++;
  localStorage.setItem('pr_active_goal', JSON.stringify(goal));
  showToast("세션 완료! 고생하셨습니다.");
  renderActiveGoal(goal);
}

function resetGoal() {
  if (confirm("정말 목표를 초기화하시겠습니까?")) {
    localStorage.removeItem('pr_active_goal');
    checkActiveGoal();
  }
}

// 기타 헬퍼 함수
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  if(viewId === 'hof-view') renderHallOfFame();
}
function saveApiKey() { localStorage.setItem('pr_openai_key', document.getElementById('openai-key').value); alert('저장됨'); }
function showToast(m) { const t = document.getElementById('toast-msg'); t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3000); }

const defaultExercisesDB = {
  "겟업": { category: "케틀벨", target: "전신", history: [] },
  "데드리프트": { category: "등", target: "후면", history: [] }
};
