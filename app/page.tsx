"use client";

import intelligenceData from "@/data/intelligence.json";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type Trend = "新出现" | "升温" | "稳定" | "降温" | "样本不足";
type Priority = "高" | "中" | "低";
type MaturityLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
type DisplayPriority = "P0" | "P1" | "P2" | "P3";
type SourceWeight = "高" | "中" | "中低" | "低";
type ThemeType = "需求型" | "动作型";

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
  type: ThemeType;
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
};

type Opportunity = {
  id: string;
  themeId: string;
  title: string;
  type: "短期机会" | "中长期机会";
  feasibility: "可行" | "待验证" | "不可行";
  status: "待评估" | "验证中" | "已立项" | "执行中" | "已完成" | "暂缓";
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

type ThemeRelation = {
  leftThemeId: string;
  rightThemeId: string;
  level: string;
  reason: string;
};

type ManualReview = {
  themeId: string;
  priority: Priority;
  rating: Priority;
  demandStrength: Priority;
  competitorResponse: Priority;
  actionability: Priority;
  risk: Priority;
  relationDecision: "已确认" | "待确认" | "不关联";
  opportunityDecision: "进入机会池" | "继续观察" | "暂不处理";
  actions: string[];
  note: string;
};

type ManualReviewState = Record<string, ManualReview>;

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
  themeRelations: ThemeRelation[];
  opportunities: Opportunity[];
  manualReviews?: ManualReview[];
};

const intelligence = intelligenceData as IntelligenceData;

const sourceStats = [
  { name: "竞品情报", total: 116, active: 101, freq: "按页/账号分频", color: "bg-teal-500" },
  { name: "用户声音", total: 77, active: 66, freq: "每日", color: "bg-indigo-500" },
  { name: "SEO搜索", total: 42, active: 38, freq: "每周2-3次", color: "bg-cyan-500" },
  { name: "第三方媒体", total: 71, active: 58, freq: "每周1-2次", color: "bg-amber-500" },
  { name: "政策监管", total: 57, active: 49, freq: "每周/事件加频", color: "bg-rose-500" },
  { name: "需求触发市场", total: 109, active: 88, freq: "按对象分频", color: "bg-emerald-500" },
];

const briefingItems: BriefingItem[] = [
  {
    id: "b1",
    period: "daily",
    type: "需求信号",
    title: "美国用户想观看 BBC iPlayer，但受地区版权限制",
    summary: "Reddit 与搜索结果同时出现 BBC iPlayer 访问受限讨论，核心证据在 24 小时内新增 4 条。",
    priority: "高",
    trend: "升温",
    evidence: 8,
    source: "Reddit / SEO",
    time: "今日 09:20",
  },
  {
    id: "b2",
    period: "daily",
    type: "竞品动作",
    title: "NordVPN通过SEO教程布局 BBC iPlayer 访问场景",
    summary: "竞品新增教程内容并在搜索结果中进入前列，与升温需求主题存在强关联。",
    priority: "高",
    trend: "新出现",
    evidence: 5,
    source: "竞品官网 / SERP",
    time: "今日 08:40",
  },
  {
    id: "b3",
    period: "daily",
    type: "外部变化",
    title: "英国年龄验证政策相关讨论继续扩散",
    summary: "政策与媒体信源出现多条 VPN、隐私、安全访问相关内容，标记为风险高但机会不降级。",
    priority: "高",
    trend: "升温",
    evidence: 6,
    source: "政策监管 / 媒体",
    time: "今日 07:10",
  },
  {
    id: "b4",
    period: "weekly",
    type: "需求信号",
    title: "德国用户想订阅美国流媒体，但受支付地区限制",
    summary: "本周核心证据从 2 条增至 6 条，平台规则和用户讨论均指向支付地区限制。",
    priority: "高",
    trend: "升温",
    evidence: 6,
    source: "UGC / 平台规则",
    time: "本周",
  },
  {
    id: "b5",
    period: "weekly",
    type: "竞品动作",
    title: "Surfshark通过价格活动布局家庭订阅用户",
    summary: "价格页、社媒和第三方评测站均出现家庭订阅与折扣内容，建议进入活动策略观察。",
    priority: "高",
    trend: "升温",
    evidence: 7,
    source: "竞品情报 / 媒体",
    time: "本周",
  },
  {
    id: "b6",
    period: "weekly",
    type: "待处理",
    title: "3 个强关联主题等待人工确认",
    summary: "系统识别出需求升温与竞品动作同步出现，需增长负责人确认是否进入机会池。",
    priority: "高",
    trend: "稳定",
    evidence: 3,
    source: "主题关联",
    time: "本周",
  },
];

const themes: Theme[] = [
  {
    id: "d1",
    type: "需求型",
    title: "美国用户想观看 BBC iPlayer，但受地区版权限制",
    summary: "用户在美国访问英国流媒体时遇到地区限制，讨论集中在可用英国节点与 VPN 检测问题。",
    market: "美国",
    platform: "BBC iPlayer",
    competitor: "多竞品",
    trend: "升温",
    priority: "高",
    currentEvidence: 8,
    previousEvidence: 3,
    coreEvidence: 8,
    referenceInfo: 5,
    linkedThemes: 2,
    updatedAt: "2026-07-10",
  },
  {
    id: "d2",
    type: "需求型",
    title: "德国用户想订阅美国流媒体，但受支付地区限制",
    summary: "用户尝试跨区订阅时遇到支付方式、账单地址和账户地区限制，关联平台规则变化。",
    market: "德国",
    platform: "Hulu / Disney+",
    competitor: "ExpressVPN",
    trend: "升温",
    priority: "高",
    currentEvidence: 6,
    previousEvidence: 2,
    coreEvidence: 6,
    referenceInfo: 3,
    linkedThemes: 1,
    updatedAt: "2026-07-09",
  },
  {
    id: "d3",
    type: "需求型",
    title: "英国用户想保护浏览隐私，但受公共网络安全风险影响",
    summary: "公共 Wi-Fi 与数据隐私内容稳定出现，但最近 7 天核心证据不足以判断升温。",
    market: "英国",
    platform: "公共网络",
    competitor: "Proton VPN",
    trend: "样本不足",
    priority: "中",
    currentEvidence: 2,
    previousEvidence: 1,
    coreEvidence: 2,
    referenceInfo: 4,
    linkedThemes: 1,
    updatedAt: "2026-07-08",
  },
  {
    id: "a1",
    type: "动作型",
    title: "NordVPN通过SEO教程布局 BBC iPlayer 访问场景",
    summary: "竞品围绕 BBC iPlayer 更新教程页，并在搜索结果中获得更高可见度。",
    market: "美国 / 英国",
    platform: "BBC iPlayer",
    competitor: "NordVPN",
    trend: "新出现",
    priority: "高",
    currentEvidence: 5,
    previousEvidence: 0,
    coreEvidence: 5,
    referenceInfo: 2,
    linkedThemes: 1,
    updatedAt: "2026-07-10",
  },
  {
    id: "a2",
    type: "动作型",
    title: "Surfshark通过价格活动布局家庭订阅用户",
    summary: "竞品页面和社媒同时强化家庭订阅、折扣和多人设备权益表达。",
    market: "北美 / 西欧",
    platform: "价格页",
    competitor: "Surfshark",
    trend: "升温",
    priority: "高",
    currentEvidence: 7,
    previousEvidence: 3,
    coreEvidence: 7,
    referenceInfo: 4,
    linkedThemes: 2,
    updatedAt: "2026-07-09",
  },
  {
    id: "a3",
    type: "动作型",
    title: "ExpressVPN通过YouTube内容布局流媒体解锁场景",
    summary: "官方视频新增流媒体访问内容，但暂未形成足够多来源证据。",
    market: "全球",
    platform: "YouTube",
    competitor: "ExpressVPN",
    trend: "稳定",
    priority: "中",
    currentEvidence: 4,
    previousEvidence: 4,
    coreEvidence: 4,
    referenceInfo: 1,
    linkedThemes: 1,
    updatedAt: "2026-07-07",
  },
];

const evidence: Evidence[] = [
  {
    id: "e1",
    role: "核心证据",
    themeId: "d1",
    title: "Reddit 讨论：美国用户询问 BBC iPlayer 可用 VPN",
    sourceType: "用户声音",
    source: "Reddit",
    summary: "用户明确表达在美国访问 BBC iPlayer 失败，并询问可用英国节点。",
    time: "2026-07-10 09:20",
  },
  {
    id: "e2",
    role: "核心证据",
    themeId: "d1",
    title: "SERP 变化：VPN for BBC iPlayer 新页面进入前 10",
    sourceType: "SEO搜索",
    source: "Google SERP",
    summary: "核心关键词前 10 中新增两条教程型页面，说明该场景流量竞争增强。",
    time: "2026-07-10 08:55",
  },
  {
    id: "e3",
    role: "核心证据",
    themeId: "a1",
    title: "NordVPN 更新 BBC iPlayer 教程页",
    sourceType: "竞品情报",
    source: "NordVPN",
    summary: "页面标题、教程结构和英国节点说明出现更新，匹配动作型主题。",
    time: "2026-07-10 08:40",
  },
  {
    id: "e4",
    role: "参考信息",
    themeId: "d1",
    title: "第三方媒体提到 BBC iPlayer 海外访问限制",
    sourceType: "第三方媒体",
    source: "VPN review site",
    summary: "文章提及海外观看限制，但用户所在国家不明确，因此只挂为参考。",
    time: "2026-07-09 18:10",
  },
  {
    id: "e5",
    role: "核心证据",
    themeId: "a2",
    title: "Surfshark 价格页突出家庭设备覆盖",
    sourceType: "竞品情报",
    source: "Surfshark pricing",
    summary: "套餐页新增家庭场景表达，与折扣活动共同构成竞品动作证据。",
    time: "2026-07-09 16:30",
  },
];

const opportunities: Opportunity[] = [
  {
    id: "o1",
    themeId: "d1",
    title: "BBC iPlayer 访问需求验证",
    type: "短期机会",
    feasibility: "待验证",
    status: "验证中",
    actions: ["产品能力验证", "SEO页面", "内容选题"],
    cycle: "先用1-3天验证英国节点，再进入2-4周SEO页面建设",
    nextStep: "验证英国节点播放稳定性与 VPN 检测情况",
    owner: "增长PM",
  },
  {
    id: "o2",
    themeId: "d2",
    title: "德国跨区订阅限制内容机会",
    type: "中长期机会",
    feasibility: "待验证",
    status: "待评估",
    actions: ["内容选题", "落地页优化", "客服/运营响应"],
    cycle: "1-2周完成内容验证，后续按月观察搜索需求",
    nextStep: "梳理支付地区限制 FAQ 与可合规表达边界",
    owner: "内容运营",
  },
  {
    id: "o3",
    themeId: "a2",
    title: "家庭订阅价格活动跟进",
    type: "短期机会",
    feasibility: "可行",
    status: "待评估",
    actions: ["价格/活动策略", "落地页优化"],
    cycle: "3-7天完成竞品价格表达与活动页对比",
    nextStep: "对比核心竞品折扣表达和设备权益表述",
    owner: "增长运营",
  },
];

const trendStyles: Record<Trend, string> = {
  "新出现": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "升温": "bg-rose-50 text-rose-700 border-rose-200",
  "稳定": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "降温": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "样本不足": "bg-amber-50 text-amber-800 border-amber-200",
};

const priorityStyles: Record<Priority, string> = {
  "高": "bg-red-600 text-white",
  "中": "bg-amber-500 text-zinc-950",
  "低": "bg-zinc-200 text-zinc-700",
};

const maturityStyles: Record<MaturityLevel, string> = {
  L0: "border-zinc-200 bg-zinc-50 text-zinc-700",
  L1: "border-cyan-200 bg-cyan-50 text-cyan-700",
  L2: "border-teal-200 bg-teal-50 text-teal-700",
  L3: "border-indigo-200 bg-indigo-50 text-indigo-700",
  L4: "border-emerald-200 bg-emerald-50 text-emerald-700",
  L5: "border-red-200 bg-red-50 text-red-700",
};

const displayPriorityStyles: Record<DisplayPriority, string> = {
  P0: "border-red-200 bg-red-50 text-red-700",
  P1: "border-amber-200 bg-amber-50 text-amber-800",
  P2: "border-zinc-200 bg-zinc-50 text-zinc-700",
  P3: "border-zinc-200 bg-white text-zinc-500",
};

const actionOptions = ["产品能力验证", "SEO页面", "内容选题", "落地页优化", "广告投放", "价格/活动策略", "合作渠道", "客服/运营响应"];
const sourceCategories = ["竞品情报", "用户声音", "SEO搜索", "第三方媒体", "政策监管", "需求触发市场"];
const competitorNames = ["NordVPN", "ExpressVPN", "Surfshark", "Proton VPN", "CyberGhost", "PIA VPN"];
const sourceTagDefinitions = [
  ["信源大类", "说明信息来自竞品官方、用户论坛、SEO、第三方媒体、政策监管还是需求触发市场。"],
  ["来源形态", "说明这条信息来自官网、官方账号、论坛/社区、搜索结果、新闻聚合或媒体评测。"],
  ["来源对象", "标记具体网站、账号、竞品或平台，例如 NordVPN、Surfshark、Reddit、Google SERP。"],
  ["用户市场", "只在能够从标题、摘要或信源中识别时标记用户所在国家或区域。"],
];

type SourceTagInput = {
  sourceType?: string;
  source: string;
  title: string;
  summary: string;
  originalTitle?: string;
  url?: string;
};

function sourceCategoryLabel(sourceType: string) {
  if (sourceType === "平台服务生态" || sourceType === "相关平台") return "需求触发市场";
  return sourceType;
}

function sourceTypeFromBriefing(item: BriefingItem) {
  if (item.type === "竞品动作") return "竞品情报";
  if (item.type === "需求信号") return "用户声音";
  if (item.type === "外部变化") return "政策监管";
  return "主题关联";
}

function compactSourceTags(item: SourceTagInput) {
  const sourceType = sourceCategoryLabel(item.sourceType ?? "其他");
  const tags = [
    sourceType,
    inferSourceFormat(item),
    inferSourceEntity(item),
    inferMarketTag(item),
  ].filter(Boolean) as string[];

  return Array.from(new Set(tags)).slice(0, 4);
}

function inferSourceFormat(item: SourceTagInput) {
  const text = `${item.sourceType ?? ""} ${item.source} ${item.title} ${item.summary} ${item.originalTitle ?? ""} ${item.url ?? ""}`.toLowerCase();
  const originalTitle = (item.originalTitle ?? "").toLowerCase();
  const officialPublisher = competitorNames.some((name) => originalTitle.endsWith(`- ${name.toLowerCase()}`));
  if (/reddit|forum|community|quora|ugc/.test(text)) return "论坛/社区";
  if (/youtube|tiktok|instagram|twitter|x\.com|官方账号/.test(text)) return "官方账号";
  if (/pricing|价格页/.test(text)) return "官网/价格页";
  if (/google news|news\.google/.test(text) && !officialPublisher) return "新闻聚合";
  if (officialPublisher) return "官网";
  if ((item.sourceType === "竞品情报" || sourceCategoryLabel(item.sourceType ?? "") === "竞品情报") && /^(nordvpn|expressvpn|surfshark|proton vpn|cyberghost|pia vpn)/.test(item.source.toLowerCase())) return "官网";
  if (/google news|news\.google/.test(text)) return "新闻聚合";
  if (/serp|seo|google search|search\?q=/.test(text)) return "搜索结果";
  if (item.sourceType === "第三方媒体") return "媒体评测";
  if (item.sourceType === "政策监管") return "政策/媒体";
  return "网页";
}

function inferSourceEntity(item: SourceTagInput) {
  const text = `${item.source} ${item.title} ${item.summary} ${item.originalTitle ?? ""}`.toLowerCase();
  const matchedCompetitor = competitorNames.find((name) => text.includes(name.toLowerCase()));
  if (matchedCompetitor) return matchedCompetitor;
  if (text.includes("reddit")) return "Reddit";
  if (text.includes("google serp")) return "Google SERP";
  if (text.includes("google news")) return "Google News";
  if (text.includes("bbc iplayer")) return "BBC iPlayer";
  if (text.includes("netflix")) return "Netflix";
  if (text.includes("world cup")) return "World Cup";
  return item.source.length > 18 ? item.source.slice(0, 18) : item.source;
}

function inferMarketTag(item: SourceTagInput) {
  const text = `${item.title} ${item.summary} ${item.source} ${item.originalTitle ?? ""}`.toLowerCase();
  if (/美国|us|united states/.test(text)) return "美国";
  if (/英国|uk|britain|bbc/.test(text)) return "英国";
  if (/德国|de|germany/.test(text)) return "德国";
  if (/eu|europe|欧盟/.test(text)) return "欧盟";
  if (/global|world cup|worldwide|全球/.test(text)) return "全球";
  return "";
}

function isOfficialCompetitorEvidence(item: Evidence) {
  if (sourceCategoryLabel(item.sourceType) !== "竞品情报") return false;
  const source = item.source.toLowerCase();
  const title = `${item.title} ${item.summary} ${item.originalTitle ?? ""}`.toLowerCase();
  const directOfficial = /^(nordvpn|expressvpn|surfshark|proton vpn|cyberghost|pia vpn)/.test(source);
  const officialSurface = /pricing|youtube|官网|官方|价格页/.test(source) || /官网|官方|价格页/.test(title);
  const publisherIsCompetitor = competitorNames.some((name) => title.endsWith(`- ${name.toLowerCase()}`));
  return directOfficial || officialSurface || publisherIsCompetitor;
}

function isUserForumEvidence(item: Evidence) {
  if (sourceCategoryLabel(item.sourceType) !== "用户声音") return false;
  const text = `${item.source} ${item.title} ${item.summary} ${item.originalTitle ?? ""} ${item.url ?? ""}`.toLowerCase();
  return /reddit|forum|community|quora|ugc|用户讨论|讨论/.test(text);
}

function inferDisplayPriority(item: Pick<Evidence, "role" | "sourceType" | "title" | "summary">): DisplayPriority {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (item.sourceType === "政策监管" && (text.includes("age") || text.includes("verification") || text.includes("ban"))) return "P0";
  if (item.role === "核心证据" || item.sourceType === "竞品情报") return "P1";
  if (item.sourceType === "第三方媒体") return "P2";
  return "P2";
}

function inferBriefingDisplayPriority(item: BriefingItem): DisplayPriority {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (item.type === "外部变化" && (text.includes("年龄") || text.includes("age") || text.includes("verification"))) return "P0";
  if (item.priority === "高") return "P1";
  if (item.priority === "中") return "P2";
  return "P3";
}

function inferSourceWeight(sourceType: string, source: string): SourceWeight {
  const text = `${sourceType} ${source}`.toLowerCase();
  if (sourceType === "政策监管" || text.includes("official") || text.includes("nordvpn") || text.includes("surfshark") || text.includes("expressvpn")) return "高";
  if (sourceType === "SEO搜索" || sourceType === "用户声音") return "中";
  if (sourceType === "第三方媒体") return "中低";
  return "低";
}

function inferThemeMaturity(theme: Theme): MaturityLevel {
  if (theme.currentEvidence >= 8 && theme.linkedThemes >= 1 && theme.priority === "高") return "L2";
  if (theme.currentEvidence >= 3 || theme.linkedThemes >= 1) return "L1";
  return "L0";
}

function inferOpportunityMaturity(opportunity: Opportunity): MaturityLevel {
  if (opportunity.status === "已完成") return "L4";
  if (opportunity.status === "验证中" || opportunity.status === "执行中" || opportunity.status === "已立项") return "L3";
  return "L2";
}

function scoreTheme(theme: Theme) {
  const demand = theme.type === "需求型" ? 2 : theme.platform !== "价格页" ? 1 : 0;
  const restriction = /限制|受限|地区|支付|隐私|公共网络|解锁|访问/.test(theme.summary + theme.title) ? 2 : theme.type === "需求型" ? 1 : 0;
  const vpnFit = /VPN|节点|访问|解锁|隐私|跨区/.test(theme.summary + theme.title) ? 2 : 1;
  const frequency = theme.currentEvidence >= 6 ? 2 : theme.currentEvidence >= 3 ? 1 : 0;
  const sourceMix = theme.linkedThemes >= 2 ? 2 : theme.linkedThemes >= 1 ? 1 : 0;
  const total = demand + restriction + vpnFit + frequency + sourceMix;
  const suggested: MaturityLevel = total >= 8 && restriction > 0 && vpnFit > 0 ? "L2" : total >= 4 ? "L1" : "L0";

  return { demand, restriction, vpnFit, frequency, sourceMix, total, suggested };
}


function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SourceTagRow({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex h-7 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600">
          {tag}
        </span>
      ))}
    </div>
  );
}

function MiniBars({ current, previous }: { current: number; previous: number }) {
  const max = Math.max(current, previous, 1);
  return (
    <div className="flex h-12 w-20 items-end gap-2" aria-label={`本周期 ${current} 条, 上周期 ${previous} 条`}>
      <div className="w-8 rounded-t bg-zinc-300" style={{ height: `${Math.max(20, (previous / max) * 48)}px` }} />
      <div className="w-8 rounded-t bg-teal-500" style={{ height: `${Math.max(20, (current / max) * 48)}px` }} />
    </div>
  );
}

function createDefaultReview(theme: Theme): ManualReview {
  return {
    themeId: theme.id,
    priority: theme.priority,
    rating: theme.priority,
    demandStrength: theme.type === "需求型" ? theme.priority : "中",
    competitorResponse: theme.type === "动作型" ? theme.priority : "中",
    actionability: theme.priority === "高" ? "高" : "中",
    risk: theme.trend === "样本不足" ? "高" : "中",
    relationDecision: "待确认",
    opportunityDecision: theme.priority === "高" ? "进入机会池" : "继续观察",
    actions: theme.type === "需求型" ? ["产品能力验证", "SEO页面"] : ["内容选题"],
    note: "",
  };
}

function SegmentedButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`h-9 rounded px-2 text-sm font-semibold ${
            value === option ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function SourceDisclosure({
  url,
  originalTitle,
  className = "",
}: {
  url?: string;
  originalTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900"
      >
        {open ? "收起来源" : "查看来源"}
      </button>
      {open && (
        <div className="mt-2 max-w-full rounded-md border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-600">
          {originalTitle && (
            <p className="mb-2 break-words">
              <span className="font-semibold text-zinc-700">原始标题：</span>
              {originalTitle}
            </p>
          )}
          <p className="font-semibold text-zinc-700">原链接：</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-5 text-zinc-600">{url}</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [briefingPeriod, setBriefingPeriod] = useState<"daily" | "weekly">("daily");
  const [activeView, setActiveView] = useState("简报");
  const [themeFilter, setThemeFilter] = useState<"全部" | ThemeType>("全部");
  const [selectedThemeId, setSelectedThemeId] = useState("d1");
  const [manualReviewsReady, setManualReviewsReady] = useState(false);
  const [manualReviews, setManualReviews] = useState<ManualReviewState>({});
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyCategory, setHistoryCategory] = useState("全部");
  const [historyPriority, setHistoryPriority] = useState<"全部" | DisplayPriority>("全部");
  const [feedbackType, setFeedbackType] = useState("误判");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackLogs, setFeedbackLogs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setManualReviewsReady(true);
      return;
    }
    try {
      setManualReviews(JSON.parse(window.localStorage.getItem("vpn-intel-manual-reviews") ?? "{}") as ManualReviewState);
      setFeedbackLogs(JSON.parse(window.localStorage.getItem("vpn-intel-feedback-logs") ?? "[]") as string[]);
    } catch {
      setManualReviews({});
      setFeedbackLogs([]);
    }
    setManualReviewsReady(true);
  }, []);

  useEffect(() => {
    if (!manualReviewsReady) return;
    window.localStorage.setItem("vpn-intel-manual-reviews", JSON.stringify(manualReviews));
  }, [manualReviews, manualReviewsReady]);

  useEffect(() => {
    if (!manualReviewsReady) return;
    window.localStorage.setItem("vpn-intel-feedback-logs", JSON.stringify(feedbackLogs));
  }, [feedbackLogs, manualReviewsReady]);

  const visibleBriefing = useMemo(
    () => intelligence.briefingItems.filter((item) => item.period === briefingPeriod && item.priority === "高"),
    [briefingPeriod],
  );

  const visibleThemes = useMemo(
    () => intelligence.themes.filter((theme) => themeFilter === "全部" || theme.type === themeFilter),
    [themeFilter],
  );

  const selectedTheme = intelligence.themes.find((theme) => theme.id === selectedThemeId) ?? intelligence.themes[0];
  const selectedEvidence = intelligence.evidence.filter((item) => item.themeId === selectedTheme.id);
  const selectedRelations = intelligence.themeRelations.filter(
    (relation) => relation.leftThemeId === selectedTheme.id || relation.rightThemeId === selectedTheme.id,
  );
  const selectedOpportunities = intelligence.opportunities.filter((opportunity) => opportunity.themeId === selectedTheme.id);
  const sourceUrlByTitle = useMemo(
    () =>
      new Map(
        intelligence.evidence.flatMap((item): [string, string][] => {
          if (!item.url) return [];
          return item.originalTitle
            ? [
                [item.title, item.url],
                [item.originalTitle, item.url],
              ]
            : [[item.title, item.url]];
        }),
      ),
    [],
  );
  const evidenceWithMeta = useMemo(
    () =>
      intelligence.evidence.map((item) => ({
        ...item,
        sourceCategory: sourceCategoryLabel(item.sourceType),
        sourceTags: compactSourceTags(item),
        maturity: "L0" as MaturityLevel,
        displayPriority: inferDisplayPriority(item),
        sourceWeight: inferSourceWeight(item.sourceType, item.source),
      })),
    [],
  );
  const officialCompetitorItems = evidenceWithMeta.filter((item) => isOfficialCompetitorEvidence(item)).slice(0, 5);
  const userForumItems = evidenceWithMeta.filter((item) => isUserForumEvidence(item)).slice(0, 5);
  const priorityEvents = evidenceWithMeta
    .filter((item) => item.displayPriority === "P0" || item.displayPriority === "P1")
    .slice(0, 6);
  const candidateInsights = intelligence.themes
    .map((theme) => ({ ...theme, maturity: inferThemeMaturity(theme), score: scoreTheme(theme) }))
    .filter((theme) => theme.maturity === "L1" || theme.maturity === "L2")
    .sort((a, b) => b.score.total - a.score.total);
  const demandObjects = [
    {
      name: "BBC iPlayer",
      category: "流媒体 / 影视",
      heat: "高",
      restriction: "地区版权限制",
      markets: "US → UK",
      platform: "BBC iPlayer",
      maturity: "L2" as MaturityLevel,
      status: "验证中",
    },
    {
      name: "2026 World Cup",
      category: "体育赛事",
      heat: "高",
      restriction: "转播地区差异",
      markets: "Global",
      platform: "BBC / ESPN / 本地电视台",
      maturity: "L1" as MaturityLevel,
      status: "限制待确认",
    },
    {
      name: "Hulu / Disney+ 跨区订阅",
      category: "流媒体 / 影视",
      heat: "中",
      restriction: "支付地区与账号地区",
      markets: "DE → US",
      platform: "Hulu / Disney+",
      maturity: "L2" as MaturityLevel,
      status: "待评估",
    },
  ];
  const categorySummaries = sourceCategories.map((category) => {
    const items = evidenceWithMeta.filter((item) => item.sourceCategory === category);
    const important = items.filter((item) => item.displayPriority === "P0" || item.displayPriority === "P1").length;
    return {
      category,
      total: items.length,
      important,
      summary:
        category === "竞品情报"
          ? "观察竞品官网、价格、功能、节点和官方内容动作。"
          : category === "用户声音"
            ? "聚合用户访问困难、替代品讨论和隐含 VPN 场景。"
            : category === "SEO搜索"
              ? "跟踪竞品词、场景词和访问困难词的搜索信号。"
              : category === "政策监管"
                ? "监控欧美政策、年龄验证、隐私与平台监管风险。"
                : category === "需求触发市场"
                  ? "按赛事、流媒体、游戏等对象观察高热限制场景。"
                  : "保留评测、榜单、对比和行业媒体参考。",
    };
  });
  const visibleHistory = evidenceWithMeta.filter((item) => {
    const query = historyQuery.trim().toLowerCase();
    const text = `${item.title} ${item.summary} ${item.source} ${item.originalTitle ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesCategory = historyCategory === "全部" || item.sourceCategory === historyCategory;
    const matchesPriority = historyPriority === "全部" || item.displayPriority === historyPriority;
    return matchesQuery && matchesCategory && matchesPriority;
  });
  const selectedManualReview = {
    ...createDefaultReview(selectedTheme),
    ...(intelligence.manualReviews?.find((review) => review.themeId === selectedTheme.id) ?? {}),
    ...(manualReviews[selectedTheme.id] ?? {}),
  };
  const coreEvidenceCount = intelligence.evidence.filter((item) => item.role === "核心证据").length;
  const referenceEvidenceCount = intelligence.evidence.length - coreEvidenceCount;
  const highThemeCount = intelligence.themes.filter((theme) => theme.priority === "高").length;
  const manualReviewCount = new Set([
    ...Object.keys(manualReviews),
    ...(intelligence.manualReviews?.map((review) => review.themeId) ?? []),
  ]).size;
  const validatingOpportunityCount = intelligence.opportunities.filter((opportunity) => opportunity.status === "验证中").length;
  const waitingOpportunityCount = intelligence.opportunities.filter((opportunity) => opportunity.status === "待评估").length;
  const totalSourceCount = intelligence.sourceStats.reduce((sum, source) => sum + source.total, 0);
  const activeSourceCount = intelligence.sourceStats.reduce((sum, source) => sum + source.active, 0);
  const lastUpdatedTime = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(intelligence.generatedAt));

  function updateManualReview(patch: Partial<ManualReview>) {
    setManualReviews((current) => ({
      ...current,
      [selectedTheme.id]: {
        ...createDefaultReview(selectedTheme),
        ...(current[selectedTheme.id] ?? {}),
        ...patch,
      },
    }));
  }

  function toggleManualAction(action: string) {
    const currentActions = selectedManualReview.actions;
    updateManualReview({
      actions: currentActions.includes(action)
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action],
    });
  }

  function submitFeedback() {
    const note = feedbackNote.trim();
    if (!note) return;
    const timestamp = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    setFeedbackLogs((current) => [`${timestamp} · ${feedbackType} · ${note}`, ...current].slice(0, 20));
    setFeedbackNote("");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">VPN 市场增长信息中心</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950">
              {intelligence.displayDate} 情报简报
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {intelligence.sourceStats.map((source) => (
              <div key={source.name} className="min-w-24 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className={`mb-2 h-1.5 rounded-full ${source.color}`} />
                <p className="text-xs font-medium text-zinc-500">{source.name}</p>
                <p className="text-lg font-semibold">{source.active}/{source.total}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-5 lg:h-fit">
          <nav className="grid gap-2 rounded-md border border-zinc-200 bg-white p-2">
            {["简报", "主题库", "证据库", "机会池", "信源状态", "标签体系", "规则模型", "反馈配置"].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`h-11 rounded px-3 text-left text-sm font-semibold transition ${
                  activeView === view
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                {view}
              </button>
            ))}
          </nav>

          <section className="mt-4 rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold">抓取状态</p>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>今日正常信源</span>
                  <span>{intelligence.status.normalSourceRate}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${intelligence.status.normalSourceRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>待人工确认</span>
                  <span>{intelligence.status.sourcesWaitingReview}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.min(100, intelligence.status.sourcesWaitingReview * 2)}%` }} />
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {activeView === "简报" && (
            <div className="grid gap-5">
              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">日报质量状态</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {intelligence.status.normalSourceRate >= 90 ? "正常" : intelligence.status.normalSourceRate >= 70 ? "部分异常" : "高风险异常"} ·
                      抓取成功率 {intelligence.status.normalSourceRate}% · 失败待检 {intelligence.status.sourcesWaitingReview}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ["今日新增", intelligence.status.newItemsToday],
                      ["重点信息", priorityEvents.length],
                      ["候选洞察", candidateInsights.length],
                      ["人工待处理", intelligence.status.pendingReview],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <p className="text-xs font-semibold text-zinc-500">{label}</p>
                        <p className="mt-1 text-2xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
                  阅读提示：政策监管和竞品官方动作可作为高优先级 L0 单点事件；L2 候选洞察必须同时具备用户需求、限制原因、VPN 相关性、频率和来源可信度。
                </p>
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">高优先级简报</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      今日新增 {intelligence.status.newItemsToday} · 高优先级 {intelligence.status.highPriorityToday} · 待确认 {intelligence.status.pendingReview}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-1">
                    {[
                      ["daily", "每日"],
                      ["weekly", "每周"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setBriefingPeriod(key as "daily" | "weekly")}
                        className={`h-9 rounded px-4 text-sm font-semibold ${
                          briefingPeriod === key ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {visibleBriefing.map((item) => {
                    const itemUrl = item.url ?? sourceUrlByTitle.get(item.title);
                    const displayPriority = inferBriefingDisplayPriority(item);
                    return (
                      <article key={item.id} className="rounded-md border border-zinc-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <SourceTagRow
                              tags={compactSourceTags({
                                sourceType: sourceTypeFromBriefing(item),
                                source: item.source,
                                title: item.title,
                                summary: item.summary,
                                originalTitle: item.originalTitle,
                                url: itemUrl,
                              })}
                            />
                            <h3 className="mt-3 break-words text-lg font-semibold">{item.title}</h3>
                            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-zinc-600">{item.summary}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">{item.type}</Badge>
                              <Badge className={trendStyles[item.trend]}>{item.trend}</Badge>
                              <Badge className={displayPriorityStyles[displayPriority]}>{displayPriority}</Badge>
                            </div>
                            <SourceDisclosure url={itemUrl} originalTitle={item.originalTitle} className="mt-3" />
                          </div>
                          <div className="grid min-w-36 gap-1 text-sm text-zinc-500">
                            <span>{item.source}</span>
                            <span>{item.evidence} 条核心证据</span>
                            <span>{item.time}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">竞品官方信源</h2>
                      <p className="mt-1 text-sm text-zinc-500">只看官网、价格页、官方账号等由竞品直接发布的信息</p>
                    </div>
                    <span className="rounded bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">{officialCompetitorItems.length} 条</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {officialCompetitorItems.map((item) => (
                      <article key={item.id} className="rounded-md border border-zinc-200 p-4">
                        <SourceTagRow tags={item.sourceTags} />
                        <h3 className="mt-3 break-words text-sm font-semibold">{item.title}</h3>
                        <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{item.source}</span>
                          <span>{item.time}</span>
                        </div>
                        <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-3" />
                      </article>
                    ))}
                    {officialCompetitorItems.length === 0 && (
                      <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                        今日暂无竞品官方信源信息
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">用户论坛声音</h2>
                      <p className="mt-1 text-sm text-zinc-500">只看 Reddit、论坛、社区等用户主动发布的需求和限制反馈</p>
                    </div>
                    <span className="rounded bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">{userForumItems.length} 条</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {userForumItems.map((item) => (
                      <article key={item.id} className="rounded-md border border-zinc-200 p-4">
                        <SourceTagRow tags={item.sourceTags} />
                        <h3 className="mt-3 break-words text-sm font-semibold">{item.title}</h3>
                        <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{item.source}</span>
                          <span>{item.time}</span>
                        </div>
                        <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-3" />
                      </article>
                    ))}
                    {userForumItems.length === 0 && (
                      <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                        今日暂无用户论坛声音
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">重点事件池</h2>
                  <div className="mt-5 grid gap-3">
                    {priorityEvents.map((item) => (
                      <article key={item.id} className="rounded-md border border-zinc-200 p-4">
                        <SourceTagRow tags={item.sourceTags} />
                        <h3 className="mt-3 break-words text-sm font-semibold">{item.title}</h3>
                        <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge className={displayPriorityStyles[item.displayPriority]}>{item.displayPriority}</Badge>
                          <Badge className={maturityStyles[item.maturity]}>{item.maturity}</Badge>
                        </div>
                        <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-3" />
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">L2 候选洞察池</h2>
                  <div className="mt-5 grid gap-3">
                    {candidateInsights.slice(0, 5).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setSelectedThemeId(theme.id);
                          setActiveView("主题库");
                        }}
                        className="rounded-md border border-zinc-200 p-4 text-left transition hover:bg-zinc-50"
                      >
                        <div className="flex flex-wrap gap-2">
                          <Badge className={maturityStyles[theme.score.suggested]}>{theme.score.suggested}</Badge>
                          <Badge className={trendStyles[theme.trend]}>{theme.trend}</Badge>
                          <Badge className={displayPriorityStyles[theme.priority === "高" ? "P1" : "P2"]}>{theme.priority === "高" ? "P1" : "P2"}</Badge>
                        </div>
                        <h3 className="mt-3 break-words text-sm font-semibold">{theme.title}</h3>
                        <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{theme.summary}</p>
                        <p className="mt-3 text-xs font-semibold text-teal-700">L2 分数 {theme.score.total}/10 · 核心证据 {theme.coreEvidence}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-3">
                <div className="rounded-md border border-zinc-200 bg-white p-5 xl:col-span-2">
                  <h2 className="text-xl font-semibold">需求 × 竞品关联</h2>
                  <div className="mt-5 grid gap-3">
                    {intelligence.themeRelations.map(({ leftThemeId, rightThemeId, level, reason }) => {
                      const leftTheme = intelligence.themes.find((theme) => theme.id === leftThemeId);
                      const rightTheme = intelligence.themes.find((theme) => theme.id === rightThemeId);
                      return (
                        <div key={`${leftThemeId}-${rightThemeId}`} className="grid gap-3 rounded-md border border-zinc-200 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                          <p className="text-sm font-semibold">{leftTheme?.title}</p>
                          <div className="text-center text-xs font-semibold text-teal-700">
                            {level}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{rightTheme?.title}</p>
                            <p className="mt-1 text-xs text-zinc-500">{reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">本周机会入口</h2>
                  <div className="mt-5 grid gap-4">
                    {intelligence.opportunities.map((opportunity) => (
                      <div key={opportunity.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{opportunity.title}</p>
                          <Badge className="border-teal-200 bg-teal-50 text-teal-700">{opportunity.type}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{opportunity.nextStep}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">需求触发对象</h2>
                  <div className="mt-5 grid gap-3">
                    {demandObjects.map((object) => (
                      <div key={object.name} className="rounded-md border border-zinc-200 p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={maturityStyles[object.maturity]}>{object.maturity}</Badge>
                          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">{object.category}</Badge>
                          <Badge className="border-rose-200 bg-rose-50 text-rose-700">热度 {object.heat}</Badge>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold">{object.name}</h3>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          {object.restriction} · {object.platform} · {object.markets} · {object.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">分类信息压缩区</h2>
                  <div className="mt-5 grid gap-3">
                    {categorySummaries.map((item) => (
                      <div key={item.category} className="rounded-md border border-zinc-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{item.category}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">{item.summary}</p>
                          </div>
                          <div className="text-right text-xs text-zinc-500">
                            <p>信息 {item.total}</p>
                            <p>重点 {item.important}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeView === "主题库" && (
            <div className="grid gap-5">
              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">全部主题库</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      主题 {intelligence.themes.length} · 高优先级 {highThemeCount} · 人工修正 {manualReviewCount}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
                    {["全部", "需求型", "动作型"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setThemeFilter(filter as "全部" | ThemeType)}
                        className={`h-9 rounded px-3 text-sm font-semibold ${
                          themeFilter === filter ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-md border border-zinc-200">
                  <div className="grid min-w-[820px] grid-cols-[1.7fr_0.7fr_0.8fr_0.7fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
                    <span>主题</span>
                    <span>市场</span>
                    <span>平台/竞品</span>
                    <span>趋势</span>
                    <span>证据</span>
                  </div>
                  {visibleThemes.map((theme) => {
                    const themeEvidence = intelligence.evidence.filter((item) => item.themeId === theme.id);
                    const themeRelations = intelligence.themeRelations.filter(
                      (relation) => relation.leftThemeId === theme.id || relation.rightThemeId === theme.id,
                    );
                    const themeOpportunity = intelligence.opportunities.find((opportunity) => opportunity.themeId === theme.id);
                    const themeScore = scoreTheme(theme);
                    const themeMaturity = inferThemeMaturity(theme);
                    const isSelected = selectedTheme.id === theme.id;
                    return (
                      <div key={theme.id} className="min-w-[820px] border-t border-zinc-200">
                        <button
                          onClick={() => setSelectedThemeId(theme.id)}
                          className={`grid w-full grid-cols-[1.7fr_0.7fr_0.8fr_0.7fr_0.7fr] items-center gap-3 px-4 py-4 text-left transition hover:bg-zinc-50 ${
                            isSelected ? "bg-teal-50/60" : "bg-white"
                          }`}
                        >
                          <span>
                            <span className="block break-words text-sm font-semibold">{theme.title}</span>
                            <span className="mt-1 block break-words text-xs text-zinc-500">{theme.type} · {theme.summary}</span>
                            <span className="mt-2 flex flex-wrap gap-2">
                              <Badge className={maturityStyles[themeMaturity]}>{themeMaturity}</Badge>
                              <Badge className={displayPriorityStyles[theme.priority === "高" ? "P1" : "P2"]}>{theme.priority === "高" ? "P1" : "P2"}</Badge>
                              <Badge className="border-zinc-200 bg-white text-zinc-600">L2分 {themeScore.total}/10</Badge>
                            </span>
                          </span>
                          <span className="text-sm text-zinc-600">{theme.market}</span>
                          <span className="text-sm text-zinc-600">{theme.type === "需求型" ? theme.platform : theme.competitor}</span>
                          <span>
                            <Badge className={trendStyles[theme.trend]}>{theme.trend}</Badge>
                          </span>
                          <span className="flex items-center gap-3">
                            <MiniBars current={theme.currentEvidence} previous={theme.previousEvidence} />
                            <span className="text-xs text-zinc-500">{theme.currentEvidence}/{theme.previousEvidence}</span>
                          </span>
                        </button>
                        {isSelected && (
                          <div className="grid gap-3 bg-white px-4 pb-4 md:grid-cols-3">
                            <div className="rounded-md border border-teal-100 bg-teal-50/60 p-3">
                              <p className="text-xs font-semibold text-teal-800">相关证据</p>
                              <div className="mt-2 grid gap-2">
                                {themeEvidence.slice(0, 3).map((item) => (
                                  <div key={item.id} className="rounded bg-white/70 p-2">
                                    <SourceTagRow tags={compactSourceTags(item)} />
                                    <p className="mt-2 break-words text-xs leading-5 text-zinc-700">{item.title}</p>
                                    <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-1" />
                                  </div>
                                ))}
                                {themeEvidence.length === 0 && <p className="text-xs text-zinc-500">暂无证据</p>}
                              </div>
                            </div>
                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <p className="text-xs font-semibold text-zinc-600">关联主题</p>
                              <div className="mt-2 grid gap-2">
                                {themeRelations.map((relation) => {
                                  const linkedId = relation.leftThemeId === theme.id ? relation.rightThemeId : relation.leftThemeId;
                                  const linkedTheme = intelligence.themes.find((item) => item.id === linkedId);
                                  return (
                                    <p key={`${relation.leftThemeId}-${relation.rightThemeId}`} className="break-words text-xs leading-5 text-zinc-700">
                                      {relation.level} · {linkedTheme?.title}
                                    </p>
                                  );
                                })}
                                {themeRelations.length === 0 && <p className="text-xs text-zinc-500">暂无关联主题</p>}
                              </div>
                            </div>
                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <p className="text-xs font-semibold text-zinc-600">机会状态</p>
                              <p className="mt-2 break-words text-xs leading-5 text-zinc-700">
                                {themeOpportunity ? `${themeOpportunity.status} · ${themeOpportunity.nextStep}` : "尚未进入机会池"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">{selectedTheme.type}</Badge>
                  <Badge className={maturityStyles[inferThemeMaturity(selectedTheme)]}>{inferThemeMaturity(selectedTheme)}</Badge>
                  <Badge className={displayPriorityStyles[selectedTheme.priority === "高" ? "P1" : "P2"]}>{selectedTheme.priority === "高" ? "P1" : "P2"}</Badge>
                  <Badge className={trendStyles[selectedTheme.trend]}>{selectedTheme.trend}</Badge>
                  <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${priorityStyles[selectedTheme.priority]}`}>
                    {selectedTheme.priority}优先级
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold">{selectedTheme.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-600">{selectedTheme.summary}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {[
                    ["用户市场", selectedTheme.market],
                    ["关联平台", selectedTheme.platform],
                    ["关联竞品", selectedTheme.competitor],
                    ["更新时间", selectedTheme.updatedAt],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-semibold text-zinc-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-semibold">L2 评分链路</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    {[
                      ["用户需求", scoreTheme(selectedTheme).demand],
                      ["限制原因", scoreTheme(selectedTheme).restriction],
                      ["VPN相关性", scoreTheme(selectedTheme).vpnFit],
                      ["热度/频率", scoreTheme(selectedTheme).frequency],
                      ["来源交叉", scoreTheme(selectedTheme).sourceMix],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded bg-white p-3">
                        <p className="text-xs font-semibold text-zinc-500">{label}</p>
                        <p className="mt-1 text-lg font-semibold">{value}/2</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    总分 {scoreTheme(selectedTheme).total}/10 · 建议成熟度 {scoreTheme(selectedTheme).suggested}。限制原因或 VPN 相关性为 0 时，不自动升级 L2。
                  </p>
                </div>
                <div className="mt-5 rounded-md border border-teal-200 bg-teal-50/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold">人工修正</h3>
                    <Badge className="border-teal-200 bg-white text-teal-700">本机草稿</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-4">
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">优先级修正</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.priority}
                        options={["高", "中", "低"]}
                        onChange={(priority) => updateManualReview({ priority })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">综合评级</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.rating}
                        options={["高", "中", "低"]}
                        onChange={(rating) => updateManualReview({ rating })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">需求强度</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.demandStrength}
                        options={["高", "中", "低"]}
                        onChange={(demandStrength) => updateManualReview({ demandStrength })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">竞品响应</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.competitorResponse}
                        options={["高", "中", "低"]}
                        onChange={(competitorResponse) => updateManualReview({ competitorResponse })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">可执行性</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.actionability}
                        options={["高", "中", "低"]}
                        onChange={(actionability) => updateManualReview({ actionability })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">风险提示</span>
                      <SegmentedButtons<Priority>
                        value={selectedManualReview.risk}
                        options={["高", "中", "低"]}
                        onChange={(risk) => updateManualReview({ risk })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">关联确认</span>
                      <SegmentedButtons<ManualReview["relationDecision"]>
                        value={selectedManualReview.relationDecision}
                        options={["已确认", "待确认", "不关联"]}
                        onChange={(relationDecision) => updateManualReview({ relationDecision })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">机会决策</span>
                      <SegmentedButtons<ManualReview["opportunityDecision"]>
                        value={selectedManualReview.opportunityDecision}
                        options={["进入机会池", "继续观察", "暂不处理"]}
                        onChange={(opportunityDecision) => updateManualReview({ opportunityDecision })}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">建议动作</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {actionOptions.map((action) => {
                          const checked = selectedManualReview.actions.includes(action);
                          return (
                            <button
                              key={action}
                              onClick={() => toggleManualAction(action)}
                              className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                                checked
                                  ? "border-teal-500 bg-white text-teal-800"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-950"
                              }`}
                            >
                              {action}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold text-zinc-500">备注</span>
                      <textarea
                        value={selectedManualReview.note}
                        onChange={(event) => updateManualReview({ note: event.target.value })}
                        rows={4}
                        className="min-h-28 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-teal-500"
                        placeholder="人工判断、风险边界、后续验证点"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-200 p-4">
                    <p className="text-sm font-semibold">核心证据</p>
                    <div className="mt-3 grid gap-3">
                      {selectedEvidence.filter((item) => item.role === "核心证据").map((item) => (
                        <div key={item.id} className="rounded bg-zinc-50 p-3">
                          <SourceTagRow tags={compactSourceTags(item)} />
                          <p className="mt-2 break-words text-sm leading-6 text-zinc-700">{item.title}</p>
                          <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-zinc-200 p-4">
                    <p className="text-sm font-semibold">参考信息</p>
                    <div className="mt-3 grid gap-3">
                      {selectedEvidence.filter((item) => item.role === "参考信息").map((item) => (
                        <div key={item.id} className="rounded bg-zinc-50 p-3">
                          <SourceTagRow tags={compactSourceTags(item)} />
                          <p className="mt-2 break-words text-sm leading-6 text-zinc-700">{item.title}</p>
                          <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-1" />
                        </div>
                      ))}
                      {selectedEvidence.filter((item) => item.role === "参考信息").length === 0 && (
                        <p className="text-sm text-zinc-500">暂无参考信息</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-200 p-4">
                    <p className="text-sm font-semibold">关联判断</p>
                    <div className="mt-3 grid gap-3">
                      {selectedRelations.map((relation) => {
                        const linkedId = relation.leftThemeId === selectedTheme.id ? relation.rightThemeId : relation.leftThemeId;
                        const linkedTheme = intelligence.themes.find((theme) => theme.id === linkedId);
                        return (
                          <div key={`${relation.leftThemeId}-${relation.rightThemeId}`} className="rounded bg-zinc-50 p-3">
                            <p className="break-words text-sm font-semibold text-zinc-700">{relation.level} · {linkedTheme?.title}</p>
                            <p className="mt-1 break-words text-xs leading-5 text-zinc-500">{relation.reason}</p>
                          </div>
                        );
                      })}
                      {selectedRelations.length === 0 && <p className="text-sm text-zinc-500">暂无关联判断</p>}
                    </div>
                  </div>
                  <div className="rounded-md border border-zinc-200 p-4">
                    <p className="text-sm font-semibold">机会建议</p>
                    <div className="mt-3 grid gap-3">
                      {selectedOpportunities.map((opportunity) => (
                        <div key={opportunity.id} className="rounded bg-zinc-50 p-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">{opportunity.type}</Badge>
                            <Badge className="border-amber-200 bg-amber-50 text-amber-800">{opportunity.feasibility}</Badge>
                            <Badge className="border-zinc-200 bg-white text-zinc-700">{opportunity.status}</Badge>
                          </div>
                          <p className="mt-2 break-words text-sm font-semibold">{opportunity.title}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-zinc-500">{opportunity.nextStep}</p>
                        </div>
                      ))}
                      {selectedOpportunities.length === 0 && <p className="text-sm text-zinc-500">尚未进入机会池</p>}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeView === "证据库" && (
            <section className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-xl font-semibold">历史信息库</h2>
              <p className="mt-1 text-sm text-zinc-500">核心证据 {coreEvidenceCount} · 参考信息 {referenceEvidenceCount} · 最近更新 {lastUpdatedTime}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_160px]">
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500"
                  placeholder="搜索标题、摘要、来源或原始标题"
                />
                <select
                  value={historyCategory}
                  onChange={(event) => setHistoryCategory(event.target.value)}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500"
                >
                  {["全部", ...sourceCategories].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={historyPriority}
                  onChange={(event) => setHistoryPriority(event.target.value as "全部" | DisplayPriority)}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500"
                >
                  {["全部", "P0", "P1", "P2", "P3"].map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <div className="mt-5 grid gap-3">
                {visibleHistory.map((item) => (
                  <article key={item.id} className="rounded-md border border-zinc-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <SourceTagRow tags={item.sourceTags} />
                        <h3 className="mt-3 break-words text-base font-semibold">{item.title}</h3>
                        <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge className={item.role === "核心证据" ? "border-teal-200 bg-teal-50 text-teal-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}>
                            {item.role}
                          </Badge>
                          <Badge className={displayPriorityStyles[item.displayPriority]}>{item.displayPriority}</Badge>
                        </div>
                        <SourceDisclosure url={item.url} originalTitle={item.originalTitle} className="mt-3" />
                      </div>
                      <div className="min-w-36 text-sm text-zinc-500">
                        <p>{item.source}</p>
                        <p className="mt-1">{item.time}</p>
                      </div>
                    </div>
                  </article>
                ))}
                {visibleHistory.length === 0 && (
                  <div className="rounded-md border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                    没有匹配的信息
                  </div>
                )}
              </div>
            </section>
          )}

          {activeView === "机会池" && (
            <section className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-xl font-semibold">增长机会池</h2>
              <p className="mt-1 text-sm text-zinc-500">机会 {intelligence.opportunities.length} · 验证中 {validatingOpportunityCount} · 待评估 {waitingOpportunityCount}</p>
              <div className="mt-5 grid gap-4">
                {intelligence.opportunities.map((opportunity) => (
                  <article key={opportunity.id} className="rounded-md border border-zinc-200 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={maturityStyles[inferOpportunityMaturity(opportunity)]}>{inferOpportunityMaturity(opportunity)}</Badge>
                          <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">{opportunity.type}</Badge>
                          <Badge className="border-amber-200 bg-amber-50 text-amber-800">{opportunity.feasibility}</Badge>
                          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">{opportunity.status}</Badge>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{opportunity.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">{opportunity.nextStep}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {opportunity.actions.map((action) => (
                            <span key={action} className="rounded bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid min-w-64 gap-2 rounded-md bg-zinc-50 p-3 text-sm">
                        <p><span className="font-semibold">推荐周期：</span>{opportunity.cycle}</p>
                        <p><span className="font-semibold">负责人：</span>{opportunity.owner}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "标签体系" && (
            <div className="grid gap-5">
              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h2 className="text-xl font-semibold">信源标签体系</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  信息卡上的标签只回答“这条信息从哪里来”，不直接代表优先级、成熟度或机会价值。每条信息最多展示 4 个信源标签。
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {sourceTagDefinitions.map(([title, body]) => (
                    <div key={title} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">标签示例</h2>
                  <div className="mt-5 grid gap-4">
                    {[
                      ["竞品官方信源", ["竞品情报", "官网/价格页", "Surfshark", "美国"], "说明这条信息来自竞品自己的可控阵地，适合观察其产品、定价、内容和品牌表达。"],
                      ["用户论坛声音", ["用户声音", "论坛/社区", "Reddit", "德国"], "说明这条信息来自用户主动讨论，适合判断真实需求、限制原因和使用动机。"],
                      ["搜索信号", ["SEO搜索", "搜索结果", "Google SERP", "英国"], "说明这条信息来自搜索结果或关键词监控，适合观察流量竞争和内容入口。"],
                    ].map(([title, tags, body]) => (
                      <div key={title as string} className="rounded-md border border-zinc-200 p-4">
                        <SourceTagRow tags={tags as string[]} />
                        <p className="mt-3 text-sm font-semibold">{title}</p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">使用原则</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["少量", "同一条信息不堆叠过多标签，优先保留能帮助运营判断来源的字段。"],
                      ["稳定", "标签不随系统评分频繁变化，避免今天叫机会、明天叫风险。"],
                      ["可追溯", "标签必须能回到具体信源或信息内容，不能凭主观感觉添加。"],
                      ["和评级分离", "P0-P3、L0-L5 是判断标签；信源标签只说明来源，不说明好坏。"],
                    ].map(([title, body]) => (
                      <div key={title} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeView === "规则模型" && (
            <div className="grid gap-5">
              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h2 className="text-xl font-semibold">数据模型与规则</h2>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {[
                    ["Item 原始信息", "单条 RSS、页面变化、Google Alerts、Reddit 原帖或媒体文章，默认 L0。"],
                    ["Event 重点事件", "高优先级 L0，例如政策变化、竞品价格变化、服务器扩容或平台规则变化。"],
                    ["Phenomenon 现象", "多条信息指向同一外部现象，可进入 L1/L2 候选洞察池。"],
                    ["Insight 洞察", "经过人工评审并有验证方案、负责人和成功指标，进入 L3+。"],
                    ["Demand Object", "赛事、流媒体、游戏等会触发 VPN 需求的对象化市场。"],
                    ["Source 信源", "包含分类、颗粒度、国家、竞品、抓取方式、频率和质量状态。"],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">洞察成熟度 L0-L5</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["L0", "信息", "单条信息，尚未验证，不强行解释用户行为。"],
                      ["L1", "信号", "多条信息指向同一现象，但解释链还不完整。"],
                      ["L2", "候选洞察", "具备需求、限制、VPN 相关性、频率和可信来源。"],
                      ["L3", "有效洞察", "人工评审通过，有验证方案、负责人和成功指标。"],
                      ["L4", "已验证洞察", "已执行验证并拿到数据反馈。"],
                      ["L5", "增长洞察", "多次验证有效，可复用为增长方法。"],
                    ].map(([level, title, body]) => (
                      <div key={level} className="rounded-md border border-zinc-200 p-4">
                        <Badge className={maturityStyles[level as MaturityLevel]}>{level}</Badge>
                        <p className="mt-2 text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">信息优先级 P0-P3</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["P0", "重大事件", "需要立即关注，可能影响市场、产品、合规或运营。"],
                      ["P1", "重要变化", "值得进入每日看板重点展示，但不一定立即行动。"],
                      ["P2", "常规动态", "有记录价值，但不进入首页重点位。"],
                      ["P3", "低价值信息", "默认归档或折叠，需人工抽检。"],
                    ].map(([level, title, body]) => (
                      <div key={level} className="rounded-md border border-zinc-200 p-4">
                        <Badge className={displayPriorityStyles[level as DisplayPriority]}>{level}</Badge>
                        <p className="mt-2 text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h2 className="text-xl font-semibold">L1 → L2 评分规则</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {["用户需求明确", "限制原因明确", "VPN相关性明确", "热度/频率明显", "来源可信/多源交叉"].map((item) => (
                    <div key={item} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold">{item}</p>
                      <p className="mt-2 text-xs text-zinc-500">0-2 分</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  0-3 分建议 L0 或低价值 L1；4-7 分建议 L1；8-10 分建议 L2。限制原因或 VPN 相关性为 0 时，不自动升 L2。
                </p>
              </section>
            </div>
          )}

          {activeView === "反馈配置" && (
            <div className="grid gap-5">
              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h2 className="text-xl font-semibold">反馈与配置</h2>
                <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500"
                  >
                    {["误判", "重复现象", "低价值", "应升优先级", "应降优先级", "信源无效", "应合并到已有 L3+"].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <input
                    value={feedbackNote}
                    onChange={(event) => setFeedbackNote(event.target.value)}
                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500"
                    placeholder="记录需要修正的主题、证据或规则"
                  />
                  <button
                    type="button"
                    onClick={submitFeedback}
                    className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
                  >
                    记录反馈
                  </button>
                </div>
                <div className="mt-5 grid gap-2">
                  {feedbackLogs.map((log) => (
                    <div key={log} className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{log}</div>
                  ))}
                  {feedbackLogs.length === 0 && <p className="text-sm text-zinc-500">暂无反馈记录</p>}
                </div>
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5">
                <h2 className="text-xl font-semibold">当前 MVP 配置缺口</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[
                    ["已覆盖", "每日更新、6类信源框架、中文摘要、原链接展示、主题聚合、人工修正、机会池。"],
                    ["新补齐", "L0-L5、P0-P3、重点事件池、L2候选洞察、历史筛选、规则模型、反馈记录。"],
                    ["仍需后端", "多人共享人工反馈、信源启停、操作日志、长期历史序列、真正的搜索引擎排名抓取。"],
                    ["下一步建议", "把 source-rules.json 扩展为完整信源库字段，并接入更细的 Reddit/SEO/对象池。"],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeView === "信源状态" && (
            <section className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-xl font-semibold">信源状态</h2>
              <p className="mt-1 text-sm text-zinc-500">信源 {totalSourceCount} · 启用 {activeSourceCount} · 今日正常 {intelligence.status.normalSourceRate}%</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {intelligence.sourceStats.map((source) => (
                  <article key={source.name} className="rounded-md border border-zinc-200 p-4">
                    <div className={`h-2 rounded-full ${source.color}`} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{source.name}</h3>
                        <p className="mt-1 text-sm text-zinc-500">{source.freq}</p>
                      </div>
                      <p className="text-2xl font-semibold">{source.active}</p>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-zinc-100">
                      <div
                        className={`h-2 rounded-full ${source.color}`}
                        style={{ width: `${Math.round((source.active / source.total) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>启用 {source.active}</span>
                      <span>总计 {source.total}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
