import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const { id } = await context.params;
  const { reason } = (await request.json().catch(() => ({ reason: "" }))) as { reason?: string };
  const [document] = await db.update(documents).set({ status: "rejected", rejectionReason: reason || "Admin tomonidan rad etildi.", updatedAt: new Date() }).where(eq(documents.id, id)).returning();
  if (!document) return Response.json({ error: "Hujjat topilmadi." }, { status: 404 });
  return Response.json({ document });
}
