import { SignJWT, jwtVerify } from "jose";

export type AppRole = "admin" | "sales" | "support";
export type Session = { userId: string; email: string; role: AppRole; fullName: string };

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "knowledge-hub-development-session-key");

export async function createSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function readSession(request: Request): Promise<Session | null> {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookie = request.headers.get("cookie")?.match(/knowledge_session=([^;]+)/)?.[1];
  const token = bearer || cookie;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId || !payload.email || !payload.role || !payload.fullName) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: payload.role as AppRole,
      fullName: String(payload.fullName),
    };
  } catch {
    return null;
  }
}

export async function requestRole(request: Request): Promise<AppRole> {
  const session = await readSession(request);
  if (session) return session.role;
  const demoRole = request.headers.get("x-demo-role");
  return demoRole === "sales" || demoRole === "support" ? demoRole : "admin";
}

export async function requireAdmin(request: Request) {
  return (await requestRole(request)) === "admin";
}
