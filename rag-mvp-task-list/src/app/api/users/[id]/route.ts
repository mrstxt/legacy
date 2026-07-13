import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo‘q." }, { status: 403 });
  const { id } = await context.params;
  const body = (await request.json()) as { fullName?: string; role?: "admin" | "sales" | "support"; telegramId?: string | null; isActive?: boolean };
  const [user] = await db.update(users).set({ ...body }).where(eq(users.id, id)).returning({ id: users.id, fullName: users.fullName, role: users.role, telegramId: users.telegramId, isActive: users.isActive });
  if (!user) return Response.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
  return Response.json({ user });
}

export async function DELETE(request: Request, context: Context) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo‘q." }, { status: 403 });
  const { id } = await context.params;
  const [user] = await db.update(users).set({ isActive: false }).where(eq(users.id, id)).returning({ id: users.id });
  if (!user) return Response.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
  return Response.json({ success: true });
}
