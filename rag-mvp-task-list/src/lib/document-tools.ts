export type MaskingResult = { cleanText: string; counts: Record<string, number>; total: number };

const rules: Array<[string, RegExp]> = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /(?<!\d)(?:\+?998[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/g],
  ["card", /\b(?:\d[ -]*?){13,19}\b/g],
  ["password", /\b(?:password|parol|пароль)\s*[:=]\s*[^\s,;]+/gi],
  ["api_key", /\b(?:sk|pk|api)[_-][A-Za-z0-9_-]{12,}\b/g],
  ["token", /\b(?:token|bearer)\s+[A-Za-z0-9._-]{16,}\b/gi],
];

export function maskSensitiveData(input: string): MaskingResult {
  const counts: Record<string, number> = {};
  let cleanText = input;
  for (const [name, expression] of rules) {
    const matches = cleanText.match(expression);
    counts[name] = matches?.length ?? 0;
    cleanText = cleanText.replace(expression, "[MASKED]");
  }
  return { cleanText, counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

export function normalizeText(input: string) {
  return input
    .replace(/https?:\/\/\S+/g, "[URL]")
    .replace(/[\u{1F300}-\u{1FAFF}]{3,}/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function chunkText(input: string, chunkSize = 700, overlap = 100) {
  const words = input.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const stride = Math.max(1, chunkSize - overlap);
  for (let start = 0; start < words.length; start += stride) {
    const chunk = words.slice(start, start + chunkSize).join(" ");
    if (chunk) chunks.push(chunk);
    if (start + chunkSize >= words.length) break;
  }
  return chunks;
}

export function allowedDepartments(role: "admin" | "sales" | "support") {
  if (role === "admin") return ["sales", "support", "common"] as const;
  return role === "sales" ? (["sales", "common"] as const) : (["support", "common"] as const);
}

export function lexicalScore(query: string, content: string) {
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  if (!terms.length) return 0;
  const haystack = content.toLowerCase();
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}
