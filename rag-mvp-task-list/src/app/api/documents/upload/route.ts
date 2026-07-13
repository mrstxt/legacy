import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiInsights, documentChunks, documents, organizations, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { analyzeDocument } from "@/lib/ai-service";
import { chunkText } from "@/lib/document-tools";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

type UploadBody = { title?: string; fileName?: string; sourceType?: "pdf" | "txt" | "telegram"; department?: "sales" | "support" | "common"; content?: string };

export async function POST(request: Request) {
  await ensureDemoData();
  if (!(await requireAdmin(request))) return Response.json({ error: "Ruxsat yo'q." }, { status: 403 });
  const body = (await request.json()) as UploadBody;
  if (!body.title || !body.fileName || !body.sourceType || !body.department) return Response.json({ error: "Title, file name, source type va department majburiy." }, { status: 400 });
  if (!/[.](pdf|txt|json)$/i.test(body.fileName)) return Response.json({ error: "Faqat PDF, TXT yoki JSON qabul qilinadi." }, { status: 400 });

  const rawText = body.content?.trim() || "Hujjat matni AI tomonidan qayta ishlash uchun qabul qilindi.";
  const analysis = analyzeDocument(rawText, body.sourceType === "pdf" ? 4 : 0);
  const chunks = chunkText(rawText + " " + analysis.summary);

  const [organization] = await db.select().from(organizations).limit(1);
  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (!organization || !admin) return Response.json({ error: "Tizim sozlanmagan." }, { status: 500 });

  const [document] = await db
    .insert(documents)
    .values({
      organizationId: organization.id,
      title: body.title,
      fileName: body.fileName,
      sourceType: body.sourceType,
      department: body.department,
      status: "pending_review",
      rawText,
      cleanText: rawText,
      chunkCount: chunks.length,
      maskedCount: Object.values(analysis.masked).reduce((sum, value) => sum + value, 0),
      pageCount: body.sourceType === "pdf" ? 4 : 0,
      trustScore: analysis.trustScore,
      aiSummary: analysis.summary,
      aiSentiment: analysis.sentiment,
      aiTopics: analysis.topics,
      aiQuality: Math.round(analysis.quality * 100),
      metadata: { masked: analysis.masked, pipeline: "ai_v2" },
      uploaderId: admin.id,
    })
    .returning();

  if (!document) return Response.json({ error: "Hujjat saqlanmadi." }, { status: 500 });

  if (chunks.length) {
    await db.insert(documentChunks).values(
      chunks.map((content, chunkIndex) => ({
        documentId: document.id,
        content,
        chunkIndex,
        pageNumber: body.sourceType === "pdf" ? Math.max(1, Math.ceil((chunkIndex + 1) * 0.6)) : null,
        trustScore: document.trustScore,
      })),
    );
  }

  for (const insight of analysis.insights) {
    await db.insert(aiInsights).values({ organizationId: organization.id, documentId: document.id, kind: insight.kind, title: insight.title, detail: insight.detail, impact: insight.impact });
  }

  return Response.json({ document, analysis, pipeline: { status: "pending_review", chunks: chunks.length, masked: analysis.masked, trust: analysis.trustScore } }, { status: 201 });
}
