import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      sourceType: documents.sourceType,
      department: documents.department,
      status: documents.status,
      chunkCount: documents.chunkCount,
      maskedCount: documents.maskedCount,
      pageCount: documents.pageCount,
      trustScore: documents.trustScore,
      aiSummary: documents.aiSummary,
      aiSentiment: documents.aiSentiment,
      aiTopics: documents.aiTopics,
      aiQuality: documents.aiQuality,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      uploaderName: users.fullName,
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploaderId, users.id))
    .orderBy(desc(documents.createdAt));
  return Response.json({ documents: rows });
}
