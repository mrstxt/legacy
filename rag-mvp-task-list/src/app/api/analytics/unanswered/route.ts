import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const questions = await db
    .select({ id: chatLogs.id, question: chatLogs.question, userRole: chatLogs.userRole, createdAt: chatLogs.createdAt, confidence: chatLogs.confidence, reasoning: chatLogs.reasoning })
    .from(chatLogs)
    .where(eq(chatLogs.isUnanswered, true))
    .orderBy(desc(chatLogs.createdAt));
  return Response.json({ questions });
}
