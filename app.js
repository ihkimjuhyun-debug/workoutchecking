// 상태 관리
let selectedCategories = [];
let currentViewingExercise = "";

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  
  // 카테고리 다중 선택 로직
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
  if (!localStorage.getItem('pr_exercises')) localStorage.setItem('pr_exercises', JSON.stringify({}));
}

// 뷰 전환 컨트롤러
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') renderAllExercises();
}

// 운동 시작 버튼
function startWorkout() {
  if (selectedCategories.length === 0) return alert('최소 하나 이상의 카테고리를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `현재 부위: ${selectedCategories.join(', ')}`;
  
  // 폼 초기화
  document.getElementById('input-name').value = '';
  document.getElementById('input-weight').value = '';
  document.getElementById('input-reps').value = '';
  document.getElementById('input-sets').value = '';
  document.getElementById('past-date-container').style.display = 'none';

  showView('record-view');
}

function togglePastDateInput() {
  const container = document.getElementById('past-date-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

// 기록 저장 핵심 로직 (DB 분리 저장)
function saveRecord(timeType) {
  const name = document.getElementById('input-name').value.trim().toUpperCase(); // 검색을 위해 대문자 통일
  const weight = parseInt(document.getElementById('input-weight').value) || 0;
  const reps = parseInt(document.getElementById('input-reps').value) || 0;
  const sets = parseInt(document.getElementById('input-sets').value) || 0;

  if (!name || !reps || !sets) return alert("종목, 횟수, 세트를 정확히 입력해주세요.");

  const volume = weight * reps * sets;
  let recordDate = new Date();

  if (timeType === 'past') {
    const pastInput = document.getElementById('input-past-date').value;
    if (!pastInput) return alert("과거 날짜를 선택해주세요.");
    recordDate = new Date(pastInput);
  }

  const dateString = recordDate.toISOString().split('T')[0]; // "2026-04-11" 포맷
  const fullDateString = recordDate.toLocaleString('ko-KR');

  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));

  // 1. 명예의 전당용 Session 기록 저장
  const sessionKey = `${dateString}_${selectedCategories.join('_')}`;
  if (!sessions[sessionKey]) {
    sessions[sessionKey] = { date: dateString, categories: selectedCategories, totalVolume: 0 };
  }
  sessions[sessionKey].totalVolume += volume;

  // 2. 종목별 히스토리 기록 저장
  if (!exercises[name]) {
    exercises[name] = { category: selectedCategories[0], history: [] };
  }
  
  exercises[name].history.push({
    date: fullDateString,
    timestamp: recordDate.getTime(),
    weight: weight,
    reps: reps,
    sets: sets,
    volume: volume
  });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));

  alert(`저장 완료! [${name}] 총 볼륨: ${volume}kg`);
  showView('hof-view'); // 저장 후 명예의 전당으로 이동하여 성취감 고취
}

// 명예의 전당 렌더링
function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const container = document.getElementById('hof-list');
  container.innerHTML = '';

  // 날짜 최신순 정렬
  const sortedSessions = Object.values(sessions).sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedSessions.forEach(session => {
    container.innerHTML += `
      <div class="record-card">
        <span class="volume-badge">${session.totalVolume.toLocaleString()} kg</span>
        <div class="record-title">${session.date}</div>
        <div class="record-details">진행 부위: ${session.categories.join(', ')}</div>
      </div>
    `;
  });
}

// 종목 검색 및 렌더링
function renderAllExercises(filterCat = null, searchQuery = "") {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list');
  container.innerHTML = '';

  for (const [name, data] of Object.entries(exercises)) {
    if (filterCat && data.category !== filterCat) continue;
    if (searchQuery && !name.includes(searchQuery.toUpperCase())) continue;

    container.innerHTML += `
      <div class="record-card" onclick="openExerciseHistory('${name}')">
        <div class="record-title">${name} <span style="font-size:0.8rem; color:var(--primary);">[${data.category}]</span></div>
        <div class="record-details">총 ${data.history.length}개의 기록이 있습니다. (클릭하여 비교)</div>
      </div>
    `;
  }
}

function searchExercises() {
  const query = document.getElementById('search-input').value;
  renderAllExercises(null, query);
}

function filterByCategory(cat) {
  renderAllExercises(cat, "");
}

// 특정 종목 히스토리 렌더링 (최고 볼륨 Red / 최고 무게 Yellow 글로우 로직)
function openExerciseHistory(name) {
  currentViewingExercise = name;
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const historyData = exercises[name].history;
  
  // 최신순 정렬
  historyData.sort((a, b) => b.timestamp - a.timestamp);

  // 최고 기록 찾기 로직
  let maxVolume = 0;
  let maxWeight = 0;
  
  historyData.forEach(h => {
    if (h.volume > maxVolume) maxVolume = h.volume;
    if (h.weight > maxWeight) maxWeight = h.weight;
  });

  const container = document.getElementById('history-list');
  container.innerHTML = '';
  document.getElementById('history-title').innerText = `${name} 기록 비교`;

  historyData.forEach(h => {
    let glowClass = "";
    // 두 가지 기록을 동시에 달성한 날은 빨간색(볼륨)을 우선하거나 별도 클래스 부여 가능
    if (h.volume === maxVolume && maxVolume > 0) glowClass = "highlight-red";
    else if (h.weight === maxWeight && maxWeight > 0) glowClass = "highlight-yellow";

    container.innerHTML += `
      <div class="record-card ${glowClass}">
        <span class="volume-badge">볼륨: ${h.volume.toLocaleString()} kg</span>
        <div class="record-title">${h.weight}kg x ${h.reps}회 x ${h.sets}세트</div>
        <div class="record-details">기록일: ${h.date}</div>
      </div>
    `;
  });

  showView('history-view');
}

// 히스토리 화면에서 바로 해당 종목 기록하러 가기
function goToRecordFromHistory() {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const cat = exercises[currentViewingExercise].category;
  
  selectedCategories = [cat]; // 해당 종목의 카테고리 자동 셋팅
  document.getElementById('input-name').value = currentViewingExercise;
  
  document.getElementById('current-categories-title').innerText = `현재 부위: ${cat}`;
  showView('record-view');
}
