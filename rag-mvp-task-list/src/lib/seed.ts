import bcrypt from "bcryptjs";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiInsights, chatLogs, documentChunks, documents, feedbacks, learningSignals, organizations, users } from "@/db/schema";
import { analyzeDocument } from "@/lib/ai-service";
import { chunkText } from "@/lib/document-tools";

let seedPromise: Promise<void> | undefined;

export function ensureDemoData() {
  if (!seedPromise) seedPromise = seed();
  return seedPromise;
}

async function seed() {
  const existing = await db.select({ id: organizations.id }).from(organizations).limit(1);
  if (existing.length) return;

  const passwordHash = await bcrypt.hash("Admin2026!", 10);
  const [organization] = await db
    .insert(organizations)
    .values({
      name: "Nexa Finance",
      mission: "Bilim — ishonchga aylangan kuch. Har bir xodim tasdiqlangan ma'lumot orqali qaror qabul qiladi.",
      values: [
        { title: "Ishonch", description: "Faqat tasdiqlangan va tekshirilgan ma'lumotlargina javob beradi." },
        { title: "Shaffoflik", description: "Har bir javob manbasi va ishonch darajasi ko'rsatiladi." },
        { title: "Mas'uliyat", description: "AI insonni almashtirmaydi, qaror qabul qilishda yordam beradi." },
        { title: "Rivojlanish", description: "Har bir suhbat tizimni yanada aqlli qiladi." },
      ],
    })
    .returning();
  if (!organization) return;
  const [admin] = await db
    .insert(users)
    .values({
      organizationId: organization.id,
      fullName: "Dilshod Karimov",
      email: "admin@nexa.uz",
      passwordHash,
      role: "admin",
      telegramId: "1048923001",
      trustScore: 96,
      learningSignals: { topics: ["karta_blok", "eskalatsiya"], engagement: 92 },
    })
    .returning();
  const [supportUser] = await db
    .insert(users)
    .values({
      organizationId: organization.id,
      fullName: "Aziza Raximova",
      email: "aziza@nexa.uz",
      passwordHash,
      role: "support",
      telegramId: "578902114",
      trustScore: 88,
      learningSignals: { topics: ["karta_blok", "to'lov_qaytish"], engagement: 81 },
    })
    .returning();
  const [salesUser] = await db
    .insert(users)
    .values({
      organizationId: organization.id,
      fullName: "Bekzod Tursunov",
      email: "bekzod@nexa.uz",
      passwordHash,
      role: "sales",
      telegramId: "450912887",
      trustScore: 84,
      learningSignals: { topics: ["onboarding", "demo"], engagement: 78 },
    })
    .returning();
  if (!admin || !supportUser || !salesUser) return;

  const samples = [
    {
      title: "Support SOP — Karta blok holati",
      fileName: "support-karta-sop.pdf",
      sourceType: "pdf" as const,
      department: "support" as const,
      status: "indexed" as const,
      pageCount: 18,
      rawText: "Mijoz karta bloklanganini bildirsa, avval shaxsini tasdiqlang. Mobil ilovadagi kartalar bo'limidan blok sababini tekshiring. Xavfsizlik blokirovkasi bo'lsa, Team Leadga eskalatsiya qiling. Mijozga 15 daqiqa ichida qayta aloqa bering. Telefon: +998 90 123 45 67, email: support@nexa.uz",
    },
    {
      title: "Mijozlar bilan muloqot standarti",
      fileName: "muloqot-standarti.txt",
      sourceType: "txt" as const,
      department: "common" as const,
      status: "indexed" as const,
      pageCount: 4,
      rawText: "Mijozga javob berishda xushmuomala va aniq bo'ling. Masalani qayta aytib tasdiqlang, keyin yechim uchun aniq muddat bering. Tasdiqlanmagan ma'lumotni va'da qilmang. Diqqat: xavfsizlik masalalarida ehtiyot bo'ling.",
    },
    {
      title: "Yanvar — Support chat export",
      fileName: "telegram-support-yanvar.json",
      sourceType: "telegram" as const,
      department: "support" as const,
      status: "pending_review" as const,
      pageCount: 0,
      rawText: "Telegram chat eksportidan ajratilgan savol-javoblar. Kartani bloklash, PIN tiklash va to'lov qaytishi bo'yicha tavsiya qilingan javoblar mavjud. Diqqat: xavfsizlik ohanglari aniqlandi. E-mail: security@nexa.uz, parol: secret123.",
    },
    {
      title: "Sales skript — Onboarding",
      fileName: "sales-onboarding.pdf",
      sourceType: "pdf" as const,
      department: "sales" as const,
      status: "indexed" as const,
      pageCount: 9,
      rawText: "Potensial mijozga mahsulot qiymatini qisqa tushuntiring. Demo so'roviga 1 ish kuni ichida javob qaytaring va CRMda leadni yangilang. Telefon: +998 71 200 88 99. Narx bo'yicha savolga ehtiyot bo'ling.",
    },
  ];

  const created = [];
  for (const sample of samples) {
    const analysis = analyzeDocument(sample.rawText, sample.pageCount);
    const [document] = await db
      .insert(documents)
      .values({
        organizationId: organization.id,
        title: sample.title,
        fileName: sample.fileName,
        sourceType: sample.sourceType,
        department: sample.department,
        status: sample.status,
        pageCount: sample.pageCount,
        chunkCount: chunkText(analysis.summary ? `${sample.rawText}\n${analysis.summary}` : sample.rawText).length,
        maskedCount: Object.values(analysis.masked).reduce((sum, value) => sum + value, 0),
        rawText: sample.rawText,
        cleanText: sample.rawText,
        trustScore: analysis.trustScore,
        aiSummary: analysis.summary,
        aiSentiment: analysis.sentiment,
        aiTopics: analysis.topics,
        aiQuality: Math.round(analysis.quality * 100),
        metadata: { masked: analysis.masked, pipeline: "ai_analyzed" },
        uploaderId: admin.id,
        approverId: sample.status === "indexed" ? admin.id : null,
      })
      .returning();
    if (!document) continue;
    created.push({ document, analysis });
  }

  for (const { document, analysis } of created) {
    const baseText = document.cleanText ?? "";
    const chunks = chunkText(baseText + " " + analysis.summary, 200, 40);
    if (chunks.length) {
      await db.insert(documentChunks).values(
        chunks.map((content, chunkIndex) => ({
          documentId: document.id,
          content,
          chunkIndex,
          pageNumber: document.sourceType === "pdf" ? Math.max(1, Math.ceil((chunkIndex + 1) * 1.2)) : null,
          senderSeniority: document.sourceType === "telegram" ? "senior" : "unknown",
          trustScore: document.trustScore,
        })),
      );
    }
    for (const insight of analysis.insights) {
      await db.insert(aiInsights).values({ organizationId: organization.id, documentId: document.id, kind: insight.kind, title: insight.title, detail: insight.detail, impact: insight.impact });
    }
  }

  const [chat] = await db
    .insert(chatLogs)
    .values({
      organizationId: organization.id,
      userId: supportUser.id,
      question: "Mijoz karta blok bo'lsa nima qilish kerak?",
      answer: "Avval mijoz shaxsini tasdiqlang, keyin mobil ilovadagi kartalar bo'limidan blok sababini tekshiring. Xavfsizlik blokirovkasi bo'lsa, Team Leadga eskalatsiya qiling.\n\nManba: Support SOP — Karta blok holati · 4-sahifa.",
      userRole: "support",
      confidence: 94,
      trustScore: 88,
      reasoning: "Eng yaxshi natija: Support SOP. Ishonch 88%, semantik o'xshashlik 92%.",
      intent: "card_security",
      sourceChunks: [{ title: "Support SOP — Karta blok holati", page: 4, trust: 88 }],
    })
    .returning();
  if (chat) await db.insert(feedbacks).values({ chatLogId: chat.id, type: "like" });

  const [unanswered] = await db
    .insert(chatLogs)
    .values({
      organizationId: organization.id,
      userId: salesUser.id,
      question: "Investor uchun maxsus narx siyosati bormi?",
      answer: "Bu savol bo'yicha tasdiqlangan bilim bazasida yetarli ma'lumot topilmadi. Iltimos, Team Lead yoki Admin bilan bog'laning.",
      userRole: "sales",
      confidence: 24,
      trustScore: 30,
      reasoning: "Sales bo'limida investor siyosati bo'yicha tasdiqlangan hujjat topilmadi.",
      intent: "pricing",
      sourceChunks: [],
      isUnanswered: true,
    })
    .returning();

  if (unanswered) await db.insert(aiInsights).values({ organizationId: organization.id, chatLogId: unanswered.id, kind: "stale", title: "Bilim bo'shlig'i", detail: "Sales — investor siyosati mavzusida hujjat yo'q", impact: 90 });

  for (const topic of [
    { topic: "Karta bloklash", intent: "card_security", frequency: 18, trend: 24 },
    { topic: "To'lov qaytishi", intent: "process_timing", frequency: 14, trend: 18 },
    { topic: "Sales demo jarayoni", intent: "guidance", frequency: 11, trend: 12 },
  ]) {
    await db.insert(learningSignals).values({ organizationId: organization.id, ...topic });
  }
}
