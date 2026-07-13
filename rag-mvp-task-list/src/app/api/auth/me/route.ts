import { readSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Autentifikatsiya talab qilinadi." }, { status: 401 });
  return Response.json({ user: session });
}
