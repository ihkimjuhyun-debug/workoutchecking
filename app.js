let selectedCategories = [];
let currentViewingExercise = "";

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  
  // 메인 화면 카테고리 다중 선택 로직
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

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  if (viewId === 'hof-view') renderHallOfFame();
  if (viewId === 'search-view') renderAllExercises();
}

// --------------------------------------------------------
// 기록 입력 및 다중 종목 로직
// --------------------------------------------------------
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
      <div class="input-group mt-10">
        <label>운동 종목</label>
        <input type="text" class="input-name" placeholder="예: 덤벨 플라이">
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>무게 (kg)</label>
          <input type="number" class="input-weight" placeholder="0">
        </div>
        <div class="input-group">
          <label>횟수 (회)</label>
          <input type="number" class="input-reps" placeholder="0">
        </div>
        <div class="input-group">
          <label>세트 (세트)</label>
          <input type="number" class="input-sets" placeholder="0">
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', entryHtml);
}

function resetExerciseInputs() {
  const container = document.getElementById('exercise-inputs-container');
  container.innerHTML = `
    <div class="exercise-entry mb-20">
      <div class="input-group mt-10">
        <label>운동 종목</label>
        <input type="text" class="input-name" placeholder="예: OHP, 벤치프레스">
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>무게 (kg)</label>
          <input type="number" class="input-weight" placeholder="0">
        </div>
        <div class="input-group">
          <label>횟수 (회)</label>
          <input type="number" class="input-reps" placeholder="0">
        </div>
        <div class="input-group">
          <label>세트 (세트)</label>
          <input type="number" class="input-sets" placeholder="0">
        </div>
      </div>
    </div>
  `;
}

function togglePastDateInput() {
  const container = document.getElementById('past-date-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry');
  let sessionTotalVolume = 0;
  let validWorkouts = [];

  entries.forEach(entry => {
    const name = entry.querySelector('.input-name').value.trim().toUpperCase();
    const weight = parseInt(entry.querySelector('.input-weight').value) || 0;
    const reps = parseInt(entry.querySelector('.input-reps').value) || 0;
    const sets = parseInt(entry.querySelector('.input-sets').value) || 0;

    if (name && reps && sets) {
      validWorkouts.push({ name, weight, reps, sets, volume: weight * reps * sets });
    }
  });

  if (validWorkouts.length === 0) return alert("최소 하나의 종목을 정확히 입력해주세요.");

  let recordDate = new Date();
  if (timeType === 'past') {
    const pastInput = document.getElementById('input-past-date').value;
    if (!pastInput) return alert("과거 날짜와 시간을 선택해주세요.");
    recordDate = new Date(pastInput);
  }

  // 초 단위까지 기록
  const dateString = recordDate.toISOString().split('T')[0];
  const fullDateString = recordDate.toLocaleString('ko-KR', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));

  const sessionKey = `${dateString}_${selectedCategories.join('_')}_${recordDate.getTime()}`;
  sessions[sessionKey] = { date: fullDateString, categories: selectedCategories, totalVolume: 0 };

  validWorkouts.forEach(workout => {
    sessions[sessionKey].totalVolume += workout.volume;
    sessionTotalVolume += workout.volume;

    if (!exercises[workout.name]) {
      exercises[workout.name] = { category: selectedCategories[0], history: [] };
    }
    
    exercises[workout.name].history.push({
      date: fullDateString,
      timestamp: recordDate.getTime(),
      weight: workout.weight,
      reps: workout.reps,
      sets: workout.sets,
      volume: workout.volume
    });
  });

  localStorage.setItem('pr_sessions', JSON.stringify(sessions));
  localStorage.setItem('pr_exercises', JSON.stringify(exercises));

  alert(`저장 완료! 총 ${validWorkouts.length}개 종목, 세션 볼륨: ${sessionTotalVolume.toLocaleString()}kg`);
  showView('hof-view');
}

// --------------------------------------------------------
// 조회 및 렌더링 로직 (검색, 명예의 전당)
// --------------------------------------------------------
function renderHallOfFame() {
  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const container = document.getElementById('hof-list');
  container.innerHTML = '';

  const sortedSessions = Object.values(sessions).sort((a, b) => {
    return new Date(b.date.replace(/\. /g, '-').replace('오전', 'AM').replace('오후', 'PM')) - 
           new Date(a.date.replace(/\. /g, '-').replace('오전', 'AM').replace('오후', 'PM'));
  });

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

function renderAllExercises(filterCat = null, searchQuery = "") {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const container = document.getElementById('exercise-list');
  container.innerHTML = '';

  let hasResult = false;
  for (const [name, data] of Object.entries(exercises)) {
    if (filterCat && data.category !== filterCat) continue;
    if (searchQuery && !name.includes(searchQuery.toUpperCase())) continue;

    hasResult = true;
    container.innerHTML += `
      <div class="record-card" onclick="openExerciseHistory('${name}')">
        <div class="record-title">${name} <span style="font-size:0.85rem; color:var(--primary); font-weight:normal;">[${data.category}]</span></div>
        <div class="record-details">총 ${data.history.length}개의 기록이 있습니다. (클릭하여 비교)</div>
      </div>
    `;
  }
  
  if (!hasResult) {
    container.innerHTML = `<div style="text-align:center; color:#888; padding: 20px;">검색 결과가 없습니다.</div>`;
  }
}

function searchExercises() {
  const query = document.getElementById('search-input').value;
  // 검색 시 활성화된 카테고리 필터도 유지하도록 수정
  const activeBtn = document.querySelector('#filter-categories .cat-btn.active-filter');
  const cat = activeBtn ? activeBtn.innerText : null;
  renderAllExercises(cat, query);
}

function filterByCategory(cat, btnElement) {
  const isActive = btnElement.classList.contains('active-filter');
  
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => {
    btn.classList.remove('active-filter');
  });
  
  if (isActive) {
    // 이미 활성화된 버튼을 누르면 필터 해제
    renderAllExercises(null, document.getElementById('search-input').value);
  } else {
    // 새 카테고리 필터 적용
    btnElement.classList.add('active-filter');
    renderAllExercises(cat, document.getElementById('search-input').value);
  }
}

function openExerciseHistory(name) {
  currentViewingExercise = name;
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const historyData = exercises[name].history;
  
  historyData.sort((a, b) => b.timestamp - a.timestamp);

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

function goToRecordFromHistory() {
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));
  const cat = exercises[currentViewingExercise].category;
  
  selectedCategories = [cat]; 
  document.getElementById('current-categories-title').innerText = `운동 기록 (${cat})`;
  
  resetExerciseInputs();
  // 동적 입력칸의 첫 번째 종목 이름에 값 채워넣기
  setTimeout(() => {
    document.querySelector('.input-name').value = currentViewingExercise;
  }, 50);
  
  showView('record-view');
}
