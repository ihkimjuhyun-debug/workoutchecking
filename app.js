let selectedCategories = [];
let generatedRoutinesTemp = [];
let selectedRoutineIndex = null;
let pendingDalleB64 = "";

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkActiveGoals();
  document.getElementById('openai-key').value = localStorage.getItem('pr_openai_key') || '';
  
  // 메인 카테고리 선택
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

  // 검색 필터 선택
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => {
    btn.onclick = function() {
      const isActive = this.classList.contains('active-filter');
      document.querySelectorAll('#filter-categories .cat-btn').forEach(b => b.classList.remove('active-filter'));
      if (!isActive) this.classList.add('active-filter');
      searchExercises();
    }
  });
});

function initStorage() {
  if (!localStorage.getItem('pr_sessions')) localStorage.setItem('pr_sessions', JSON.stringify({}));
  if (!localStorage.getItem('pr_exercises')) {
    localStorage.setItem('pr_exercises', JSON.stringify({
      "데드리프트": { category: "등", target: "후면", history: [] },
      "OHP": { category: "어깨", target: "어깨", history: [] },
      "스쿼트": { category: "하체", target: "하체", history: [] },
      "벤치프레스": { category: "가슴", target: "가슴", history: [] }
    }));
  }
}

// 🔥 유틸리티: 초 단위까지 완벽한 날짜 포맷 생성
function getExactDateString(timestamp) {
  const d = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

// -------------------------------------------------------------------------
// 🏃 운동 기록 및 낱말 카드 (Quick Select) 로직
// -------------------------------------------------------------------------
function startWorkout() {
  if (selectedCategories.length === 0) return alert('부위를 먼저 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  document.getElementById('exercise-inputs-container').innerHTML = ''; 
  addExerciseInput(); 
  renderQuickSelectCards(); 
  showView('record-view');
}

// 🔥 낱말 카드 렌더링 (가로 스크롤 카드)
function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container'); 
  container.innerHTML = ''; 
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  
  Object.entries(exercises).filter(([_, data]) => selectedCategories.includes(data.category)).forEach(([name, data]) => {
    const card = document.createElement('div');
    // CSS 인라인 스타일로 낱말 카드 디자인 강제 적용
    card.style.cssText = "min-width: 120px; background: #2a2a2a; border: 1px solid #444; border-radius: 8px; padding: 10px; cursor: pointer; text-align: center; flex-shrink: 0; transition: 0.2s;";
    card.onmouseover = () => card.style.borderColor = "var(--primary)";
    card.onmouseout = () => card.style.borderColor = "#444";
    card.onclick = () => addExerciseInput(name); // 터치 시 바로 종목 추가
    
    card.innerHTML = `
      <div style="font-weight: bold; font-size: 1rem; color: #fff; margin-bottom: 4px;">${name}</div>
      <div style="font-size: 0.75rem; color: var(--primary); background: rgba(255,140,0,0.1); border-radius: 4px; display: inline-block; padding: 2px 6px;">${data.category}</div>
    `;
    container.appendChild(card);
  });
}

function addExerciseInput(name = '') {
  const container = document.getElementById('exercise-inputs-container');
  const div = document.createElement('div'); 
  div.className = 'exercise-entry mb-20'; 
  div.style.cssText = "background: #1e1e1e; padding: 15px; border-radius: 10px; border: 1px solid #333;";
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between;">
      <input type="text" class="input-name mb-10" placeholder="종목명" value="${name}" style="flex:1;">
      <button class="secondary-btn" style="width:auto; height:45px; margin-left:10px; background:transparent; border:none; color:#ff4a4a;" onclick="this.parentElement.parentElement.remove()">❌</button>
    </div>
    <div class="input-row">
      <input type="number" class="input-weight" placeholder="무게(kg)">
      <input type="number" class="input-reps" placeholder="횟수(회)">
      <input type="number" class="input-sets" placeholder="세트수">
    </div>`; 
  container.appendChild(div);
}

// 🔥 다른 곳에서 특정 종목을 오늘 일지에 즉시 추가하는 브릿지 함수
function jumpToRecordView(exName, exCategory) {
  // 카테고리 자동 활성화
  if (!selectedCategories.includes(exCategory)) {
    selectedCategories.push(exCategory);
    document.querySelectorAll('#category-selection .cat-btn').forEach(btn => {
      if(btn.dataset.cat === exCategory) btn.classList.add('selected');
    });
  }
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  
  showView('record-view');
  renderQuickSelectCards();
  
  // 이미 빈 칸이 있으면 거기 채우고, 아니면 새로 만듦
  const inputs = document.querySelectorAll('.exercise-entry .input-name');
  let filled = false;
  for (let input of inputs) {
    if (input.value.trim() === '') {
      input.value = exName;
      filled = true;
      break;
    }
  }
  if (!filled) addExerciseInput(exName);
  showToast(`[${exName}] 종목이 일지에 추가되었습니다.`);
}

function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry');
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  
  let recordDate = new Date();
  if (timeType === 'past') {
    const pastVal = document.getElementById('input-past-date').value;
    if(!pastVal) return alert("날짜와 시간을 선택해주세요.");
    recordDate = new Date(pastVal);
  }

  const session = { 
    exactDateStr: getExactDateString(recordDate.getTime()), // 🔥 초 단위 날짜 저장
    timestamp: recordDate.getTime(), 
    categories: [...selectedCategories], 
    workouts: [], 
    totalVolume: 0 
  };
  
  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim();
    const val1 = parseFloat(entry.querySelector('.input-weight').value) || 0;
    const val2 = parseFloat(entry.querySelector('.input-reps').value) || 0;
    const sets = parseInt(entry.querySelector('.input-sets').value) || 1; // 기본 1세트
    
    if (name && val1 > 0 && val2 > 0) {
      let volume = val1 * val2 * sets;
      session.workouts.push({ name, weight: val1, reps: val2, sets, volume });
      session.totalVolume += volume;
      
      if (!exercises[name]) exercises[name] = { category: "기타", history: [] };
      exercises[name].history.push({ 
        exactDateStr: session.exactDateStr, 
        timestamp: session.timestamp, 
        weight: val1, reps: val2, sets, volume 
      });
    }
  });
  
  if(session.workouts.length === 0) return alert("종목명과 무게, 횟수를 정확히 입력해주세요.");
  
  sessions[`S_${recordDate.getTime()}`] = session;
  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  
  // 입력창 초기화
  document.getElementById('exercise-inputs-container').innerHTML = '';
  showToast("성공적으로 기록되었습니다!");
  showView('hof-view');
}

// -------------------------------------------------------------------------
// 🏆 명예의 전당 및 세션 상세 뷰 (터치 기능 완벽 복구)
// -------------------------------------------------------------------------
function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const volList = document.getElementById('hof-volume-list');
  volList.innerHTML = '';
  
  Object.entries(sessions).sort((a,b) => b[1].totalVolume - a[1].totalVolume).forEach(([key, s], i) => {
    const div = document.createElement('div'); 
    div.className = 'record-card mb-10';
    div.style.cursor = 'pointer';
    div.onclick = () => openSessionDetail(key); // 🔥 클릭 시 상세 뷰 오픈
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span class="volume-badge" style="font-size:1rem; padding:4px 8px;">${s.totalVolume.toLocaleString()}kg</span> 
          <b style="color:var(--primary); margin-left:5px;">${i+1}위</b>
        </div>
        <div style="font-size:0.8rem; color:#aaa;">터치하여 세부 기록 보기 🔍</div>
      </div>
      <div style="margin-top:10px; font-weight:bold; font-size:1.1rem; color:#fff;">📅 ${s.exactDateStr || getExactDateString(s.timestamp)}</div>
      <small style="color:#888;">훈련 부위: ${s.categories.join(', ')}</small>
    `;
    volList.appendChild(div);
  });
}

function openSessionDetail(key) {
  const session = JSON.parse(localStorage.getItem('pr_sessions'))[key];
  if (!session) return;

  document.getElementById('session-detail-title').innerText = `📅 ${session.exactDateStr || getExactDateString(session.timestamp)}`;
  document.getElementById('session-detail-info').innerText = `총 누적 볼륨: ${session.totalVolume.toLocaleString()}kg`;
  
  const list = document.getElementById('session-workout-list');
  list.innerHTML = session.workouts.map(w => `
    <div class="record-card mb-10" style="background:#222; border-left: 3px solid var(--primary);">
      <div style="font-size:1.1rem; font-weight:bold; color:#fff; margin-bottom:5px;">${w.name}</div>
      <div style="color:#ddd;">
        <span style="display:inline-block; width:60px;">무게:</span> <b style="color:var(--primary);">${w.weight}kg</b><br>
        <span style="display:inline-block; width:60px;">반복:</span> <b>${w.reps}회</b> x ${w.sets}세트<br>
        <span style="display:inline-block; width:60px;">볼륨:</span> <span style="color:#aaa;">${w.volume.toLocaleString()}kg</span>
      </div>
    </div>
  `).join('');
  
  showView('session-detail-view');
}

function togglePastDateInput() { 
  const c = document.getElementById('past-date-container'); 
  c.style.display = c.style.display === 'none' ? 'block' : 'none'; 
}
function switchHofTab(t) { 
  document.querySelectorAll('#hof-view .hof-tab').forEach(tab => tab.classList.remove('active')); 
  if (t === 'volume') document.querySelectorAll('#hof-view .hof-tab')[0].classList.add('active'); 
}

// -------------------------------------------------------------------------
// 🔍 검색, 종목 관리 및 과거 히스토리
// -------------------------------------------------------------------------
function searchExercises() {
  const filterCat = document.querySelector('#filter-categories .cat-btn.active-filter')?.dataset.filter;
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list'); 
  container.innerHTML = '';
  const query = document.getElementById('search-input').value.toUpperCase();
  
  Object.entries(exercises).forEach(([name, data]) => {
    if ((!filterCat || data.category === filterCat) && (!query || name.includes(query))) {
      const card = document.createElement('div');
      card.className = 'record-card mb-10';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b style="font-size:1.1rem;">${name}</b> 
            <span class="target-badge" style="margin-left:5px;">${data.category}</span>
          </div>
          <div style="display:flex; gap:5px;">
            <button class="secondary-btn" style="padding:6px 10px; font-size:0.8rem; border-color:#888;" onclick="openExerciseHistory('${name}')">📜 기록</button>
            <button class="primary-btn" style="padding:6px 10px; font-size:0.8rem; width:auto;" onclick="jumpToRecordView('${name}', '${data.category}')">➕ 추가</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    }
  });
}

function openExerciseHistory(name) {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const history = exercises[name].history || [];
  document.getElementById('history-title').innerText = `${name} 성장 기록`;
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (history.length === 0) {
    list.innerHTML = '<div style="color:#888; text-align:center;">기록이 없습니다.</div>';
  } else {
    // 최신순 정렬
    history.sort((a,b) => b.timestamp - a.timestamp).forEach(h => {
      list.innerHTML += `
        <div class="record-card mb-10" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.9rem; color:#aaa; margin-bottom:4px;">📅 ${h.exactDateStr || getExactDateString(h.timestamp)}</div>
            <div style="font-size:1.1rem; color:#fff; font-weight:bold;">${h.weight}kg <span style="font-size:0.9rem; color:#888;">x ${h.reps}회 x ${h.sets}세트</span></div>
          </div>
          <div><button class="primary-btn" style="padding:6px 10px; font-size:0.8rem;" onclick="jumpToRecordView('${name}', '${exercises[name].category}')">➕ 다시하기</button></div>
        </div>
      `;
    });
  }
  showView('history-view');
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
  if (ex[name]) return alert('이미 존재하는 종목입니다.');
  ex[name] = { category: cat, target: "전신", history: [], b64_img: pendingDalleB64 };
  localStorage.setItem('pr_exercises', JSON.stringify(ex));
  alert('추가 완료!'); 
  toggleCustomExerciseForm(); 
  searchExercises();
}


// -------------------------------------------------------------------------
// 🔥 다중 AI 목표 및 스케줄링 시스템 (v10 로직 완벽 보존)
// -------------------------------------------------------------------------
function toggleGoalSetup() {
  const setupArea = document.getElementById('goal-setup-area');
  setupArea.style.display = setupArea.style.display === 'none' ? 'block' : 'none';
  document.getElementById('ai-routines-area').style.display = 'none';
}

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

  const targetSessionCount = dur * 10; 
  const systemPrompt = `당신은 세계 최고의 스트렝스 코치입니다.
목표: ${name} ${tw}kg ${tr}회 도달. 현재: ${cw}kg ${cr}회 가능.

[규칙]
1. 정확한 중량(kg) 명시: "라이트", "헤비" 같은 표현 금지. 모든 종목에 정확한 kg 계산값 제시.
2. 체중/영양: 목표 달성을 위한 현실적 체급과 하루 6끼 식단(단백질/탄수화물 위주) 제시.
3. 횟수: 주 2.5회 빈도로 정확히 ${targetSessionCount}개의 세션 배열 생성.
4. 보조운동: 메인 + 보조 2~3종목 구체적으로 훈련(detail)에 포함.
5. 무조건 한국어 출력.

JSON 구조:
{
  "recommendedWeight": "목표 체중 (예: 95kg)", "nutrition": "상세 식단 가이드",
  "routines": [{ "title": "루틴 명칭", "desc": "요약", "sessions": [{ "title": "주차 훈련", "detail": "종목명 숫자kg 숫자회 숫자세트", "rationale": "생리학적 이유" }] }]
}`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "정확한 무게(kg)가 명시된 루틴 생성 시작." }], response_format: { type: "json_object" }
    });
    const parsed = JSON.parse(data.choices[0].message.content);
    const globalWeight = parsed.recommendedWeight || "분석 누락"; const globalNutrition = parsed.nutrition || "분석 누락";
    let extracted = parsed.routines || parsed.routine || Object.values(parsed).find(Array.isArray) || [];

    generatedRoutinesTemp = extracted.map(r => ({ ...r, recommendedWeight: globalWeight, nutrition: globalNutrition }));

    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div class="mt-10" style="font-size:0.8rem; color:var(--primary); font-weight:bold;">총 ${r.sessions ? r.sessions.length : 0}개 세션 설계됨</div>
      </div>`).join('');
    document.getElementById('ai-loading').style.display = 'none'; document.getElementById('ai-routines-area').style.display = 'block';
  } catch (err) { alert("오류: " + err.message); document.getElementById('btn-generate-routine').style.display = 'block'; document.getElementById('ai-loading').style.display = 'none'; }
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
  const startDate = new Date(); const endDate = new Date(); endDate.setMonth(endDate.getMonth() + dur);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interval = totalDays / (totalSessions - 1 || 1);

  const sessions = routine.sessions.map((s, i) => {
    const sDate = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
    return { ...s, date: `${sDate.getFullYear()}.${String(sDate.getMonth() + 1).padStart(2, '0')}.${String(sDate.getDate()).padStart(2, '0')}`, done: false };
  });

  const newGoal = {
    id: Date.now(), title: `${name} ${tw}kg ${tr}회 달성 목표`, target: `${tw}kg ${tr}회`,
    recommendedWeight: routine.recommendedWeight, nutrition: routine.nutrition,
    sessions: sessions, total: totalSessions, completed: 0, endDate: endDate.getTime()
  };

  let goals = JSON.parse(localStorage.getItem('pr_active_goals')) || [];
  goals.unshift(newGoal); // 새 목표를 맨 위에 추가
  localStorage.setItem('pr_active_goals', JSON.stringify(goals));
  
  toggleGoalSetup(); checkActiveGoals();
  document.getElementById('btn-generate-routine').style.display = 'block';
}

function checkActiveGoals() {
  const goals = JSON.parse(localStorage.getItem('pr_active_goals')) || [];
  const listContainer = document.getElementById('active-goals-list');
  const header = document.getElementById('active-goals-header');
  if (goals.length > 0) { header.style.display = 'flex'; renderActiveGoals(goals); } 
  else { header.style.display = 'none'; listContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">생성된 목표가 없습니다. 새 목표를 추가해보세요!</div>'; document.getElementById('goal-setup-area').style.display = 'block'; }
}

function renderActiveGoals(goals) {
  let html = '';
  goals.forEach((goal, gIndex) => {
    const percent = goal.total === 0 ? 0 : Math.round((goal.completed / goal.total) * 100);
    const diffDays = Math.ceil((goal.endDate - Date.now()) / (1000 * 60 * 60 * 24));
    let ddayText = diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)} (종료)`);
    
    let msg = "💪 새로운 도전을 응원합니다! 첫 세션을 시작하세요.";
    if(percent > 0 && percent < 40) msg = "🔥 초반 페이스가 좋습니다! 꾸준함이 무기입니다.";
    else if(percent >= 40 && percent < 70) msg = "🚀 벌써 절반에 가까워집니다. 한계에 부딪혀보세요!";
    else if(percent >= 70 && percent < 100) msg = "👑 고지가 눈앞입니다. 피킹 사이클에 집중하세요!";
    else if(percent === 100) msg = "🏆 완벽하게 달성했습니다! 당신은 진정한 비스트입니다.";

    html += `
      <div class="record-card mb-20" style="border-color: ${percent === 100 ? '#4CAF50' : 'var(--primary)'};">
        <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-10">
          <h3 style="color:${percent === 100 ? '#4CAF50' : 'var(--primary)'}; font-size:1.2rem; margin:0;">${goal.title}</h3>
          <span style="font-weight:900; color:#fff; background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:6px;">${ddayText}</span>
        </div>
        <div style="font-size:0.85rem; color:#aaa; line-height:1.4;" class="mb-10"><b>권장 체중:</b> ${goal.recommendedWeight}<br><b>영양 가이드:</b> ${goal.nutrition}</div>
        <div class="progress-bg mb-5"><div class="progress-fill" style="width:${percent}%; background:${percent === 100 ? '#4CAF50' : 'var(--primary)'}"></div></div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:bold;" class="mb-10">
          <span style="color:${percent === 100 ? '#4CAF50' : 'var(--primary)'};">${percent}% 완료</span><span>${goal.completed} / ${goal.total} 세션</span>
        </div>
        <div style="background:rgba(255,140,0,0.1); padding:10px; border-radius:8px; color:var(--primary); font-weight:bold; font-size:0.9rem;" class="mb-15">${msg}</div>
        <div style="display:flex; gap:10px;">
          <button class="secondary-btn" style="flex:1;" onclick="toggleSessionList(${gIndex})">📅 세부 훈련 스케줄 보기</button>
          <button class="secondary-btn" style="flex:0.3; border-color:#ff4a4a; color:#ff4a4a;" onclick="deleteGoal(${gIndex})">삭제</button>
        </div>
        <div id="sessions-list-${gIndex}" style="display:none; margin-top:15px; border-top:1px solid #333; padding-top:15px;">
          ${goal.sessions.map((s, sIndex) => `
            <div class="session-item ${s.done ? 'done' : ''}">
              <div style="flex:1">
                <div style="color: ${s.done ? '#888' : 'var(--primary)'}; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">📅 ${s.date} ${s.done ? '(완료됨)' : ''}</div>
                <div class="session-name" style="font-size: 1.1rem; color: ${s.done ? '#888' : '#fff'};">${s.title}</div>
                <div style="font-weight:bold; color: ${s.done ? '#666' : '#ddd'}; margin: 8px 0; font-size: 0.95rem; white-space: pre-wrap; line-height: 1.5;">${s.detail}</div>
                <button class="btn-rationale" onclick="toggleSessionRationale(${gIndex}, ${sIndex})">💡 코치 분석 보기</button>
                <div id="rationale-${gIndex}-${sIndex}" class="rationale-box" style="display:none; margin-top:10px; background: rgba(0,0,0,0.2); border-radius: 8px;">${s.rationale}</div>
              </div>
              <button class="check-btn" style="height:fit-content;" onclick="completeSession(${gIndex}, ${sIndex})">${s.done ? '완료' : '달성'}</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  document.getElementById('active-goals-list').innerHTML = html;
}

function toggleSessionList(gIndex) {
  const el = document.getElementById(`sessions-list-${gIndex}`);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function toggleSessionRationale(gIndex, sIndex) {
  const box = document.getElementById(`rationale-${gIndex}-${sIndex}`);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}
function completeSession(gIndex, sIndex) {
  let goals = JSON.parse(localStorage.getItem('pr_active_goals'));
  if (goals[gIndex].sessions[sIndex].done) return;
  goals[gIndex].sessions[sIndex].done = true; goals[gIndex].completed++;
  localStorage.setItem('pr_active_goals', JSON.stringify(goals));
  showToast("세션을 완벽히 달성했습니다!");
  checkActiveGoals(); 
  document.getElementById(`sessions-list-${gIndex}`).style.display = 'block'; 
}
function deleteGoal(gIndex) {
  if (confirm("이 목표와 훈련 기록을 삭제하시겠습니까?")) {
    let goals = JSON.parse(localStorage.getItem('pr_active_goals'));
    goals.splice(gIndex, 1);
    localStorage.setItem('pr_active_goals', JSON.stringify(goals));
    checkActiveGoals();
  }
}
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0, 0);
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'goal-view') checkActiveGoals();
}
function saveApiKey() { localStorage.setItem('pr_openai_key', document.getElementById('openai-key').value); alert('API 키 저장 완료.'); }
function showToast(m) { const t = document.getElementById('toast-msg'); t.innerText = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
