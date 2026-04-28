let selectedCategories = [];
let currentViewingExercise = "";
let currentEditingSessionKey = "";
let previousViewBeforeSession = "hof-view";
let pendingDalleB64 = ""; 

function toggleCategory(cat, btnElement) {
  if (selectedCategories.includes(cat)) {
    selectedCategories = selectedCategories.filter(c => c !== cat);
    btnElement.classList.remove('selected');
  } else {
    selectedCategories.push(cat);
    btnElement.classList.add('selected');
  }
}

function getAvatarHtml(name, b64ImgData) {
  if (b64ImgData) {
    return `<div class="ex-avatar"><img src="data:image/png;base64,${b64ImgData}" alt="icon" style="width:100%; height:100%; object-fit:cover;"></div>`;
  }
  return `<div class="ex-avatar">${name.substring(0, 2).toUpperCase()}</div>`;
}

const defaultExercisesDB = {
  "겟업": { category: "케틀벨", target: "전신", fav: true, history: [] },
  "케틀벨 스윙": { category: "케틀벨", target: "후면", fav: true, history: [] },
  "러닝": { category: "유산소", target: "심폐", fav: true, history: [] },
  "벤치프레스": { category: "가슴", target: "가슴", fav: false, history: [] },
  "스쿼트": { category: "하체", target: "하체", fav: false, history: [] },
  "데드리프트": { category: "등", target: "후면", fav: false, history: [] },
  "OHP": { category: "어깨", target: "어깨", fav: false, history: [] },
};

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkActiveGoal();
  document.getElementById('openai-key').value = localStorage.getItem('pr_openai_key') || '';

  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const isActive = this.classList.contains('active-filter');
      document.querySelectorAll('#filter-categories .cat-btn').forEach(b => b.classList.remove('active-filter'));
      if (!isActive) this.classList.add('active-filter');
      searchExercises(); 
    });
  });
});

function initStorage() {
  if (!localStorage.getItem('pr_sessions')) localStorage.setItem('pr_sessions', JSON.stringify({}));
  let stored = JSON.parse(localStorage.getItem('pr_exercises')) || {};
  for (const [name, data] of Object.entries(defaultExercisesDB)) {
    if (!stored[name]) stored[name] = data;
  }
  localStorage.setItem('pr_exercises', JSON.stringify(stored));
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.classList.add('active');
  window.scrollTo(0,0);
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') searchExercises();
  if (viewId === 'goal-view') checkActiveGoal();
}

function saveApiKey() {
  const key = document.getElementById('openai-key').value.trim();
  localStorage.setItem('pr_openai_key', key); alert("API 설정이 저장되었습니다.");
}

async function callOpenAI(type, bodyData) {
  const localKey = localStorage.getItem('pr_openai_key');
  try {
    if (localKey) {
      const url = type === 'chat' ? "https://api.openai.com/v1/chat/completions" : "https://api.openai.com/v1/images/generations";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localKey}` }, body: JSON.stringify(bodyData) });
      return await res.json();
    } else {
      const url = type === 'chat' ? "/api/generateRoutine" : "/api/generateImage";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyData) });
      return await res.json();
    }
  } catch (error) { throw new Error(error.message || "네트워크/API 오류입니다."); }
}

async function generateDalleIcon() {
  const name = document.getElementById('custom-ex-name').value.trim();
  if (!name) return alert("종목 이름을 입력해주세요!");
  const btn = document.getElementById('btn-gen-img'); btn.innerText = "🎨 AI 통신 중..."; btn.disabled = true;

  try {
    const data = await callOpenAI('image', { model: "dall-e-2", prompt: `A simple, flat, minimalist fitness vector icon of a person doing ${name}, dark grey background #333333, primary color orange #ff8c00, no text, clean UI asset`, n: 1, size: "256x256", response_format: "b64_json" });
    if (data.error) throw new Error(data.error.message);
    pendingDalleB64 = data.data[0].b64_json;
    document.getElementById('generated-img').src = `data:image/png;base64,${pendingDalleB64}`;
    document.getElementById('ai-img-preview').style.display = 'block'; btn.innerText = "🎨 다시 그리기";
  } catch (err) { alert("이미지 생성 실패: " + err.message); btn.innerText = "🎨 AI 썸네일 그리기 (선택)"; } 
  finally { btn.disabled = false; }
}

function addCustomExercise() {
  const name = document.getElementById('custom-ex-name').value.trim().toUpperCase();
  const cat = document.getElementById('custom-ex-cat').value; const target = document.getElementById('custom-ex-target').value.trim();
  if (!name) return alert('종목 이름을 입력해주세요.');
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  if (exercises[name]) return alert('이미 존재하는 종목입니다.');

  exercises[name] = { category: cat, target: target || cat, fav: false, b64_img: pendingDalleB64, history: [] };
  localStorage.setItem('pr_exercises', JSON.stringify(exercises)); alert(`[${name}] 추가 완료!`);
  document.getElementById('custom-ex-name').value = ''; document.getElementById('custom-ex-target').value = ''; document.getElementById('ai-img-preview').style.display = 'none'; pendingDalleB64 = "";
  document.getElementById('custom-exercise-form').style.display = 'none'; searchExercises();
}
function toggleCustomExerciseForm() { const form = document.getElementById('custom-exercise-form'); form.style.display = form.style.display === 'none' ? 'block' : 'none'; }


// ------------------------------------------------------------------------
// 🚀 AI 루틴 & 목표 설정 (🔥 초고도화된 프롬프트 엔진)
// ------------------------------------------------------------------------
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;

async function generateAIRoutines() {
  const target = document.getElementById('goal-target').value.trim();
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value);
  if (!target || !current) return alert("목표와 현재 기록을 입력해주세요.");

  document.getElementById('btn-generate').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';

  // 🔥 20년차 역도/파워리프팅/SFG 코치의 뇌를 이식한 극한의 프롬프트
  const systemPrompt = `You are a Master SFG and Elite Powerlifting Coach with 20 years of experience.
Your job is to generate 3 specialized workout routines to take the user from their CURRENT performance to their TARGET performance over the specified duration.

CRITICAL RULES FOR PROGRESSION:
1. PEAKING IS MANDATORY: The user MUST mathematically and physically reach or attempt the TARGET weight in the final sessions. If the goal is 60kg, the final weeks MUST contain 56kg or 60kg (e.g., Heavy Singles, Push Press, or Overload holds). DO NOT stay at light weights.
2. Progressive Overload: Start with Accumulation (Volume), move to Intensification (Heavy weights, lower reps), and end with Peaking (Near TARGET weight).

CRITICAL RULES FOR RATIONALE (코치 코멘트):
1. Must be written in highly professional, biomechanical Korean.
2. NO GENERIC BULLSHIT. Do not write "근지구력 향상" or "안정적인 볼륨".
3. ANTAGONIST SYNERGY: If you program Pulling exercises (Rows, Pull-ups) for a Pressing goal, explicitly explain WHY. (e.g., "등 상부와 광배근은 프레스의 발사대(Platform) 역할을 합니다. 강력한 로우 운동은 길항근을 수축시켜 어깨 관절의 안정성을 극대화하고 방산(Irradiation) 효과를 일으켜 프레스 중량을 올립니다.")
4. NEURAL ADAPTATION: Explain heavy sets as "CNS(중추신경계) 적응 및 고역치 운동단위 동원".

JSON Format MUST be EXACTLY:
[
  {
    "title": "1. SFG & Peaking Program", 
    "desc": "StrongFirst 기반의 신경계 동원 및 절대근력 피킹 프로그램", 
    "sessions": [
      {
        "title": "Week 1 (Volume)", 
        "detail": "Kettlebell Press 40kg 5x5, Heavy Bent Over Row 40kg 4x8", 
        "rationale": "프레스 중량을 올리기 위해 광배근을 두껍게 만들어 안정적인 발사대를 구축합니다. 길항근의 성장은 프레스 하강 구간의 통제력을 높입니다."
      },
      ... (Generate 8 to 12 realistic, progressive sessions. The final session MUST reach or heavily overload near the TARGET weight)
    ]
  }
]`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o", 
      messages: [ { role: "system", content: systemPrompt }, { role: "user", content: `목표: ${target}, 현재: ${current}, 기간: ${months}개월` } ],
      response_format: { type: "json_object" }
    });

    if (data.error) throw new Error(data.error.message);
    let rawContent = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultObj = JSON.parse(rawContent);
    generatedRoutinesTemp = Array.isArray(resultObj) ? resultObj : (resultObj.routines || Object.values(resultObj)[0]);

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';
    
    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div style="margin-top:10px; font-size:0.8rem; color:var(--primary);">세부 훈련: 총 ${r.sessions.length}개 세션 (피킹 포함)</div>
      </div>`).join('');
  } catch (err) {
    alert("API 호출 오류: " + err.message);
    document.getElementById('btn-generate').style.display = 'block';
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
  const target = document.getElementById('goal-target').value.trim(); 
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value); 
  const routine = generatedRoutinesTemp[selectedRoutineIndex];
  
  let sessions = [], startDate = new Date(), endDate = new Date(); 
  endDate.setMonth(endDate.getMonth() + months);
  
  let totalSessions = routine.sessions.length; 
  let interval = ((endDate - startDate) / (1000 * 60 * 60 * 24)) / totalSessions;

  for(let i=0; i<totalSessions; i++) {
    let sDate = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
    sessions.push({ 
      id: i, 
      date: `${sDate.getFullYear()}.${String(sDate.getMonth()+1).padStart(2,'0')}.${String(sDate.getDate()).padStart(2,'0')}`, 
      title: routine.sessions[i].title, 
      detail: routine.sessions[i].detail, 
      rationale: routine.sessions[i].rationale,
      done: false 
    });
  }

  localStorage.setItem('pr_active_goal', JSON.stringify({ target, current, months, endDate: endDate.getTime(), totalSessions: totalSessions, completedSessions: 0, sessions }));
  
  document.getElementById('goal-setup-area').style.display = 'none'; 
  document.getElementById('ai-routines-area').style.display = 'none'; 
  document.getElementById('btn-generate').style.display = 'block'; 
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

function toggleRationale(idx) {
  const box = document.getElementById(`rationale-${idx}`);
  box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

function renderActiveGoal(goal) {
  document.getElementById('active-goal-title').innerText = goal.target; 
  document.getElementById('active-goal-desc').innerText = `현재: ${goal.current} ➔ 목표: ${goal.target}`;
  const diffDays = Math.ceil((goal.endDate - new Date().getTime()) / (1000 * 60 * 60 * 24)); 
  document.getElementById('active-goal-dday').innerText = `D-${diffDays > 0 ? diffDays : 'Day'}`;
  const percentage = goal.totalSessions === 0 ? 0 : Math.round((goal.completedSessions / goal.totalSessions) * 100);
  
  setTimeout(() => { document.getElementById('goal-progress-bar').style.width = `${percentage}%`; }, 100);
  document.getElementById('goal-progress-text').innerText = `${percentage}% 완료`; 
  document.getElementById('goal-session-count').innerText = `${goal.completedSessions} / ${goal.totalSessions} 세션`;
  
  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => `
    <div class="session-item ${s.done ? 'done' : ''}">
      <div style="flex: 1; padding-right: 10px;">
        <div class="session-name">${s.done ? '✅' : '🔥'} ${s.title}</div>
        <div style="font-size: 0.95rem; color: ${s.done ? '#888' : '#ddd'}; margin-bottom: 6px; white-space: pre-wrap; font-weight: bold; line-height: 1.4;">${s.detail}</div>
        
        <button class="btn-rationale" onclick="toggleRationale(${idx})">왜 이렇게 운동하나요? (AI 분석)</button>
        <div id="rationale-${idx}" class="rationale-box">
           💡 <b>전문 코치 분석:</b><br>${s.rationale}
        </div>

        <div class="session-date mt-10">${s.done ? s.date + ' 완료됨' : '목표일: ' + s.date}</div>
      </div>
      <button class="check-btn ${s.done ? 'done-btn' : ''}" ${s.done ? '' : `onclick="completeGoalSession(${idx})"`}>
        ${s.done ? '달성' : '달성하기'}
      </button>
    </div>
  `).join('');
}

function completeGoalSession(idx) {
  let goal = JSON.parse(localStorage.getItem('pr_active_goal')); 
  if(goal.sessions[idx].done) return;
  goal.sessions[idx].done = true; goal.completedSessions += 1; 
  localStorage.setItem('pr_active_goal', JSON.stringify(goal));
  const diffDays = Math.ceil((goal.endDate - new Date().getTime()) / (1000 * 60 * 60 * 24));
  showToast(`🎉 축하합니다! ${goal.totalSessions}회 중 ${goal.completedSessions}회를 달성했습니다.<br>목표까지 ${diffDays}일 남았습니다!`); 
  renderActiveGoal(goal);
}

function resetGoal() { 
  if(confirm("정말 현재 진행 중인 목표를 포기하시겠습니까? (이전 훈련 기록도 모두 초기화됩니다)")) { localStorage.removeItem('pr_active_goal'); checkActiveGoal(); } 
}
function showToast(msg) { 
  const t = document.getElementById("toast-msg"); t.innerHTML = msg; t.classList.add("show"); setTimeout(() => { t.classList.remove("show"); }, 3500); 
}

// ------------------------------------------------------------------------
// 🏃 공통 운동 기록 및 렌더링 로직
// ------------------------------------------------------------------------
function startWorkout() {
  if (selectedCategories.length === 0) return alert('홈 화면에서 부위를 먼저 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  document.getElementById('exercise-inputs-container').innerHTML = ''; addExerciseInput(); renderQuickSelectCards(); showView('record-view');
}

function createExerciseCardElement(ex, isQuickSelect = false) {
  const card = document.createElement('div'); card.className = 'ex-card-layout'; card.onclick = () => isQuickSelect ? addExerciseFromQuickSelect(ex.name) : openExerciseHistory(ex.name);
  card.innerHTML = `<div class="ex-card-left">${getAvatarHtml(ex.name, ex.b64_img)}</div><div class="ex-card-right"><div class="ex-header"><span class="ex-title">${ex.name}</span><div class="ex-icons"><span class="action-icon ${ex.fav?'icon-fav active':'icon-fav'}" onclick="event.stopPropagation(); toggleFavorite('${ex.name}')">⭐</span><span class="action-icon icon-trash" onclick="event.stopPropagation(); deleteExercise('${ex.name}')">🗑️</span></div></div><div class="ex-target"><span class="target-badge">${ex.target||ex.category}</span></div></div>`; 
  return card;
}

function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container'); container.innerHTML = ''; const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  Object.entries(exercises).filter(([_, d]) => selectedCategories.includes(d.category)).forEach(([name, data]) => { container.appendChild(createExerciseCardElement({name, ...data}, true)); });
}

function addExerciseInput(name = '') {
  const container = document.getElementById('exercise-inputs-container'); const isCardio = name && JSON.parse(localStorage.getItem('pr_exercises'))[name]?.category === '유산소';
  const div = document.createElement('div'); div.className = 'exercise-entry mb-20'; 
  div.innerHTML = `<input type="text" class="input-name mb-10" placeholder="종목명" value="${name}"><div class="input-row"><input type="number" class="input-weight" placeholder="${isCardio ? '거리(km)' : '무게(kg)'}"><input type="number" class="input-reps" placeholder="${isCardio ? '시간(분)' : '횟수(회)'}">${isCardio ? '' : '<input type="number" class="input-sets" placeholder="세트">'}</div>`; 
  container.appendChild(div);
}

function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry'); const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  let recordDate = timeType === 'past' ? new Date(document.getElementById('input-past-date').value) : new Date();
  const session = { date: recordDate.toLocaleString(), timestamp: recordDate.getTime(), categories: [...selectedCategories], workouts: [], totalVolume: 0 };
  
  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim(); const val1 = parseFloat(entry.querySelector('.input-weight').value) || 0; const val2 = parseFloat(entry.querySelector('.input-reps').value) || 0; const sets = entry.querySelector('.input-sets') ? parseInt(entry.querySelector('.input-sets').value) || 0 : 1;
    if (name) {
      const isCardio = exercises[name] && exercises[name].category === '유산소'; let volume = val1 * val2 * sets;
      session.workouts.push({ name, weight: val1, reps: val2, sets, volume, pace: isCardio && val1>0 ? (val2/val1).toFixed(2) : null }); session.totalVolume += volume;
      if (!exercises[name]) exercises[name] = { category: "기타", target: "전신", history: [] };
      exercises[name].history.push({ date: session.date, timestamp: session.timestamp, name, weight: val1, reps: val2, sets, volume, pace: isCardio && val1>0 ? (val2/val1).toFixed(2) : null });
    }
  });
  if(session.workouts.length === 0) return alert("데이터를 입력해주세요.");
  sessions[`S_${recordDate.getTime()}`] = session; localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises)); showView('hof-view');
}

function openExerciseHistory(name) {
  currentViewingExercise = name; const exercises = JSON.parse(localStorage.getItem('pr_exercises')); const container = document.getElementById('history-list'); container.innerHTML = ''; document.getElementById('history-title').innerText = `${name} 기록 비교`;
  if(!exercises[name].history || exercises[name].history.length === 0) { container.innerHTML = '<div style="color:#888;">기록이 없습니다.</div>'; } 
  else { exercises[name].history.sort((a, b) => b.timestamp - a.timestamp).forEach(h => {
    const isCardio = exercises[name].category === '유산소'; const card = document.createElement('div'); card.className = 'record-card'; card.style.display = 'flex'; card.style.justifyContent = 'space-between';
    card.innerHTML = `<div><div style="font-size:1.1rem; font-weight:bold; margin-bottom:5px;">📅 ${h.date.split(' 오전')[0].split(' 오후')[0]}</div><div style="color:#ddd;">${isCardio ? `${h.weight}km / ${h.reps}분` : `${h.weight}kg x ${h.reps}회 x ${h.sets}세트`}</div></div>
      <div style="text-align:right; display:flex; flex-direction:column; gap:5px;"><span class="volume-badge">${isCardio ? `총 ${h.reps}분` : `볼륨: ${h.volume.toLocaleString()}kg`}</span><span style="font-size:0.85rem; color:#aaa; font-weight:bold;">${isCardio ? `페이스: ${Math.floor(h.pace)}:${Math.round((h.pace%1)*60).toString().padStart(2,'0')}/km` : `최고: ${name}: ${h.weight}kg`}</span></div>`; container.appendChild(card);
  }); } showView('history-view');
}

function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const volList = document.getElementById('hof-volume-list'); volList.innerHTML = '';
  Object.entries(sessions).sort((a,b) => b[1].totalVolume - a[1].totalVolume).forEach(([key, s], i) => {
    const div = document.createElement('div'); div.className = 'record-card mb-10'; div.onclick = () => openSessionDetail(key);
    div.innerHTML = `<span class="volume-badge">${s.totalVolume.toLocaleString()}kg</span> <b>${i+1}위</b> | ${s.date.split(' ')[0]} 세션<br><small style="color:#888;">${s.categories.join(', ')}</small>`; volList.appendChild(div);
  });
}

function openSessionDetail(key) {
  const session = JSON.parse(localStorage.getItem('pr_sessions'))[key]; currentEditingSessionKey = key; document.getElementById('session-detail-title').innerText = `${session.date.split(' ')[0]} 상세`; document.getElementById('session-detail-info').innerText = `총 볼륨: ${session.totalVolume.toLocaleString()}kg`;
  document.getElementById('session-workout-list').innerHTML = session.workouts.map(w => `<div class="record-card mb-10" style="background:#222;"><b>${w.name}</b>: ${w.weight}kg(km) x ${w.reps}회(분) x ${w.sets}세트</div>`).join(''); showView('session-detail-view');
}

let currentSearchType = 'exercise';
function switchSearchTab(type) { 
  currentSearchType = type; document.querySelectorAll('#search-view .hof-tab').forEach(tab => tab.classList.remove('active')); document.querySelectorAll('#search-view .hof-tab')[type==='exercise'?0:1].classList.add('active'); 
  document.getElementById('search-exercise-area').style.display = type==='exercise'?'block':'none'; document.getElementById('search-session-area').style.display = type==='exercise'?'none':'block'; searchExercises(); 
}

function searchExercises() {
  const activeBtn = document.querySelector('#filter-categories .cat-btn.active-filter'); const filterCat = activeBtn ? activeBtn.dataset.filter : null;
  if (currentSearchType === 'exercise') { 
    const exercises = JSON.parse(localStorage.getItem('pr_exercises')); const container = document.getElementById('exercise-list'); container.innerHTML = ''; const query = document.getElementById('search-input').value.toUpperCase(); 
    Object.entries(exercises).forEach(([name, data]) => { if ((!filterCat || data.category === filterCat) && (!query || name.includes(query))) container.appendChild(createExerciseCardElement({name, ...data}, false)); }); 
  } else { 
    const sessions = JSON.parse(localStorage.getItem('pr_sessions')) || {}; const container = document.getElementById('session-search-list'); container.innerHTML = ''; 
    Object.entries(sessions).map(([key, data]) => ({ key, ...data })).sort((a, b) => b.timestamp - a.timestamp).forEach(s => { 
      if (filterCat && (!s.categories || !s.categories.includes(filterCat))) return; 
      container.innerHTML += `<div class="record-card highlight-red mb-10" onclick="openSessionDetail('${s.key}')"><span class="volume-badge">${s.totalVolume.toLocaleString()} kg</span><div class="record-title">📅 ${s.date.split(' ')[0]}</div><div class="record-details">부위: ${s.categories.join(', ')}</div></div>`; 
    }); 
  }
}

function addExerciseFromQuickSelect(exName) { const inputs = document.querySelectorAll('.exercise-entry .input-name'); let filled = false; for (let input of inputs) { if (input.value.trim() === '') { input.value = exName; filled = true; input.closest('.exercise-entry').style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.6)'; setTimeout(() => { input.closest('.exercise-entry').style.boxShadow = 'none'; }, 600); break; } } if (!filled) addExerciseInput(exName); }
function deleteExercise(name) { if(confirm(`[${name}] 삭제하시겠습니까?`)) { const ex = JSON.parse(localStorage.getItem('pr_exercises')); delete ex[name]; localStorage.setItem('pr_exercises', JSON.stringify(ex)); searchExercises(); } }
function toggleFavorite(name) { const ex = JSON.parse(localStorage.getItem('pr_exercises')); ex[name].fav = !ex[name].fav; localStorage.setItem('pr_exercises', JSON.stringify(ex)); searchExercises(); }
function switchHofTab(t) { document.querySelectorAll('#hof-view .hof-tab').forEach(tab => tab.classList.remove('active')); document.getElementById('hof-volume-list').style.display = 'none'; document.getElementById('hof-weight-list').style.display = 'none'; if (t === 'volume') { document.querySelectorAll('#hof-view .hof-tab')[0].classList.add('active'); document.getElementById('hof-volume-list').style.display = 'flex'; } else { document.querySelectorAll('#hof-view .hof-tab')[1].classList.add('active'); document.getElementById('hof-weight-list').style.display = 'flex'; } } 
function goBackFromSessionDetail() { showView(previousViewBeforeSession); } function togglePastDateInput() { const c = document.getElementById('past-date-container'); c.style.display = c.style.display === 'none' ? 'block' : 'none'; }
