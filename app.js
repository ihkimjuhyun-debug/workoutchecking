let selectedCategories = [];
let currentViewingExercise = "";
let currentEditingSessionKey = "";

// 🌟 앱 시작 시 기본 운동 데이터 베이스 (픽토그램 & 타겟부위 포함)
const defaultExercisesDB = {
  "OHP": { category: "어깨", target: "어깨, 삼두", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "사이드 레터럴 레이즈": { category: "어깨", target: "측면 어깨", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "데드리프트": { category: "등", target: "등, 하체", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "랫풀다운": { category: "등", target: "광배근", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "벤치프레스": { category: "가슴", target: "가슴, 삼두", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "푸쉬업": { category: "가슴", target: "가슴, 코어", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "스쿼트": { category: "하체", target: "하체, 둔근", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "레그프레스": { category: "하체", target: "대퇴사두", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "바벨 컬": { category: "팔", target: "이두", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "트라이셉스 익스텐션": { category: "팔", target: "삼두", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "크런치": { category: "복근", target: "상복부", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] },
  "플랭크": { category: "복근", target: "코어", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] }
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
  if (!storedExercises) {
    // 처음 앱을 켜면 기본 DB를 스토리지에 심어줌
    localStorage.setItem('pr_exercises', JSON.stringify(defaultExercisesDB));
  } else {
    // 기존 유저의 경우, DB에 없는 기본 종목만 추가로 머지해줌 (기존 데이터 손실 방지)
    let isUpdated = false;
    for (const [name, data] of Object.entries(defaultExercisesDB)) {
      if (!storedExercises[name]) {
        storedExercises[name] = data;
        isUpdated = true;
      }
    }
    if (isUpdated) localStorage.setItem('pr_exercises', JSON.stringify(storedExercises));
  }
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0,0);
  
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') renderAllExercises();
}

// --- 운동 기록 뷰 로직 (기존과 동일) ---
function startWorkout() {
  if (selectedCategories.length === 0) return alert('최소 하나 이상의 카테고리를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `운동 기록 (${selectedCategories.join(', ')})`;
  resetExerciseInputs();
  document.getElementById('past-date-container').style.display = 'none';
  showView('record-view');
}
function addExerciseInput() {
  const container = document.getElementById('exercise-inputs-container');
  const entryHtml = `
    <div class="exercise-entry mb-20" style="animation: fadeIn 0.3s ease;">
      <button type="button" class="remove-btn" onclick="this.parentElement.remove()">삭제 ✖</button>
      <div class="input-group mt-10"><label>운동 종목</label><input type="text" class="input-name" placeholder="예: 덤벨 플라이"></div>
      <div class="input-row">
        <div class="input-group"><label>무게 (kg)</label><input type="number" class="input-weight" placeholder="0"></div>
        <div class="input-group"><label>횟수 (회)</label><input type="number" class="input-reps" placeholder="0"></div>
        <div class="input-group"><label>세트</label><input type="number" class="input-sets" placeholder="0"></div>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', entryHtml);
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
      // 신규 입력 종목은 즐겨찾기X, 타겟부위 미정으로 자동 생성됨
      exercises[w.name] = { category: selectedCategories[0], target: "전신", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] };
    }
    exercises[w.name].history.push({ date: fullDateString, timestamp: recordDate.getTime(), weight: w.weight, reps: w.reps, sets: w.sets, volume: w.volume });
  });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`저장 완료! 세션 볼륨: ${sessionTotalVolume.toLocaleString()}kg`);
  showView('hof-view');
}

// --- 명예의 전당 및 세션 복기 (기존과 동일) ---
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

  if (!exercises[name]) exercises[name] = { category: session.categories[0] || '기타', target: "전신", fav: false, img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축", img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완", history: [] };
  exercises[name].history.push({ date: session.date, timestamp: session.timestamp, weight: weight, reps: reps, sets: sets, volume: volume });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions)); localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`[${name}] 복기 완료!`); openSessionDetail(currentEditingSessionKey);
}

// ------------------------------------------------------------------------
// 🌟 신규: 검색 리스트 렌더링 (즐겨찾기 정렬 & 낱말 카드 UI)
// ------------------------------------------------------------------------
function renderAllExercises(filterCat = null, searchQuery = "") {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list');
  container.innerHTML = '';
  
  // 객체를 배열로 변환하여 정렬 (1순위: 즐겨찾기, 2순위: 가나다순)
  let exArray = Object.entries(exercises).map(([name, data]) => ({ name, ...data }));
  
  exArray.sort((a, b) => {
    if (a.fav === b.fav) return a.name.localeCompare(b.name);
    return a.fav ? -1 : 1; // fav가 true면 위로
  });

  let hasResult = false;
  
  exArray.forEach(ex => {
    if (filterCat && ex.category !== filterCat) return;
    if (searchQuery && !ex.name.includes(searchQuery.toUpperCase())) return;
    hasResult = true;

    const starClass = ex.fav ? 'fav-star active' : 'fav-star';
    
    // 카드 클릭 이벤트와 즐겨찾기 별 클릭 이벤트를 분리(stopPropagation)
    container.innerHTML += `
      <div class="record-card ex-card-layout" onclick="openExerciseHistory('${ex.name}')">
        
        <div class="ex-card-left">
          <img src="${ex.img1 || 'https://dummyimage.com/60x60/2a2a2a/ff8c00&text=P1'}" class="ex-picto" alt="start">
          <img src="${ex.img2 || 'https://dummyimage.com/60x60/2a2a2a/ff8c00&text=P2'}" class="ex-picto" alt="end">
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

// ⭐ 즐겨찾기 토글 함수
function toggleFavorite(name) {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  exercises[name].fav = !exercises[name].fav;
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  
  // 현재 필터와 검색어 유지하며 다시 렌더링
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

// ------------------------------------------------------------------------
// 🌟 신규: 커스텀 종목 추가 로직
// ------------------------------------------------------------------------
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

  exercises[name] = {
    category: cat,
    target: target || cat, // 자극 부위 안 쓰면 카테고리로 대체
    fav: false,
    img1: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=수축",
    img2: "https://dummyimage.com/60x60/2a2a2a/ff8c00&text=이완",
    history: []
  };

  localStorage.setItem('pr_exercises', JSON.stringify(exercises));
  alert(`[${name}] 종목이 추가되었습니다!`);
  
  // 폼 초기화 및 다시 렌더링
  document.getElementById('custom-ex-name').value = '';
  document.getElementById('custom-ex-target').value = '';
  toggleCustomExerciseForm();
  
  // 해당 카테고리로 필터링해서 보여주기
  const catBtns = document.querySelectorAll('#filter-categories .cat-btn');
  catBtns.forEach(btn => { if(btn.innerText === cat) filterByCategory(cat, btn); });
}

// 특정 종목 히스토리 뷰 (기존과 동일)
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
  resetExerciseInputs();
  setTimeout(() => { document.querySelector('.input-name').value = currentViewingExercise; }, 50);
  showView('record-view');
}
