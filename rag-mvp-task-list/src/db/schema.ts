import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "sales", "support"]);
export const departmentEnum = pgEnum("department", ["sales", "support", "common"]);
export const sourceTypeEnum = pgEnum("source_type", ["pdf", "txt", "telegram"]);
export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "pending_review",
  "approved",
  "indexed",
  "rejected",
  "failed",
]);
export const feedbackTypeEnum = pgEnum("feedback_type", ["like", "dislike"]);
export const insightKindEnum = pgEnum("insight_kind", [
  "topic",
  "sentiment",
  "quality",
  "coverage",
  "stale",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  mission: text("mission"),
  values: jsonb("values").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("support"),
  telegramId: varchar("telegram_id", { length: 80 }),
  isActive: boolean("is_active").notNull().default(true),
  trustScore: integer("trust_score").notNull().default(80),
  learningSignals: jsonb("learning_signals").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  department: departmentEnum("department").notNull().default("common"),
  status: documentStatusEnum("status").notNull().default("uploaded"),
  rawText: text("raw_text"),
  cleanText: text("clean_text"),
  maskedCount: integer("masked_count").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
  trustScore: integer("trust_score").notNull().default(0),
  aiSummary: text("ai_summary"),
  aiTopics: jsonb("ai_topics").notNull().default([]),
  aiSentiment: varchar("ai_sentiment", { length: 32 }).default("neutral"),
  aiQuality: integer("ai_quality").notNull().default(0),
  metadata: jsonb("metadata").notNull().default({}),
  rejectionReason: text("rejection_reason"),
  uploaderId: uuid("uploader_id").references(() => users.id),
  approverId: uuid("approver_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  pageNumber: integer("page_number"),
  senderSeniority: varchar("sender_seniority", { length: 32 }).default("unknown"),
  qdrantPointId: varchar("qdrant_point_id", { length: 100 }),
  trustScore: integer("trust_score").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatLogs = pgTable("chat_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  userRole: userRoleEnum("user_role").notNull(),
  confidence: integer("confidence").notNull().default(0),
  trustScore: integer("trust_score").notNull().default(0),
  reasoning: text("reasoning"),
  sourceChunks: jsonb("source_chunks").notNull().default([]),
  isUnanswered: boolean("is_unanswered").notNull().default(false),
  intent: varchar("intent", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatLogId: uuid("chat_log_id").references(() => chatLogs.id, { onDelete: "cascade" }).notNull(),
  type: feedbackTypeEnum("type").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
  chatLogId: uuid("chat_log_id").references(() => chatLogs.id, { onDelete: "cascade" }),
  kind: insightKindEnum("kind").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  impact: integer("impact").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const learningSignals = pgTable("learning_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  topic: varchar("topic", { length: 120 }).notNull(),
  intent: varchar("intent", { length: 64 }),
  frequency: integer("frequency").notNull().default(1),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  trend: integer("trend").notNull().default(0),
});

export type Document = typeof documents.$inferSelect;
export type User = typeof users.$inferSelect;
export type ChatLog = typeof chatLogs.$inferSelect;
