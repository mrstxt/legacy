"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Database,
  FileCheck2,
  FileText,
  Gauge,
  HeartHandshake,
  Layers3,
  LifeBuoy,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Radar,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";

type Section = "overview" | "copilot" | "knowledge" | "learning" | "trust";
type Role = "support" | "sales";
type DocStatus = "Indexed" | "Pending review";

type Doc = {
  id: string;
  title: string;
  type: string;
  department: string;
  status: DocStatus;
  trust: number;
  chunks: number;
  masked: number;
  summary: string;
  topics: string[];
};

type Message = {
  id: number;
  kind: "user" | "assistant";
  text: string;
  trust?: number;
  confidence?: number;
  source?: string;
  intent?: string;
  model?: string;
  reasoning?: string;
  loading?: boolean;
};

type Signal = { title: string; value: number; trend: number; detail: string };

const initialDocs: Doc[] = [
  { id: "sop", title: "Support SOP — Karta blok holati", type: "PDF", department: "Support", status: "Indexed", trust: 92, chunks: 35, masked: 6, summary: "Shaxsni tasdiqlash, blok sababini tekshirish va 15 daqiqada qayta aloqa.", topics: ["#bloklash", "#xavfsizlik", "#eskalatsiya"] },
  { id: "telegram", title: "Yanvar — Support chat export", type: "Telegram", department: "Support", status: "Pending review", trust: 74, chunks: 28, masked: 9, summary: "PIN tiklash, to‘lov qaytishi va kartalar bo‘yicha chat tavsiyalari.", topics: ["#tiklash", "#to‘lov", "#chat"] },
  { id: "standard", title: "Mijozlar bilan muloqot standarti", type: "TXT", department: "Common", status: "Indexed", trust: 88, chunks: 12, masked: 2, summary: "Aniq, xushmuomala va tasdiqlangan ma’lumot bilan javob berish qoidalari.", topics: ["#muloqot", "#standart"] },
  { id: "sales", title: "Sales skript — Onboarding", type: "PDF", department: "Sales", status: "Indexed", trust: 84, chunks: 17, masked: 1, summary: "Demo so‘rovlarini bir ish kunida qayta ishlash va CRMni yangilash.", topics: ["#demo", "#lead", "#onboarding"] },
];

const initialSignals: Signal[] = [
  { title: "Karta bloklash", value: 18, trend: 24, detail: "card_security" },
  { title: "To‘lov qaytishi", value: 14, trend: 18, detail: "process_timing" },
  { title: "Sales demo jarayoni", value: 11, trend: 12, detail: "guidance" },
  { title: "Investor siyosati", value: 6, trend: -2, detail: "pricing · bilim bo‘shlig‘i" },
];

const initialMessages: Message[] = [
  { id: 1, kind: "assistant", text: "Assalomu alaykum. Men sizning AI Copilot’ingizman. Hujjatlarni izlayman, javob manbasini ko‘rsataman va bilmagan narsamni yashirmayman. Bugun nimani aniqlashtiramiz?", trust: 96, confidence: 98, model: "Knowledge Trust", reasoning: "Suhbat ishga tushdi · role filter active" },
  { id: 2, kind: "user", text: "Mijoz karta blok bo‘lsa nima qilish kerak?" },
  { id: 3, kind: "assistant", text: "Avval mijoz shaxsini tasdiqlang. Keyin mobil ilovadagi kartalar bo‘limidan blok sababini tekshiring. Xavfsizlik blokirovkasi bo‘lsa Team Leadga eskalatsiya qiling va 15 daqiqada qayta aloqa bering.", trust: 88, confidence: 94, source: "Support SOP — Karta blok holati · 4-sahifa", intent: "card_security", model: "Local RAG demo", reasoning: "Role: Support · Semantic 92% · Trust 88%" },
];

const values = [
  { title: "Ishonch", icon: ShieldCheck, text: "Faqat tasdiqlangan manbaga tayangan javob." },
  { title: "Shaffoflik", icon: Radar, text: "Har bir javobning manbasi va ishonchi ko‘rinadi." },
  { title: "Mas’uliyat", icon: HeartHandshake, text: "AI qarorni almashtirmaydi — uni aniqroq qiladi." },
  { title: "Rivojlanish", icon: BrainCircuit, text: "Har bir feedback keyingi javobni yaxshilaydi." },
];

const nav = [
  { id: "overview" as const, label: "Boshqaruv paneli", icon: LineChart },
  { id: "copilot" as const, label: "AI Copilot", icon: Bot, badge: "LIVE" },
  { id: "knowledge" as const, label: "Bilim bazasi", icon: Database, badge: "04" },
  { id: "learning" as const, label: "O‘rganish signallari", icon: BrainCircuit, badge: "04" },
  { id: "trust" as const, label: "Trust Center", icon: ShieldCheck },
];

export default function KnowledgeDashboard() {
  const [active, setActive] = useState<Section>("copilot");
  const [role, setRole] = useState<Role>("support");
  const [docs, setDocs] = useState(initialDocs);
  const [signals] = useState(initialSignals);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("Local RAG demo");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadDepartment, setUploadDepartment] = useState("support");

  const pending = docs.filter((doc) => doc.status === "Pending review").length;
  const avgTrust = Math.round(docs.reduce((sum, doc) => sum + doc.trust, 0) / docs.length);
  const filteredDocs = docs.filter((doc) => {
    const matchesSearch = `${doc.title} ${doc.department} ${doc.topics.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = department === "All" || doc.department === department;
    return matchesSearch && matchesDepartment;
  });

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  async function askCopilot(question = input) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const userMessage: Message = { id: Date.now(), kind: "user", text: trimmed };
    const loadingId = Date.now() + 1;
    const loadingMessage: Message = { id: loadingId, kind: "assistant", text: "Bilim bazasi tekshirilmoqda...", loading: true };
    setMessages((current) => [...current, userMessage, loadingMessage]);
    setInput("");
    try {
      const response = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await response.json()) as { answer?: string; confidence?: number; trust?: number; intent?: string; reasoning?: string; model?: string; sources?: { title?: string; page?: number | null }[]; error?: string; aiUsed?: boolean };
      if (!response.ok) throw new Error(data.error || "AI javob bermadi");
      setModel(data.model || "Local RAG");
      const source = data.sources?.[0]?.title ? `${data.sources[0].title}${data.sources[0].page ? ` · ${data.sources[0].page}-sahifa` : ""}` : undefined;
      setMessages((current) => current.map((message) => message.id === loadingId ? { id: loadingId, kind: "assistant", text: data.answer || "Javob topilmadi.", trust: data.trust, confidence: data.confidence, source, intent: data.intent, reasoning: data.reasoning, model: data.aiUsed ? data.model : "Local RAG fallback" } : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === loadingId ? { ...message, text: error instanceof Error ? error.message : "AI servisga ulanib bo‘lmadi.", loading: false, confidence: 0, trust: 0, reasoning: "So‘rov bajarilmadi." } : message));
    }
  }

  function setFeedback(messageId: number, type: "like" | "dislike") {
    notify(type === "like" ? "Feedback qabul qilindi — AI o‘rganish signali yangilandi." : "Javob bilim bo‘shlig‘i sifatida belgilandi.");
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, reasoning: `${message.reasoning || ""} · Feedback: ${type}` } : message));
  }

  async function uploadDocument() {
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      notify("Hujjat nomi va matnini kiriting.");
      return;
    }
    setUploading(true);
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: uploadTitle, fileName: `${uploadTitle.toLowerCase().replace(/\s+/g, "-")}.txt`, sourceType: "txt", department: uploadDepartment, content: uploadContent }),
      });
      const data = (await response.json()) as { document?: { id: string; chunkCount: number; maskedCount: number; trustScore: number; aiSummary?: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Upload xatosi");
      const item: Doc = { id: data.document?.id || String(Date.now()), title: uploadTitle, type: "TXT", department: uploadDepartment === "support" ? "Support" : uploadDepartment === "sales" ? "Sales" : "Common", status: "Pending review", trust: data.document?.trustScore || 80, chunks: data.document?.chunkCount || 1, masked: data.document?.maskedCount || 0, summary: data.document?.aiSummary || "AI tahlil tayyor.", topics: ["#yangi", "#ai-tahlil"] };
      setDocs((current) => [item, ...current]);
      setUploadTitle("");
      setUploadContent("");
      setUploadOpen(false);
      notify("Hujjat AI tahlil qilindi va review navbatiga qo‘shildi.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload xatosi");
    } finally {
      setUploading(false);
    }
  }

  function approveDoc(id: string) {
    setDocs((current) => current.map((doc) => doc.id === id ? { ...doc, status: "Indexed", trust: Math.min(98, doc.trust + 4) } : doc));
    notify("Hujjat tasdiqlandi — AI qidiruviga qo‘shildi.");
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#17213e]">
      <Sidebar active={active} setActive={setActive} docs={docs} pending={pending} />
      <main className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e6eaf2] bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf1ff] text-[#2d4bc8] lg:hidden"><Compass className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8995ac]">Knowledge Trust</p><h1 className="text-[17px] font-bold tracking-[-0.02em] text-[#1b2645]">{nav.find((item) => item.id === active)?.label}</h1></div></div>
          <div className="flex items-center gap-3"><div className="hidden h-10 w-[250px] items-center gap-2 rounded-xl border border-[#e1e6f0] bg-[#fafbfd] px-3 md:flex"><Search className="h-4 w-4 text-[#9aa6b9]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bilim bazasidan izlash..." className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#9aa6b9]" /></div><div className="hidden items-center gap-1.5 rounded-full border border-[#bde8d3] bg-[#effbf4] px-3 py-2 text-[10px] font-bold text-[#137e5a] sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#19a974]" /> AI online</div><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e1e6f0] text-[#697590]"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ef5a6a]" /></button><button onClick={() => setUploadOpen(true)} className="hidden items-center gap-2 rounded-xl bg-[#2d4bc8] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_22px_rgba(45,75,200,0.2)] sm:flex"><Plus className="h-4 w-4" /> Hujjat qo‘shish</button></div>
        </header>

        <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8">
          {active === "overview" && <Overview setActive={setActive} docs={docs} signals={signals} avgTrust={avgTrust} pending={pending} />}
          {active === "copilot" && <Copilot role={role} setRole={setRole} messages={messages} input={input} setInput={setInput} ask={askCopilot} feedback={setFeedback} model={model} />}
          {active === "knowledge" && <Knowledge docs={filteredDocs} department={department} setDepartment={setDepartment} setSelectedDoc={setSelectedDoc} approveDoc={approveDoc} openUpload={() => setUploadOpen(true)} />}
          {active === "learning" && <Learning signals={signals} messages={messages} setActive={setActive} />}
          {active === "trust" && <TrustCenter avgTrust={avgTrust} docs={docs} />}
        </div>
      </main>

      {uploadOpen && <UploadModal title={uploadTitle} setTitle={setUploadTitle} content={uploadContent} setContent={setUploadContent} department={uploadDepartment} setDepartment={setUploadDepartment} uploading={uploading} submit={uploadDocument} close={() => setUploadOpen(false)} />}
      {selectedDoc && <DocumentModal doc={selectedDoc} approve={() => approveDoc(selectedDoc.id)} close={() => setSelectedDoc(null)} />}
      {toast && <div className="fixed bottom-5 right-5 z-50 flex max-w-[340px] items-center gap-2 rounded-xl bg-[#1e2f59] px-4 py-3 text-[11px] font-semibold text-white shadow-2xl"><Check className="h-4 w-4 shrink-0 text-[#66dda1]" />{toast}</div>}
    </div>
  );
}

function Sidebar({ active, setActive, docs, pending }: { active: Section; setActive: (section: Section) => void; docs: Doc[]; pending: number }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-[#e5e9f2] bg-white px-4 py-6 lg:flex"><div className="mb-10 flex items-center gap-3 px-2"><div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2d4bc8] to-[#6677f2] text-white shadow-[0_12px_24px_rgba(45,75,200,0.25)]"><Compass className="h-5 w-5" /><span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-[#19a974]" /></div><div><p className="text-[15px] font-extrabold tracking-[-0.03em] text-[#1c2746]">Knowledge Trust</p><p className="text-[10px] font-semibold text-[#8d99ae]">Ishonchli bilim markazi</p></div></div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a1adbf]">Workspace</p><nav className="space-y-1">{nav.map((item) => { const Icon = item.icon; const selected = active === item.id; return <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12.5px] font-bold transition ${selected ? "bg-[#eef2ff] text-[#2d4bc8]" : "text-[#68748d] hover:bg-[#f6f8fc]"}`}><Icon className="h-[18px] w-[18px]" strokeWidth={selected ? 2.4 : 1.9} /><span className="flex-1">{item.label}</span>{item.badge && <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${selected ? "bg-[#dce5ff] text-[#2d4bc8]" : "bg-[#f1f4f8] text-[#8b97ad]"}`}>{item.id === "knowledge" ? docs.length : item.id === "learning" ? "04" : item.badge}</span>}</button>; })}</nav><p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a1adbf]">Tizim</p><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[12.5px] font-bold text-[#68748d] hover:bg-[#f6f8fc]"><Settings2 className="h-[18px] w-[18px]" /> Sozlamalar</button><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[12.5px] font-bold text-[#68748d] hover:bg-[#f6f8fc]"><LifeBuoy className="h-[18px] w-[18px]" /> Yordam</button><div className="mt-auto rounded-2xl border border-[#dce4ff] bg-gradient-to-br from-[#eff2ff] to-[#f8f1ff] p-4"><div className="flex items-center gap-2 text-[#2d4bc8]"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-[0.08em]">AI Copilot active</span></div><p className="mt-2 text-[10px] leading-[1.55] text-[#5d6785]">Rolga mos qidiruv, manba va ishonch har bir suhbatda ko‘rinadi.</p><div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#137e5a]"><span className="h-1.5 w-1.5 rounded-full bg-[#19a974]" /> Qdrant online</div></div><div className="mt-5 flex items-center gap-3 border-t border-[#edf0f5] px-2 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#2d4bc8] to-[#7482f2] text-[11px] font-bold text-white">DK</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-[#293552]">Dilshod Karimov</p><p className="text-[10px] text-[#94a0b4]">Administrator</p></div><ChevronRight className="h-4 w-4 rotate-90 text-[#8e9aad]" /></div></aside>;
}

function Overview({ setActive, docs, signals, avgTrust, pending }: { setActive: (section: Section) => void; docs: Doc[]; signals: Signal[]; avgTrust: number; pending: number }) {
  return <div className="space-y-6"><section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1e2e7b] via-[#2d4bc8] to-[#6474f2] p-7 text-white shadow-[0_24px_60px_rgba(35,55,150,0.24)] sm:p-9"><div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[36px] border-white/[0.06]" /><div className="relative grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"><Activity className="h-3.5 w-3.5" /> 17 Yanvar · AI pulse</div><h2 className="text-[27px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[34px]">Bilim — ishonchga aylangan kuch.</h2><p className="mt-3 max-w-xl text-[13px] leading-[1.65] text-[#d2dbff]">Sizning AI markazingiz hujjatlarni o‘qiydi, xavfsiz manbalardan javob beradi va qayerda bilim yetishmayotganini ko‘rsatadi.</p><div className="mt-6 flex gap-3"><button onClick={() => setActive("copilot")} className="rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#263eae]"><Bot className="mr-1.5 inline h-3.5 w-3.5" /> AI bilan gaplashish</button><button onClick={() => setActive("trust")} className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-[11px] font-bold text-white">Tamoyillarni ko‘rish</button></div></div><div className="grid grid-cols-2 gap-3"><HeroStat label="Javob aniqligi" value="94.2%" detail="+3.4% bu oyda" /><HeroStat label="O‘rtacha trust" value={`${avgTrust}%`} detail="4 ta hujjat" /><HeroStat label="Bugungi savollar" value="14" detail="3 ta bo‘lim" /><HeroStat label="Review navbati" value={String(pending).padStart(2, "0")} detail="Admin e’tibori" /></div></div></section><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<Database className="h-5 w-5" />} label="Bilim bazasi" value={String(docs.length).padStart(2, "0")} detail="hujjat faol" tone="blue" /><Kpi icon={<ShieldCheck className="h-5 w-5" />} label="Trust index" value={`${avgTrust}%`} detail="barqaror" tone="green" /><Kpi icon={<BrainCircuit className="h-5 w-5" />} label="Learning signals" value={String(signals.length).padStart(2, "0")} detail="AI kuzatyapti" tone="violet" /><Kpi icon={<HeartHandshake className="h-5 w-5" />} label="Foydali javoblar" value="92%" detail="feedback asosida" tone="orange" /></div><div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-[#e5e9f2] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8995ac]">Knowledge pulse</p><h3 className="mt-1 text-[15px] font-bold text-[#1f2947]">AI nimani ko‘proq ko‘ryapti?</h3></div><LineChart className="h-5 w-5 text-[#2d4bc8]" /></div><div className="mt-6 flex h-[150px] items-end gap-3 rounded-xl bg-[#f8f9fd] px-5 pb-4 pt-6">{[42, 64, 54, 78, 58, 86, 72, 94, 68, 82, 91, 76].map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className={`w-full rounded-t-md transition group-hover:bg-[#2d4bc8] ${index > 8 ? "bg-[#2d4bc8]" : "bg-[#cad5ff]"}`} style={{ height: `${height}%` }} /></div>)}</div><div className="mt-4 flex items-center justify-between text-[10px] text-[#8995ac]"><span>07:00</span><span>12:00</span><span>18:00</span><span>Hozir</span></div></div><div className="rounded-2xl border border-[#e5e9f2] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8995ac]">Bugungi fokus</p><h3 className="mt-1 text-[15px] font-bold text-[#1f2947]">AI tavsiyasi</h3></div><Sparkles className="h-5 w-5 text-[#2d4bc8]" /></div><div className="mt-5 rounded-xl border border-[#dce5ff] bg-[#f5f7ff] p-4"><div className="flex items-center gap-2 text-[#2d4bc8]"><AlertTriangle className="h-4 w-4" /><p className="text-[11px] font-bold">Bilim bo‘shlig‘i topildi</p></div><p className="mt-2 text-[12px] font-bold text-[#1f2947]">Sales — investor narx siyosati</p><p className="mt-1 text-[11px] leading-[1.55] text-[#68748d]">Bu savolga 6 marta javob topilmadi. Admin hujjat qo‘shsa, javob sifati oshadi.</p><button onClick={() => setActive("copilot")} className="mt-3 text-[10px] font-bold text-[#2d4bc8]">AI suhbatida tekshirish <ArrowUpRight className="ml-1 inline h-3 w-3" /></button></div></div></div></div>;
}

function Copilot({ role, setRole, messages, input, setInput, ask, feedback, model }: { role: Role; setRole: (role: Role) => void; messages: Message[]; input: string; setInput: (value: string) => void; ask: (question?: string) => void; feedback: (id: number, type: "like" | "dislike") => void; model: string }) {
  const quick = role === "support" ? ["Mijoz karta blok bo‘lsa nima qilish kerak?", "To‘lov qaytishi qancha vaqt oladi?", "PIN tiklash tartibi qanday?"] : ["Demo so‘roviga qachon javob beramiz?", "Leadni CRMda qachon yangilayman?", "Investor uchun narx siyosati bormi?"];
  const last = [...messages].reverse().find((message) => message.kind === "assistant" && !message.loading);
  return <div className="space-y-6"><section className="rounded-[24px] border border-[#dde5ff] bg-gradient-to-br from-[#eef2ff] via-white to-[#f7f1ff] p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2d4bc8]"><Bot className="h-4 w-4" /> AI Copilot workspace</div><h2 className="text-[27px] font-extrabold tracking-[-0.045em] text-[#1b2645] sm:text-[34px]">Savol bering. Ishonchli javob oling.</h2><p className="mt-2 max-w-2xl text-[12.5px] leading-[1.65] text-[#64708e]">AI sizga faqat javob bermaydi — manbani tekshiradi, rolga mos bilimni tanlaydi va bilmaganini ochiq aytadi.</p></div><div className="flex items-center gap-2 rounded-full border border-[#c5ead7] bg-white px-3 py-2 text-[10px] font-bold text-[#137e5a]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#19a974]" /> {model}</div></div></section><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"><div className="overflow-hidden rounded-2xl border border-[#e5e9f2] bg-white"><div className="flex flex-col gap-3 border-b border-[#edf0f5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8995ac]">Live conversation</p><h3 className="mt-1 text-[15px] font-bold text-[#1f2947]">AI bilan muloqot</h3></div><div className="flex rounded-lg bg-[#f3f5fb] p-1">{(["support", "sales"] as Role[]).map((item) => <button key={item} onClick={() => setRole(item)} className={`rounded-md px-3 py-1.5 text-[10px] font-bold capitalize ${role === item ? "bg-white text-[#2d4bc8] shadow-sm" : "text-[#8995ac]"}`}>{item}</button>)}</div></div><div className="max-h-[510px] space-y-4 overflow-y-auto bg-[#fafbfe] p-5">{messages.map((message) => <ChatBubble key={message.id} message={message} feedback={feedback} />)}</div><div className="border-t border-[#edf0f5] bg-white p-4"><div className="mb-3 flex flex-wrap gap-2">{quick.map((item) => <button key={item} onClick={() => ask(item)} className="rounded-full border border-[#dde4f3] bg-[#fafbff] px-3 py-1.5 text-[10px] font-semibold text-[#66738d] transition hover:border-[#b9c8f5] hover:text-[#2d4bc8]">{item}</button>)}</div><div className="flex items-end gap-2 rounded-xl border border-[#dce3f0] bg-[#fbfcff] p-2 focus-within:border-[#91a6ef]"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} rows={2} placeholder={`Savolingizni yozing (${role === "support" ? "Support" : "Sales"} bilim bazasi)...`} className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1 text-[12px] outline-none placeholder:text-[#a4aec0]" /><button onClick={() => ask()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#2d4bc8] text-white transition hover:bg-[#203cae]"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[9.5px] text-[#9aa5b7]">Enter — yuborish · Shift + Enter — yangi qator · AI manbani yashirmaydi</p></div></div><div className="space-y-5"><div className="rounded-2xl border border-[#e5e9f2] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8995ac]">AI decision trace</p><h3 className="mt-1 text-[14px] font-bold text-[#1f2947]">Javob qanday topildi?</h3></div><Radar className="h-5 w-5 text-[#2d4bc8]" /></div><div className="mt-5 space-y-4"><Trace icon={<LockKeyhole className="h-3.5 w-3.5" />} title="Role filter" detail={`${role === "support" ? "Support" : "Sales"} + Common hujjatlar`} done /><Trace icon={<Database className="h-3.5 w-3.5" />} title="Knowledge retrieval" detail="Qdrant + hybrid score" done /><Trace icon={<BadgeCheck className="h-3.5 w-3.5" />} title="Trust check" detail={`${last?.trust ?? 0}% manba ishonchi`} done /><Trace icon={<Sparkles className="h-3.5 w-3.5" />} title="Answer synthesis" detail={last?.model || "Kutilmoqda"} done /></div></div><div className="rounded-2xl border border-[#dce5ff] bg-gradient-to-br from-[#eef2ff] to-[#f8f2ff] p-5"><div className="flex items-center gap-2 text-[#2d4bc8]"><Zap className="h-4 w-4" /><h3 className="text-[13px] font-bold">Bepul AI rejimi</h3></div><p className="mt-2 text-[11px] leading-[1.6] text-[#5d6785]">Gemini key bo‘lsa, AI Studio free tier ishlaydi. Key bo‘lmasa ham lokal RAG fallback javob beradi — panel to‘xtamaydi.</p><div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[#137e5a]"><Check className="h-3.5 w-3.5" /> Server-side xavfsiz ulanish</div></div></div></div></div>;
}

function ChatBubble({ message, feedback }: { message: Message; feedback: (id: number, type: "like" | "dislike") => void }) {
  if (message.kind === "user") return <div className="flex justify-end"><div className="max-w-[78%] rounded-2xl rounded-br-md bg-[#2d4bc8] px-4 py-3 text-[12px] leading-[1.55] text-white shadow-sm">{message.text}</div></div>;
  return <div className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e7ecff] text-[#2d4bc8]"><Bot className="h-4 w-4" /></div><div className="max-w-[88%] space-y-2"><div className="rounded-2xl rounded-tl-md border border-[#e2e7f1] bg-white px-4 py-3 text-[12px] leading-[1.65] text-[#36415f] shadow-[0_5px_16px_rgba(36,48,95,0.04)]">{message.loading ? <span className="flex items-center gap-2 text-[#78849a]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> {message.text}</span> : message.text}</div>{!message.loading && <><div className="flex flex-wrap items-center gap-1.5">{message.confidence !== undefined && <span className="rounded-md bg-[#e1f5e9] px-2 py-1 text-[9px] font-bold text-[#137e5a]">Confidence {message.confidence}%</span>}{message.trust !== undefined && <span className="rounded-md bg-[#eef2ff] px-2 py-1 text-[9px] font-bold text-[#2d4bc8]">Trust {message.trust}%</span>}{message.intent && <span className="rounded-md bg-[#f3f5fb] px-2 py-1 text-[9px] font-bold text-[#6c7891]">{message.intent}</span>}</div>{message.source && <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#2d4bc8]"><FileCheck2 className="h-3 w-3" /> {message.source}</p>}<div className="flex items-center gap-2"><button onClick={() => feedback(message.id, "like")} className="rounded-md p-1 text-[#8a96aa] hover:bg-[#e1f5e9] hover:text-[#137e5a]"><ThumbsUp className="h-3.5 w-3.5" /></button><button onClick={() => feedback(message.id, "dislike")} className="rounded-md p-1 text-[#8a96aa] hover:bg-[#fde6e6] hover:text-[#a23a3a]"><ThumbsDown className="h-3.5 w-3.5" /></button><span className="ml-1 text-[9px] text-[#9aa5b7]">{message.reasoning}</span></div></>}</div></div>;
}

function Knowledge({ docs, department, setDepartment, setSelectedDoc, approveDoc, openUpload }: { docs: Doc[]; department: string; setDepartment: (value: string) => void; setSelectedDoc: (doc: Doc) => void; approveDoc: (id: string) => void; openUpload: () => void }) {
  return <div className="space-y-6"><SectionIntro eyebrow="Knowledge operations" title="Bilim bazasini AI bilan boshqaring" text="Har bir hujjat importdan oldin tozalanadi, tahlil qilinadi va trust score bilan reviewga keladi." action={<button onClick={openUpload} className="rounded-xl bg-[#2d4bc8] px-4 py-2.5 text-[11px] font-bold text-white"><Upload className="mr-1.5 inline h-3.5 w-3.5" /> Hujjat qo‘shish</button>} /><div className="flex flex-wrap gap-2">{["All", "Support", "Sales", "Common"].map((item) => <button key={item} onClick={() => setDepartment(item)} className={`rounded-full px-3 py-2 text-[10px] font-bold ${department === item ? "bg-[#2d4bc8] text-white" : "border border-[#dce3f0] bg-white text-[#6c7891]"}`}>{item === "All" ? "Barchasi" : item}</button>)}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{docs.map((doc) => <DocCard key={doc.id} doc={doc} open={() => setSelectedDoc(doc)} approve={() => approveDoc(doc.id)} />)}</div></div>;
}

function Learning({ signals, messages, setActive }: { signals: Signal[]; messages: Message[]; setActive: (section: Section) => void }) {
  const unanswered = messages.filter((message) => message.kind === "assistant" && message.confidence !== undefined && message.confidence < 50);
  return <div className="space-y-6"><SectionIntro eyebrow="Learning hub" title="AI qayerda o‘rganmoqda?" text="Savollar, feedback va javobsiz mavzularni signalga aylantirib, bilim bazasi yo‘nalishini ko‘rsating." action={<button onClick={() => setActive("copilot")} className="rounded-xl border border-[#dce3f0] bg-white px-4 py-2.5 text-[11px] font-bold text-[#2d4bc8]"><Bot className="mr-1.5 inline h-3.5 w-3.5" /> AI bilan tekshirish</button>} /><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-[#e5e9f2] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8995ac]">Topic intelligence</p><h3 className="mt-1 text-[15px] font-bold text-[#1f2947]">Eng ko‘p so‘ralayotgan mavzular</h3></div><BrainCircuit className="h-5 w-5 text-[#2d4bc8]" /></div><div className="mt-5 space-y-4">{signals.map((signal, index) => <div key={signal.title} className="flex items-center gap-3"><span className="w-5 text-[10px] font-extrabold text-[#a3adbd]">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="text-[12px] font-bold text-[#33405e]">{signal.title}</p><span className={`text-[10px] font-bold ${signal.trend >= 0 ? "text-[#137e5a]" : "text-[#a23a3a]"}`}>{signal.trend >= 0 ? `+${signal.trend}%` : `${signal.trend}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef1f6]"><div className={`h-full rounded-full ${signal.trend >= 0 ? "bg-gradient-to-r from-[#2d4bc8] to-[#19a974]" : "bg-[#e39a9a]"}`} style={{ width: `${Math.min(100, signal.value * 4)}%` }} /></div><p className="mt-1 text-[9.5px] text-[#9aa5b7]">{signal.value} ta savol · {signal.detail}</p></div></div>)}</div></div><div className="rounded-2xl border border-[#f0dddd] bg-[#fffafa] p-5"><div className="flex items-center gap-2 text-[#a23a3a]"><AlertTriangle className="h-4 w-4" /><h3 className="text-[14px] font-bold">Bilim bo‘shliqlari</h3></div><p className="mt-2 text-[11px] leading-[1.6] text-[#7f5d63]">AI javob topa olmagan yoki ishonchi past bo‘lgan savollar shu yerda to‘planadi.</p><div className="mt-5 rounded-xl border border-[#f2dddd] bg-white p-4"><p className="text-[11px] font-bold text-[#613f48]">Sales — investor narx siyosati</p><p className="mt-1 text-[10.5px] leading-[1.5] text-[#8a6870]">6 marta so‘ralgan · confidence 24%</p><button onClick={() => setActive("knowledge")} className="mt-3 rounded-lg bg-[#a23a3a] px-3 py-2 text-[10px] font-bold text-white">Hujjat qo‘shish</button></div></div></div><div className="rounded-2xl border border-[#dde5ff] bg-gradient-to-r from-[#eef2ff] to-[#f8f2ff] p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#2d4bc8]"><Sparkles className="h-5 w-5" /></div><div><p className="text-[13px] font-bold text-[#1f2947]">AI tavsiyasi</p><p className="mt-1 text-[11.5px] leading-[1.6] text-[#5d6785]">Karta bloklash mavzusi 24% o‘sdi. Support SOP’ga PIN tiklash va to‘lov qaytishi bo‘yicha alohida qadamlar qo‘shsangiz, no-answer rate kamayishi mumkin.</p></div></div></div></div>;
}

function TrustCenter({ avgTrust, docs }: { avgTrust: number; docs: Doc[] }) {
  const gaugeStyle = { background: "conic-gradient(#2d4bc8 " + avgTrust * 3.6 + "deg, #eef1f7 0deg)" };
  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Trust center" title="AI’ning axloqiy va texnik kompassi" text="Knowledge Trust javobni tezlik bilan emas, ishonch, manba va mas’uliyat bilan o‘lchaydi." action={<span className="flex items-center gap-2 rounded-full border border-[#bde8d3] bg-[#effbf4] px-3 py-2 text-[10px] font-bold text-[#137e5a]"><ShieldCheck className="h-3.5 w-3.5" /> Policy active</span>} />
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-[#e5e9f2] bg-white p-6">
          <div className="mx-auto grid h-44 w-44 place-items-center rounded-full" style={gaugeStyle}>
            <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8995ac]">Trust index</p>
              <p className="mt-1 text-3xl font-extrabold text-[#1f2947]">{avgTrust}%</p>
              <p className="text-[9px] font-bold text-[#137e5a]">stable</p>
            </div>
          </div>
          <div className="mt-5 text-center">
            <p className="text-[13px] font-bold text-[#1f2947]">Ishonchli javob protokoli</p>
            <p className="mt-1 text-[11px] leading-[1.55] text-[#6c7891]">Role filter → source retrieval → trust check → transparent answer.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className="rounded-2xl border border-[#e5e9f2] bg-white p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#2d4bc8]"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 text-[14px] font-bold text-[#1f2947]">{value.title}</h3>
                <p className="mt-1.5 text-[11px] leading-[1.6] text-[#6c7891]">{value.text}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-[#e5e9f2] bg-white p-5">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8995ac]">Transparency board</p><h3 className="mt-1 text-[15px] font-bold text-[#1f2947]">Manba sifati va xavfsizlik</h3></div>
          <LockKeyhole className="h-5 w-5 text-[#2d4bc8]" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-[#edf0f5] p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f3f5fb] text-[#2d4bc8]"><FileText className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate text-[11.5px] font-bold text-[#33405e]">{doc.title}</p><span className="text-[10px] font-bold text-[#137e5a]">{doc.trust}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1f6]"><div className="h-full rounded-full bg-gradient-to-r from-[#2d4bc8] to-[#19a974]" style={{ width: `${doc.trust}%` }} /></div></div>
              <BadgeCheck className="h-4 w-4 text-[#19a974]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return <section className="flex flex-col justify-between gap-5 rounded-2xl border border-[#e3e8f2] bg-white p-6 sm:flex-row sm:items-end sm:p-7"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2d4bc8]"><Sparkles className="h-3.5 w-3.5" /> {eyebrow}</p><h2 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-[#1b2645]">{title}</h2><p className="mt-2 max-w-2xl text-[12px] leading-[1.65] text-[#6c7891]">{text}</p></div>{action}</section>;
}

function HeroStat({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#ccd5ff]">{label}</p><p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-[10px] font-semibold text-[#cbd6ff]">{detail}</p></div>; }
function Kpi({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="rounded-2xl border border-[#e5e9f2] bg-white p-4"><div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{icon}</div><p className="mt-4 text-[10px] font-semibold text-[#8995a9]">{label}</p><div className="mt-1 flex items-end gap-2"><p className="text-[24px] font-extrabold tracking-[-0.04em] text-[#1d2747]">{value}</p><p className="mb-1 text-[9.5px] font-bold text-[#2aa16e]">{detail}</p></div></div>; }
function Trace({ icon, title, detail, done }: { icon: ReactNode; title: string; detail: string; done?: boolean }) { return <div className="flex items-center gap-3"><div className={`grid h-8 w-8 place-items-center rounded-lg ${done ? "bg-[#e5f8ee] text-[#137e5a]" : "bg-[#f3f5fb] text-[#8b97ad]"}`}>{icon}</div><div className="flex-1"><p className="text-[11px] font-bold text-[#33405e]">{title}</p><p className="mt-0.5 text-[10px] text-[#8b97ad]">{detail}</p></div>{done && <Check className="h-4 w-4 text-[#19a974]" />}</div>; }
function DocCard({ doc, open, approve }: { doc: Doc; open: () => void; approve: () => void }) { return <div className="rounded-2xl border border-[#e5e9f2] bg-white p-5 transition hover:border-[#cbd6f5] hover:shadow-[0_18px_34px_rgba(45,75,200,0.08)]"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#2d4bc8]"><FileText className="h-5 w-5" /></div><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${doc.trust >= 85 ? "bg-[#e1f5e9] text-[#137e5a]" : "bg-[#fff2d9] text-[#a76b08]"}`}><BadgeCheck className="mr-1 inline h-3 w-3" />{doc.trust}% trust</span></div><p className="mt-4 text-[13px] font-bold text-[#1f2947]">{doc.title}</p><p className="mt-1 text-[11px] leading-[1.55] text-[#6c7891]">{doc.summary}</p><div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-md bg-[#f3f5fb] px-2 py-1 text-[9.5px] font-bold text-[#68748d]">{doc.department}</span><span className="rounded-md bg-[#f3f5fb] px-2 py-1 text-[9.5px] font-bold text-[#68748d]">{doc.type}</span><span className="rounded-md bg-[#fff2e3] px-2 py-1 text-[9.5px] font-bold text-[#a76b08]">{doc.masked} masked</span></div><div className="mt-4 flex flex-wrap gap-1.5">{doc.topics.map((topic) => <span key={topic} className="rounded-md bg-[#eef2ff] px-2 py-1 text-[9px] font-bold text-[#2d4bc8]">{topic}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-[#edf0f5] pt-3"><button onClick={open} className="text-[10px] font-bold text-[#2d4bc8]">AI preview <ChevronRight className="inline h-3 w-3" /></button>{doc.status === "Pending review" ? <button onClick={approve} className="rounded-lg bg-[#e1f5e9] px-2.5 py-1.5 text-[10px] font-bold text-[#137e5a]">Tasdiqlash</button> : <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#137e5a]"><span className="h-1.5 w-1.5 rounded-full bg-[#19a974]" /> Indexed</span>}</div></div>; }

function UploadModal({ title, setTitle, content, setContent, department, setDepartment, uploading, submit, close }: { title: string; setTitle: (value: string) => void; content: string; setContent: (value: string) => void; department: string; setDepartment: (value: string) => void; uploading: boolean; submit: () => void; close: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0e173a]/55 p-4 backdrop-blur-sm"><div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#edf0f5] px-6 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2d4bc8]">AI ingestion</p><h3 className="mt-1 text-[16px] font-bold text-[#1f2947]">Bilim bazasiga hujjat qo‘shish</h3></div><button onClick={close} className="rounded-lg p-1 text-[#8b97ad]"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><label className="block text-[10px] font-bold text-[#697590]">Hujjat nomi<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Masalan: PIN tiklash SOP" className="mt-1.5 w-full rounded-lg border border-[#dfe5ef] px-3 py-2.5 text-[12px] outline-none focus:border-[#91a6ef]" /></label><div className="grid grid-cols-2 gap-3"><label className="text-[10px] font-bold text-[#697590]">Bo‘lim<select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#dfe5ef] bg-white px-3 py-2.5 text-[11px] outline-none"><option value="support">Support</option><option value="sales">Sales</option><option value="common">Common</option></select></label><div className="rounded-lg border border-dashed border-[#bfcdf4] bg-[#f7f9ff] px-3 py-2.5 text-[10px] text-[#68748d]"><Upload className="mr-1 inline h-3.5 w-3.5 text-[#2d4bc8]" /> TXT / JSON matn</div></div><label className="block text-[10px] font-bold text-[#697590]">Hujjat matni<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} placeholder="AI shu matnni PII masklaydi, mavzularni ajratadi, trust score hisoblaydi..." className="mt-1.5 w-full resize-none rounded-lg border border-[#dfe5ef] px-3 py-2.5 text-[12px] leading-[1.55] outline-none focus:border-[#91a6ef]" /></label><div className="rounded-xl bg-[#f5f7ff] p-3 text-[10px] leading-[1.55] text-[#68748d]"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#2d4bc8]" /> AI pipeline: PII masking → topic analysis → trust score → chunking → admin review.</div><div className="flex justify-end gap-2"><button onClick={close} className="rounded-lg px-3 py-2 text-[11px] font-bold text-[#78849a]">Bekor qilish</button><button disabled={uploading} onClick={submit} className="rounded-lg bg-[#2d4bc8] px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-60">{uploading ? <><LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" /> AI tahlil qilmoqda</> : "AI tahlilni boshlash"}</button></div></div></div></div>; }

function DocumentModal({ doc, approve, close }: { doc: Doc; approve: () => void; close: () => void }) { return <div className="fixed inset-0 z-40 grid place-items-center bg-[#0e173a]/45 p-4" onClick={close}><div onClick={(event) => event.stopPropagation()} className="w-full max-w-[590px] overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between border-b border-[#edf0f5] px-6 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2d4bc8]">AI preview</p><h3 className="mt-1 text-[16px] font-bold text-[#1f2947]">{doc.title}</h3></div><button onClick={close} className="rounded-lg p-1 text-[#8b97ad]"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><div className="rounded-xl border border-[#dce5ff] bg-[#f7f9ff] p-4"><p className="text-[10px] font-bold uppercase text-[#2d4bc8]">AI xulosa</p><p className="mt-1.5 text-[12px] leading-[1.6] text-[#33405e]">{doc.summary}</p></div><div className="grid grid-cols-3 gap-2 text-center"><MiniStat label="Trust" value={`${doc.trust}%`} tone="text-[#137e5a] bg-[#e1f5e9]" /><MiniStat label="Chunks" value={String(doc.chunks)} tone="text-[#2d4bc8] bg-[#eef2ff]" /><MiniStat label="Masked" value={String(doc.masked)} tone="text-[#a76b08] bg-[#fff2d9]" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8995ac]">AI mavzulari</p><div className="mt-2 flex flex-wrap gap-2">{doc.topics.map((topic) => <span key={topic} className="rounded-md bg-[#eef2ff] px-2.5 py-1.5 text-[10px] font-bold text-[#2d4bc8]">{topic}</span>)}</div></div><div className="flex items-center justify-between border-t border-[#edf0f5] pt-4"><span className="text-[10px] text-[#8995ac]">Status: <b className="text-[#a76b08]">{doc.status}</b></span>{doc.status === "Pending review" && <button onClick={approve} className="rounded-lg bg-[#19a974] px-4 py-2 text-[10px] font-bold text-white">Tasdiqlash va indexlash</button>}</div></div></div></div>; }
function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`rounded-xl p-3 ${tone}`}><p className="text-[9px] font-bold uppercase opacity-75">{label}</p><p className="mt-1 text-[16px] font-extrabold">{value}</p></div>; }
