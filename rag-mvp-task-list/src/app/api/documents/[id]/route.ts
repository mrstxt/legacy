import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiInsights, documentChunks, documents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const { id } = await context.params;
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return Response.json({ error: "Hujjat topilmadi." }, { status: 404 });
  const insights = await db.select().from(aiInsights).where(eq(aiInsights.documentId, id));
  return Response.json({ document, insights });
}

export async function DELETE(request: Request, context: Context) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const { id } = await context.params;
  await db.delete(documentChunks).where(eq(documentChunks.documentId, id));
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning({ id: documents.id });
  if (!deleted) return Response.json({ error: "Hujjat topilmadi." }, { status: 404 });
  return Response.json({ success: true, vectorCleanup: "queued" });
}
