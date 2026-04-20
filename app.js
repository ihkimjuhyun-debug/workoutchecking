document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
});

document.getElementById('analyze-btn').addEventListener('click', async () => {
  const inputText = document.getElementById('workout-input').value;
  if (!inputText.trim()) return alert("운동 기록을 입력해주세요!");

  document.getElementById('loading').style.display = 'block';
  document.getElementById('analyze-btn').style.display = 'none';

  try {
    // Vercel Serverless Function 호출
    const response = await fetch('/api/parseWorkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText })
    });

    const data = await response.json();
    if (data.workouts) {
      analyzeAndSaveWorkout(data.workouts);
    } else {
      alert("분석에 실패했습니다. 내용을 다시 확인해주세요.");
    }
  } catch (error) {
    console.error(error);
    alert("서버 통신 에러가 발생했습니다.");
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('analyze-btn').style.display = 'block';
  }
});

function analyzeAndSaveWorkout(workouts) {
  // 로컬 스토리지에서 과거 기록 불러오기
  let pastRecords = JSON.parse(localStorage.getItem('workout_records')) || {};
  
  let sessionTotalVolume = 0;
  let isPrAchieved = false;
  let prMessages = [];
  let parsedHTML = "";

  const today = new Date().toLocaleDateString('ko-KR');

  workouts.forEach(ex => {
    const volume = ex.weight * ex.reps * ex.sets;
    sessionTotalVolume += volume;
    
    parsedHTML += `<div class="record-card">
      <strong>${ex.name}</strong><br>
      ${ex.weight}kg x ${ex.reps}회 x ${ex.sets}세트 (총 볼륨: ${volume}kg)
    </div>`;

    const history = pastRecords[ex.name];

    if (history) {
      // PR 조건 검사
      if (ex.weight === history.maxWeight && ex.reps > history.maxRepsAtMax) {
        isPrAchieved = true;
        prMessages.push(`🔥 [${ex.name}] 반복수 PR! (${history.maxRepsAtMax}회 ➡️ ${ex.reps}회)`);
        pastRecords[ex.name].maxRepsAtMax = ex.reps;
        pastRecords[ex.name].lastUpdated = today;
      }
      
      if (volume > history.maxVolume) {
        isPrAchieved = true;
        prMessages.push(`🔥 [${ex.name}] 볼륨 PR! (${history.maxVolume}kg ➡️ ${volume}kg)`);
        pastRecords[ex.name].maxVolume = volume;
        pastRecords[ex.name].maxWeight = Math.max(pastRecords[ex.name].maxWeight, ex.weight); // 최고 중량 갱신
        pastRecords[ex.name].lastUpdated = today;
      }
    } else {
      pastRecords[ex.name] = {
        maxWeight: ex.weight,
        maxRepsAtMax: ex.reps,
        maxVolume: volume,
        lastUpdated: today
      };
    }
  });

  // 결과 화면 업데이트
  document.getElementById('session-total').innerText = `🏆 오늘 세션 총 중량: ${sessionTotalVolume}kg`;
  document.getElementById('parsed-list').innerHTML = parsedHTML;
  document.getElementById('result-area').style.display = 'block';

  // 로컬 스토리지 저장
  localStorage.setItem('workout_records', JSON.stringify(pastRecords));
  renderHistory();

  // PR 달성 시 효과 적용 (정확히 5분간 유지)
  if (isPrAchieved) {
    triggerPrEffect(prMessages);
  }
}

function renderHistory() {
  const pastRecords = JSON.parse(localStorage.getItem('workout_records')) || {};
  const historyDiv = document.getElementById('history-list');
  historyDiv.innerHTML = "";

  for (const [name, data] of Object.entries(pastRecords)) {
    historyDiv.innerHTML += `
      <div class="record-card">
        <strong>${name}</strong> (최근 갱신: ${data.lastUpdated})<br>
        최고 볼륨: ${data.maxVolume}kg | 최고 무게: ${data.maxWeight}kg (최대 ${data.maxRepsAtMax}회)
      </div>`;
  }
}

function triggerPrEffect(messages) {
  const container = document.getElementById('workout-view');
  const notification = document.getElementById('pr-alert');
  
  notification.innerHTML = `<span>🔥 PR 달성! 🔥</span><br><br>${messages.join('<br>')}`;
  
  container.classList.add('pr-achieved');
  notification.classList.add('show');

  // 5분(300,000ms) 후 원상복구
  setTimeout(() => {
    container.classList.remove('pr-achieved');
    notification.classList.remove('show');
  }, 300000); 
}
