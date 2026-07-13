import { db } from "@/db";
import { chatLogs, learningSignals } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const [rows, signals] = await Promise.all([db.select({ question: chatLogs.question, intent: chatLogs.intent }).from(chatLogs), db.select().from(learningSignals).orderBy(learningSignals.frequency)]);
  const counts = new Map<string, { question: string; count: number; intent: string | null }>();
  rows.forEach(({ question, intent }) => {
    const key = question.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { question, count: 1, intent });
  });
  return Response.json({
    questions: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    learningSignals: signals.sort((a, b) => b.frequency - a.frequency).slice(0, 10),
  });
}
