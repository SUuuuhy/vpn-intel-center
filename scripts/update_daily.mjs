import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../data/intelligence.json", import.meta.url);
const RULES_PATH = new URL("../data/source-rules.json", import.meta.url);
const MAX_ITEMS_PER_SOURCE = 8;
const FETCH_TIMEOUT_MS = 12000;
const dryRun = process.argv.includes("--dry-run");
const sanitizeOnly = process.argv.includes("--sanitize-only");

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
const scheduledSources = rules.sources.filter((source) => shouldCrawlSource(source, now));

const existingEvidenceIds = new Set(data.evidence.map((item) => item.id));
const fetchedEvidence = [];
const failures = [];

if (!sanitizeOnly) {
  for (const source of scheduledSources) {
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
}

const mergedEvidence = [...fetchedEvidence, ...data.evidence].slice(0, 80);
const highPriorityToday = fetchedEvidence.filter((item) => item.role === "核心证据").length;

if (!sanitizeOnly) {
  data.generatedAt = generatedAt;
  data.displayDate = displayDate;
  data.status.newItemsToday = fetchedEvidence.length;
  data.status.highPriorityToday = highPriorityToday;
  data.status.pendingReview = Math.max(data.status.pendingReview, failures.length);
  data.status.normalSourceRate = Math.round(((scheduledSources.length - failures.length) / Math.max(1, scheduledSources.length)) * 100);
  data.status.sourcesWaitingReview = failures.length;
}
data.sourceStats = buildSourceStats(rules.sources);
data.evidence = sanitizeEvidenceList(mergedEvidence);

const latestBriefings = fetchedEvidence
  .filter((item) => item.role === "核心证据")
  .slice(0, 3)
  .map((item, index) => ({
    id: `auto-${displayDate}-${index + 1}`,
    period: "daily",
    type: item.sourceType === "竞品情报" ? "竞品动作" : item.sourceType === "政策监管" ? "外部变化" : "需求信号",
    title: item.title,
    originalTitle: item.originalTitle,
    summary: item.summary,
    priority: "高",
    trend: "新出现",
    evidence: 1,
    source: item.source,
    time: item.time,
    url: item.url,
  }));

if (!sanitizeOnly && latestBriefings.length > 0) {
  const retained = data.briefingItems.filter((item) => !item.id.startsWith(`auto-${displayDate}`));
  data.briefingItems = [...latestBriefings, ...retained].slice(0, 24);
}
data.briefingItems = sanitizeBriefingList(data.briefingItems, data.evidence);

if (!dryRun) {
  await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

if (failures.length > 0) {
  console.warn("Some sources failed:", JSON.stringify(failures));
}
console.log(
  `${dryRun ? "Dry run:" : sanitizeOnly ? "Sanitized" : "Updated"} ${fetchedEvidence.length} new evidence items for ${displayDate}. Checked ${scheduledSources.length}/${rules.sources.length} scheduled sources.`,
);

function shouldCrawlSource(source, date) {
  const frequency = String(source.frequency || "daily").toLowerCase();
  if (frequency === "paused" || frequency === "manual") return false;
  if (frequency === "weekly") return shanghaiWeekday(date) === "Mon";
  return true;
}

function shanghaiWeekday(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(date);
}

function buildSourceStats(sources) {
  const categoryOrder = ["竞品情报", "用户声音", "SEO搜索", "第三方媒体", "政策监管", "需求触发市场"];
  const categoryMeta = {
    "竞品情报": { freq: "按页/账号分频", color: "bg-teal-500" },
    "用户声音": { freq: "每日", color: "bg-indigo-500" },
    "SEO搜索": { freq: "每周2-3次", color: "bg-cyan-500" },
    "第三方媒体": { freq: "每周1-2次", color: "bg-amber-500" },
    "政策监管": { freq: "每周/事件加频", color: "bg-rose-500" },
    "需求触发市场": { freq: "按对象分频", color: "bg-emerald-500" },
  };
  const counts = new Map();

  for (const source of sources) {
    const category = normalizeSourceCategory(source.category);
    const current = counts.get(category) ?? { total: 0, active: 0 };
    current.total += 1;
    if (source.frequency !== "paused" && source.frequency !== "manual") current.active += 1;
    counts.set(category, current);
  }

  return categoryOrder.map((category) => {
    const count = counts.get(category) ?? { total: 0, active: 0 };
    return {
      name: category,
      total: count.total,
      active: count.active,
      freq: categoryMeta[category].freq,
      color: categoryMeta[category].color,
    };
  });
}

function normalizeSourceCategory(category) {
  if (category === "用户声音（UGC）") return "用户声音";
  if (category === "SEO 搜索结果") return "SEO搜索";
  if (category === "政策与监管") return "政策监管";
  if (category === "相关市场" || category === "平台服务生态" || category === "相关平台") return "需求触发市场";
  return category;
}

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
  return stripHtml(decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")));
}

function decodeEntities(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)));
}

function stripHtml(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSummary(value, fallback = "") {
  const cleaned = cleanXml(value || fallback);
  return cleaned.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim() || fallback;
}

function sanitizeEvidenceList(items) {
  return items.map((item) => {
    const rawTitle = cleanSummary(item.originalTitle || item.title, item.title);
    const rawSummary = cleanSummary(item.summary, rawTitle);
    const themeId = item.id?.startsWith("auto-")
      ? inferThemeId(`${rawTitle} ${rawSummary}`.toLowerCase(), item.sourceType)
      : item.themeId;
    const shouldLocalize = item.id?.startsWith("auto-") || startsWithLatin(rawSummary) || !containsChinese(rawSummary);
    const sourceInfo = { category: item.sourceType, name: item.source };

    return {
      ...item,
      themeId,
      ...(shouldLocalize ? { originalTitle: rawTitle } : item.originalTitle ? { originalTitle: cleanSummary(item.originalTitle, item.originalTitle) } : {}),
      title: shouldLocalize ? buildChineseTitle(rawTitle, sourceInfo, themeId) : cleanSummary(item.title, rawTitle),
      summary: shouldLocalize ? buildChineseSummary(rawTitle, rawSummary, sourceInfo, themeId, item.role) : rawSummary,
      url: item.url || inferSourceUrl(item, rawTitle),
    };
  });
}

function sanitizeBriefingList(items, evidenceItems) {
  const evidenceByUrl = new Map(evidenceItems.filter((item) => item.url).map((item) => [item.url, item]));
  const evidenceByTitle = new Map(
    evidenceItems.flatMap((item) => [
      [item.title, item],
      [item.originalTitle, item],
    ]).filter(([title]) => title),
  );

  return items.map((item) => {
    const title = cleanSummary(item.title, item.title);
    const matchedEvidence = (item.url && evidenceByUrl.get(item.url)) || evidenceByTitle.get(title);
    const sourceInfo = { category: sourceTypeFromBriefing(item.type), name: item.source };
    const rawTitle = cleanSummary(item.originalTitle || matchedEvidence?.originalTitle || title, title);
    const rawSummary = cleanSummary(item.summary, rawTitle);
    const themeId = matchedEvidence?.themeId || inferThemeId(`${rawTitle} ${rawSummary}`.toLowerCase(), sourceInfo.category);
    const shouldLocalize = item.id?.startsWith("auto-") || startsWithLatin(rawSummary) || !containsChinese(rawSummary);

    return {
      ...item,
      ...(shouldLocalize ? { originalTitle: rawTitle } : item.originalTitle ? { originalTitle: cleanSummary(item.originalTitle, item.originalTitle) } : {}),
      title: shouldLocalize ? buildChineseTitle(rawTitle, sourceInfo, themeId) : title,
      summary: shouldLocalize ? buildChineseSummary(rawTitle, rawSummary, sourceInfo, themeId, item.priority === "高" ? "核心证据" : "参考信息") : rawSummary,
      url: item.url || matchedEvidence?.url || inferBriefingUrl(item, rawTitle),
    };
  });
}

function containsChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function startsWithLatin(value) {
  return /^[A-Za-z]/.test(value.trim());
}

function sourceTypeFromBriefing(type) {
  if (type === "竞品动作") return "竞品情报";
  if (type === "外部变化") return "政策监管";
  return "用户声音";
}

function buildChineseTitle(rawTitle, source, themeId) {
  if (containsChinese(rawTitle)) return rawTitle;

  const text = rawTitle.toLowerCase();
  const subject = inferSubject(text, themeId);
  const publisher = extractPublisher(rawTitle);
  const competitor = inferCompetitor(text);
  const suffix = publisher ? ` · ${publisher}` : "";

  if (source.category === "竞品情报") {
    return `${competitor ? `${competitor} 动作` : "竞品动作"}：${subject}${suffix}`;
  }
  if (source.category === "用户声音") return `用户需求：${subject}${suffix}`;
  if (source.category === "政策监管") return `政策监管：${subject}${suffix}`;
  if (source.category === "SEO搜索") return `SEO 信号：${subject}${suffix}`;
  if (source.category === "第三方媒体") return `第三方评测：${subject}${suffix}`;
  if (source.category === "相关平台") return `平台生态：${subject}${suffix}`;
  if (source.category === "需求触发市场") return `需求对象：${subject}${suffix}`;
  return `${source.category || "外部情报"}：${subject}${suffix}`;
}

function buildChineseSummary(rawTitle, rawSummary, source, themeId, role) {
  const text = `${rawTitle} ${rawSummary}`.toLowerCase();
  const subject = inferSubject(text, themeId);
  const publisher = extractPublisher(rawTitle);
  const sourceName = source.name || source.category || "外部信源";
  const publisherText = publisher ? `（${publisher}）` : "";
  const originalTitle = trimPublisher(rawTitle);

  if (source.category === "竞品情报") {
    const competitor = inferCompetitor(text) || "相关竞品";
    return `该信息来自${sourceName}${publisherText}，显示${competitor}围绕「${subject}」出现产品、内容、价格或品牌动作。系统将其标记为${role}，用于判断竞品正在把哪些需求场景转化为增长入口。原文标题：${originalTitle}。`;
  }
  if (source.category === "用户声音") {
    return `该信息来自${sourceName}${publisherText}，反映外部讨论中出现「${subject}」相关需求。系统将其标记为${role}，重点用于判断用户想访问什么内容或服务，以及受到地区、支付、隐私或平台规则限制后是否产生 VPN 使用动机。原文标题：${originalTitle}。`;
  }
  if (source.category === "政策监管") {
    return `该信息来自${sourceName}${publisherText}，指向「${subject}」相关的政策或监管变化。系统将其标记为${role}，作为风险提示和机会评估的参考，但不直接降低增长机会判断。原文标题：${originalTitle}。`;
  }
  if (source.category === "SEO搜索") {
    return `该信息来自${sourceName}${publisherText}，说明「${subject}」相关搜索结果出现变化。系统将其标记为${role}，用于观察需求热度、竞品页面布局和潜在 SEO 切入点。原文标题：${originalTitle}。`;
  }
  if (source.category === "需求触发市场") {
    return `该信息来自${sourceName}${publisherText}，指向「${subject}」这一需求触发对象。系统将其标记为${role}，用于判断高人气内容、赛事或平台是否因为地区限制、版权差异或访问门槛触发 VPN 使用需求。原文标题：${originalTitle}。`;
  }

  return `该信息来自${sourceName}${publisherText}，与「${subject}」相关。系统将其标记为${role}，用于辅助增长和运营判断外部市场变化。原文标题：${originalTitle}。`;
}

function inferSubject(text, themeId) {
  if (text.includes("age verification") || text.includes("age-verification") || text.includes("verification")) return "年龄验证与 VPN 限制";
  if (text.includes("privacy") || text.includes("law") || text.includes("regulation")) return "隐私监管与合规风险";
  if (text.includes("bbc") || text.includes("iplayer") || themeId === "d1") return "BBC iPlayer 访问限制";
  if (text.includes("world cup") || text.includes("match") || text.includes("espn")) return "体育赛事观看与跨区访问";
  if (text.includes("netflix") || text.includes("hulu") || text.includes("disney") || text.includes("stream")) return "流媒体访问需求";
  if (text.includes("payment") || text.includes("purchase") || text.includes("account") || themeId === "d2") return "跨区支付与账号限制";
  if (text.includes("price") || text.includes("deal") || text.includes("save") || text.includes("discount") || text.includes("month")) return "价格促销与套餐表达";
  if (text.includes("scam") || text.includes("protection") || text.includes("safe")) return "安全防护功能";
  if (text.includes("server") || text.includes("location")) return "节点覆盖能力";
  if (text.includes("compare") || text.includes(" vs ") || text.includes("review")) return "竞品对比与评测";
  if (text.includes("blocked") || text.includes("restriction") || text.includes("unblock") || text.includes("access")) return "访问限制与解锁需求";
  if (themeId === "a2") return "家庭订阅与价格活动";
  if (themeId === "a3") return "流媒体解锁内容";
  return "VPN 市场相关信号";
}

function inferCompetitor(text) {
  if (text.includes("nordvpn")) return "NordVPN";
  if (text.includes("expressvpn")) return "ExpressVPN";
  if (text.includes("surfshark")) return "Surfshark";
  if (text.includes("proton")) return "Proton VPN";
  if (text.includes("cyberghost")) return "CyberGhost";
  if (text.includes("ipvanish")) return "IPVanish";
  return "";
}

function extractPublisher(title) {
  const parts = title.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-1) : "";
}

function trimPublisher(title) {
  const parts = title.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(" - ") : title;
}

function inferSourceUrl(item, rawTitle) {
  if (item.url) return item.url;
  const sourceText = `${item.sourceType} ${item.source} ${rawTitle}`.toLowerCase();

  if (sourceText.includes("reddit") || item.sourceType === "用户声音") {
    return searchUrl("https://www.reddit.com/search/?q=", rawTitle);
  }
  if (sourceText.includes("google serp") || item.sourceType === "SEO搜索") {
    return googleSearchUrl(rawTitle);
  }
  if (sourceText.includes("surfshark")) {
    return "https://surfshark.com/pricing";
  }
  if (sourceText.includes("nordvpn")) {
    return googleSearchUrl(`site:nordvpn.com ${rawTitle}`);
  }
  return googleSearchUrl(rawTitle);
}

function inferBriefingUrl(item, rawTitle) {
  if (item.url) return item.url;
  const sourceText = `${item.type} ${item.source} ${rawTitle}`.toLowerCase();
  if (sourceText.includes("reddit")) return searchUrl("https://www.reddit.com/search/?q=", rawTitle);
  if (sourceText.includes("seo") || sourceText.includes("serp")) return googleSearchUrl(rawTitle);
  if (sourceText.includes("surfshark")) return "https://surfshark.com/pricing";
  if (sourceText.includes("nordvpn")) return googleSearchUrl(`site:nordvpn.com ${rawTitle}`);
  return undefined;
}

function searchUrl(base, query) {
  return `${base}${encodeURIComponent(query)}`;
}

function googleSearchUrl(query) {
  return searchUrl("https://www.google.com/search?q=", query);
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
  const role = score >= 4 ? "核心证据" : "参考信息";
  const id = createHash("sha1").update(`${source.id}:${item.link || item.title}`).digest("hex").slice(0, 12);
  const publishedDate = item.publishedAt ? new Date(item.publishedAt) : now;
  const safePublishedDate = Number.isNaN(publishedDate.getTime()) ? now : publishedDate;
  const rawTitle = cleanSummary(item.title, item.title);
  const rawSummary = cleanSummary(item.summary, rawTitle);
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
    role,
    themeId,
    title: buildChineseTitle(rawTitle, source, themeId),
    originalTitle: rawTitle,
    sourceType: source.category,
    source: source.name,
    summary: buildChineseSummary(rawTitle, rawSummary, source, themeId, role),
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
  if (text.includes("privacy") || text.includes("age verification") || text.includes("age-verification") || text.includes("verification")) return "d3";
  return "d1";
}
