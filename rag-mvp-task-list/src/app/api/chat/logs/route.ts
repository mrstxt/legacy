import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const logs = await db
    .select({
      id: chatLogs.id,
      question: chatLogs.question,
      answer: chatLogs.answer,
      userRole: chatLogs.userRole,
      confidence: chatLogs.confidence,
      trustScore: chatLogs.trustScore,
      intent: chatLogs.intent,
      reasoning: chatLogs.reasoning,
      sourceChunks: chatLogs.sourceChunks,
      isUnanswered: chatLogs.isUnanswered,
      createdAt: chatLogs.createdAt,
      userName: users.fullName,
    })
    .from(chatLogs)
    .leftJoin(users, eq(chatLogs.userId, users.id))
    .orderBy(desc(chatLogs.createdAt))
    .limit(80);
  return Response.json({ logs });
}
