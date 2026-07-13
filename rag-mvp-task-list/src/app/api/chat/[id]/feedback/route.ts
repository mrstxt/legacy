import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatLogs, feedbacks } from "@/db/schema";
import { ensureDemoData } from "@/lib/seed";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  await ensureDemoData();
  const { id } = await context.params;
  const { type, comment } = (await request.json()) as { type?: "like" | "dislike"; comment?: string };
  if (type !== "like" && type !== "dislike") return Response.json({ error: "Feedback turi noto'g'ri." }, { status: 400 });
  const [chat] = await db.select({ id: chatLogs.id }).from(chatLogs).where(eq(chatLogs.id, id)).limit(1);
  if (!chat) return Response.json({ error: "Chat topilmadi." }, { status: 404 });
  const [feedback] = await db.insert(feedbacks).values({ chatLogId: id, type, comment: comment || null }).returning();
  return Response.json({ feedback }, { status: 201 });
}
