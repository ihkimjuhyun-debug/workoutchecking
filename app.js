let selectedCategories = [];
let currentViewingExercise = "";
let currentEditingSessionKey = "";

// 🔥 핵심 해결책: 외부 서버 접속이 필요 없는 내장 SVG 데이터 (네트워크 에러 원천 차단)
function getSvgDataUri(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="#2a2a2a"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#ff8c00" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const safeImg1 = getSvgDataUri('자세1');
const safeImg2 = getSvgDataUri('자세2');

const defaultExercisesDB = {
  "OHP": { category: "어깨", target: "전/측면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 숄더 프레스": { category: "어깨", target: "전/측면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "사이드 레터럴 레이즈": { category: "어깨", target: "측면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "프론트 레이즈": { category: "어깨", target: "전면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "벤트오버 레터럴 레이즈": { category: "어깨", target: "후면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "밀리터리 프레스": { category: "어깨", target: "어깨, 코어", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "아놀드 프레스": { category: "어깨", target: "전면 삼각근 극대화", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "업라이트 로우": { category: "어깨", target: "측면 삼각근, 승모", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "페이스 풀": { category: "어깨", target: "후면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "리버스 펙덱 플라이": { category: "어깨", target: "후면 삼각근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },

  "데드리프트": { category: "등", target: "후면 사슬 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "랫풀다운": { category: "등", target: "광배근 상/하부", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "바벨 로우": { category: "등", target: "등 두께, 광배근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 로우": { category: "등", target: "광배근 편측", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "풀업": { category: "등", target: "광배근 너비", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "시티드 로우": { category: "등", target: "승모근, 등 중앙", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "티바 로우": { category: "등", target: "등 두께", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "암풀다운": { category: "등", target: "광배근 고립", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "펜들레이 로우": { category: "등", target: "등 폭발력", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "백 익스텐션": { category: "등", target: "척추기립근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },

  "벤치프레스": { category: "가슴", target: "가슴 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "인클라인 벤치프레스": { category: "가슴", target: "윗가슴", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "디클라인 벤치프레스": { category: "가슴", target: "아랫가슴", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 프레스": { category: "가슴", target: "가슴 가동범위", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 플라이": { category: "가슴", target: "가슴 안쪽 고립", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "펙덱 플라이": { category: "가슴", target: "가슴 안쪽 수축", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "케이블 크로스오버": { category: "가슴", target: "가슴 하부 라인", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "푸쉬업": { category: "가슴", target: "가슴, 코어", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "체스트 프레스 머신": { category: "가슴", target: "가슴 전체 안정화", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "딥스": { category: "가슴", target: "아랫가슴 극대화", fav: false, img1: safeImg1, img2: safeImg2, history: [] },

  "스쿼트": { category: "하체", target: "하체 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "레그프레스": { category: "하체", target: "대퇴사두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "런지": { category: "하체", target: "대퇴, 둔근 편측", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "레그 익스텐션": { category: "하체", target: "대퇴사두 고립", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "레그 컬": { category: "하체", target: "햄스트링", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "루마니안 데드리프트": { category: "하체", target: "햄스트링, 둔근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "카프 레이즈": { category: "하체", target: "종아리", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "브이스쿼트": { category: "하체", target: "대퇴사두, 둔근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "핵스쿼트": { category: "하체", target: "대퇴사두 집중", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "힙 쓰러스트": { category: "하체", target: "대둔근 폭발력", fav: false, img1: safeImg1, img2: safeImg2, history: [] },

  "바벨 컬": { category: "팔", target: "이두근 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 컬": { category: "팔", target: "이두근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "해머 컬": { category: "팔", target: "상완근, 전완근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "프리처 컬": { category: "팔", target: "이두근 고립", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "케이블 푸쉬다운": { category: "팔", target: "삼두근 외측", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "트라이셉스 익스텐션": { category: "팔", target: "삼두근 장두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "라트익 (바벨)": { category: "팔", target: "삼두근 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "덤벨 킥백": { category: "팔", target: "삼두근 수축", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "클로즈그립 벤치프레스": { category: "팔", target: "삼두근 볼륨", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "리버스 컬": { category: "팔", target: "전완근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },

  "크런치": { category: "복근", target: "상복부", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "레그레이즈": { category: "복근", target: "하복부", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "플랭크": { category: "복근", target: "코어 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "사이드 플랭크": { category: "복근", target: "외복사근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "바이시클 크런치": { category: "복근", target: "복사근, 상복부", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "행잉 레그레이즈": { category: "복근", target: "하복부 고립", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "케이블 크런치": { category: "복근", target: "복직근 두께", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "러시안 트위스트": { category: "복근", target: "코어 회전근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "싯업": { category: "복근", target: "복직근 전체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "AB 롤아웃": { category: "복근", target: "코어 강성", fav: false, img1: safeImg1, img2: safeImg2, history: [] }
};

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  document.querySelectorAll('#category-selection .cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.target.dataset.cat;
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat); e.target.classList.remove('selected');
      } else {
        selectedCategories.push(cat); e.target.classList.add('selected');
      }
    });
  });
});

function initStorage() {
  if (!localStorage.getItem('pr_sessions')) localStorage.setItem('pr_sessions', JSON.stringify({}));
  let storedExercises = JSON.parse(localStorage.getItem('pr_exercises'));
  let isUpdated = false;

  if (!storedExercises) {
    storedExercises = defaultExercisesDB; isUpdated = true;
  } else {
    // 1. 없는 기본 종목 채우기
    for (const [name, data] of Object.entries(defaultExercisesDB)) {
      if (!storedExercises[name]) { storedExercises[name] = data; isUpdated = true; }
    }
    // 2. 🔥 자동 복구: 외부 이미지 URL이 깨진 데이터들을 모두 내장 SVG로 갈아치움
    for (const key in storedExercises) {
      if (storedExercises[key].img1 && (storedExercises[key].img1.includes('placeholder') || storedExercises[key].img1.includes('dummyimage'))) {
        storedExercises[key].img1 = safeImg1; storedExercises[key].img2 = safeImg2; isUpdated = true;
      }
    }
  }
  if (isUpdated) localStorage.setItem('pr_exercises', JSON.stringify(storedExercises));
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0,0);
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') renderAllExercises();
}

function startWorkout() {
  if (selectedCategories.length === 0) return alert('최소 하나 이상의 카테고리를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `운동 기록 (${selectedCategories.join(', ')})`;
  resetExerciseInputs(); renderQuickSelectCards(); 
  document.getElementById('past-date-container').style.display = 'none'; showView('record-view');
}

// 🌟 공통 종목 카드 렌더러 (createElement를 사용하여 태그 파괴 완벽 방어)
function createExerciseCardElement(ex, isQuickSelect = false) {
  const card = document.createElement('div');
  card.className = 'ex-card-layout';
  card.onclick = () => isQuickSelect ? addExerciseFromQuickSelect(ex.name) : openExerciseHistory(ex.name);

  const starClass = ex.fav ? 'icon-fav active' : 'icon-fav';
  const targetText = ex.target || ex.category;
  const imgSource1 = ex.img1 || safeImg1;
  const imgSource2 = ex.img2 || safeImg2;

  card.innerHTML = `
    <div class="ex-card-left">
      <img src="${imgSource1}" class="ex-picto" alt="picto1">
      <img src="${imgSource2}" class="ex-picto" alt="picto2">
    </div>
    <div class="ex-card-right">
      <div class="ex-header">
        <span class="ex-title">${ex.name}</span>
        <div class="ex-icons">
          <span class="action-icon ${starClass}" onclick="event.stopPropagation(); toggleFavorite('${ex.name}')">⭐</span>
          <span class="action-icon icon-trash" onclick="event.stopPropagation(); deleteExercise('${ex.name}')">🗑️</span>
        </div>
      </div>
      <div class="ex-target">
        <span class="target-badge">${targetText}</span>
      </div>
    </div>
  `;
  return card;
}

function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container');
  if (!container) return; container.innerHTML = ''; 

  const exercises = JSON.parse(localStorage.getItem('pr_exercises')) || {};
  let exArray = Object.entries(exercises).map(([name, data]) => ({ name, ...data })).filter(ex => selectedCategories.includes(ex.category));
  exArray.sort((a, b) => { if (a.fav === b.fav) return a.name.localeCompare(b.name); return a.fav ? -1 : 1; });

  if (exArray.length === 0) {
    container.innerHTML = `<div style="color:#888; font-size:0.85rem; padding:10px; width:100%; text-align:center;">등록된 종목이 없습니다. 직접 입력하거나 검색 탭에서 추가하세요.</div>`;
    return;
  }
  exArray.forEach(ex => container.appendChild(createExerciseCardElement(ex, true)));
}

function renderAllExercises(filterCat = null, searchQuery = "") {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list'); container.innerHTML = '';
  
  let exArray = Object.entries(exercises).map(([name, data]) => ({ name, ...data }));
  exArray.sort((a, b) => { if (a.fav === b.fav) return a.name.localeCompare(b.name); return a.fav ? -1 : 1; });

  let hasResult = false;
  exArray.forEach(ex => {
    if (filterCat && ex.category !== filterCat) return;
    if (searchQuery && !ex.name.includes(searchQuery.toUpperCase())) return;
    hasResult = true;
    container.appendChild(createExerciseCardElement(ex, false));
  });
  
  if (!hasResult) container.innerHTML = `<div style="text-align:center; color:#888; padding: 20px;">검색 결과가 없습니다.</div>`;
}

function deleteExercise(name) {
  if(!confirm(`정말 [${name}] 종목을 삭제하시겠습니까?\n(오타를 지우거나 커스텀 종목을 삭제할 때 유용합니다)`)) return;
  
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  delete exercises[name];
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  
  if (document.getElementById('search-view').classList.contains('active')) searchExercises();
  else if (document.getElementById('record-view').classList.contains('active')) renderQuickSelectCards();
}

function toggleFavorite(name) {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  exercises[name].fav = !exercises[name].fav;
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  
  if (document.getElementById('search-view').classList.contains('active')) searchExercises();
  else if (document.getElementById('record-view').classList.contains('active')) renderQuickSelectCards();
}

function addExerciseFromQuickSelect(exName) {
  const inputs = document.querySelectorAll('.exercise-entry .input-name');
  let filled = false;
  for (let input of inputs) {
    if (input.value.trim() === '') {
      input.value = exName; filled = true;
      input.closest('.exercise-entry').style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.6)';
      setTimeout(() => { input.closest('.exercise-entry').style.boxShadow = 'none'; }, 600); break;
    }
  }
  if (!filled) addExerciseInput(exName);
}

function addExerciseInput(prefillName = '') {
  const container = document.getElementById('exercise-inputs-container');
  const entryHtml = `
    <div class="exercise-entry mb-20" style="animation: fadeIn 0.3s ease; box-shadow: ${prefillName ? '0 0 15px rgba(255, 140, 0, 0.6)' : 'none'};">
      <button type="button" class="remove-btn" onclick="this.parentElement.remove()">삭제 ✖</button>
      <div class="input-group mt-10"><label>운동 종목</label><input type="text" class="input-name" placeholder="예: 덤벨 플라이" value="${prefillName}"></div>
      <div class="input-row">
        <div class="input-group"><label>무게 (kg)</label><input type="number" class="input-weight" placeholder="0"></div>
        <div class="input-group"><label>횟수 (회)</label><input type="number" class="input-reps" placeholder="0"></div>
        <div class="input-group"><label>세트</label><input type="number" class="input-sets" placeholder="0"></div>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', entryHtml);
  if(prefillName) setTimeout(() => { container.lastElementChild.style.boxShadow = 'none'; }, 600);
}

function resetExerciseInputs() {
  document.getElementById('exercise-inputs-container').innerHTML = `
    <div class="exercise-entry mb-20">
      <div class="input-group mt-10"><label>운동 종목</label><input type="text" class="input-name" placeholder="예: 스쿼트"></div>
      <div class="input-row">
        <div class="input-group"><label>무게 (kg)</label><input type="number" class="input-weight" placeholder="0"></div>
        <div class="input-group"><label>횟수 (회)</label><input type="number" class="input-reps" placeholder="0"></div>
        <div class="input-group"><label>세트</label><input type="number" class="input-sets" placeholder="0"></div>
      </div>
    </div>`;
}

function togglePastDateInput() {
  const container = document.getElementById('past-date-container'); container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry');
  let sessionTotalVolume = 0; let validWorkouts = [];

  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim().toUpperCase();
    const weight = parseInt(entry.querySelector('.input-weight').value) || 0;
    const reps = parseInt(entry.querySelector('.input-reps').value) || 0;
    const sets = parseInt(entry.querySelector('.input-sets').value) || 0;
    if (name && reps && sets) validWorkouts.push({ name, weight, reps, sets, volume: weight * reps * sets });
  });

  if (validWorkouts.length === 0) return alert("종목, 횟수, 세트를 정확히 입력해주세요.");

  let recordDate = new Date();
  if (timeType === 'past') {
    const pastInput = document.getElementById('input-past-date').value;
    if (!pastInput) return alert("과거 날짜와 시간을 선택해주세요."); recordDate = new Date(pastInput);
  }

  const dateString = recordDate.toISOString().split('T')[0];
  const fullDateString = recordDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const sessionKey = `${dateString}_${selectedCategories.join('_')}_${recordDate.getTime()}`;
  
  sessions[sessionKey] = { date: fullDateString, timestamp: recordDate.getTime(), categories: selectedCategories, totalVolume: 0, workouts: [] };

  validWorkouts.forEach(w => {
    sessions[sessionKey].totalVolume += w.volume; sessions[sessionKey].workouts.push(w); sessionTotalVolume += w.volume;
    if (!exercises[w.name]) exercises[w.name] = { category: selectedCategories[0], target: selectedCategories[0], fav: false, img1: safeImg1, img2: safeImg2, history: [] };
    exercises[w.name].history.push({ date: fullDateString, timestamp: recordDate.getTime(), weight: w.weight, reps: w.reps, sets: w.sets, volume: w.volume });
  });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`저장 완료! 세션 볼륨: ${sessionTotalVolume.toLocaleString()}kg`); showView('hof-view');
}

function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const volContainer = document.getElementById('hof-volume-list'); const weightContainer = document.getElementById('hof-weight-list');
  volContainer.innerHTML = ''; weightContainer.innerHTML = '';

  const sessionList = Object.entries(sessions).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.totalVolume - a.totalVolume);
  sessionList.forEach((session, index) => {
    let rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}위`;
    volContainer.innerHTML += `
      <div class="record-card highlight-red" onclick="openSessionDetail('${session.key}')">
        <span class="volume-badge" style="color: #ff4a4a; background: rgba(255,74,74,0.15);">${session.totalVolume.toLocaleString()} kg</span>
        <div class="record-title">${rank} ${session.date.split(' ')[0]}</div>
        <div class="record-details">진행 부위: ${session.categories.join(', ')} <br><span style="font-size:0.8rem; color:#888;">(클릭하여 기록 복기)</span></div>
      </div>`;
  });

  let weightRecords = [];
  for (const [name, data] of Object.entries(exercises)) {
    let maxWeight = 0; let bestRecord = null;
    data.history.forEach(h => { if (h.weight > maxWeight) { maxWeight = h.weight; bestRecord = h; } });
    if (bestRecord && maxWeight > 0) weightRecords.push({ name, category: data.category, maxWeight, date: bestRecord.date, reps: bestRecord.reps });
  }

  weightRecords.sort((a, b) => b.maxWeight - a.maxWeight).forEach((rec, index) => {
    let rank = index === 0 ? '👑' : `${index + 1}위`;
    weightContainer.innerHTML += `
      <div class="record-card highlight-yellow">
        <span class="volume-badge" style="color: #ffd700; background: rgba(255,215,0,0.15);">${rec.maxWeight} kg</span>
        <div class="record-title">${rank} ${rec.name} <span style="font-size:0.85rem; color:#888;">[${rec.category}]</span></div>
        <div class="record-details">${rec.maxWeight}kg x ${rec.reps}회 (달성일: ${rec.date.split(' ')[0]})</div>
      </div>`;
  });
}

function switchHofTab(type) {
  document.querySelectorAll('.hof-tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById('hof-volume-list').style.display = 'none'; document.getElementById('hof-weight-list').style.display = 'none';
  if (type === 'volume') { document.querySelectorAll('.hof-tab')[0].classList.add('active'); document.getElementById('hof-volume-list').style.display = 'flex'; } 
  else { document.querySelectorAll('.hof-tab')[1].classList.add('active'); document.getElementById('hof-weight-list').style.display = 'flex'; }
}

function openSessionDetail(sessionKey) {
  currentEditingSessionKey = sessionKey;
  const session = JSON.parse(localStorage.getItem('pr_sessions'))[sessionKey];
  document.getElementById('session-detail-title').innerText = session.date.split(' ')[0] + " 세션";
  document.getElementById('session-detail-info').innerText = `진행 부위: ${session.categories.join(', ')} | 세션 볼륨: ${session.totalVolume.toLocaleString()}kg`;

  const workoutList = document.getElementById('session-workout-list'); workoutList.innerHTML = '';
  if (session.workouts && session.workouts.length > 0) {
    session.workouts.forEach((w, idx) => {
      workoutList.innerHTML += `
        <div class="record-card" style="padding: 12px; background: #222;">
          <div class="record-title" style="font-size: 1rem;">${idx + 1}. ${w.name}</div>
          <div class="record-details">${w.weight}kg x ${w.reps}회 x ${w.sets}세트 (볼륨: ${w.volume.toLocaleString()}kg)</div>
        </div>`;
    });
  }
  document.getElementById('past-add-name').value = ''; document.getElementById('past-add-weight').value = ''; document.getElementById('past-add-reps').value = ''; document.getElementById('past-add-sets').value = '';
  showView('session-detail-view');
}

function addWorkoutToPastSession() {
  if (!currentEditingSessionKey) return;
  const name = document.getElementById('past-add-name').value.trim().toUpperCase();
  const weight = parseInt(document.getElementById('past-add-weight').value) || 0;
  const reps = parseInt(document.getElementById('past-add-reps').value) || 0;
  const sets = parseInt(document.getElementById('past-add-sets').value) || 0;
  if (!name || !reps || !sets) return alert("정확히 입력해주세요.");

  const volume = weight * reps * sets;
  const sessions = JSON.parse(localStorage.getItem('pr_sessions')); const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const session = sessions[currentEditingSessionKey];

  if (!session.workouts) session.workouts = []; if (!session.timestamp) session.timestamp = new Date().getTime();
  session.workouts.push({ name, weight, reps, sets, volume }); session.totalVolume += volume;

  if (!exercises[name]) exercises[name] = { category: session.categories[0] || '기타', target: "전신", fav: false, img1: safeImg1, img2: safeImg2, history: [] };
  exercises[name].history.push({ date: session.date, timestamp: session.timestamp, weight: weight, reps: reps, sets: sets, volume: volume });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`[${name}] 복기 완료!`); openSessionDetail(currentEditingSessionKey);
}

function searchExercises() {
  const query = document.getElementById('search-input').value;
  const activeBtn = document.querySelector('#filter-categories .cat-btn.active-filter');
  renderAllExercises(activeBtn ? activeBtn.innerText : null, query);
}

function filterByCategory(cat, btnElement) {
  const isActive = btnElement.classList.contains('active-filter');
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => btn.classList.remove('active-filter'));
  if (isActive) renderAllExercises(null, document.getElementById('search-input').value);
  else { btnElement.classList.add('active-filter'); renderAllExercises(cat, document.getElementById('search-input').value); }
}

function toggleCustomExerciseForm() {
  const form = document.getElementById('custom-exercise-form'); form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addCustomExercise() {
  const name = document.getElementById('custom-ex-name').value.trim().toUpperCase();
  const cat = document.getElementById('custom-ex-cat').value;
  const target = document.getElementById('custom-ex-target').value.trim();

  if (!name) return alert('종목 이름을 입력해주세요.');
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  if (exercises[name]) return alert('이미 존재하는 종목입니다.');

  exercises[name] = { category: cat, target: target || cat, fav: false, img1: safeImg1, img2: safeImg2, history: [] };
  localStorage.setItem('pr_exercises', JSON.stringify(exercises)); alert(`[${name}] 종목 추가 완료!`);
  
  document.getElementById('custom-ex-name').value = ''; document.getElementById('custom-ex-target').value = ''; toggleCustomExerciseForm();
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => { if(btn.innerText === cat) filterByCategory(cat, btn); });
}

function openExerciseHistory(name) {
  currentViewingExercise = name;
  const historyData = JSON.parse(localStorage.getItem('pr_exercises'))[name].history;
  if (!historyData) return; historyData.sort((a, b) => b.timestamp - a.timestamp);

  let maxVolume = 0, maxWeight = 0;
  historyData.forEach(h => { if (h.volume > maxVolume) maxVolume = h.volume; if (h.weight > maxWeight) maxWeight = h.weight; });

  const container = document.getElementById('history-list'); container.innerHTML = '';
  document.getElementById('history-title').innerText = `${name} 기록 비교`;

  historyData.forEach(h => {
    let glowClass = "";
    if (h.volume === maxVolume && maxVolume > 0) glowClass = "highlight-red";
    else if (h.weight === maxWeight && maxWeight > 0) glowClass = "highlight-yellow";

    container.innerHTML += `
      <div class="record-card ${glowClass}">
        <span class="volume-badge">볼륨: ${h.volume.toLocaleString()} kg</span>
        <div class="record-title">${h.weight}kg x ${h.reps}회 x ${h.sets}세트</div>
        <div class="record-details">기록일: ${h.date}</div>
      </div>`;
  });
  showView('history-view');
}

function goToRecordFromHistory() {
  const cat = JSON.parse(localStorage.getItem('pr_exercises'))[currentViewingExercise].category;
  selectedCategories = [cat]; document.getElementById('current-categories-title').innerText = `운동 기록 (${cat})`;
  document.getElementById('quick-select-container').innerHTML = ''; 
  resetExerciseInputs(); setTimeout(() => { document.querySelector('.input-name').value = currentViewingExercise; }, 50);
  showView('record-view');
}
