import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export async function POST(request: Request) {
  await ensureDemoData();
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (!email || !password) return Response.json({ error: "Email va parol majburiy." }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Email yoki parol noto‘g‘ri." }, { status: 401 });
  }
  const token = await createSession({ userId: user.id, email: user.email, role: user.role, fullName: user.fullName });
  const response = Response.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
  response.headers.set("Set-Cookie", `knowledge_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`);
  return response;
}
