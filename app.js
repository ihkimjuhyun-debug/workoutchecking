// --------------------------------------------------------
// 1. 다중 운동 종목 입력칸 동적 추가/초기화 함수
// --------------------------------------------------------
function addExerciseInput() {
  const container = document.getElementById('exercise-inputs-container');
  const entryHtml = `
    <div class="exercise-entry record-card mb-20" style="position:relative; animation: fadeIn 0.3s ease;">
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
    <div class="exercise-entry record-card mb-20" style="position:relative;">
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

// --------------------------------------------------------
// 2. 운동 시작 버튼 (초기화 로직 연동)
// --------------------------------------------------------
function startWorkout() {
  if (selectedCategories.length === 0) return alert('최소 하나 이상의 카테고리를 선택해주세요.');
  document.getElementById('current-categories-title').innerText = `현재 부위: ${selectedCategories.join(', ')}`;
  
  resetExerciseInputs(); // 여러 개 추가했던 폼 초기화
  document.getElementById('past-date-container').style.display = 'none';
  showView('record-view');
}

// --------------------------------------------------------
// 3. 기록 저장 로직 (다중 종목 반복 처리 및 초 단위 시간)
// --------------------------------------------------------
function saveRecord(timeType) {
  const entries = document.querySelectorAll('.exercise-entry');
  let sessionTotalVolume = 0;
  let validWorkouts = [];

  // DOM에서 모든 종목 데이터를 수집
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

  // 날짜 및 초 단위 시간 설정
  let recordDate = new Date();
  if (timeType === 'past') {
    const pastInput = document.getElementById('input-past-date').value;
    if (!pastInput) return alert("과거 날짜와 시간을 선택해주세요.");
    recordDate = new Date(pastInput);
  }

  const dateString = recordDate.toISOString().split('T')[0];
  // '2026. 4. 21. 오전 01:10:44' 형태로 초 단위까지 완벽하게 기록
  const fullDateString = recordDate.toLocaleString('ko-KR', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  const sessions = JSON.parse(localStorage.getItem('pr_sessions'));
  const exercises = JSON.parse(localStorage.getItem('pr_exercises'));

  // 1. Session 데이터 기록 (루프를 돌며 총 볼륨 합산)
  const sessionKey = `${dateString}_${selectedCategories.join('_')}_${recordDate.getTime()}`; // 고유 세션키 보장
  sessions[sessionKey] = { 
    date: fullDateString, // 명예의 전당에서도 시간까지 보이게 함
    categories: selectedCategories, 
    totalVolume: 0 
  };

  // 2. 종목별 기록 저장
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

  alert(`저장 완료! 총 ${validWorkouts.length}개 종목, 세션 볼륨: ${sessionTotalVolume}kg`);
  showView('hof-view');
}

// --------------------------------------------------------
// 4. 검색 필터 시각적 피드백 로직
// --------------------------------------------------------
function filterByCategory(cat, btnElement) {
  // 모든 버튼의 액티브 디자인 제거
  document.querySelectorAll('#filter-categories .cat-btn').forEach(btn => {
    btn.classList.remove('active-filter');
  });
  
  // 클릭된 버튼만 액티브 디자인 적용
  if (btnElement) {
    btnElement.classList.add('active-filter');
  }

  // 기존 검색 렌더링 호출
  renderAllExercises(cat, "");
}
