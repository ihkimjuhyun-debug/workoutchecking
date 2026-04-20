// 과거 기록 데이터베이스 예시 (실제 앱에서는 로컬 스토리지나 DB에서 불러옴)
const pastRecords = {
  "렛풀다운": {
    maxWeight: 130,       // 최고 무게
    maxRepsAtMax: 20,     // 최고 무게에서의 최대 반복수
    maxVolume: 7800       // 해당 종목 단일 세션 최고 볼륨 (예: 130kg * 20회 * 3세트)
  },
  "OHP": {
    maxWeight: 100,
    maxRepsAtMax: 6,
    maxVolume: 3000       // (예: 100kg * 6회 * 5세트)
  }
};

// 오늘 수행한 운동 리스트 (입력된 데이터 파싱 결과)
const todayWorkout = [
  { name: "사이드 레터럴 레이즈", weight: 10, reps: 30, sets: 3 },
  { name: "숄더 프레스", weight: 50, reps: 30, sets: 3 },
  { name: "렛풀다운", weight: 130, reps: 21, sets: 1 }, // PR 상황 가정
  { name: "OHP", weight: 100, reps: 6, sets: 5 }
];

function analyzeWorkout(workoutData) {
  let sessionTotalVolume = 0;
  let isPrAchieved = false;
  let prMessages = [];

  workoutData.forEach(exercise => {
    // 1. 종목별 총 중량 (볼륨) 계산
    const exerciseVolume = exercise.weight * exercise.reps * exercise.sets;
    sessionTotalVolume += exerciseVolume;

    console.log(`${exercise.name} 총 중량: ${exerciseVolume}kg`);

    // 2. 과거 기록과 비교 및 PR 검사
    const history = pastRecords[exercise.name];
    
    if (history) {
      // PR 조건 1: 같은 무게에서 반복수가 늘었을 때
      if (exercise.weight === history.maxWeight && exercise.reps > history.maxRepsAtMax) {
        isPrAchieved = true;
        prMessages.push(`🔥 ${exercise.name} 반복수 PR 달성! (${history.maxRepsAtMax}회 ➡️ ${exercise.reps}회)`);
        pastRecords[exercise.name].maxRepsAtMax = exercise.reps; // 기록 갱신
      }
      
      // PR 조건 2: 총 볼륨이 증가했을 때 (예: 100kg 6개 1세트 -> 100kg 6개 5세트로 볼륨 성장)
      if (exerciseVolume > history.maxVolume) {
        isPrAchieved = true;
        prMessages.push(`🔥 ${exercise.name} 볼륨 PR 달성! (${history.maxVolume}kg ➡️ ${exerciseVolume}kg)`);
        pastRecords[exercise.name].maxVolume = exerciseVolume; // 기록 갱신
      }
    } else {
      // 첫 운동 기록인 경우 데이터베이스에 추가
      pastRecords[exercise.name] = {
        maxWeight: exercise.weight,
        maxRepsAtMax: exercise.reps,
        maxVolume: exerciseVolume
      };
    }
  });

  console.log(`💪 오늘 세션 총 중량: ${sessionTotalVolume}kg`);

  // 3. PR 달성 시 시각 효과 트리거
  if (isPrAchieved) {
    triggerPrEffect(prMessages);
  }
}

// PR 시각 효과 및 5분 유지 타이머
function triggerPrEffect(messages) {
  const container = document.getElementById('workout-view');
  const notification = document.getElementById('pr-alert');
  
  // 알림 텍스트 업데이트
  notification.innerHTML = `<span>🔥</span> PR 달성!<br>${messages.join('<br>')}`;
  
  // 글로우 효과 및 알림창 표시
  container.classList.add('pr-achieved');
  notification.classList.add('show');

  // 정확히 5분(300,000ms) 후 효과 제거
  setTimeout(() => {
    container.classList.remove('pr-achieved');
    notification.classList.remove('show');
  }, 300000); 
}

// 실행
// analyzeWorkout(todayWorkout);
