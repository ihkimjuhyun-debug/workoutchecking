// 🏆 명예의 전당 복구 및 강화 렌더링 함수
function renderHallOfFame() {
  const sessionsRaw = JSON.parse(localStorage.getItem('pr_sessions')) || {};
  const exercisesRaw = JSON.parse(localStorage.getItem('pr_exercises')) || {};
  
  const volContainer = document.getElementById('hof-volume-list');
  const weightContainer = document.getElementById('hof-weight-list');
  
  if (!volContainer || !weightContainer) return; // 요소가 없으면 리턴

  volContainer.innerHTML = '';
  weightContainer.innerHTML = '';

  // 1. 역대 세션 볼륨 랭킹 
  // [수정] 세션 키에서 timestamp를 추출하거나 저장된 데이터를 기반으로 숫자 정렬
  const sessionList = Object.values(sessionsRaw);
  
  if (sessionList.length === 0) {
    volContainer.innerHTML = '<div style="text-align:center; color:#666; padding:40px;">기록된 세션이 없습니다.</div>';
  } else {
    // 볼륨 높은 순으로 정렬
    sessionList.sort((a, b) => b.totalVolume - a.totalVolume);

    sessionList.forEach((session, index) => {
      let rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}위`;
      volContainer.innerHTML += `
        <div class="record-card highlight-red">
          <span class="volume-badge" style="color: #ff4a4a; background: rgba(255,74,74,0.15);">${session.totalVolume.toLocaleString()} kg</span>
          <div class="record-title">${rankIcon} ${session.date}</div>
          <div class="record-details">부위: ${session.categories ? session.categories.join(', ') : '기타'}</div>
        </div>
      `;
    });
  }

  // 2. 종목별 최고 무게 PR 랭킹
  let weightRecords = [];
  for (const [name, data] of Object.entries(exercisesRaw)) {
    if (!data.history || data.history.length === 0) continue;

    // 해당 종목의 히스토리 중 가장 높은 무게 찾기
    let maxEntry = data.history.reduce((prev, current) => (prev.weight > current.weight) ? prev : current);
    
    if (maxEntry && maxEntry.weight > 0) {
      weightRecords.push({
        name: name,
        category: data.category || '미분류',
        maxWeight: maxEntry.weight,
        date: maxEntry.date,
        reps: maxEntry.reps
      });
    }
  }

  if (weightRecords.length === 0) {
    weightContainer.innerHTML = '<div style="text-align:center; color:#666; padding:40px;">기록된 종목이 없습니다.</div>';
  } else {
    // 무게 높은 순 정렬
    weightRecords.sort((a, b) => b.maxWeight - a.maxWeight);

    weightRecords.forEach((rec, index) => {
      let rankIcon = index === 0 ? '👑' : `${index + 1}위`;
      weightContainer.innerHTML += `
        <div class="record-card highlight-yellow">
          <span class="volume-badge" style="color: #ffd700; background: rgba(255,215,0,0.15);">${rec.maxWeight} kg</span>
          <div class="record-title">${rankIcon} ${rec.name} <span style="font-size:0.8rem; color:#888;">[${rec.category}]</span></div>
          <div class="record-details">${rec.maxWeight}kg x ${rec.reps}회 (달성일: ${rec.date})</div>
        </div>
      `;
    });
  }
}

// 탭 전환 함수 (안전하게 display 속성 제어)
function switchHofTab(type) {
  const volTab = document.querySelectorAll('.hof-tab')[0];
  const weightTab = document.querySelectorAll('.hof-tab')[1];
  const volList = document.getElementById('hof-volume-list');
  const weightList = document.getElementById('hof-weight-list');

  if (type === 'volume') {
    volTab.classList.add('active');
    weightTab.classList.remove('active');
    volList.style.display = 'flex';
    weightList.style.display = 'none';
  } else {
    volTab.classList.remove('active');
    weightTab.classList.add('active');
    volList.style.display = 'none';
    weightList.style.display = 'flex';
  }
}
