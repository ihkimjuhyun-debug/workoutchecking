let selectedCategories = [];
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;
let pendingDalleB64 = "";

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkActiveGoal();
  document.getElementById('openai-key').value = localStorage.getItem('pr_openai_key') || '';
  
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
    localStorage.setItem('pr_exercises', JSON.stringify({
      "데드리프트": { category: "등", target: "후면", history: [] },
      "OHP": { category: "어깨", target: "어깨", history: [] },
      "스쿼트": { category: "하체", target: "하체", history: [] }
    }));
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

// 🔥 루틴 생성 (현실적 체중 & 훈련 세션 수 강제)
async function generateAIRoutines() {
  const name = document.getElementById('goal-name').value.trim();
  const tw = document.getElementById('goal-target-weight').value;
  const tr = document.getElementById('goal-target-reps').value;
  const cw = document.getElementById('goal-current-weight').value;
  const cr = document.getElementById('goal-current-reps').value;
  const dur = parseInt(document.getElementById('goal-duration').value);

  if (!name || !tw || !tr || !cw || !cr) return alert("모든 항목을 입력해주세요.");

  document.getElementById('btn-generate-routine').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-routines-area').style.display = 'none';

  // 🔥 주 2.5회 기준(월 10회)으로 훈련 횟수 강제 계산 (3개월이면 30개 세션)
  const targetSessionCount = dur * 10; 

  const systemPrompt = `당신은 세계 최고의 스트렝스 코치(파워리프팅 엘리트)입니다.
사용자 상태: 현재 ${name} ${cw}kg ${cr}회 가능 -> 목표: ${tw}kg ${tr}회 도달.

[치명적 오류 방지 규칙 - 반드시 지킬 것]
1. 현실적인 체중 계산: ${name} ${tw}kg를 수행하려면 체중 대비 근력 비율(Wilks 등)을 고려할 때 현실적으로 필요한 체급이 있습니다. 130kg OHP 같은 엘리트 중량에 72kg 같은 비현실적인 체중을 추천하지 마세요. 수행 능력을 받쳐줄 수 있는 묵직하고 현실적인 골격근량과 목표 체중(예: 90kg~105kg 이상)을 설정하세요.
2. 훈련 세션 수 강제: 절대로 한 달에 1~2번 훈련하는 요약본을 짜지 마세요. 주 2.5회 훈련 빈도를 기준으로, ${dur}개월간 **정확히 ${targetSessionCount}개의 훈련 세션**을 JSON 배열에 하나도 빠짐없이 꽉 채워서 생성하세요.
3. 필수 보조 운동: 메인 운동 1개와 함께 등, 후면 사슬, 코어 등의 필수 보조 운동 2~3개를 훈련(detail)에 반드시 포함하세요.
4. 영양: 하루 6끼(끼니당 단백질 40g/탄수 80g) 섭취를 기준으로 현실적인 총 칼로리와 매크로를 한국어로 작성하세요.
5. 언어 강제: 모든 텍스트는 100% 한국어로만 작성하세요. 영어 절대 금지.

JSON 구조:
{
  "recommendedWeight": "현실적인 목표 체중 (예: 95kg)",
  "nutrition": "식단 가이드(단백질/탄수화물 포함 상세 내역)",
  "routines": [
    {
      "title": "루틴 명칭",
      "desc": "루틴 개요",
      "sessions": [
        { "title": "훈련 구분(예: 1주차 1번째 고강도)", "detail": "운동 리스트(종목/무게/회/세트)", "rationale": "보조 운동 포함 생리학적 근거" }
      ]
    }
  ]
}`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt }, 
        { role: "user", content: `${name} 목표 달성을 위해 정확히 ${targetSessionCount}개의 개별 세션이 포함된 루틴을 생성해.` }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(data.choices[0].message.content);
    const globalWeight = parsed.recommendedWeight || "체중 분석 누락";
    const globalNutrition = parsed.nutrition || "영양 분석 누락";
    let extracted = parsed.routines || parsed.routine || Object.values(parsed).find(Array.isArray) || [];

    generatedRoutinesTemp = extracted.map(r => ({
      ...r, recommendedWeight: globalWeight, nutrition: globalNutrition
    }));

    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div class="mt-10" style="font-size:0.8rem; color:var(--primary); font-weight:bold;">총 ${r.sessions ? r.sessions.length : 0}개 세션 훈련 스케줄 생성 완료</div>
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
  const dur = parseInt(document.getElementById('goal-duration').value);

  const totalSessions = routine.sessions.length;
  if (totalSessions < 2) return alert("AI가 세션을 너무 적게 생성했습니다. 다시 생성해주세요.");

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + dur);
  
  // 훈련 간격 자동 계산 (정확한 날짜 할당)
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interval = totalDays / (totalSessions - 1 || 1);

  const sessions = routine.sessions.map((s, i) => {
    const sDate = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
    return {
      ...s,
      date: `${sDate.getFullYear()}.${String(sDate.getMonth() + 1).padStart(2, '0')}.${String(sDate.getDate()).padStart(2, '0')}`,
      done: false
    };
  });

  const goalData = {
    title: `${name} ${tw}kg ${tr}회 완전 정복`,
    target: `${tw}kg ${tr}회`,
    recommendedWeight: routine.recommendedWeight,
    nutrition: routine.nutrition,
    sessions: sessions,
    total: totalSessions,
    completed: 0,
    endDate: endDate.getTime()
  };

  localStorage.setItem('pr_active_goal', JSON.stringify(goalData));
  checkActiveGoal();
}

function renderActiveGoal(goal) {
  document.getElementById('active-goal-title').innerText = goal.title;
  document.getElementById('active-goal-desc').innerText = `목표: ${goal.target}`;
  document.getElementById('active-goal-weight').innerText = goal.recommendedWeight;
  document.getElementById('active-goal-nutrition').innerText = goal.nutrition;

  const percent = Math.round((goal.completed / goal.total) * 100);
  document.getElementById('goal-progress-bar').style.width = percent + '%';
  document.getElementById('goal-progress-text').innerText = `${percent}% 완료 (${goal.completed}/${goal.total} 세션)`;

  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => `
    <div class="session-item ${s.done ? 'done' : ''}">
      <div style="flex:1">
        <div style="color: var(--primary); font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">📅 ${s.date} ${s.done ? '(완료됨)' : ''}</div>
        <div class="session-name" style="font-size: 1.1rem;">${s.title}</div>
        <div style="font-weight:bold; color:#ddd; margin: 8px 0; font-size: 0.95rem; white-space: pre-wrap; line-height: 1.5;">${s.detail}</div>
        <button class="btn-rationale" onclick="toggleSessionRationale(${idx})">💡 전문 코치 분석 보기</button>
        <div id="active-rationale-${idx}" class="rationale-box" style="display:none; margin-top:10px; background: rgba(0,0,0,0.2); border-radius: 8px;">${s.rationale}</div>
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
  showToast("세션을 완벽히 달성했습니다!");
  renderActiveGoal(goal);
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

function resetGoal() {
  if (confirm("현재 목표를 초기화하시겠습니까? 데이터가 삭제됩니다.")) {
    localStorage.removeItem('pr_active_goal');
    checkActiveGoal();
  }
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0, 0);
  if (viewId === 'hof-view') renderHallOfFame();
}

function saveApiKey() {
  localStorage.setItem('pr_openai_key', document.getElementById('openai-key').value);
  alert('API 키가 저장되었습니다.');
}

function showToast(m) {
  const t = document.getElementById('toast-msg');
  t.innerText = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function startWorkout() {
  if (selectedCategories.length === 0) return alert('부위를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  document.getElementById('exercise-inputs-container').innerHTML = ''; addExerciseInput(); showView('record-view');
}

function addExerciseInput(name = '') {
  const container = document.getElementById('exercise-inputs-container');
  const div = document.createElement('div'); div.className = 'exercise-entry mb-20'; 
  div.innerHTML = `<input type="text" class="input-name mb-10" placeholder="종목명" value="${name}"><div class="input-row"><input type="number" class="input-weight" placeholder="무게(kg)"><input type="number" class="input-reps" placeholder="횟수(회)"><input type="number" class="input-sets" placeholder="세트"></div>`; 
  container.appendChild(div);
}

function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry');
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  let recordDate = timeType === 'past' ? new Date(document.getElementById('input-past-date').value) : new Date();
  const session = { date: recordDate.toLocaleString(), timestamp: recordDate.getTime(), categories: [...selectedCategories], workouts: [], totalVolume: 0 };
  
  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim();
    const val1 = parseFloat(entry.querySelector('.input-weight').value) || 0;
    const val2 = parseFloat(entry.querySelector('.input-reps').value) || 0;
    const sets = parseInt(entry.querySelector('.input-sets').value) || 0;
    if (name) {
      let volume = val1 * val2 * sets;
      session.workouts.push({ name, weight: val1, reps: val2, sets, volume });
      session.totalVolume += volume;
      if (!exercises[name]) exercises[name] = { category: "기타", history: [] };
      exercises[name].history.push({ date: session.date, timestamp: session.timestamp, weight: val1, reps: val2, sets, volume });
    }
  });
  
  if(session.workouts.length === 0) return alert("입력된 데이터가 없습니다.");
  sessions[`S_${recordDate.getTime()}`] = session;
  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  showView('hof-view');
}

function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const volList = document.getElementById('hof-volume-list');
  volList.innerHTML = '';
  Object.entries(sessions).sort((a,b) => b[1].totalVolume - a[1].totalVolume).forEach(([key, s], i) => {
    const div = document.createElement('div'); div.className = 'record-card mb-10';
    div.innerHTML = `<span class="volume-badge">${s.totalVolume.toLocaleString()}kg</span> <b>${i+1}위</b> | ${s.date.split(' ')[0]}<br><small style="color:#888;">${s.categories.join(', ')}</small>`;
    volList.appendChild(div);
  });
}

// 통합 검색 및 커스텀 종목 (생략 없이 유지)
function searchExercises() {
  const filterCat = document.querySelector('#filter-categories .cat-btn.active-filter')?.dataset.filter;
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list'); container.innerHTML = '';
  const query = document.getElementById('search-input').value.toUpperCase();
  Object.entries(exercises).forEach(([name, data]) => {
    if ((!filterCat || data.category === filterCat) && (!query || name.includes(query))) {
      container.innerHTML += `<div class="record-card mb-10"><b>${name}</b> <span class="target-badge">${data.category}</span></div>`;
    }
  });
}
function toggleCustomExerciseForm() {
  const f = document.getElementById('custom-exercise-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
async function generateDalleIcon() {
  const name = document.getElementById('custom-ex-name').value.trim();
  if(!name) return alert("종목명 입력");
  document.getElementById('btn-gen-img').disabled = true;
  try {
    const d = await callOpenAI('image', { prompt: `Minimalist icon of ${name}, dark background, orange accent`, n:1, size:"256x256", response_format:"b64_json" });
    pendingDalleB64 = d.data[0].b64_json;
    document.getElementById('generated-img').src = `data:image/png;base64,${pendingDalleB64}`;
    document.getElementById('ai-img-preview').style.display = 'block';
  } catch(e) { alert(e.message); } finally { document.getElementById('btn-gen-img').disabled = false; }
}
function addCustomExercise() {
  const name = document.getElementById('custom-ex-name').value.trim().toUpperCase();
  const cat = document.getElementById('custom-ex-cat').value;
  if (!name) return alert('이름 입력');
  const ex = JSON.parse(localStorage.getItem('pr_exercises'));
  if (ex[name]) return alert('이미 존재함');
  ex[name] = { category: cat, target: "전신", history: [], b64_img: pendingDalleB64 };
  localStorage.setItem('pr_exercises', JSON.stringify(ex));
  alert('추가 완료'); toggleCustomExerciseForm(); searchExercises();
}
