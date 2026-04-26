let selectedCategories = [];
let currentViewingExercise = "";
let currentEditingSessionKey = "";
let previousViewBeforeSession = "hof-view";
let pendingDalleB64 = ""; // 생성된 DALL-E 이미지를 담아둘 변수

// 🔥 아바타 생성기: DALL-E 이미지가 있으면 그걸 쓰고, 없으면 글자로 렌더링
function getAvatarHtml(name, b64ImgData) {
  if (b64ImgData) {
    return `<div class="ex-avatar"><img src="data:image/png;base64,${b64ImgData}"></div>`;
  }
  const shortName = name.substring(0, 2).toUpperCase();
  return `<div class="ex-avatar">${shortName}</div>`;
}

// (기본 DB는 이전과 동일. b64_img 필드 추가 지원)
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

  document.querySelectorAll('#category-selection .cat-btn').forEach(btn => {
    btn.onclick = (e) => {
      const cat = e.target.dataset.cat;
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat); e.target.classList.remove('selected');
      } else {
        selectedCategories.push(cat); e.target.classList.add('selected');
      }
    };
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
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0,0);
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') searchExercises();
  if (viewId === 'goal-view') checkActiveGoal();
}

// ------------------------------------------------------------------------
// ⚙️ API 키 관리
// ------------------------------------------------------------------------
function saveApiKey() {
  const key = document.getElementById('openai-key').value.trim();
  localStorage.setItem('pr_openai_key', key);
  alert("API 키가 저장되었습니다.");
}

function getApiKey() {
  const key = localStorage.getItem('pr_openai_key');
  if (!key) {
    alert("설정 탭에서 OpenAI API 키를 먼저 입력해주세요!");
    showView('settings-view');
    return null;
  }
  return key;
}

// ------------------------------------------------------------------------
// 🎨 DALL-E 2 커스텀 아이콘 생성 로직 (Localstorage 최적화를 위해 256x256 Base64 사용)
// ------------------------------------------------------------------------
async function generateDalleIcon() {
  const key = getApiKey(); if (!key) return;
  const name = document.getElementById('custom-ex-name').value.trim();
  if (!name) return alert("종목 이름을 먼저 입력해주세요!");

  const btn = document.getElementById('btn-gen-img');
  btn.innerText = "🎨 AI가 그림을 그리는 중... (약 5초)";
  btn.disabled = true;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "dall-e-2", // 아이콘용으로는 DALL-E 2 256px가 비용/용량 면에서 압도적으로 유리합니다
        prompt: `A simple, flat, minimalist fitness vector icon of a person doing ${name}, dark grey background #333333, primary color orange #ff8c00, no text, clean UI asset`,
        n: 1,
        size: "256x256",
        response_format: "b64_json" // Base64로 직접 받아 Canvas CORS 에러 우회!
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    pendingDalleB64 = data.data[0].b64_json;
    document.getElementById('generated-img').src = `data:image/png;base64,${pendingDalleB64}`;
    document.getElementById('ai-img-preview').style.display = 'block';
    btn.innerText = "🎨 다시 그리기";
  } catch (err) {
    alert("이미지 생성 실패: " + err.message);
    btn.innerText = "🎨 AI로 종목 아이콘 그리기 (선택)";
  } finally {
    btn.disabled = false;
  }
}

function addCustomExercise() {
  const name = document.getElementById('custom-ex-name').value.trim().toUpperCase();
  const cat = document.getElementById('custom-ex-cat').value;
  const target = document.getElementById('custom-ex-target').value.trim();

  if (!name) return alert('종목 이름을 입력해주세요.');
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  if (exercises[name]) return alert('이미 존재하는 종목입니다.');

  // DALL-E 이미지가 생성되어 있다면 같이 저장
  exercises[name] = { category: cat, target: target || cat, fav: false, b64_img: pendingDalleB64, history: [] };
  localStorage.setItem('pr_exercises', JSON.stringify(exercises)); 
  alert(`[${name}] 종목 추가 완료!`);
  
  // 리셋
  document.getElementById('custom-ex-name').value = ''; 
  document.getElementById('custom-ex-target').value = ''; 
  document.getElementById('ai-img-preview').style.display = 'none';
  pendingDalleB64 = "";
  
  toggleCustomExerciseForm();
  searchExercises();
}

function toggleCustomExerciseForm() {
  const form = document.getElementById('custom-exercise-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// ------------------------------------------------------------------------
// 🚀 GPT-4o 연동 루틴 생성
// ------------------------------------------------------------------------
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;

async function generateAIRoutinesReal() {
  const key = getApiKey(); if (!key) return;
  const target = document.getElementById('goal-target').value.trim();
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value);

  if (!target || !current) return alert("목표와 현재 기록을 모두 입력해주세요.");

  document.getElementById('btn-generate').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-loading-text').innerText = "🧠 GPT-4o가 스트렝스 주기화 로직을 계산 중입니다...";

  const systemPrompt = `You are an elite strength coach and SFG Kettlebell Beast Tamer.
Generate exactly 3 workout routines for the user's goal as a JSON array.
1. Based on StrongEndurance/Scientific literature.
2. Based on Powerlifting Conjugate Method.
3. Based on personal adaptation (mention recovering joints and progressive overload).
JSON Format: [{"title": "String", "desc": "String", "sessionsCount": Number}]
sessionsCount should be total sessions over ${months} months (e.g., 10 to 30).`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `목표: ${target}, 현재: ${current}, 기간: ${months}개월` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // GPT-4o JSON 객체 파싱 ({"routines": [...] } 형태로 래핑되어 올 수 있음)
    const resultObj = JSON.parse(data.choices[0].message.content);
    generatedRoutinesTemp = Array.isArray(resultObj) ? resultObj : (resultObj.routines || Object.values(resultObj)[0]);

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';
    
    const list = document.getElementById('ai-routines-list');
    list.innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div style="margin-top:10px; font-size:0.8rem; color:var(--primary);">예상 훈련: 총 ${r.sessionsCount}회</div>
      </div>
    `).join('');
  } catch (err) {
    alert("GPT 호출 에러: " + err.message + "\n\n개발용 임시 루틴으로 대체합니다.");
    // 에러 시 폴백용 임시 데이터 생성
    generatedRoutinesTemp = [{ title: "1. SFG 기본 볼륨 루틴", desc: "주 2회 안정적인 볼륨으로 적응합니다.", sessionsCount: months * 8 }];
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';
    document.getElementById('ai-routines-list').innerHTML = `<div class="ai-routine-card" id="routine-card-0" onclick="selectRoutine(0)"><div class="ai-routine-title">임시 생성 루틴</div><div class="ai-routine-desc">API 연결 실패로 임시 루틴이 생성되었습니다.</div></div>`;
  }
}

function selectRoutine(index) {
  selectedRoutineIndex = index;
  document.querySelectorAll('.ai-routine-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`routine-card-${index}`).classList.add('selected');
}

function startSelectedRoutine() {
  if (selectedRoutineIndex === null) return alert("루틴을 먼저 선택해주세요.");
  
  const target = document.getElementById('goal-target').value.trim();
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value);
  const routine = generatedRoutinesTemp[selectedRoutineIndex];

  let sessions = [];
  let startDate = new Date();
  let endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  
  let totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  let interval = totalDays / routine.sessionsCount;

  for(let i=0; i<routine.sessionsCount; i++) {
    let sDate = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
    let dateStr = `${sDate.getFullYear()}.${String(sDate.getMonth()+1).padStart(2,'0')}.${String(sDate.getDate()).padStart(2,'0')}`;
    sessions.push({ id: i, date: dateStr, title: `${target.split(' ')[0]} 훈련 (Session ${i+1})`, done: false });
  }

  const goalData = { target, current, months, endDate: endDate.getTime(), totalSessions: routine.sessionsCount, completedSessions: 0, sessions: sessions };

  localStorage.setItem('pr_active_goal', JSON.stringify(goalData));
  document.getElementById('goal-setup-area').style.display = 'none';
  document.getElementById('ai-routines-area').style.display = 'none';
  document.getElementById('btn-generate').style.display = 'block';
  
  checkActiveGoal();
}

function checkActiveGoal() {
  const goalData = JSON.parse(localStorage.getItem('pr_active_goal'));
  if (goalData) {
    document.getElementById('goal-setup-area').style.display = 'none';
    document.getElementById('active-goal-area').style.display = 'block';
    renderActiveGoal(goalData);
  } else {
    document.getElementById('goal-setup-area').style.display = 'block';
    document.getElementById('active-goal-area').style.display = 'none';
  }
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

  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => {
    return s.done ? 
      `<div class="session-item done"><div><div class="session-name">✅ ${s.title}</div><div class="session-date">${s.date} 완료</div></div><button class="check-btn done-btn">달성</button></div>` :
      `<div class="session-item"><div><div class="session-name">🔥 ${s.title}</div><div class="session-date">목표일: ${s.date}</div></div><button class="check-btn" onclick="completeGoalSession(${idx})">달성하기</button></div>`;
  }).join('');
}

function completeGoalSession(index) {
  let goalData = JSON.parse(localStorage.getItem('pr_active_goal'));
  if(goalData.sessions[index].done) return;

  goalData.sessions[index].done = true;
  goalData.completedSessions += 1;
  localStorage.setItem('pr_active_goal', JSON.stringify(goalData));

  const percentage = Math.round((goalData.completedSessions / goalData.totalSessions) * 100);
  const diffDays = Math.ceil((goalData.endDate - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  showToast(`🎉 축하합니다! ${goalData.totalSessions}회 중 ${goalData.completedSessions}회를 달성했습니다.<br>진도율 ${percentage}%! 목표까지 ${diffDays}일 남았습니다.`);
  renderActiveGoal(goalData);
}

function resetGoal() {
  if(!confirm("진행 중인 목표 기록을 정말 초기화하시겠습니까?")) return;
  localStorage.removeItem('pr_active_goal');
  checkActiveGoal();
}

function showToast(msg) {
  const toast = document.getElementById("toast-msg");
  toast.innerHTML = msg;
  toast.classList.add("show");
  setTimeout(() => { toast.classList.remove("show"); }, 3500);
}

// ------------------------------------------------------------------------
// 이하 기존 운동 렌더링 로직 (getAvatarHtml 적용)
// ------------------------------------------------------------------------
function createExerciseCardElement(ex, isQuickSelect = false) {
  const card = document.createElement('div');
  card.className = 'ex-card-layout';
  card.onclick = () => isQuickSelect ? addExerciseFromQuickSelect(ex.name) : openExerciseHistory(ex.name);
  const starClass = ex.fav ? 'icon-fav active' : 'icon-fav';
  
  // DALL-E 이미지가 있으면 넣고, 없으면 글자 반환
  card.innerHTML = `
    <div class="ex-card-left">${getAvatarHtml(ex.name, ex.b64_img)}</div>
    <div class="ex-card-right">
      <div class="ex-header">
        <span class="ex-title">${ex.name}</span>
        <div class="ex-icons">
          <span class="action-icon ${starClass}" onclick="event.stopPropagation(); toggleFavorite('${ex.name}')">⭐</span>
          <span class="action-icon icon-trash" onclick="event.stopPropagation(); deleteExercise('${ex.name}')">🗑️</span>
        </div>
      </div>
      <div class="ex-target"><span class="target-badge">${ex.target || ex.category}</span></div>
    </div>
  `;
  return card;
}

function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container'); container.innerHTML = ''; 
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  Object.entries(exercises).filter(([_, d]) => selectedCategories.includes(d.category)).forEach(([name, data]) => {
    container.appendChild(createExerciseCardElement({name, ...data}, true));
  });
}

function renderAllExercises(filterCat, searchQuery) {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list'); container.innerHTML = '';
  Object.entries(exercises).forEach(([name, data]) => {
    if ((!filterCat || data.category === filterCat) && (!searchQuery || name.includes(searchQuery))) {
      container.appendChild(createExerciseCardElement({name, ...data}, false));
    }
  });
}

// (나머지 기본 로직 - startWorkout, addExerciseInput, saveRecord, openExerciseHistory 등은 버전 4.0과 동일하게 유지됩니다)
function startWorkout() {
  if (selectedCategories.length === 0) return alert('카테고리를 선택하세요.');
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  document.getElementById('exercise-inputs-container').innerHTML = ''; addExerciseInput();
  renderQuickSelectCards(); showView('record-view');
}
function addExerciseInput(name = '') {
  const container = document.getElementById('exercise-inputs-container');
  const isCardio = name && JSON.parse(localStorage.getItem('pr_exercises'))[name]?.category === '유산소';
  const div = document.createElement('div'); div.className = 'exercise-entry mb-20';
  div.innerHTML = `<input type="text" class="input-name mb-10" placeholder="종목명" value="${name}">
    <div class="input-row"><input type="number" class="input-weight" placeholder="${isCardio ? '거리(km)' : '무게(kg)'}"><input type="number" class="input-reps" placeholder="${isCardio ? '시간(분)' : '횟수(회)'}">${isCardio ? '' : '<input type="number" class="input-sets" placeholder="세트">'}</div>`;
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
    const sets = entry.querySelector('.input-sets') ? parseInt(entry.querySelector('.input-sets').value) || 0 : 1;
    if (name) {
      const isCardio = exercises[name] && exercises[name].category === '유산소';
      let volume = val1 * val2 * sets;
      session.workouts.push({ name, weight: val1, reps: val2, sets, volume, pace: isCardio && val1>0 ? (val2/val1).toFixed(2) : null });
      session.totalVolume += volume;
      if (!exercises[name]) exercises[name] = { category: "기타", target: "전신", history: [] };
      exercises[name].history.push({ date: session.date, timestamp: session.timestamp, name, weight: val1, reps: val2, sets, volume, pace: isCardio && val1>0 ? (val2/val1).toFixed(2) : null });
    }
  });
  sessions[`S_${recordDate.getTime()}`] = session;
  localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  showView('hof-view');
}
function openExerciseHistory(name) {
  currentViewingExercise = name;
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('history-list'); container.innerHTML = '';
  document.getElementById('history-title').innerText = `${name} 기록 비교`;
  exercises[name].history.sort((a, b) => b.timestamp - a.timestamp).forEach(h => {
    const isCardio = exercises[name].category === '유산소';
    const card = document.createElement('div'); card.className = 'record-card'; card.style.display = 'flex'; card.style.justifyContent = 'space-between';
    card.innerHTML = `<div><div style="font-size:1.1rem; font-weight:bold; margin-bottom:5px;">📅 ${h.date.split(' 오전')[0].split(' 오후')[0]}</div><div style="color:#ddd;">${isCardio ? `${h.weight}km / ${h.reps}분` : `${h.weight}kg x ${h.reps}회 x ${h.sets}세트`}</div></div>
      <div style="text-align:right; display:flex; flex-direction:column; gap:5px;"><span class="volume-badge">${isCardio ? `총 ${h.reps}분` : `볼륨: ${h.volume.toLocaleString()}kg`}</span><span style="font-size:0.85rem; color:#aaa; font-weight:bold;">${isCardio ? `페이스: ${Math.floor(h.pace)}:${Math.round((h.pace%1)*60).toString().padStart(2,'0')}/km` : `최고: ${name}: ${h.weight}kg`}</span></div>`;
    container.appendChild(card);
  });
  showView('history-view');
}
function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const volList = document.getElementById('hof-volume-list'); volList.innerHTML = '';
  Object.entries(sessions).sort((a,b) => b[1].totalVolume - a[1].totalVolume).forEach(([key, s], i) => {
    const div = document.createElement('div'); div.className = 'record-card mb-10'; div.onclick = () => openSessionDetail(key);
    div.innerHTML = `<span class="volume-badge">${s.totalVolume.toLocaleString()}kg</span> <b>${i+1}위</b> | ${s.date.split(' ')[0]} 세션<br><small style="color:#888;">${s.categories.join(', ')}</small>`;
    volList.appendChild(div);
  });
}
function openSessionDetail(key) {
  const session = JSON.parse(localStorage.getItem('pr_sessions'))[key]; currentEditingSessionKey = key;
  document.getElementById('session-detail-title').innerText = `${session.date.split(' ')[0]} 상세`; document.getElementById('session-detail-info').innerText = `총 볼륨: ${session.totalVolume.toLocaleString()}kg`;
  document.getElementById('session-workout-list').innerHTML = session.workouts.map(w => `<div class="record-card mb-10" style="background:#222;"><b>${w.name}</b>: ${w.weight}kg(km) x ${w.reps}회(분) x ${w.sets}세트</div>`).join('');
  showView('session-detail-view');
}
let currentSearchType = 'exercise';
function switchSearchTab(type) {
  currentSearchType = type; document.querySelectorAll('#search-view .hof-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#search-view .hof-tab')[type==='exercise'?0:1].classList.add('active');
  document.getElementById('search-exercise-area').style.display = type==='exercise'?'block':'none';
  document.getElementById('search-session-area').style.display = type==='exercise'?'none':'block';
  searchExercises();
}
function filterByCategory(cat, btn) {
  const isActive = btn.classList.contains('active-filter'); document.querySelectorAll('#filter-categories .cat-btn').forEach(b => b.classList.remove('active-filter'));
  if (!isActive) btn.classList.add('active-filter'); searchExercises();
}
function searchExercises() {
  const activeBtn = document.querySelector('#filter-categories .cat-btn.active-filter'); const filterCat = activeBtn ? activeBtn.innerText : null;
  if (currentSearchType === 'exercise') { renderAllExercises(filterCat, document.getElementById('search-input').value.toUpperCase()); } 
  else {
    const sessions = JSON.parse(localStorage.getItem('pr_sessions')) || {}; const container = document.getElementById('session-search-list'); container.innerHTML = '';
    Object.entries(sessions).map(([key, data]) => ({ key, ...data })).sort((a, b) => b.timestamp - a.timestamp).forEach(s => {
      if (filterCat && (!s.categories || !s.categories.includes(filterCat))) return;
      container.innerHTML += `<div class="record-card highlight-red" onclick="openSessionDetail('${s.key}', 'search-view')"><span class="volume-badge">${s.totalVolume.toLocaleString()} kg</span><div class="record-title">📅 ${s.date.split(' ')[0]}</div><div class="record-details">부위: ${s.categories.join(', ')}</div></div>`;
    });
  }
}
function deleteExercise(name) { if(confirm(`[${name}] 종목을 삭제하시겠습니까?`)) { const ex = JSON.parse(localStorage.getItem('pr_exercises')); delete ex[name]; localStorage.setItem('pr_exercises', JSON.stringify(ex)); searchExercises(); } }
function toggleFavorite(name) { const ex = JSON.parse(localStorage.getItem('pr_exercises')); ex[name].fav = !ex[name].fav; localStorage.setItem('pr_exercises', JSON.stringify(ex)); searchExercises(); }
function switchHofTab(t) {} function goBackFromSessionDetail() { showView(previousViewBeforeSession); } function togglePastDateInput() { const c = document.getElementById('past-date-container'); c.style.display = c.style.display === 'none' ? 'block' : 'none'; }
