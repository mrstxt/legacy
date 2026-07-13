import { db } from "@/db";
import { aiInsights, chatLogs, documents, feedbacks, learningSignals, organizations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const [organization] = await db.select().from(organizations).limit(1);
  const [allDocuments, allChats, allFeedback, allInsights, allSignals] = await Promise.all([
    db.select({ status: documents.status, trustScore: documents.trustScore }).from(documents),
    db.select({ isUnanswered: chatLogs.isUnanswered, confidence: chatLogs.confidence, trustScore: chatLogs.trustScore, createdAt: chatLogs.createdAt }).from(chatLogs),
    db.select({ type: feedbacks.type }).from(feedbacks),
    db.select({ kind: aiInsights.kind, impact: aiInsights.impact }).from(aiInsights),
    db.select().from(learningSignals),
  ]);
  const today = new Date().toDateString();
  const likes = allFeedback.filter((item) => item.type === "like").length;
  const trustAvg = allDocuments.length ? Math.round(allDocuments.reduce((sum, item) => sum + item.trustScore, 0) / allDocuments.length) : 0;
  return Response.json({
    organization: organization ? { name: organization.name, mission: organization.mission, values: organization.values } : null,
    totalDocuments: allDocuments.length,
    approvedDocuments: allDocuments.filter((item) => item.status === "indexed").length,
    pendingDocuments: allDocuments.filter((item) => item.status === "pending_review").length,
    todayQuestions: allChats.filter((item) => item.createdAt.toDateString() === today).length,
    unansweredQuestions: allChats.filter((item) => item.isUnanswered).length,
    feedbackRate: allFeedback.length ? Math.round((likes / allFeedback.length) * 100) : 0,
    trustAverage: trustAvg,
    insightCount: allInsights.length,
    learningSignals: allSignals,
  });
}
