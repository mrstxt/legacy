import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ready: true, services: { postgres: "healthy", vectorIndex: "configured" } });
  } catch {
    return Response.json({ ready: false, services: { postgres: "unavailable" } }, { status: 503 });
  }
}
