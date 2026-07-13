import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo‘q." }, { status: 403 });
  const rows = await db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, telegramId: users.telegramId, isActive: users.isActive, createdAt: users.createdAt }).from(users).orderBy(asc(users.fullName));
  return Response.json({ users: rows });
}

export async function POST(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo‘q." }, { status: 403 });
  const body = (await request.json()) as { fullName?: string; email?: string; password?: string; role?: "admin" | "sales" | "support"; telegramId?: string };
  if (!body.fullName || !body.email || !body.password || !body.role) return Response.json({ error: "Ism, email, parol va rol majburiy." }, { status: 400 });
  const [organization] = await db.select().from(organizations).limit(1);
  if (!organization) return Response.json({ error: "Tashkilot topilmadi." }, { status: 500 });
  const [user] = await db.insert(users).values({ organizationId: organization.id, fullName: body.fullName, email: body.email.toLowerCase(), passwordHash: await bcrypt.hash(body.password, 10), role: body.role, telegramId: body.telegramId || null }).returning({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, telegramId: users.telegramId, isActive: users.isActive });
  return Response.json({ user }, { status: 201 });
}
