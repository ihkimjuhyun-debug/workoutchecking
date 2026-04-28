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

// 🔥 루틴 생성 (100% 한국어 강제 및 영양/체중 파싱 강화)
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

  // 🔥 프롬프트 전면 개편: 한국어 강제, 보디빌딩식 6끼 식단 컨텍스트, 단일 JSON 구조 강제
  const systemPrompt = `당신은 20년 경력의 엘리트 스트렝스 코치이자 영양 전문가입니다.
사용자의 1RM(Epley 공식: 중량 * (1 + 횟수/30))을 분석하여 목표 달성을 위한 피킹(Peaking) 루틴과 영양 가이드를 JSON으로 작성하세요.
현재 능력: ${cw}kg ${cr}회 / 목표: ${tw}kg ${tr}회

[필수 규칙 - 위반 시 치명적 오류 발생]
1. 언어 강제: 모든 출력값(title, desc, detail, rationale, nutrition 등)은 **무조건 100% 한국어**로 작성하세요. 영어 사용 절대 금지.
2. 영양 가이드(nutrition): 하루 6끼 식사(끼니당 단백질 40g, 탄수화물 80g 수준)를 수행하는 고강도 훈련자의 식단 패턴에 맞추어, 이 목표를 달성하기 위한 하루 총 매크로(탄/단/지)와 식단 조언을 한국어로 작성하세요.
3. 체중(recommendedWeight): 목표 중량에 걸맞은 적정 체중을 한국어로 제시하세요. (예: 85kg)
4. 피킹 훈련: 주차별로 점진적 과부하를 거쳐 마지막 세션은 반드시 목표 중량(${tw}kg)에 도달해야 합니다.
5. 숫자 표기법: 모든 훈련 detail의 숫자 뒤에는 '회', '세트'를 한국어로 붙이세요. (예: 130kg 1회 3세트)
6. 코치 분석(rationale): 보조 운동이 본 운동에 기여하는 역학적 이유(발사대 역할, 길항근 수축, 방산 효과 등)를 전문적인 한국어로 설명하세요.

반드시 아래 JSON 형태를 그대로 복사하여 값만 채워 응답하세요:
{
  "recommendedWeight": "목표 체중 (예: 85kg)",
  "nutrition": "식단 조언 (한국어)",
  "routines": [
    {
      "title": "루틴 이름 (한국어)",
      "desc": "루틴 요약 (한국어)",
      "sessions": [
        {
          "title": "주차 이름 (예: 1주차 - 볼륨 적응기)",
          "detail": "훈련 내용 (예: 100kg 5회 5세트)",
          "rationale": "전문 코치 분석 (한국어)"
        }
      ]
    }
  ]
}`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `목표 종목: ${name}, ${dur}개월짜리 피킹 루틴과 식단을 한국어로 생성해.` }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(data.choices[0].message.content);
    
    // 🔥 데이터 파싱 방어 코드: 루트에 있든 배열 안에 있든 무조건 뽑아냅니다.
    const globalWeight = parsed.recommendedWeight || "목표 체중 분석 중 누락됨";
    const globalNutrition = parsed.nutrition || "영양 식단 분석 중 누락됨";

    let extractedRoutines = parsed.routines || parsed.routine || Object.values(parsed).find(Array.isArray) || [];
    
    if (!Array.isArray(extractedRoutines) || extractedRoutines.length === 0) {
      throw new Error("AI가 루틴 배열을 정상적으로 생성하지 못했습니다.");
    }

    // 각 루틴 객체에 전역 체중/영양 정보를 주입하여 유실 차단
    generatedRoutinesTemp = extractedRoutines.map(r => ({
      ...r,
      recommendedWeight: r.recommendedWeight || globalWeight,
      nutrition: r.nutrition || globalNutrition
    }));

    // UI 렌더링
    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div class="mt-10" style="font-size:0.85rem; color:#aaa; line-height: 1.4;">
          <b>💪 추천 체중:</b> ${r.recommendedWeight}<br>
          <b>🥗 맞춤 식단:</b> ${r.nutrition}
        </div>
        <div class="mt-10" style="font-size:0.8rem; color:var(--primary); font-weight:bold;">총 ${r.sessions ? r.sessions.length : 0}개 세션 설계됨</div>
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
    title: `${name} ${tw}kg ${tr}회 달성 프로젝트`,
    target: `${tw}kg ${tr}회`,
    recommendedWeight: routine.recommendedWeight, // 파싱된 체중 저장
    nutrition: routine.nutrition, // 파싱된 영양 정보 저장
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
  
  // 영양 정보 렌더링
  document.getElementById('active-goal-weight').innerText = goal.recommendedWeight || "정보 없음";
  document.getElementById('active-goal-nutrition').innerText = goal.nutrition || "정보 없음";

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

// 기존 운동 일지 저장 로직(간소화)
function startWorkout() {
  if (selectedCategories.length === 0) return alert('부위를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `기록 (${selectedCategories.join(', ')})`;
  document.getElementById('exercise-inputs-container').innerHTML = ''; addExerciseInput(); renderQuickSelectCards(); showView('record-view');
}
function addExerciseInput(name = '') {
  const container = document.getElementById('exercise-inputs-container');
  const isCardio = name && JSON.parse(localStorage.getItem('pr_exercises'))[name]?.category === '유산소';
  const div = document.createElement('div'); div.className = 'exercise-entry mb-20'; 
  div.innerHTML = `<input type="text" class="input-name mb-10" placeholder="종목명" value="${name}"><div class="input-row"><input type="number" class="input-weight" placeholder="${isCardio ? '거리(km)' : '무게(kg)'}"><input type="number" class="input-reps" placeholder="${isCardio ? '시간(분)' : '횟수(회)'}">${isCardio ? '' : '<input type="number" class="input-sets" placeholder="세트">'}</div>`; 
  container.appendChild(div);
}
function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container'); container.innerHTML = ''; const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  Object.entries(exercises).filter(([_, d]) => selectedCategories.includes(d.category)).forEach(([name, data]) => { 
    const card = document.createElement('div'); card.className = 'ex-card-layout'; card.onclick = () => { addExerciseInput(name); };
    card.innerHTML = `<div class="ex-card-left">${getAvatarHtml(name, data.b64_img)}</div><div class="ex-card-right"><div class="ex-header"><span class="ex-title">${name}</span></div><div class="ex-target"><span class="target-badge">${data.target||data.category}</span></div></div>`; 
    container.appendChild(card);
  });
}
function getAvatarHtml(name, b64) { return b64 ? `<div class="ex-avatar"><img src="data:image/png;base64,${b64}" alt="icon" style="width:100%; height:100%; object-fit:cover;"></div>` : `<div class="ex-avatar">${name.substring(0,2).toUpperCase()}</div>`; }
function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry'); const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  let recordDate = timeType === 'past' ? new Date(document.getElementById('input-past-date').value) : new Date();
  const session = { date: recordDate.toLocaleString(), timestamp: recordDate.getTime(), categories: [...selectedCategories], workouts: [], totalVolume: 0 };
  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim(); const val1 = parseFloat(entry.querySelector('.input-weight').value) || 0; const val2 = parseFloat(entry.querySelector('.input-reps').value) || 0; const sets = entry.querySelector('.input-sets') ? parseInt(entry.querySelector('.input-sets').value) || 0 : 1;
    if (name) { let volume = val1 * val2 * sets; session.workouts.push({ name, weight: val1, reps: val2, sets, volume }); session.totalVolume += volume; if (!exercises[name]) exercises[name] = { category: "기타", target: "전신", history: [] }; exercises[name].history.push({ date: session.date, timestamp: session.timestamp, name, weight: val1, reps: val2, sets, volume }); }
  });
  if(session.workouts.length === 0) return alert("데이터 입력 필요");
  sessions[`S_${recordDate.getTime()}`] = session; localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises)); showView('hof-view');
}
function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const volList = document.getElementById('hof-volume-list'); volList.innerHTML = '';
  Object.entries(sessions).sort((a,b) => b[1].totalVolume - a[1].totalVolume).forEach(([key, s], i) => {
    const div = document.createElement('div'); div.className = 'record-card mb-10';
    div.innerHTML = `<span class="volume-badge">${s.totalVolume.toLocaleString()}kg</span> <b>${i+1}위</b> | ${s.date.split(' ')[0]}<br><small style="color:#888;">${s.categories.join(', ')}</small>`; volList.appendChild(div);
  });
}
function togglePastDateInput() { const c = document.getElementById('past-date-container'); c.style.display = c.style.display === 'none' ? 'block' : 'none'; }
function switchHofTab(t) { document.querySelectorAll('#hof-view .hof-tab').forEach(tab => tab.classList.remove('active')); if (t === 'volume') document.querySelectorAll('#hof-view .hof-tab')[0].classList.add('active'); else document.querySelectorAll('#hof-view .hof-tab')[1].classList.add('active'); }
function searchExercises() { /* 통합검색 유지 */ }
