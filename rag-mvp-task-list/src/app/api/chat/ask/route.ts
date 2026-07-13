import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { aiInsights, chatLogs, documentChunks, documents, learningSignals, organizations } from "@/db/schema";
import { requestRole } from "@/lib/auth";
import { runRetrieval } from "@/lib/ai-service";
import { answerWithGemini } from "@/lib/gemini";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureDemoData();
  const body = (await request.json()) as { question?: string; userId?: string };
  if (!body.question?.trim()) return Response.json({ error: "Savol bo'sh bo'lishi mumkin emas." }, { status: 400 });

  const role = await requestRole(request);
  const departments = role === "admin" ? ["sales", "support", "common"] : role === "sales" ? ["sales", "common"] : ["support", "common"];
  const [organization] = await db.select().from(organizations).limit(1);
  if (!organization) return Response.json({ error: "Tashkilot topilmadi." }, { status: 500 });

  const documentsRows = await db
    .select({ id: documents.id, title: documents.title, department: documents.department, status: documents.status, cleanText: documents.cleanText, trustScore: documents.trustScore, aiSentiment: documents.aiSentiment, aiQuality: documents.aiQuality })
    .from(documents)
    .where(and(eq(documents.organizationId, organization.id), inArray(documents.department, departments as ("sales" | "support" | "common")[])));
  const documentIds = documentsRows.map((doc) => doc.id);
  const chunks = documentIds.length
    ? await db.select({ id: documentChunks.id, documentId: documentChunks.documentId, content: documentChunks.content, pageNumber: documentChunks.pageNumber, senderSeniority: documentChunks.senderSeniority, trustScore: documentChunks.trustScore }).from(documentChunks).where(inArray(documentChunks.documentId, documentIds))
    : [];
  const documentsWithChunks = documentsRows.map((doc) => ({ ...doc, chunks: chunks.filter((chunk) => chunk.documentId === doc.id) }));
  const retrieval = runRetrieval({ question: body.question, role, documents: documentsWithChunks });

  const context = retrieval.candidates
    .slice(0, 3)
    .map((candidate, index) => `[${index + 1}] ${candidate.title} | bo'lim: ${candidate.department} | sahifa: ${candidate.page ?? "-"} | trust: ${Math.round(candidate.trust * 100)}%\n${candidate.content}`)
    .join("\n\n");
  const ai = await answerWithGemini({ question: body.question.trim(), role, context: retrieval.noAnswer ? "" : context, fallback: retrieval.safeAnswer });
  const answer = ai.answer;
  const reasoning = `${retrieval.reasoning} ${ai.used ? `Gemini ${ai.model} javobni context asosida shakllantirdi.` : "Lokal RAG fallback ishladi; GEMINI_API_KEY berilsa model javobi yoqiladi."}`;

  const [chat] = await db.insert(chatLogs).values({
    organizationId: organization.id,
    userId: body.userId || null,
    question: body.question.trim(),
    answer,
    userRole: role,
    confidence: retrieval.confidence,
    trustScore: retrieval.trust,
    intent: retrieval.intent,
    reasoning,
    sourceChunks: retrieval.top ? [{ title: retrieval.top.title, page: retrieval.top.page, trust: retrieval.trust, score: retrieval.confidence }] : [],
    isUnanswered: retrieval.noAnswer,
  }).returning({ id: chatLogs.id });

  if (chat) {
    if (retrieval.noAnswer) {
      await db.insert(aiInsights).values({ organizationId: organization.id, chatLogId: chat.id, kind: "stale", title: "Bilim bo'shlig'i", detail: `"${body.question.trim()}" savoliga javob topilmadi`, impact: 75 });
    }
    const [signal] = await db.select({ id: learningSignals.id, frequency: learningSignals.frequency, trend: learningSignals.trend }).from(learningSignals).where(and(eq(learningSignals.organizationId, organization.id), eq(learningSignals.topic, retrieval.intent))).limit(1);
    if (signal) {
      await db.update(learningSignals).set({ frequency: signal.frequency + 1, trend: signal.trend + (retrieval.noAnswer ? -1 : 1), lastSeen: new Date() }).where(eq(learningSignals.id, signal.id));
    } else {
      await db.insert(learningSignals).values({ organizationId: organization.id, topic: retrieval.intent, intent: retrieval.intent, frequency: 1, trend: retrieval.noAnswer ? -1 : 1 });
    }
  }

  return Response.json({
    chatLogId: chat?.id,
    answer,
    confidence: retrieval.confidence,
    trust: retrieval.trust,
    intent: retrieval.intent,
    reasoning,
    model: ai.model,
    aiUsed: ai.used,
    sources: retrieval.top ? [{ title: retrieval.top.title, page: retrieval.top.page, department: retrieval.top.department, trust: retrieval.trust }] : [],
    noAnswer: retrieval.noAnswer,
    candidates: retrieval.candidates,
  });
}
