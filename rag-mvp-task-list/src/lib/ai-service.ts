import { allowedDepartments, chunkText, lexicalScore, maskSensitiveData, normalizeText } from "@/lib/document-tools";

export type InsightKind = "topic" | "sentiment" | "quality" | "coverage" | "stale";

export type DocumentIntelligence = {
  trustScore: number;
  quality: number;
  sentiment: "positive" | "neutral" | "concern" | "negative";
  topics: { label: string; weight: number }[];
  summary: string;
  reasoning: string;
  insights: { kind: InsightKind; title: string; detail: string; impact: number }[];
  masked: Record<string, number>;
};

const stopwords = new Set([
  "va", "yoki", "uchun", "bilan", "kerak", "ham", "bu", "uchun", "bizga", "sizga", "mijoz", "har", "bitta", "ko'p", "soni", "ichida",
]);

function tokenize(text: string) {
  return (text.toLowerCase().match(/[\p{L}]{3,}/gu) ?? []).filter((token) => !stopwords.has(token));
}

function topicFrequency(tokens: string[]) {
  const map = new Map<string, number>();
  for (const token of tokens) map.set(token, (map.get(token) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function detectSentiment(text: string): DocumentIntelligence["sentiment"] {
  const lower = text.toLowerCase();
  const positive = ["rahmat", "yaxshi", "ajoyib", "zo'r", "muvaffaqiyat", "ijobiy"];
  const negative = ["muammo", "shikoyat", "xato", "blok", "yo'qotdi", "yomon", "narigi", "kutilgan"];
  const concern = ["ehtiyot", "diqqat", "xavfsizlik", "tekshiring", "ogohlantirish"];
  if (negative.some((word) => lower.includes(word))) return "negative";
  if (concern.some((word) => lower.includes(word))) return "concern";
  if (positive.some((word) => lower.includes(word))) return "positive";
  return "neutral";
}

function trustScoreFromSignals({
  masked,
  quality,
  sentiment,
  pageCount,
}: {
  masked: number;
  quality: number;
  sentiment: DocumentIntelligence["sentiment"];
  pageCount: number;
}) {
  const base = 60;
  const maskedBoost = Math.min(20, masked * 1.2);
  const qualityBoost = quality * 15;
  const sentimentAdjust = sentiment === "negative" ? -10 : sentiment === "concern" ? -4 : 6;
  const lengthBoost = Math.min(8, pageCount * 0.4);
  return Math.max(20, Math.min(99, Math.round(base + maskedBoost + qualityBoost + sentimentAdjust + lengthBoost)));
}

export function analyzeDocument(rawText: string, pageCount: number): DocumentIntelligence {
  const masking = maskSensitiveData(rawText);
  const cleanText = normalizeText(masking.cleanText);
  const tokens = tokenize(cleanText);
  const frequencies = topicFrequency(tokens).slice(0, 6);
  const total = tokens.length || 1;
  const topics = frequencies.map(([label, count]) => ({ label, weight: Math.round((count / total) * 100) }));
  const sentiment = detectSentiment(cleanText);
  const quality = Math.min(0.95, 0.45 + (cleanText.length / 4000) * 0.4 + (topics[0]?.weight ?? 0) / 200);
  const trustScore = trustScoreFromSignals({ masked: masking.total, quality, sentiment, pageCount });
  const summary = `Hujjat ${topics.length ? topics[0].label : "umumiy"} mavzusiga ega, ${pageCount || 1} sahifa va ${chunkText(cleanText).length} ta semantik blok.`;
  const reasoning = `Hujjat ${(quality * 100).toFixed(0)}% sifat baholandi, ${masking.total} ta maxfiy ma'lumot masklandi va ${sentiment} ohang aniqlandi.`;
  const insights: DocumentIntelligence["insights"] = [
    { kind: "quality", title: "Sifat bahosi", detail: `AI sifat ko'rsatkichi: ${(quality * 100).toFixed(0)}%`, impact: Math.round(quality * 100) },
    { kind: "topic", title: "Asosiy mavzular", detail: topics.slice(0, 3).map((topic) => `${topic.label} (${topic.weight}%)`).join(", ") || "Mavzu aniqlanmadi", impact: 70 },
    { kind: "coverage", title: "Bilim qamrovi", detail: `${chunkText(cleanText).length} ta semantik blok mavjud`, impact: Math.min(90, chunkText(cleanText).length * 2) },
  ];
  if (sentiment === "concern" || sentiment === "negative") {
    insights.push({ kind: "stale", title: "Diqqat talab", detail: "Hujjatda xavfsizlik yoki shikoyat ohanglari aniqlandi", impact: 80 });
  }
  return { trustScore, quality, sentiment, topics, summary, reasoning, insights, masked: masking.counts };
}

export type RetrievalCandidate = {
  documentId: string;
  chunkId: string;
  title: string;
  page: number | null;
  department: string;
  content: string;
  semantic: number;
  trust: number;
  roleMatch: number;
  seniority: number;
  quality: number;
  score: number;
  reasoning: string;
};

export type RetrievalInput = {
  question: string;
  role: "admin" | "sales" | "support";
  documents: Array<{
    id: string;
    title: string;
    department: string;
    status: string;
    cleanText: string | null;
    trustScore: number;
    aiSentiment: string | null;
    aiQuality: number;
    chunks: { id: string; content: string; pageNumber: number | null; senderSeniority: string | null; trustScore: number }[];
  }>;
};

export type RetrievalResult = {
  candidates: RetrievalCandidate[];
  top: RetrievalCandidate | null;
  confidence: number;
  trust: number;
  noAnswer: boolean;
  intent: string;
  reasoning: string;
  safeAnswer: string;
};

function detectIntent(question: string) {
  const lower = question.toLowerCase();
  if (/(karta|blok|tiklash|pin|parol)/.test(lower)) return "card_security";
  if (/(qancha|muddat|necha kun|qachon)/.test(lower)) return "process_timing";
  if (/(qanday|qayerda|kim|qaysi)/.test(lower)) return "guidance";
  if (/(narx|to'lov|qiymat|tolov)/.test(lower)) return "pricing";
  if (/(skript|argument|qarshi|savol)/.test(lower)) return "objection_handling";
  return "general";
}

const noAnswerText = "Bu savol bo'yicha tasdiqlangan bilim bazasida yetarli ma'lumot topilmadi. Iltimos, Team Lead yoki Admin bilan bog'laning.";

export function runRetrieval({ question, role, documents: docs }: RetrievalInput): RetrievalResult {
  const intent = detectIntent(question);
  const departments = [...allowedDepartments(role)];
  const candidates: RetrievalCandidate[] = [];
  for (const document of docs) {
    if (document.status !== "indexed") continue;
    if (!departments.includes(document.department as "sales" | "support" | "common")) continue;
    for (const chunk of document.chunks) {
      const semantic = lexicalScore(question, chunk.content);
      const roleMatch = 1;
      const seniority = chunk.senderSeniority === "senior" || chunk.senderSeniority === "manager" ? 1 : 0.6;
      const quality = document.aiQuality / 100 || 0.6;
      const trust = (document.trustScore + chunk.trustScore) / 200;
      const score = semantic * 0.55 + roleMatch * 0.18 + seniority * 0.12 + quality * 0.05 + trust * 0.10;
      candidates.push({
        documentId: document.id,
        chunkId: chunk.id,
        title: document.title,
        page: chunk.pageNumber,
        department: document.department,
        content: chunk.content,
        semantic,
        trust,
        roleMatch,
        seniority,
        quality,
        score,
        reasoning: `semantic ${(semantic * 100).toFixed(0)}% · trust ${(trust * 100).toFixed(0)}% · role ${role}`,
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] ?? null;
  const confidence = top ? Math.round(top.score * 100) : 0;
  const trust = top ? Math.round((top.trust + (top.quality || 0)) * 50) : 0;
  const noAnswer = !top || confidence < 32;
  const safeAnswer = noAnswer
    ? noAnswerText
    : `${top.content.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ")}\n\nManba: ${top.title}${top.page ? ` · ${top.page}-sahifa` : ""}.`;
  const reasoning = noAnswer
    ? "Savol uchun mos rol va bo'limdagi hujjat topilmadi yoki ishonch darajasi past."
    : `Eng yaxshi natija: ${top.title}. Ishonch ${trust}%, semantik o'xshashlik ${(top.semantic * 100).toFixed(0)}%.`;
  return { candidates: candidates.slice(0, 5), top, confidence, trust, noAnswer, intent, reasoning, safeAnswer };
}
