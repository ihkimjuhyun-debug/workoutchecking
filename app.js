let selectedCategories = [];
let currentViewingExercise = "";
let currentEditingSessionKey = "";

// 🔥 안전한 이미지 URL을 사용한 기본 DB
const safeImg1 = "https://via.placeholder.com/60/2a2a2a/ff8c00?text=P1";
const safeImg2 = "https://via.placeholder.com/60/2a2a2a/ff8c00?text=P2";

const defaultExercisesDB = {
  "OHP": { category: "어깨", target: "어깨, 삼두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "사이드 레터럴 레이즈": { category: "어깨", target: "측면 어깨", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "데드리프트": { category: "등", target: "등, 하체", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "랫풀다운": { category: "등", target: "광배근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "벤치프레스": { category: "가슴", target: "가슴, 삼두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "푸쉬업": { category: "가슴", target: "가슴, 코어", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "스쿼트": { category: "하체", target: "하체, 둔근", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "레그프레스": { category: "하체", target: "대퇴사두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "바벨 컬": { category: "팔", target: "이두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "트라이셉스 익스텐션": { category: "팔", target: "삼두", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "크런치": { category: "복근", target: "상복부", fav: false, img1: safeImg1, img2: safeImg2, history: [] },
  "플랭크": { category: "복근", target: "코어", fav: false, img1: safeImg1, img2: safeImg2, history: [] }
};

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  document.querySelectorAll('#category-selection .cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.target.dataset.cat;
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat);
        e.target.classList.remove('selected');
      } else {
        selectedCategories.push(cat);
        e.target.classList.add('selected');
      }
    });
  });
});

function initStorage() {
  if (!localStorage.getItem('pr_sessions')) localStorage.setItem('pr_sessions', JSON.stringify({}));
  
  let storedExercises = JSON.parse(localStorage.getItem('pr_exercises'));
  let isUpdated = false;

  if (!storedExercises) {
    storedExercises = defaultExercisesDB;
    isUpdated = true;
  } else {
    // 1. 기존 DB에 없는 신규 종목 추가
    for (const [name, data] of Object.entries(defaultExercisesDB)) {
      if (!storedExercises[name]) { storedExercises[name] = data; isUpdated = true; }
    }
    // 2. 🔥 사용자 기기의 꼬인 이미지 URL(특수문자 파싱 에러) 강제 치료 스크립트
    for (const key in storedExercises) {
      if (storedExercises[key].img1 && storedExercises[key].img1.includes('&text=')) {
        storedExercises[key].img1 = safeImg1;
        storedExercises[key].img2 = safeImg2;
        isUpdated = true;
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

// ------------------------------------------------------------------------
// 🔥 낱말 카드 렌더링 에러 완벽 차단 로직 (DOM 직접 조작)
// ------------------------------------------------------------------------
function startWorkout() {
  if (selectedCategories.length === 0) return alert('최소 하나 이상의 카테고리를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `운동 기록 (${selectedCategories.join(', ')})`;
  
  resetExerciseInputs(); // 먼저 폼을 세팅하고
  renderQuickSelectCards(); // 낱말 카드를 띄움
  
  document.getElementById('past-date-container').style.display = 'none';
  showView('record-view');
}

function renderQuickSelectCards() {
  const container = document.getElementById('quick-select-container');
  if (!container) return; // 요소가 없으면 크래시 방지
  container.innerHTML = ''; 

  const exercises = JSON.parse(localStorage.getItem('pr_exercises')) || {};

  // 선택한 카테고리에 해당하는 종목만 필터링
  let exArray = Object.entries(exercises)
    .map(([name, data]) => ({ name, ...data }))
    .filter(ex => selectedCategories.includes(ex.category));

  // 정렬 (1. 즐겨찾기 순, 2. 가나다 순)
  exArray.sort((a, b) => {
    if (a.fav === b.fav) return a.name.localeCompare(b.name);
    return a.fav ? -1 : 1;
  });

  if (exArray.length === 0) {
    container.innerHTML = `<div style="color: #888; font-size: 0.85rem; padding: 10px; width: 100%; text-align: center;">선택한 카테고리에 해당하는 낱말 카드가 없습니다.</div>`;
    return;
  }

  // HTML 파싱 에러 방지를 위해 document.createElement 로 안전하게 카드 생성
  exArray.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'quick-card';
    card.onclick = () => addExerciseFromQuickSelect(ex.name);

    const favHtml = ex.fav ? `<span style="color: #ffd700; margin-right: 2px;">⭐</span>` : ``;
    const targetText = ex.target || ex.category;
    const imgSource = ex.img1 || safeImg1;

    card.innerHTML = `
      <img src="${imgSource}" class="quick-picto-mini" alt="picto">
      <div class="quick-info">
        <span class="quick-title">${favHtml}${ex.name}</span>
        <span class="target-badge" style="margin-top: 4px; display: inline-block; width: fit-content; font-size: 0.7rem;">${targetText}</span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function addExerciseFromQuickSelect(exName) {
  const inputs = document.querySelectorAll('.exercise-entry .input-name');
  let filled = false;
  
  for (let input of inputs) {
    if (input.value.trim() === '') {
      input.value = exName;
      filled = true;
      input.closest('.exercise-entry').style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.6)';
      setTimeout(() => { input.closest('.exercise-entry').style.boxShadow = 'none'; }, 600);
      break;
    }
  }
  
  if (!filled) {
    addExerciseInput(exName);
  }
}

// ------------------------------------------------------------------------
// 나머지 모든 로직 (건드리지 않고 완벽하게 유지)
// ------------------------------------------------------------------------
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
  const container = document.getElementById('exercise-inputs-container');
  container.innerHTML = `
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
  const container = document.getElementById('past-date-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
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
    if (!pastInput) return alert("과거 날짜와 시간을 선택해주세요.");
    recordDate = new Date(pastInput);
  }

  const dateString = recordDate.toISOString().split('T')[0];
  const fullDateString = recordDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const sessionKey = `${dateString}_${selectedCategories.join('_')}_${recordDate.getTime()}`;
  
  sessions[sessionKey] = { date: fullDateString, timestamp: recordDate.getTime(), categories: selectedCategories, totalVolume: 0, workouts: [] };

  validWorkouts.forEach(w => {
    sessions[sessionKey].totalVolume += w.volume;
    sessions[sessionKey].workouts.push(w);
    sessionTotalVolume += w.volume;

    if (!exercises[w.name]) {
      exercises[w.name] = { category: selectedCategories[0], target: selectedCategories[0], fav: false, img1: safeImg1, img2: safeImg2, history: [] };
    }
    exercises[w.name].history.push({ date: fullDateString, timestamp: recordDate.getTime(), weight: w.weight, reps: w.reps, sets: w.sets, volume: w.volume });
  });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`저장 완료! 세션 볼륨: ${sessionTotalVolume.toLocaleString()}kg`);
  showView('hof-view');
}

function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const volContainer = document.getElementById('hof-volume-list'); const weightContainer = document.getElementById('hof-weight-list');
  volContainer.innerHTML = ''; weightContainer.innerHTML = '';

  const sessionList = Object.entries(sessions).map(([key, val]) => ({ key, ...val }));
  sessionList.sort((a, b) => b.totalVolume - a.totalVolume);

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

  weightRecords.sort((a, b) => b.maxWeight - a.maxWeight);
  weightRecords.forEach((rec, index) => {
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

function renderAllExercises(filterCat = null, searchQuery = "") {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list');
  container.innerHTML = '';
  
  let exArray = Object.entries(exercises).map(([name, data]) => ({ name, ...data }));
  
  exArray.sort((a, b) => {
    if (a.fav === b.fav) return a.name.localeCompare(b.name);
    return a.fav ? -1 : 1;
  });

  let hasResult = false;
  
  exArray.forEach(ex => {
    if (filterCat && ex.category !== filterCat) return;
    if (searchQuery && !ex.name.includes(searchQuery.toUpperCase())) return;
    hasResult = true;

    const starClass = ex.fav ? 'fav-star active' : 'fav-star';
    
    container.innerHTML += `
      <div class="record-card ex-card-layout" onclick="openExerciseHistory('${ex.name}')">
        <div class="ex-card-left">
          <img src="${ex.img1 || safeImg1}" class="ex-picto" alt="start">
          <img src="${ex.img2 || safeImg2}" class="ex-picto" alt="end">
        </div>
        <div class="ex-card-right">
          <div class="ex-header">
            <span class="ex-title">${ex.name}</span>
            <div class="ex-badges">
              <span class="target-badge">${ex.target || ex.category}</span>
              <span class="${starClass}" onclick="event.stopPropagation(); toggleFavorite('${ex.name}')">⭐</span>
            </div>
          </div>
          <div class="record-details">기록 ${ex.history ? ex.history.length : 0}개 (클릭하여 히스토리 보기)</div>
        </div>
      </div>`;
  });
  
  if (!hasResult) container.innerHTML = `<div style="text-align:center; color:#888; padding: 20px;">검색 결과가 없습니다.</div>`;
}

function toggleFavorite(name) {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  exercises[name].fav = !exercises[name].fav;
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  searchExercises();
}

function searchExercises() {
  const query = document.getElementById('search-input').value;
  const activeBtn = document.querySelector('#filter-categories .cat-btn.active-filter');
  const cat = activeBtn ? activeBtn.innerText : null;
  renderAllExercises(cat, query);
}

function filterByCategory(cat, btnElement) {
  const isActive = btnElement.classList.contains('active-filter');
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => btn.classList.remove('active-filter'));
  if (isActive) { renderAllExercises(null, document.getElementById('search-input').value); } 
  else { btnElement.classList.add('active-filter'); renderAllExercises(cat, document.getElementById('search-input').value); }
}

function toggleCustomExerciseForm() {
  const form = document.getElementById('custom-exercise-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addCustomExercise() {
  const name = document.getElementById('custom-ex-name').value.trim().toUpperCase();
  const cat = document.getElementById('custom-ex-cat').value;
  const target = document.getElementById('custom-ex-target').value.trim();

  if (!name) return alert('종목 이름을 입력해주세요.');

  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  if (exercises[name]) return alert('이미 존재하는 종목입니다.');

  exercises[name] = { category: cat, target: target || cat, fav: false, img1: safeImg1, img2: safeImg2, history: [] };

  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`[${name}] 종목이 추가되었습니다!`);
  
  document.getElementById('custom-ex-name').value = '';
  document.getElementById('custom-ex-target').value = '';
  toggleCustomExerciseForm();
  
  const catBtns = document.querySelectorAll('#filter-categories .cat-btn');
  catBtns.forEach(btn => { if(btn.innerText === cat) filterByCategory(cat, btn); });
}

function openExerciseHistory(name) {
  currentViewingExercise = name;
  const historyData = JSON.parse(localStorage.getItem('pr_exercises'))[name].history;
  if (!historyData) return;
  historyData.sort((a, b) => b.timestamp - a.timestamp);

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
  resetExerciseInputs();
  setTimeout(() => { document.querySelector('.input-name').value = currentViewingExercise; }, 50);
  showView('record-view');
}
