// ... (상단 공통 변수 및 초기화 로직 유지)

async function generateAIRoutines() {
  const target = document.getElementById('goal-target').value.trim();
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value);
  if (!target || !current) return alert("목표와 현재 기록을 입력해주세요.");

  document.getElementById('btn-generate').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';

  // 🔥 프롬프트 강화: 섀도우 복싱 금지, 스트렝스 원칙 강조, 근거(rationale) 포함 지시
  const systemPrompt = `You are a world-class strength coach (SFG, StrongFirst, Westside Barbell specialized).
Generate exactly 3 workout routines for the user's goal as a JSON array.
NEVER include irrelevant cardio like shadow boxing, soccer, etc. Only focus on compound lifts, kettlebell strength, and relevant stability accessories.

Format MUST be:
[
  {
    "title": "Routine Title", 
    "desc": "Short description", 
    "sessions": [
      {
        "title": "Day 1: Accummulation", 
        "detail": "OHP 40kg 5x5, Pull-ups 3x8", 
        "rationale": "High volume with moderate intensity to build work capacity and neural patterns."
      },
      ...
    ]
  }
]
- rationale field must explain 'WHY' this specific intensity/volume is chosen in Korean.
- Generate approx 10-15 progressive sessions.`;

  try {
    const data = await callOpenAI('chat', {
      model: "gpt-4o", // 더 높은 추론 능력을 위해 4o 사용
      messages: [ { role: "system", content: systemPrompt }, { role: "user", content: `목표: ${target}, 현재: ${current}, 기간: ${months}개월` } ],
      response_format: { type: "json_object" }
    });

    if (data.error) throw new Error(data.error.message);
    let rawContent = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultObj = JSON.parse(rawContent);
    generatedRoutinesTemp = Array.isArray(resultObj) ? resultObj : (resultObj.routines || Object.values(resultObj)[0]);

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-routines-area').style.display = 'block';
    
    document.getElementById('ai-routines-list').innerHTML = generatedRoutinesTemp.map((r, i) => `
      <div class="ai-routine-card" id="routine-card-${i}" onclick="selectRoutine(${i})">
        <div class="ai-routine-title">${r.title}</div>
        <div class="ai-routine-desc">${r.desc}</div>
        <div style="margin-top:10px; font-size:0.8rem; color:var(--primary);">세부 훈련: 총 ${r.sessions.length}개 세션 설계됨</div>
      </div>`).join('');
  } catch (err) {
    alert("API 호출 오류: " + err.message);
    document.getElementById('btn-generate').style.display = 'block';
    document.getElementById('ai-loading').style.display = 'none';
  }
}

function startSelectedRoutine() {
  if (selectedRoutineIndex === null) return alert("루틴을 선택해주세요.");
  const target = document.getElementById('goal-target').value.trim(); 
  const current = document.getElementById('goal-current').value.trim();
  const months = parseInt(document.getElementById('goal-duration').value); 
  const routine = generatedRoutinesTemp[selectedRoutineIndex];
  
  let sessions = [], startDate = new Date(), endDate = new Date(); 
  endDate.setMonth(endDate.getMonth() + months);
  
  let totalSessions = routine.sessions.length;
  let interval = ((endDate - startDate) / (1000 * 60 * 60 * 24)) / totalSessions;

  for(let i=0; i<totalSessions; i++) {
    let sDate = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
    sessions.push({ 
      id: i, 
      date: `${sDate.getFullYear()}.${String(sDate.getMonth()+1).padStart(2,'0')}.${String(sDate.getDate()).padStart(2,'0')}`, 
      title: routine.sessions[i].title, 
      detail: routine.sessions[i].detail,
      rationale: routine.sessions[i].rationale, // 🔥 근거 데이터 저장
      done: false 
    });
  }

  localStorage.setItem('pr_active_goal', JSON.stringify({ target, current, months, endDate: endDate.getTime(), totalSessions, completedSessions: 0, sessions }));
  checkActiveGoal();
}

function renderActiveGoal(goal) {
  document.getElementById('active-goal-title').innerText = goal.target; 
  document.getElementById('active-goal-desc').innerText = `현재: ${goal.current} ➔ 목표: ${goal.target}`;
  
  const diffDays = Math.ceil((goal.endDate - new Date().getTime()) / (1000 * 60 * 60 * 24)); 
  document.getElementById('active-goal-dday').innerText = `D-${diffDays > 0 ? diffDays : 'Day'}`;
  
  const percentage = goal.totalSessions === 0 ? 0 : Math.round((goal.completedSessions / goal.totalSessions) * 100);
  setTimeout(() => { document.getElementById('goal-progress-bar').style.width = `${percentage}%`; }, 100);
  document.getElementById('goal-progress-text').innerText = `${percentage}% 완료`; 
  document.getElementById('goal-session-count').innerText = `${goal.completedSessions} / ${goal.totalSessions} 세션`;
  
  document.getElementById('goal-sessions-list').innerHTML = goal.sessions.map((s, idx) => `
    <div class="session-item ${s.done ? 'done' : ''}">
      <div style="flex: 1; padding-right: 10px;">
        <div class="session-name">${s.done ? '✅' : '🔥'} ${s.title}</div>
        <div style="font-size: 0.9rem; color: #ddd; white-space: pre-wrap; font-weight: bold; margin-bottom: 5px;">${s.detail}</div>
        
        <button class="btn-rationale" onclick="toggleRationale(${idx})">왜 이렇게 운동하나요? (AI 분석)</button>
        <div id="rationale-${idx}" class="rationale-box">
           💡 <b>코치 코멘트:</b><br>${s.rationale}
        </div>

        <div class="session-date mt-10">${s.done ? s.date + ' 완료' : '목표일: ' + s.date}</div>
      </div>
      <button class="check-btn ${s.done ? 'done-btn' : ''}" ${s.done ? '' : `onclick="completeGoalSession(${idx})"`}>
        ${s.done ? '달성' : '달성하기'}
      </button>
    </div>
  `).join('');
}

// 근거 박스 토글 함수
function toggleRationale(idx) {
  const box = document.getElementById(`rationale-${idx}`);
  box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

// ... (기타 saveRecord, searchExercises 등 기존 함수 유지)
