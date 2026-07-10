import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../data/intelligence.json", import.meta.url);
const RULES_PATH = new URL("../data/source-rules.json", import.meta.url);
const MAX_ITEMS_PER_SOURCE = 8;
const FETCH_TIMEOUT_MS = 12000;
const dryRun = process.argv.includes("--dry-run");

const now = new Date();
const generatedAt = now.toISOString();
const displayDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);

const data = JSON.parse(await readFile(DATA_PATH, "utf8"));
const rules = JSON.parse(await readFile(RULES_PATH, "utf8"));

const existingEvidenceIds = new Set(data.evidence.map((item) => item.id));
const fetchedEvidence = [];
const failures = [];

for (const source of rules.sources) {
  try {
    const text = await fetchText(source.url);
    const items = source.mode === "rss" ? parseRss(text) : parseHtmlTitle(text, source.url);
    for (const item of items.slice(0, MAX_ITEMS_PER_SOURCE)) {
      const classified = classifyItem(item, source, rules.keywords);
      if (!classified) continue;
      if (existingEvidenceIds.has(classified.id)) continue;
      existingEvidenceIds.add(classified.id);
      fetchedEvidence.push(classified);
    }
  } catch (error) {
    failures.push({ source: source.id, message: error.message });
  }
}

const mergedEvidence = [...fetchedEvidence, ...data.evidence].slice(0, 80);
const highPriorityToday = fetchedEvidence.filter((item) => item.role === "核心证据").length;

data.generatedAt = generatedAt;
data.displayDate = displayDate;
data.status.newItemsToday = fetchedEvidence.length;
data.status.highPriorityToday = highPriorityToday;
data.status.pendingReview = Math.max(data.status.pendingReview, failures.length);
data.status.normalSourceRate = Math.round(((rules.sources.length - failures.length) / Math.max(1, rules.sources.length)) * 100);
data.status.sourcesWaitingReview = failures.length;
data.evidence = mergedEvidence;

const latestBriefings = fetchedEvidence
  .filter((item) => item.role === "核心证据")
  .slice(0, 3)
  .map((item, index) => ({
    id: `auto-${displayDate}-${index + 1}`,
    period: "daily",
    type: item.sourceType === "竞品情报" ? "竞品动作" : item.sourceType === "政策监管" ? "外部变化" : "需求信号",
    title: item.title,
    summary: item.summary,
    priority: "高",
    trend: "新出现",
    evidence: 1,
    source: item.source,
    time: item.time,
  }));

if (latestBriefings.length > 0) {
  const retained = data.briefingItems.filter((item) => !item.id.startsWith(`auto-${displayDate}`));
  data.briefingItems = [...latestBriefings, ...retained].slice(0, 24);
}

if (!dryRun) {
  await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

if (failures.length > 0) {
  console.warn("Some sources failed:", JSON.stringify(failures));
}
console.log(`${dryRun ? "Dry run:" : "Updated"} ${fetchedEvidence.length} new evidence items for ${displayDate}.`);

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "vpn-intelligence-center/1.0 (+https://github.com)",
        "Accept": "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRss(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => {
    const item = match[0];
    return {
      title: cleanXml(readTag(item, "title")),
      link: cleanXml(readTag(item, "link")),
      summary: cleanXml(readTag(item, "description")),
      publishedAt: cleanXml(readTag(item, "pubDate")),
    };
  }).filter((item) => item.title);
}

function parseHtmlTitle(html, url) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url;
  return [{ title: cleanXml(title), link: url, summary: "", publishedAt: generatedAt }];
}

function readTag(xml, tag) {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
}

function cleanXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyItem(item, source, keywords) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const score =
    countMatches(text, keywords.vpn) * 2 +
    countMatches(text, keywords.competitors) * 2 +
    countMatches(text, keywords.demand) +
    countMatches(text, keywords.platforms);

  if (score < 2) return null;

  const themeId = inferThemeId(text, source.category);
  const id = createHash("sha1").update(`${source.id}:${item.link || item.title}`).digest("hex").slice(0, 12);
  const publishedDate = item.publishedAt ? new Date(item.publishedAt) : now;
  const safePublishedDate = Number.isNaN(publishedDate.getTime()) ? now : publishedDate;
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(safePublishedDate).replace(/\//g, "-");

  return {
    id: `auto-${id}`,
    role: score >= 4 ? "核心证据" : "参考信息",
    themeId,
    title: item.title,
    sourceType: source.category,
    source: source.name,
    summary: item.summary || `${source.name} 捕捉到与 VPN 市场相关的新信息。`,
    time,
    url: item.link || source.url,
  };
}

function countMatches(text, list) {
  return list.reduce((sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function inferThemeId(text, category) {
  if (category === "竞品情报") {
    if (text.includes("surfshark")) return "a2";
    if (text.includes("expressvpn")) return "a3";
    return "a1";
  }
  if (text.includes("bbc") || text.includes("iplayer")) return "d1";
  if (text.includes("payment") || text.includes("hulu") || text.includes("disney")) return "d2";
  if (text.includes("privacy") || text.includes("age verification")) return "d3";
  return "d1";
}
