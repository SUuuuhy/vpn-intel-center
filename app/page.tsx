"use client";

import intelligenceData from "@/data/intelligence.json";
import collectionProfilesData from "@/data/collection-profiles.json";
import sourceRulesData from "@/data/source-rules.json";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type Priority = "高" | "中" | "低";
type Trend = "新出现" | "升温" | "稳定" | "降温" | "样本不足";
type PanelView = "竞品情报" | "用户声音" | "增长热点" | "政策风险" | "历史信息库" | "潜在机会" | "信息源管理";
type HotspotView = "影视" | "体育" | "游戏";

type SourceRule = {
  id: string;
  name: string;
  category: string;
  secondaryCategory: string;
  granularity: string;
  market: string;
  competitor: string;
  scene: string;
  isCore: boolean;
  crawlMethod: string;
  url: string;
  mode: string;
  frequency: string;
};

type SourceRuleInput = Partial<Omit<SourceRule, "isCore">> & {
  isCore?: boolean | string | number;
};

type SourceRulesData = {
  timezone: string;
  marketFocus: string[];
  keywords: Record<string, string[]>;
  sources: SourceRule[];
};

type BriefingItem = {
  id: string;
  period: "daily" | "weekly";
  type: "需求信号" | "竞品动作" | "外部变化" | "待处理";
  title: string;
  originalTitle?: string;
  summary: string;
  priority: Priority;
  trend: Trend;
  evidence: number;
  source: string;
  time: string;
  url?: string;
};

type Theme = {
  id: string;
  type: "需求型" | "动作型";
  title: string;
  summary: string;
  market: string;
  platform: string;
  competitor: string;
  trend: Trend;
  priority: Priority;
  currentEvidence: number;
  previousEvidence: number;
  coreEvidence: number;
  referenceInfo: number;
  linkedThemes: number;
  updatedAt: string;
};

type Evidence = {
  id: string;
  role: "核心证据" | "参考信息";
  themeId: string;
  title: string;
  originalTitle?: string;
  sourceType: string;
  source: string;
  summary: string;
  time: string;
  url?: string;
  userMarket?: string;
  targetMarket?: string;
  platformObject?: string;
  rawNeed?: string;
  discussionHeat?: string;
  displayPriority?: string;
  sourcePanel?: string;
  vpnRelevance?: string;
  collectionProfile?: string;
  collectionProfileName?: string;
  collectionKeyword?: string;
  collectionRule?: string;
  hotspotType?: string;
};

type Opportunity = {
  id: string;
  themeId: string;
  title: string;
  type: string;
  feasibility: string;
  status: string;
  actions: string[];
  cycle: string;
  nextStep: string;
  owner: string;
};

type SourceStat = {
  name: string;
  total: number;
  active: number;
  freq: string;
  color: string;
};

type IntelligenceData = {
  generatedAt: string;
  displayDate: string;
  status: {
    newItemsToday: number;
    highPriorityToday: number;
    pendingReview: number;
    normalSourceRate: number;
    sourcesWaitingReview: number;
    manualCorrections: number;
  };
  sourceStats: SourceStat[];
  briefingItems: BriefingItem[];
  themes: Theme[];
  evidence: Evidence[];
  opportunities: Opportunity[];
};

type CollectionProfile = {
  id: string;
  name: string;
  panel: string;
  sourceType: string;
  hotspotType: string;
  frequency: string;
  requiredUrls: string[];
  searchKeywords: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  summaryRule: string;
};

type CollectionProfilesData = {
  profiles: CollectionProfile[];
};

type OpportunityEdit = {
  rating: Priority;
  status: string;
  note: string;
};

const intelligence = intelligenceData as IntelligenceData;
const sourceRules = sourceRulesData as SourceRulesData;
const collectionProfiles = (collectionProfilesData as CollectionProfilesData).profiles;

const panelViews: PanelView[] = ["竞品情报", "用户声音", "增长热点", "政策风险", "历史信息库", "潜在机会", "信息源管理"];
const hotspotViews: HotspotView[] = ["影视", "体育", "游戏"];
const competitorNames = ["NordVPN", "ExpressVPN", "Surfshark", "Proton VPN", "CyberGhost", "PIA VPN"];
const sourceCategories = ["竞品情报", "用户声音", "SEO搜索", "第三方媒体", "政策监管", "需求触发市场"];
const sourceFrequencies = ["daily", "weekly", "event", "manual", "paused"];
const sourceCrawlMethods = ["RSS", "HTML", "API", "SERP", "Social", "Manual"];
const categoryColors: Record<string, string> = {
  "竞品情报": "bg-teal-500",
  "用户声音": "bg-indigo-500",
  "SEO搜索": "bg-cyan-500",
  "第三方媒体": "bg-amber-500",
  "政策监管": "bg-rose-500",
  "需求触发市场": "bg-emerald-500",
};
const frequencyLabels: Record<string, string> = {
  daily: "每日",
  weekly: "每周",
  event: "事件触发",
  manual: "手动维护",
  paused: "暂停",
};
const crawlMethodLabels: Record<string, string> = {
  RSS: "RSS",
  HTML: "页面抓取",
  API: "API",
  SERP: "搜索结果",
  Social: "社媒抓取",
  Manual: "手动录入",
};
const priorityStyles: Record<Priority, string> = {
  "高": "border-rose-200 bg-rose-50 text-rose-700",
  "中": "border-amber-200 bg-amber-50 text-amber-800",
  "低": "border-zinc-200 bg-zinc-50 text-zinc-600",
};
const trendStyles: Record<string, string> = {
  "新出现": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "升温": "border-rose-200 bg-rose-50 text-rose-700",
  "稳定": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "降温": "border-zinc-200 bg-zinc-50 text-zinc-600",
  "样本不足": "border-amber-200 bg-amber-50 text-amber-800",
};

function sourceCategoryLabel(category: string) {
  if (category === "用户声音（UGC）") return "用户声音";
  if (category === "SEO 搜索结果") return "SEO搜索";
  if (category === "政策与监管") return "政策监管";
  if (category === "相关市场" || category === "平台服务生态" || category === "相关平台") return "需求触发市场";
  return category;
}

function sourceFrequencyLabel(value: string) {
  return frequencyLabels[value] ?? value;
}

function sourceCrawlMethodLabel(value: string) {
  return crawlMethodLabels[value] ?? value;
}

function createEmptySourceRule(): SourceRule {
  return {
    id: "",
    name: "",
    category: "竞品情报",
    secondaryCategory: "",
    granularity: "站点级",
    market: "Global",
    competitor: "",
    scene: "",
    isCore: true,
    crawlMethod: "HTML",
    url: "",
    mode: "html",
    frequency: "daily",
  };
}

function createSourceId(name: string, url = "") {
  const base = `${name || url}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return base || `source-${Date.now()}`;
}

function normalizeSourceRule(input: SourceRuleInput): SourceRule {
  const name = String(input.name ?? "").trim();
  const url = String(input.url ?? "").trim();
  const isCoreValue = input.isCore;
  const crawlMethod = String(input.crawlMethod ?? "HTML").trim();

  return {
    ...createEmptySourceRule(),
    ...input,
    id: String(input.id ?? "").trim() || createSourceId(name, url),
    name,
    category: sourceCategoryLabel(String(input.category ?? "竞品情报").trim()),
    secondaryCategory: String(input.secondaryCategory ?? "").trim(),
    granularity: String(input.granularity ?? "站点级").trim(),
    market: String(input.market ?? "Global").trim(),
    competitor: String(input.competitor ?? "").trim(),
    scene: String(input.scene ?? "").trim(),
    isCore:
      isCoreValue === undefined ||
      isCoreValue === "" ||
      isCoreValue === true ||
      String(isCoreValue).toLowerCase() === "true" ||
      String(isCoreValue) === "1",
    crawlMethod,
    url,
    mode: String(input.mode ?? "").trim() || crawlMethod.toLowerCase(),
    frequency: String(input.frequency ?? "daily").trim(),
  };
}

function mergeManagedSources(baseSources: SourceRule[], storedSources: SourceRuleInput[]) {
  const byId = new Map(baseSources.map((source) => [source.id, normalizeSourceRule(source)]));
  storedSources.forEach((source) => {
    const normalized = normalizeSourceRule(source);
    if (normalized.name && normalized.url) byId.set(normalized.id, normalized);
  });
  return Array.from(byId.values());
}

function buildSourceStats(sources: SourceRule[]): SourceStat[] {
  return sourceCategories.map((category) => {
    const matched = sources.filter((source) => sourceCategoryLabel(source.category) === category);
    return {
      name: category,
      total: matched.length,
      active: matched.filter((source) => source.frequency !== "manual" && source.frequency !== "paused").length,
      freq:
        category === "竞品情报"
          ? "每日"
          : category === "用户声音"
            ? "每日"
            : category === "政策监管"
              ? "官方优先"
              : category === "需求触发市场"
                ? "按对象加频"
                : "每周",
      color: categoryColors[category],
    };
  });
}

function shouldCrawlToday(source: SourceRule) {
  if (source.frequency === "paused" || source.frequency === "manual") return false;
  if (source.frequency === "weekly") {
    return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", weekday: "short" }).format(new Date()) === "Mon";
  }
  return true;
}

function inferSourcePanel(source: SourceRule): PanelView {
  const category = sourceCategoryLabel(source.category);
  const text = `${source.name} ${source.secondaryCategory} ${source.scene} ${source.url}`.toLowerCase();
  if (category === "政策监管") return "政策风险";
  if (category === "用户声音") return "用户声音";
  if (category === "需求触发市场" || /steamdb|game|gaming|f1|world cup|netflix|bbc|hulu|disney|espn|stream/.test(text)) return "增长热点";
  if (category === "竞品情报" || category === "第三方媒体") return "竞品情报";
  return "历史信息库";
}

function isCompetitorEvidence(item: Evidence) {
  const text = `${item.title} ${item.summary} ${item.originalTitle ?? ""}`.toLowerCase();
  return item.sourceType === "竞品情报" || (item.sourceType === "第三方媒体" && competitorNames.some((name) => text.includes(name.toLowerCase())));
}

function isUserVoiceEvidence(item: Evidence) {
  const text = `${item.source} ${item.title} ${item.summary}`.toLowerCase();
  return item.sourceType === "用户声音" || /reddit|forum|community|quora|discord|用户/.test(text);
}

function isPolicyEvidence(item: Evidence) {
  return item.sourceType === "政策监管";
}

function isGrowthEvidence(item: Evidence) {
  const text = `${item.title} ${item.summary} ${item.originalTitle ?? ""} ${item.platformObject ?? ""}`.toLowerCase();
  return item.sourceType === "需求触发市场" || Boolean(item.hotspotType) || /netflix|bbc|iplayer|hulu|disney|espn|world cup|f1|steam|game|stream|sports/.test(text);
}

function sortByTime<T extends { time?: string; updatedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => String(b.time ?? b.updatedAt ?? "").localeCompare(String(a.time ?? a.updatedAt ?? "")));
}

function uniquePolicyItems(items: Evidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title
      .replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, " ")
      .toLowerCase()
      .split(" ")
      .slice(0, 10)
      .join(" ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceDomain(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceQuality(item: Evidence) {
  const domain = sourceDomain(item.url);
  if (/\.gov|europa\.eu|ofcom|ftc|ico\.org|cnil|edpb/.test(domain)) return "官方";
  if (/reddit|forum|community|quora|discord/.test(`${domain} ${item.source}`.toLowerCase())) return "用户讨论";
  if (/news\.google|google\.com\/search/.test(item.url ?? "")) return "聚合链接";
  return "原始链接";
}

function extractNeedText(item: Evidence) {
  if (item.rawNeed) return item.rawNeed;
  const text = item.summary.replace(/^该信息来自.+?，/, "");
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function createGrowthHotspots(evidence: Evidence[], themes: Theme[], sources: SourceRule[]) {
  const movieSignals = [
    ...themes.filter((theme) => /bbc|iplayer|netflix|hulu|disney|流媒体|影视/i.test(`${theme.title} ${theme.platform}`)),
    ...evidence.filter((item) => item.hotspotType === "影视" || /netflix|bbc|iplayer|hulu|disney|stream|影视|流媒体/i.test(`${item.title} ${item.summary}`)).slice(0, 3).map(themeFromEvidence),
  ].slice(0, 5);
  const sportsSignals = [
    ...themes.filter((theme) => /world cup|f1|espn|体育|赛事/i.test(`${theme.title} ${theme.platform}`)),
    ...evidence.filter((item) => /world cup|f1|espn|match|sports|体育|赛事/i.test(`${item.title} ${item.summary}`)).slice(0, 4).map(themeFromEvidence),
  ].slice(0, 5);
  const gameSources = sources.filter((source) => /steamdb|steam|game|gaming|电竞|游戏/i.test(`${source.name} ${source.secondaryCategory} ${source.url}`)).slice(0, 6);
  const gameSignals = gameSources.map((source, index) => ({
    id: source.id,
    title: index === 0 && /steamdb/i.test(source.name) ? "SteamDB 全球热度排行" : source.name,
    summary: `跟踪 ${source.name} 的热度、平台限制和玩家讨论，结合论坛信号判断是否存在加速、跨区访问或平台限制需求。`,
    market: source.market || "Global",
    platform: source.name,
    priority: source.isCore ? "高" : "中",
    trend: source.frequency === "daily" ? "升温" : "稳定",
    currentEvidence: 0,
    coreEvidence: 0,
  })) as Theme[];

  return {
    "影视": movieSignals,
    "体育": sportsSignals,
    "游戏": gameSignals,
  };
}

function themeFromEvidence(item: Evidence): Theme {
  return {
    id: item.id,
    type: "需求型",
    title: item.title,
    summary: item.summary,
    market: item.userMarket ?? "Global",
    platform: item.platformObject ?? item.source,
    competitor: "多信源",
    trend: "新出现",
    priority: item.role === "核心证据" ? "高" : "中",
    currentEvidence: item.role === "核心证据" ? 1 : 0,
    previousEvidence: 0,
    coreEvidence: item.role === "核心证据" ? 1 : 0,
    referenceInfo: item.role === "参考信息" ? 1 : 0,
    linkedThemes: 0,
    updatedAt: item.time,
  };
}

function buildOpportunityFromTheme(theme: Theme): Opportunity {
  return {
    id: `theme-${theme.id}`,
    themeId: theme.id,
    title: theme.title,
    type: theme.priority === "高" ? "短期机会" : "观察机会",
    feasibility: theme.coreEvidence >= 3 ? "可验证" : "待验证",
    status: theme.coreEvidence >= 3 ? "验证中" : "继续观察",
    actions: theme.type === "需求型" ? ["内容选题", "SEO页面", "产品能力验证"] : ["竞品跟进", "落地页优化"],
    cycle: "先观察 7 天信号变化，再决定是否进入执行排期",
    nextStep: "补齐来源链接、确认用户限制原因和 VPN 相关性",
    owner: "增长运营",
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${className}`}>{children}</span>;
}

function SectionHeader({ eyebrow, title, summary, right }: { eyebrow?: string; title: string; summary?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">{title}</h2>
        {summary && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{summary}</p>}
      </div>
      {right}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold text-zinc-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function SourceDisclosure({ item }: { item: Evidence | BriefingItem }) {
  if (!item.url) return null;
  return (
    <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-teal-700">来源链接</summary>
      <a className="mt-2 block break-all text-xs leading-5 text-zinc-600 hover:text-zinc-950" href={item.url} target="_blank" rel="noreferrer">
        {item.url}
      </a>
    </details>
  );
}

function EvidenceCard({ item, compact = false }: { item: Evidence; compact?: boolean }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <Badge className={item.role === "核心证据" ? "border-teal-200 bg-teal-50 text-teal-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}>
          {item.role}
        </Badge>
        <Badge className="border-zinc-200 bg-white text-zinc-600">{sourceQuality(item)}</Badge>
        {item.vpnRelevance && <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">{item.vpnRelevance}</Badge>}
        {item.collectionProfileName && <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">{item.collectionProfileName}</Badge>}
        {item.collectionKeyword && <Badge className="border-zinc-200 bg-white text-zinc-600">关键词: {item.collectionKeyword}</Badge>}
      </div>
      <h3 className={`${compact ? "text-base" : "text-lg"} mt-3 break-words font-semibold text-zinc-950`}>{item.title}</h3>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{compact ? extractNeedText(item) : item.summary}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span>{item.source}</span>
        <span>{item.time}</span>
      </div>
      {item.collectionRule && <p className="mt-2 text-xs leading-5 text-zinc-500">收录口径：{item.collectionRule}</p>}
      <SourceDisclosure item={item} />
    </article>
  );
}

function ProfileMethodPanel({ profiles }: { profiles: CollectionProfile[] }) {
  if (profiles.length === 0) return null;
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <h3 className="font-semibold">专题采集方法</h3>
      <div className="mt-4 grid gap-4">
        {profiles.map((profile) => (
          <article key={profile.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-teal-200 bg-teal-50 text-teal-700">{profile.name}</Badge>
              <Badge className="border-zinc-200 bg-white text-zinc-600">{sourceFrequencyLabel(profile.frequency)}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{profile.summaryRule}</p>
            <div className="mt-3 grid gap-2 text-xs text-zinc-500">
              <p>必检索链接：{profile.requiredUrls.length || "无，使用关键词搜索"}</p>
              <p>逐一搜索关键词：{profile.searchKeywords.length}</p>
              <p className="break-words">关键词样例：{profile.searchKeywords.slice(0, 6).join(" / ")}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<PanelView>("竞品情报");
  const [hotspotView, setHotspotView] = useState<HotspotView>("影视");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyCategory, setHistoryCategory] = useState("全部");
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceForm, setSourceForm] = useState<SourceRule>(createEmptySourceRule());
  const [sourceNotice, setSourceNotice] = useState("");
  const [managedSources, setManagedSources] = useState<SourceRule[]>(sourceRules.sources);
  const [sourceCatalogReady, setSourceCatalogReady] = useState(false);
  const [opportunityEdits, setOpportunityEdits] = useState<Record<string, OpportunityEdit>>({});
  const [opportunityReady, setOpportunityReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setSourceCatalogReady(true);
      setOpportunityReady(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem("vpn-intel-managed-sources");
      if (stored) setManagedSources(mergeManagedSources(sourceRules.sources, JSON.parse(stored) as SourceRuleInput[]));
    } catch {
      setManagedSources(sourceRules.sources);
    }

    try {
      const stored = window.localStorage.getItem("vpn-intel-opportunity-edits");
      if (stored) setOpportunityEdits(JSON.parse(stored) as Record<string, OpportunityEdit>);
    } catch {
      setOpportunityEdits({});
    }

    setSourceCatalogReady(true);
    setOpportunityReady(true);
  }, []);

  useEffect(() => {
    if (!sourceCatalogReady || typeof window === "undefined") return;
    window.localStorage.setItem("vpn-intel-managed-sources", JSON.stringify(managedSources));
  }, [managedSources, sourceCatalogReady]);

  useEffect(() => {
    if (!opportunityReady || typeof window === "undefined") return;
    window.localStorage.setItem("vpn-intel-opportunity-edits", JSON.stringify(opportunityEdits));
  }, [opportunityEdits, opportunityReady]);

  const sourceStats = useMemo(() => buildSourceStats(managedSources), [managedSources]);
  const growthProfiles = collectionProfiles.filter((profile) => profile.panel === "增长热点");
  const policyProfiles = collectionProfiles.filter((profile) => profile.panel === "政策风险");
  const profileTaskCount = collectionProfiles.reduce((sum, profile) => sum + profile.requiredUrls.length + profile.searchKeywords.length, 0);
  const todayScheduledSources = managedSources.filter(shouldCrawlToday).length + profileTaskCount;
  const activeSourceCount = managedSources.filter((source) => source.frequency !== "manual" && source.frequency !== "paused").length;
  const competitorItems = sortByTime(intelligence.evidence.filter(isCompetitorEvidence)).slice(0, 10);
  const userVoiceItems = sortByTime(intelligence.evidence.filter(isUserVoiceEvidence)).slice(0, 10);
  const growthItems = sortByTime(intelligence.evidence.filter(isGrowthEvidence)).slice(0, 10);
  const policyItems = uniquePolicyItems(sortByTime(intelligence.evidence.filter(isPolicyEvidence))).slice(0, 8);
  const hotspots = createGrowthHotspots(growthItems, intelligence.themes, managedSources);
  const l2Themes = intelligence.themes.filter((theme) => theme.coreEvidence >= 3 || theme.priority === "高");
  const opportunityItems = [
    ...intelligence.opportunities,
    ...l2Themes
      .filter((theme) => !intelligence.opportunities.some((opportunity) => opportunity.themeId === theme.id))
      .map(buildOpportunityFromTheme),
  ];
  const historyItems = sortByTime(intelligence.evidence).filter((item) => {
    const query = historyQuery.trim().toLowerCase();
    const text = `${item.title} ${item.summary} ${item.source} ${item.originalTitle ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesCategory = historyCategory === "全部" || sourceCategoryLabel(item.sourceType) === historyCategory;
    return matchesQuery && matchesCategory;
  });
  const filteredSources = managedSources.filter((source) => {
    const query = sourceQuery.trim().toLowerCase();
    const text = `${source.name} ${source.url} ${source.category} ${source.secondaryCategory} ${source.market} ${source.competitor} ${source.scene}`.toLowerCase();
    return !query || text.includes(query);
  });
  const officialCompetitorSources = managedSources.filter((source) => {
    const text = `${source.category} ${source.secondaryCategory} ${source.name}`.toLowerCase();
    return sourceCategoryLabel(source.category) === "竞品情报" && /官方|官网|社交|博客|公告|服务器|价格/.test(text);
  }).length;
  const userForumSources = managedSources.filter((source) => {
    const text = `${source.category} ${source.secondaryCategory} ${source.url}`.toLowerCase();
    return sourceCategoryLabel(source.category) === "用户声音" || /reddit|forum|community|quora|discord/.test(text);
  }).length;
  const officialPolicySources = managedSources.filter((source) => {
    const domain = sourceDomain(source.url);
    return sourceCategoryLabel(source.category) === "政策监管" && (/\.gov|europa\.eu|ofcom|ftc|ico\.org|cnil|edpb/.test(domain) || /政府|监管|官方|标准/.test(source.secondaryCategory));
  }).length;

  function updateSourceForm<K extends keyof SourceRule>(key: K, value: SourceRule[K]) {
    setSourceForm((current) => ({ ...current, [key]: value }));
  }

  function saveSource() {
    const normalized = normalizeSourceRule(sourceForm);
    if (!normalized.name || !normalized.url) {
      setSourceNotice("请填写信源名称和链接。");
      return;
    }
    setManagedSources((current) => {
      const byId = new Map(current.map((source) => [source.id, source]));
      byId.set(normalized.id, normalized);
      return Array.from(byId.values());
    });
    setSourceForm(createEmptySourceRule());
    setSourceNotice(`已添加或更新：${normalized.name}`);
  }

  function editSource(source: SourceRule) {
    setSourceForm(normalizeSourceRule(source));
    setSourceNotice(`正在编辑：${source.name}`);
  }

  function resetSources() {
    setManagedSources(sourceRules.sources);
    setSourceNotice("已恢复为仓库内的正式信源。");
  }

  function exportSources() {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify({ ...sourceRules, sources: managedSources }, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vpn-source-rules.json";
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function updateOpportunity(id: string, patch: Partial<OpportunityEdit>, fallback: Opportunity) {
    const defaultEdit: OpportunityEdit = {
      rating: fallback.type === "短期机会" ? "高" : "中",
      status: fallback.status,
      note: fallback.nextStep,
    };
    setOpportunityEdits((current) => ({
      ...current,
      [id]: {
        ...defaultEdit,
        ...(current[id] ?? {}),
        ...patch,
      },
    }));
  }

  return (
    <main className="min-h-screen bg-[#f5f6f3] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-teal-700">VPN 市场增长信息中心</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">运营情报工作台</h1>
            <p className="mt-2 text-sm text-zinc-500">更新：{intelligence.displayDate} · 北京时间 {formatDateTime(intelligence.generatedAt)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="今日新增" value={intelligence.status.newItemsToday} />
            <Metric label="高优先级" value={intelligence.status.highPriorityToday} />
            <Metric label="正式信源" value={managedSources.length} />
            <Metric label="今日排期" value={todayScheduledSources} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-5 lg:h-fit">
          <nav className="grid gap-2 rounded-md border border-zinc-200 bg-white p-2">
            {panelViews.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`h-11 rounded px-3 text-left text-sm font-semibold transition ${
                  activeView === view ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                {view}
              </button>
            ))}
          </nav>
          <section className="mt-4 rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold">信源状态</p>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>启用信源</span>
                  <span>{activeSourceCount}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.min(100, (activeSourceCount / Math.max(1, managedSources.length)) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>抓取正常</span>
                  <span>{intelligence.status.normalSourceRate}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${intelligence.status.normalSourceRate}%` }} />
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {activeView === "竞品情报" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="Competitor"
                  title="竞品情报"
                  summary="聚合竞品官方账号、官网发布和第三方媒体中明确提到竞品的内容，优先提炼产品动作、价格活动、节点覆盖、内容营销和合作投放。"
                  right={<Badge className="border-teal-200 bg-teal-50 text-teal-700">官方信源 {officialCompetitorSources}</Badge>}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="最新动态" value={competitorItems.length} hint="来自已抓取信息" />
                  <Metric label="官方/自有信源" value={officialCompetitorSources} />
                  <Metric label="第三方竞品内容" value={managedSources.filter((source) => sourceCategoryLabel(source.category) === "第三方媒体").length} />
                  <Metric label="今日排期" value={managedSources.filter((source) => inferSourcePanel(source) === "竞品情报" && shouldCrawlToday(source)).length} />
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
                <div className="grid gap-3">
                  {competitorItems.map((item) => <EvidenceCard key={item.id} item={item} />)}
                </div>
                <div className="grid gap-4">
                  <section className="rounded-md border border-zinc-200 bg-white p-4">
                    <h3 className="font-semibold">重点竞品</h3>
                    <div className="mt-4 grid gap-3">
                      {competitorNames.map((name) => {
                        const count = competitorItems.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(name.toLowerCase())).length;
                        return (
                          <div key={name} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                            <span className="text-sm font-semibold">{name}</span>
                            <Badge className={count > 0 ? "border-teal-200 bg-teal-50 text-teal-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}>{count} 条</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="rounded-md border border-zinc-200 bg-white p-4">
                    <h3 className="font-semibold">今日判断口径</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      只把明确来自官方渠道，或第三方媒体中直接描述竞品动作的信息放到这里。泛行业报道会进入历史库，不在竞品情报里放大。
                    </p>
                  </section>
                </div>
              </section>
            </div>
          )}

          {activeView === "用户声音" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="User Voice"
                  title="用户声音"
                  summary="汇总 Reddit、论坛、问答社区、评论区等公开讨论，关注用户想访问什么、遇到什么限制，以及是否自然产生 VPN 使用动机。"
                  right={<Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">论坛/社区信源 {userForumSources}</Badge>}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Metric label="用户讨论" value={userVoiceItems.length} />
                  <Metric label="高热主题" value={intelligence.themes.filter((theme) => theme.type === "需求型" && theme.priority === "高").length} />
                  <Metric label="今日排期" value={managedSources.filter((source) => inferSourcePanel(source) === "用户声音" && shouldCrawlToday(source)).length} />
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                {userVoiceItems.map((item) => <EvidenceCard key={item.id} item={item} compact />)}
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h3 className="font-semibold">正在升温的讨论主题</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {intelligence.themes.filter((theme) => theme.type === "需求型").map((theme) => (
                    <article key={theme.id} className="rounded-md border border-zinc-200 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={priorityStyles[theme.priority]}>{theme.priority}</Badge>
                        <Badge className={trendStyles[theme.trend] ?? trendStyles["稳定"]}>{theme.trend}</Badge>
                      </div>
                      <h4 className="mt-3 text-sm font-semibold">{theme.title}</h4>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">{theme.summary}</p>
                      <p className="mt-3 text-xs font-semibold text-teal-700">核心证据 {theme.coreEvidence} · 用户市场 {theme.market}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeView === "增长热点" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="Growth Hotspots"
                  title="增长热点"
                  summary="按影视、体育、游戏三个高频内容场景观察全球热度、播放平台、地区限制和用户讨论，再判断是否满足 VPN 相关标准。"
                  right={
                    <div className="grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
                      {hotspotViews.map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => setHotspotView(view)}
                          className={`h-9 rounded px-4 text-sm font-semibold ${hotspotView === view ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                  }
                />
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="影视信源" value={managedSources.filter((source) => /影视|流媒体|netflix|bbc|hulu|disney/i.test(`${source.name} ${source.secondaryCategory} ${source.url}`)).length} />
                  <Metric label="体育信源" value={managedSources.filter((source) => /体育|赛事|f1|world cup|espn/i.test(`${source.name} ${source.secondaryCategory} ${source.url}`)).length} />
                  <Metric label="游戏信源" value={managedSources.filter((source) => /游戏|电竞|steamdb|steam|gaming/i.test(`${source.name} ${source.secondaryCategory} ${source.url}`)).length} />
                  <Metric label="专题任务" value={growthProfiles.reduce((sum, profile) => sum + profile.requiredUrls.length + profile.searchKeywords.length, 0)} />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {hotspots[hotspotView].map((theme) => (
                  <article key={theme.id} className="rounded-md border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={priorityStyles[theme.priority]}>{theme.priority}</Badge>
                      <Badge className={trendStyles[theme.trend] ?? trendStyles["稳定"]}>{theme.trend}</Badge>
                      <Badge className="border-zinc-200 bg-white text-zinc-600">{theme.market}</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold">{theme.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{theme.summary}</p>
                    <div className="mt-4 grid gap-1 text-xs text-zinc-500">
                      <span>平台/对象：{theme.platform || "待识别"}</span>
                      <span>核心证据：{theme.coreEvidence}</span>
                      <span>VPN 标准：有地区、版权、平台或网络限制时进入机会观察</span>
                    </div>
                  </article>
                ))}
              </section>

              <ProfileMethodPanel profiles={growthProfiles} />
            </div>
          )}

          {activeView === "政策风险" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="Policy Risk"
                  title="政策风险"
                  summary="只保留与 VPN 技术、隐私、年龄验证、平台访问限制直接相关的政策信息。重复报道会被合并，优先采用政府、监管机构或官方组织来源。"
                  right={<Badge className="border-rose-200 bg-rose-50 text-rose-700">官方政策信源 {officialPolicySources}</Badge>}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="去重后风险" value={policyItems.length} />
                  <Metric label="官方来源" value={officialPolicySources} />
                  <Metric label="今日排期" value={managedSources.filter((source) => inferSourcePanel(source) === "政策风险" && shouldCrawlToday(source)).length} />
                  <Metric label="专题任务" value={policyProfiles.reduce((sum, profile) => sum + profile.requiredUrls.length + profile.searchKeywords.length, 0)} />
                </div>
              </section>

              <section className="grid gap-3">
                {policyItems.map((item) => <EvidenceCard key={item.id} item={item} />)}
                {policyItems.length === 0 && <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500">暂无新的政策风险。</div>}
              </section>

              <ProfileMethodPanel profiles={policyProfiles} />
            </div>
          )}

          {activeView === "历史信息库" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="History"
                  title="历史信息库"
                  summary="查询每天抓取到的信息，适合回溯来源、主题和判断依据。"
                  right={<Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">当前保留 {intelligence.evidence.length} 条</Badge>}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    value={historyQuery}
                    onChange={(event) => setHistoryQuery(event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                    placeholder="搜索标题、摘要、来源"
                  />
                  <select
                    value={historyCategory}
                    onChange={(event) => setHistoryCategory(event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                  >
                    {["全部", ...sourceCategories].map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="grid gap-3">
                {historyItems.map((item) => <EvidenceCard key={item.id} item={item} compact />)}
                {historyItems.length === 0 && <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500">没有匹配的信息。</div>}
              </section>
            </div>
          )}

          {activeView === "潜在机会" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="Opportunity"
                  title="潜在机会"
                  summary="只收敛多信源认证后的聚合信息。这里保留简单的人工评级和行动备注，不再暴露复杂字段。"
                  right={<Badge className="border-teal-200 bg-teal-50 text-teal-700">候选机会 {opportunityItems.length}</Badge>}
                />
              </section>

              <section className="grid gap-4">
                {opportunityItems.map((opportunity) => {
                  const edit = opportunityEdits[opportunity.id] ?? {
                    rating: opportunity.type === "短期机会" ? "高" : "中",
                    status: opportunity.status,
                    note: opportunity.nextStep,
                  };
                  const theme = intelligence.themes.find((item) => item.id === opportunity.themeId);
                  return (
                    <article key={opportunity.id} className="rounded-md border border-zinc-200 bg-white p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <Badge className={priorityStyles[edit.rating]}>{edit.rating}</Badge>
                            <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">{edit.status}</Badge>
                            <Badge className="border-teal-200 bg-teal-50 text-teal-700">{opportunity.feasibility}</Badge>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold">{opportunity.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-600">{theme?.summary ?? opportunity.cycle}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {opportunity.actions.map((action) => (
                              <Badge key={action} className="border-zinc-200 bg-white text-zinc-600">{action}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid min-w-72 gap-3">
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-zinc-500">人工评级</span>
                            <select
                              value={edit.rating}
                              onChange={(event) => updateOpportunity(opportunity.id, { rating: event.target.value as Priority }, opportunity)}
                              className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500"
                            >
                              {(["高", "中", "低"] as Priority[]).map((rating) => (
                                <option key={rating} value={rating}>{rating}</option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-zinc-500">行动备注</span>
                            <textarea
                              value={edit.note}
                              onChange={(event) => updateOpportunity(opportunity.id, { note: event.target.value }, opportunity)}
                              className="min-h-20 rounded-md border border-zinc-200 px-3 py-2 text-sm leading-5 outline-none focus:border-teal-500"
                            />
                          </label>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            </div>
          )}

          {activeView === "信息源管理" && (
            <div className="grid gap-5">
              <section className="bg-white px-5 py-5">
                <SectionHeader
                  eyebrow="Sources"
                  title="信息源管理"
                  summary="维护自动抓取信源，查看每个信源的分类、抓取方式、频率和状态。"
                  right={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={exportSources} className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
                        导出 JSON
                      </button>
                      <button type="button" onClick={resetSources} className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
                        恢复正式信源
                      </button>
                    </div>
                  }
                />
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <Metric label="全部信源" value={managedSources.length} />
                  <Metric label="启用信源" value={activeSourceCount} />
                  <Metric label="今日排期" value={todayScheduledSources} />
                  <Metric label="专题任务" value={profileTaskCount} />
                  <Metric label="抓取异常" value={intelligence.status.sourcesWaitingReview} />
                </div>
                {sourceNotice && <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{sourceNotice}</p>}
              </section>

              <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h3 className="font-semibold">添加或更新信源</h3>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">信源名称</span>
                      <input value={sourceForm.name} onChange={(event) => updateSourceForm("name", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500" />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">链接</span>
                      <input value={sourceForm.url} onChange={(event) => updateSourceForm("url", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500" />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">分类</span>
                        <select value={sourceForm.category} onChange={(event) => updateSourceForm("category", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500">
                          {sourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">二级分类</span>
                        <input value={sourceForm.secondaryCategory} onChange={(event) => updateSourceForm("secondaryCategory", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500" />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">抓取方式</span>
                        <select value={sourceForm.crawlMethod} onChange={(event) => updateSourceForm("crawlMethod", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500">
                          {sourceCrawlMethods.map((method) => <option key={method} value={method}>{sourceCrawlMethodLabel(method)}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">频率</span>
                        <select value={sourceForm.frequency} onChange={(event) => updateSourceForm("frequency", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500">
                          {sourceFrequencies.map((frequency) => <option key={frequency} value={frequency}>{sourceFrequencyLabel(frequency)}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">市场</span>
                        <input value={sourceForm.market} onChange={(event) => updateSourceForm("market", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500" />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold text-zinc-500">竞品/对象</span>
                        <input value={sourceForm.competitor} onChange={(event) => updateSourceForm("competitor", event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500" />
                      </label>
                    </div>
                    <button type="button" onClick={saveSource} className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white">
                      保存信源
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold">信源状态</h3>
                    <input
                      value={sourceQuery}
                      onChange={(event) => setSourceQuery(event.target.value)}
                      className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-teal-500 md:w-80"
                      placeholder="搜索名称、链接、分类"
                    />
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200">
                    <div className="grid min-w-[980px] grid-cols-[1.2fr_0.9fr_1.4fr_0.7fr_0.7fr_0.6fr] bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
                      <span>名称</span>
                      <span>分类</span>
                      <span>链接</span>
                      <span>方式</span>
                      <span>频率</span>
                      <span>操作</span>
                    </div>
                    {filteredSources.slice(0, 140).map((source) => (
                      <div key={source.id} className="grid min-w-[980px] grid-cols-[1.2fr_0.9fr_1.4fr_0.7fr_0.7fr_0.6fr] gap-3 border-t border-zinc-200 px-4 py-4 text-sm">
                        <div>
                          <p className="font-semibold">{source.name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{source.market || "Global"}</p>
                        </div>
                        <div>
                          <p>{sourceCategoryLabel(source.category)}</p>
                          <p className="mt-1 text-xs text-zinc-500">{source.secondaryCategory || "-"}</p>
                        </div>
                        <p className="break-all text-xs leading-5 text-zinc-600">{source.url}</p>
                        <span>{sourceCrawlMethodLabel(source.crawlMethod)}</span>
                        <span>{sourceFrequencyLabel(source.frequency)}</span>
                        <button type="button" onClick={() => editSource(source)} className="h-8 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950">
                          编辑
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">当前展示前 140 条匹配结果；可以通过搜索快速定位。</p>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {sourceStats.map((stat) => (
                  <article key={stat.name} className="rounded-md border border-zinc-200 bg-white p-4">
                    <div className={`h-2 rounded-full ${stat.color}`} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{stat.name}</h3>
                        <p className="mt-1 text-sm text-zinc-500">{stat.freq}</p>
                      </div>
                      <p className="text-2xl font-semibold">{stat.total}</p>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">启用 {stat.active} · 总计 {stat.total}</p>
                  </article>
                ))}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
