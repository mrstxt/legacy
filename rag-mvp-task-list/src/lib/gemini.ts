type GeminiInput = {
  question: string;
  role: "admin" | "sales" | "support";
  context: string;
  fallback: string;
};

type GeminiResponse = {
  answer: string;
  model: string;
  used: boolean;
};

const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function cleanAnswer(text: string) {
  return text
    .replace(/^```[\s\S]*?```$/g, "")
    .replace(/^Javob:\s*/i, "")
    .trim()
    .slice(0, 2800);
}

export async function answerWithGemini({ question, role, context, fallback }: GeminiInput): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !context.trim()) return { answer: fallback, model: "local-rag", used: false };

  const systemInstruction = `Siz Knowledge Trust platformasining ${role} roli uchun ichki AI Copilotisiz.
Sizning qadriyatlaringiz: ishonch, shaffoflik, mas'uliyat va rivojlanish.
Faqat quyida berilgan tasdiqlangan bilim bazasi contextidan foydalaning. Contextda javob bo'lmasa uydirmang va o'zbek tilida quyidagi jumlani ishlating: "Tasdiqlangan bilim bazasida yetarli ma'lumot topilmadi.".
Javobni qisqa va amaliy yozing: kerak bo'lsa 1) 2) 3) qadamlar. Oxirida aynan "Manba:" bilan manbani ko'rsating. Maxfiy ma'lumotlarni qaytarmang; [MASKED] qiymatlarni hech qachon tiklamang.`;

  const prompt = `${systemInstruction}\n\nSAVOL:\n${question}\n\nTASDIQLANGAN CONTEXT:\n${context}\n\nJAVOB:`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 700,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return { answer: fallback, model: "local-rag", used: false };
    const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join(" ").trim();
    if (!text) return { answer: fallback, model: "local-rag", used: false };
    return { answer: cleanAnswer(text), model, used: true };
  } catch {
    return { answer: fallback, model: "local-rag", used: false };
  }
}
