import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../data/intelligence.json", import.meta.url);
const RULES_PATH = new URL("../data/source-rules.json", import.meta.url);
const PROFILES_PATH = new URL("../data/collection-profiles.json", import.meta.url);
const MAX_ITEMS_PER_SOURCE = 8;
const MAX_PROFILE_ITEMS_PER_SOURCE = 40;
const MAX_PROFILE_ANCHORS = 40;
const MAX_HISTORY_ITEMS = 180;
const MAX_DIAGNOSTIC_RECORDS = 160;
const FETCH_TIMEOUT_MS = 12000;
const FETCH_RETRY_COUNT = 3;
const MAX_CONCURRENT_FETCHES = 6;
const PANEL_LIMITS = {
  "竞品情报": 140,
  "用户声音": 100,
  "增长热点": 120,
  "政策风险": 30,
  "历史信息库": 20,
};
const dryRun = process.argv.includes("--dry-run");
const sanitizeOnly = process.argv.includes("--sanitize-only");
const profilesOnly = process.argv.includes("--profiles-only");

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
const collectionProfiles = JSON.parse(await readFile(PROFILES_PATH, "utf8")).profiles ?? [];
const profileSources = buildProfileSources(collectionProfiles);
const allSources = [...rules.sources, ...profileSources];
const scheduledSources = selectScheduledSources(profilesOnly ? profileSources : allSources, now);

const existingEvidenceIds = new Set(data.evidence.map((item) => item.id));
const fetchedEvidence = [];
const failures = [];
const crawlDiagnosticRecords = [];

if (!sanitizeOnly) {
  const results = await mapWithConcurrency(scheduledSources, MAX_CONCURRENT_FETCHES, async (source) => {
    const checkedAt = new Date().toISOString();
    try {
      const text = await fetchText(source.url);
      const rawItems =
        source.mode === "rss"
          ? parseRss(text)
          : source.mode === "html-deep" || shouldDeepScanHtmlSource(source)
            ? await parseHtmlDeep(text, source.url)
            : parseHtmlTitle(text, source.url);
      const itemLimit = source.collectionProfile ? MAX_PROFILE_ITEMS_PER_SOURCE : MAX_ITEMS_PER_SOURCE;
      const candidateItems = rawItems.slice(0, itemLimit);
      const acceptedItems = [];
      const rejectedSamples = [];

      for (const item of candidateItems) {
        const classified = classifyItem(item, source, rules.keywords);
        if (classified) {
          acceptedItems.push(classified);
        } else if (rejectedSamples.length < 4) {
          rejectedSamples.push({
            title: cleanSummary(item.title, item.link || source.url).slice(0, 140),
            reason: explainRejectedItem(item, source, rules.keywords),
          });
        }
      }

      return {
        source,
        items: acceptedItems,
        diagnostic: buildSourceDiagnostic(source, {
          checkedAt,
          rawItems,
          candidateItems,
          acceptedItems,
          rejectedSamples,
        }),
      };
    } catch (error) {
      return {
        source,
        error,
        diagnostic: buildFailureDiagnostic(source, error, checkedAt),
      };
    }
  });

  for (const result of results) {
    if (result.diagnostic) crawlDiagnosticRecords.push(result.diagnostic);
    if (result.error) {
      failures.push({ source: result.source.id, message: result.error.message });
      continue;
    }
    for (const classified of result.items) {
      if (existingEvidenceIds.has(classified.id)) continue;
      existingEvidenceIds.add(classified.id);
      fetchedEvidence.push(classified);
    }
  }
}

const dedupedFetchedEvidence = dedupeEvidence(fetchedEvidence).filter(shouldKeepEvidenceItem);
const mergedEvidence = dedupeEvidence([...dedupedFetchedEvidence, ...data.evidence]).filter(shouldKeepEvidenceItem).slice(0, MAX_HISTORY_ITEMS);
const highPriorityToday = dedupedFetchedEvidence.filter((item) => item.role === "核心证据").length;

if (!sanitizeOnly) {
  data.generatedAt = generatedAt;
  data.displayDate = displayDate;
  data.status.newItemsToday = dedupedFetchedEvidence.length;
  data.status.highPriorityToday = highPriorityToday;
  data.status.pendingReview = failures.length + crawlDiagnosticRecords.filter((record) => record.status === "候选未入库").length;
  data.status.normalSourceRate = Math.round(((scheduledSources.length - failures.length) / Math.max(1, scheduledSources.length)) * 100);
  data.status.sourcesWaitingReview = failures.length;
  data.crawlDiagnostics = buildCrawlDiagnostics(crawlDiagnosticRecords, scheduledSources.length);
}
data.sourceStats = buildSourceStats(rules.sources);
data.evidence = sanitizeEvidenceList(mergedEvidence);

const latestBriefings = dedupedFetchedEvidence
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
  `${dryRun ? "Dry run:" : sanitizeOnly ? "Sanitized" : "Updated"} ${dedupedFetchedEvidence.length} new evidence items for ${displayDate}. Checked ${scheduledSources.length}/${profilesOnly ? profileSources.length : allSources.length} scheduled sources.`,
);

process.exit(0);

function buildProfileSources(profiles) {
  return profiles.flatMap((profile) => {
    const requiredSources = profile.requiredUrls.map((url, index) => ({
      id: `profile-${profile.id}-required-${index + 1}`,
      name: `${profile.name} - 必检索 ${index + 1}`,
      category: profile.sourceType,
      secondaryCategory: profile.name,
      granularity: "页面级",
      market: "Global",
      competitor: "",
      scene: profile.name,
      isCore: true,
      crawlMethod: "HTML",
      url,
      mode: "html-deep",
      frequency: profile.frequency ?? "daily",
      panel: profile.panel,
      hotspotType: profile.hotspotType,
      collectionProfile: profile.id,
      collectionProfileName: profile.name,
      collectionRule: profile.summaryRule,
      includeKeywords: profile.includeKeywords ?? [],
      excludeKeywords: profile.excludeKeywords ?? [],
    }));
    const searchSources = profile.searchKeywords.map((keyword, index) => ({
      id: `profile-${profile.id}-search-${index + 1}`,
      name: `${profile.name} - ${keyword}`,
      category: profile.sourceType,
      secondaryCategory: `${profile.name}关键词搜索`,
      granularity: "关键词级",
      market: "Global",
      competitor: "",
      scene: profile.name,
      isCore: true,
      crawlMethod: "RSS",
      url: googleNewsRssUrl(`${keyword} when:1d`),
      mode: "rss",
      frequency: profile.frequency ?? "daily",
      panel: profile.panel,
      hotspotType: profile.hotspotType,
      collectionProfile: profile.id,
      collectionProfileName: profile.name,
      collectionKeyword: keyword,
      collectionRule: profile.summaryRule,
      includeKeywords: profile.includeKeywords ?? [],
      excludeKeywords: profile.excludeKeywords ?? [],
    }));
    return [...requiredSources, ...searchSources];
  });
}

function googleNewsRssUrl(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

async function mapWithConcurrency(items, limit, task) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function selectScheduledSources(sources, date) {
  const grouped = new Map();
  for (const source of sources) {
    if (!shouldCrawlSource(source, date)) continue;
    const panel = inferSourcePanel(source);
    const current = grouped.get(panel) ?? [];
    current.push(source);
    grouped.set(panel, current);
  }

  return ["竞品情报", "用户声音", "增长热点", "政策风险", "历史信息库"].flatMap((panel) => {
    const limit = PANEL_LIMITS[panel] ?? 30;
    return (grouped.get(panel) ?? [])
      .sort((a, b) => sourcePriority(b, panel) - sourcePriority(a, panel))
      .slice(0, limit);
  });
}

function shouldCrawlSource(source, date) {
  const frequency = String(source.frequency || "daily").toLowerCase();
  if (frequency === "paused" || frequency === "manual") return false;
  const panel = inferSourcePanel(source);
  if (source.collectionProfile) return true;
  if (panel === "政策风险") return isOfficialPolicySource(source) && (frequency !== "weekly" || shanghaiWeekday(date) === "Mon");
  if (panel === "竞品情报" || panel === "用户声音" || panel === "增长热点") return true;
  if (frequency === "weekly") return shanghaiWeekday(date) === "Mon";
  return true;
}

function inferSourcePanel(source) {
  if (source.panel) return source.panel;
  const category = normalizeSourceCategory(source.category);
  const text = `${source.name} ${source.secondaryCategory} ${source.scene} ${source.url}`.toLowerCase();
  if (category === "政策监管") return "政策风险";
  if (category === "用户声音") return "用户声音";
  if (category === "需求触发市场" || /steamdb|steam|game|gaming|电竞|游戏|f1|world cup|espn|netflix|bbc|hulu|disney|stream/.test(text)) return "增长热点";
  if (category === "竞品情报" || category === "第三方媒体") return "竞品情报";
  return "历史信息库";
}

function sourcePriority(source, panel) {
  const methodScore = source.mode === "rss" ? 4 : source.crawlMethod === "Social" ? 3 : source.crawlMethod === "SERP" ? 2 : 1;
  const coreScore = source.isCore ? 8 : 0;
  const officialScore = isOfficialCompetitorSource(source) || isOfficialPolicySource(source) ? 6 : 0;
  const panelScore = panel === "政策风险" && isOfficialPolicySource(source) ? 10 : 0;
  const profileScore = source.collectionProfile ? 12 : 0;
  return coreScore + officialScore + panelScore + profileScore + methodScore;
}

function buildCrawlDiagnostics(records, checkedSources) {
  const acceptedItems = records.reduce((sum, record) => sum + record.acceptedCount, 0);
  const candidateItems = records.reduce((sum, record) => sum + record.candidateCount, 0);
  const failedSources = records.filter((record) => record.status === "抓取失败").length;
  const filteredItems = records.reduce((sum, record) => sum + record.rejectedCount, 0);

  return {
    generatedAt,
    checkedSources,
    candidateItems,
    acceptedItems,
    failedSources,
    filteredItems,
    records: records
      .sort((a, b) => diagnosticStatusWeight(a.status) - diagnosticStatusWeight(b.status))
      .slice(0, MAX_DIAGNOSTIC_RECORDS),
  };
}

function diagnosticStatusWeight(status) {
  if (status === "抓取失败") return 0;
  if (status === "候选未入库") return 1;
  if (status === "无候选") return 2;
  return 3;
}

function buildSourceDiagnostic(source, { checkedAt, rawItems, candidateItems, acceptedItems, rejectedSamples }) {
  const candidateCount = candidateItems.length;
  const acceptedCount = acceptedItems.length;
  const status = acceptedCount > 0 ? "入库" : candidateCount > 0 ? "候选未入库" : "无候选";

  return {
    id: source.id,
    name: source.name,
    panel: inferSourcePanel(source),
    category: normalizeSourceCategory(source.category),
    method: source.mode || source.crawlMethod,
    url: source.url,
    status,
    checkedAt,
    candidateCount,
    rawCandidateCount: rawItems.length,
    acceptedCount,
    rejectedCount: Math.max(0, candidateCount - acceptedCount),
    collectionProfileName: source.collectionProfileName || "",
    collectionKeyword: source.collectionKeyword || "",
    acceptedSamples: acceptedItems.slice(0, 3).map((item) => item.title),
    rejectedSamples,
    note: diagnosticNote(status, source),
  };
}

function buildFailureDiagnostic(source, error, checkedAt) {
  return {
    id: source.id,
    name: source.name,
    panel: inferSourcePanel(source),
    category: normalizeSourceCategory(source.category),
    method: source.mode || source.crawlMethod,
    url: source.url,
    status: "抓取失败",
    checkedAt,
    candidateCount: 0,
    rawCandidateCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    collectionProfileName: source.collectionProfileName || "",
    collectionKeyword: source.collectionKeyword || "",
    acceptedSamples: [],
    rejectedSamples: [],
    failureReason: error.message,
    note: diagnosticNote("抓取失败", source, error.message),
  };
}

function diagnosticNote(status, source, reason = "") {
  if (status === "抓取失败") {
    if (/403|401|forbidden/i.test(reason)) return "站点限制普通抓取，需要浏览器渲染、官方 RSS/API 或专门适配。";
    if (/abort|timeout|fetch failed/i.test(reason)) return "网络或 TLS 失败，已自动重试；后续可用浏览器任务补扫。";
    return "抓取请求失败，建议检查信源可用性或改为搜索/RSS 回退。";
  }
  if (status === "候选未入库") return "抓到了候选，但没有通过主题、时效或相关性规则。";
  if (status === "无候选") {
    return source.mode === "html-deep" ? "页面可访问但没有识别出文章链接，可能需要翻页或 JS 渲染。" : "信源返回正常但没有新候选。";
  }
  return "已成功进入信息库。";
}

function isOfficialCompetitorSource(source) {
  const text = `${source.category} ${source.secondaryCategory} ${source.name} ${source.url}`.toLowerCase();
  return normalizeSourceCategory(source.category) === "竞品情报" && /官方|官网|blog|pricing|youtube|tiktok|instagram|facebook|linkedin|x\.com|twitter/.test(text);
}

function isOfficialPolicySource(source) {
  const text = `${source.name} ${source.secondaryCategory} ${source.url}`.toLowerCase();
  return /政府|监管|官方|标准|guidance|regulator|commission|authority/.test(text) || /\.gov|europa\.eu|ofcom|ftc|ico\.org|cnil|edpb|acma\.gov|oaic\.gov/.test(text);
}

function dedupeEvidence(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = evidenceDedupKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evidenceDedupKey(item) {
  const panel = item.sourcePanel || item.sourceType || "unknown";
  const title = (item.originalTitle || item.title || "")
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter((part) => part.length > 2)
    .slice(0, panel === "政策风险" ? 8 : 12)
    .join(" ");
  return `${panel}:${title || item.url || item.id}`;
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

function shouldDeepScanHtmlSource(source) {
  if (source.mode !== "html") return false;
  if (source.crawlMethod === "Social") return false;
  const text = `${source.name} ${source.secondaryCategory} ${source.scene} ${source.url}`.toLowerCase();
  return /blog|news|press|release|article|insight|resource|stories|公告|新闻|博客|资讯/.test(text);
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_RETRY_COUNT; attempt += 1) {
    try {
      return await fetchTextOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt === FETCH_RETRY_COUNT || !isRetryableFetchError(error)) break;
      await wait(350 * attempt);
    }
  }

  const attempts = FETCH_RETRY_COUNT > 1 && isRetryableFetchError(lastError) ? ` after ${FETCH_RETRY_COUNT} attempts` : "";
  throw new Error(`${lastError.message}${attempts}`);
}

async function fetchTextOnce(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/html;q=0.9,application/xhtml+xml;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "Cache-Control": "no-cache",
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

function isRetryableFetchError(error) {
  return /fetch failed|AbortError|aborted|timeout|HTTP 408|HTTP 409|HTTP 425|HTTP 429|HTTP 5\d{2}/i.test(error?.message || "");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function parseHtmlDeep(html, url) {
  const anchors = parseHtmlAnchors(html, url).slice(0, MAX_PROFILE_ANCHORS);
  const detailResults = await mapWithConcurrency(anchors, 4, async (anchor) => {
    try {
      const articleHtml = await fetchText(anchor.link);
      const title = readHtmlTitle(articleHtml) || anchor.title;
      const summary = readMeta(articleHtml, "description") || readMeta(articleHtml, "og:description") || anchor.summary;
      const publishedAt =
        readMeta(articleHtml, "article:published_time") ||
        readMeta(articleHtml, "date") ||
        readMeta(articleHtml, "pubdate") ||
        readTimeTag(articleHtml) ||
        "";
      return {
        title: cleanSummary(title, anchor.title),
        link: anchor.link,
        summary: cleanSummary(summary, title),
        publishedAt,
      };
    } catch {
      return anchor;
    }
  });
  return detailResults.filter((item) => item.title);
}

function parseHtmlAnchors(html, baseUrl) {
  const baseHost = safeHost(baseUrl);
  const seen = new Set();
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const link = resolveUrl(match[1], baseUrl);
      const title = cleanSummary(match[2], "");
      return { title, link, summary: "", publishedAt: "" };
    })
    .filter((item) => {
      if (!item.link || !item.title || item.title.length < 8) return false;
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      const host = safeHost(item.link);
      if (host && baseHost && host !== baseHost) return false;
      return isLikelyArticleUrl(item.link, item.title);
    });
}

function readHtmlTitle(html) {
  return cleanXml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function readMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i");
  return cleanXml(html.match(direct)?.[1] ?? html.match(reversed)?.[1] ?? "");
}

function readTimeTag(html) {
  return cleanXml(html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i)?.[1] ?? "");
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href.split("#")[0];
  } catch {
    return "";
  }
}

function safeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isLikelyArticleUrl(url, title) {
  const text = `${url} ${title}`.toLowerCase();
  if (/privacy|terms|subscribe|newsletter|login|signin|account|advertise|contact|about-us|category|tag\//.test(text)) return false;
  return /\/20\d{2}\/|\/news\/|\/article\/|\/press|\/blog\/|\/brands\/|\/amazon-news|netflix\.com\/newsroom|streamtvinsider\.com/.test(text);
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
  const sourcePanel = inferSourcePanel(source);
  if (isGenericHomepageSnapshot(item, source)) return null;
  if (sourcePanel === "政策风险" && !isOfficialPolicySource(source) && !source.collectionProfile) return null;
  if (source.collectionProfile && !profileMatchesItem(item, source)) return null;
  if (source.collectionProfile && !isFreshProfileItem(item)) return null;

  const relevance = scoreVpnRelevance(text, source, keywords, sourcePanel);
  if (relevance.score < relevance.minScore) return null;

  const themeId = inferThemeId(text, source.category);
  const role = relevance.score >= relevance.coreScore ? "核心证据" : "参考信息";
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
    sourcePanel,
    vpnRelevance: relevance.label,
    displayPriority: relevance.priority,
    collectionProfile: source.collectionProfile,
    collectionProfileName: source.collectionProfileName,
    collectionKeyword: source.collectionKeyword,
    collectionRule: source.collectionRule,
    hotspotType: source.hotspotType,
    source: source.name,
    summary: buildChineseSummary(rawTitle, rawSummary, source, themeId, role),
    time,
    url: item.link || source.url,
  };
}

function explainRejectedItem(item, source, keywords) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const sourcePanel = inferSourcePanel(source);
  if (isGenericHomepageSnapshot(item, source)) return "静态主页或社媒账号首页，不代表最新动态";
  if (sourcePanel === "政策风险" && !isOfficialPolicySource(source) && !source.collectionProfile) return "政策风险只保留官方或专题任务来源";
  if (source.collectionProfile && !profileMatchesItem(item, source)) return "不符合专题纳入关键词或命中排除词";
  if (source.collectionProfile && !isFreshProfileItem(item)) return "发布时间超出专题时效窗口";

  const relevance = scoreVpnRelevance(text, source, keywords, sourcePanel);
  if (relevance.score < relevance.minScore) return `相关性分 ${relevance.score} 低于入库阈值 ${relevance.minScore}`;
  return "重复信息或缺少可用标题";
}

function profileMatchesItem(item, source) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if ((source.excludeKeywords ?? []).some((keyword) => text.includes(String(keyword).toLowerCase()))) return false;
  if ((source.includeKeywords ?? []).length === 0) return true;
  return source.includeKeywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
}

function isFreshProfileItem(item) {
  if (!item.publishedAt) return true;
  const published = new Date(item.publishedAt);
  if (Number.isNaN(published.getTime())) return true;
  const ageMs = now.getTime() - published.getTime();
  return ageMs >= 0 && ageMs <= 36 * 60 * 60 * 1000;
}

function scoreVpnRelevance(text, source, keywords, panel) {
  const score =
    countMatches(text, keywords.vpn) * 2 +
    countMatches(text, keywords.competitors) * 2 +
    countMatches(text, keywords.demand) +
    countMatches(text, keywords.platforms) +
    sourceBonus(source, panel);
  const restrictionScore = countMatches(text, ["blocked", "restriction", "geo", "region", "unblock", "access", "payment", "age verification", "blackout", "not available", "地区", "限制", "跨区"]);
  const discussionScore = countMatches(text, ["reddit", "forum", "community", "thread", "discussion", "用户", "讨论"]);
  const profileKeywordScore = source.collectionProfile ? countMatches(text, source.includeKeywords ?? []) + countMatches(text, source.searchKeywords ?? []) : 0;

  if (source.collectionProfile && panel === "增长热点") {
    const growthScore = profileKeywordScore + countMatches(text, keywords.platforms) + restrictionScore * 2 + sourceBonus(source, panel);
    return {
      score: growthScore,
      minScore: 2,
      coreScore: 6,
      label: growthScore >= 6 ? "VPN 强相关" : "热点候选待验证",
      priority: growthScore >= 6 ? "P1" : "P2",
    };
  }

  if (source.collectionProfile && panel === "政策风险") {
    const policyScore = profileKeywordScore + countMatches(text, ["law", "regulation", "policy", "privacy", "security", "vpn", "age verification", "compliance", "ban", "restriction"]) * 2 + sourceBonus(source, panel);
    return {
      score: policyScore,
      minScore: 2,
      coreScore: 6,
      label: policyScore >= 6 ? "官方高相关" : "政策候选待验证",
      priority: policyScore >= 6 ? "P1" : "P2",
    };
  }

  if (panel === "增长热点") {
    const growthScore = score + restrictionScore * 2;
    return {
      score: growthScore,
      minScore: 4,
      coreScore: 7,
      label: growthScore >= 7 ? "VPN 强相关" : "待验证相关",
      priority: growthScore >= 7 ? "P1" : "P2",
    };
  }

  if (panel === "用户声音") {
    const userScore = score + discussionScore + restrictionScore;
    return {
      score: userScore,
      minScore: 3,
      coreScore: 6,
      label: userScore >= 6 ? "需求明确" : "需求待确认",
      priority: userScore >= 6 ? "P1" : "P2",
    };
  }

  if (panel === "政策风险") {
    const policyScore = score + countMatches(text, ["law", "regulation", "policy", "privacy", "security", "vpn", "age verification", "compliance"]) * 2;
    return {
      score: policyScore,
      minScore: 4,
      coreScore: 7,
      label: policyScore >= 7 ? "官方高相关" : "官方待观察",
      priority: policyScore >= 7 ? "P1" : "P2",
    };
  }

  return {
    score,
    minScore: 2,
    coreScore: 5,
    label: score >= 5 ? "竞品强相关" : "竞品待确认",
    priority: score >= 5 ? "P1" : "P2",
  };
}

function sourceBonus(source, panel) {
  if (panel === "竞品情报" && isOfficialCompetitorSource(source)) return 2;
  if (panel === "政策风险" && isOfficialPolicySource(source)) return 2;
  if (source.isCore) return 1;
  return 0;
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

function shouldKeepEvidenceItem(item) {
  if (!String(item.id || "").startsWith("auto-")) return true;
  return !isLowValueEvidenceSnapshot(item);
}

function isLowValueEvidenceSnapshot(item) {
  const sourceText = `${item.sourceType} ${item.source} ${item.url || ""}`.toLowerCase();
  const title = `${item.originalTitle || item.title || ""}`.toLowerCase();
  if (!/instagram|tiktok|linkedin|x\.com|twitter|facebook|youtube|官网|official|pricing/.test(sourceText)) return false;
  if (/news|blog|press|release|article|announc|update|launch|report|study|deal|price increase/.test(title)) return false;
  return /instagram|tiktok|linkedin|job search|creative center|\/ x$|youtube|facebook|best vpn service|pricing|official site|home|login|sign up/.test(title);
}

function isGenericHomepageSnapshot(item, source) {
  if (source.collectionProfile || source.mode === "rss" || source.mode === "html-deep") return false;
  const link = normalizeComparableUrl(item.link || source.url);
  const sourceUrl = normalizeComparableUrl(source.url);
  const sourceText = `${source.category} ${source.name} ${source.secondaryCategory} ${source.crawlMethod} ${source.url}`.toLowerCase();
  if (source.crawlMethod === "Social" && link === sourceUrl) return true;
  if (normalizeSourceCategory(source.category) === "竞品情报" && source.mode === "html" && link === sourceUrl && !shouldDeepScanHtmlSource(source)) return true;
  return /instagram|tiktok|linkedin|x\.com|twitter|facebook|youtube/.test(sourceText) && link === sourceUrl;
}

function normalizeComparableUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return String(url || "").replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}
