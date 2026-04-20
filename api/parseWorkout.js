import OpenAI from 'openai';

// Vercel 환경 변수에서 API 키를 가져옵니다. (코드에 직접 노출되지 않아 안전합니다)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST method only' });
  }

  const { text } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 비용 대비 성능이 훌륭한 모델
      messages: [
        {
          role: "system",
          content: `당신은 사용자의 운동 기록 텍스트를 분석하여 정확한 JSON 배열로 반환하는 파서입니다. 
          반드시 아래 형식의 JSON만을 반환해야 합니다. 마크다운이나 다른 설명은 절대 추가하지 마세요.
          형식: { "workouts": [ { "name": "운동이름", "weight": 숫자(kg), "reps": 숫자(회), "sets": 숫자(세트) } ] }
          예외 처리: 몸무게를 이용하는 맨몸운동은 weight를 0으로 설정하세요.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" } // 확실한 JSON 반환을 강제함
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: 'Failed to parse workout data' });
  }
}
