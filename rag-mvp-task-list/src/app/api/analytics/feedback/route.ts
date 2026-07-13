import { db } from "@/db";
import { chatLogs, feedbacks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const [rows, chatRows] = await Promise.all([db.select({ type: feedbacks.type }).from(feedbacks), db.select({ confidence: chatLogs.confidence, trustScore: chatLogs.trustScore }).from(chatLogs)]);
  const likes = rows.filter((row) => row.type === "like").length;
  const avgConfidence = chatRows.length ? Math.round(chatRows.reduce((sum, row) => sum + row.confidence, 0) / chatRows.length) : 0;
  const avgTrust = chatRows.length ? Math.round(chatRows.reduce((sum, row) => sum + row.trustScore, 0) / chatRows.length) : 0;
  return Response.json({ likes, dislikes: rows.length - likes, total: rows.length, satisfactionRate: rows.length ? Math.round((likes / rows.length) * 100) : 0, avgConfidence, avgTrust });
}
