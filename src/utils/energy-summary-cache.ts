import {
  getEnergyStatisticsSummary,
  transformStatsData,
  unwrapEnergyStatisticsSummaryResponse,
  type EnergyStatisticsSummaryDto,
  type EnergyStatsQueryParams,
  type StatsDimension,
  type StatsDisplayData
} from "@/api/business-stats";

const SESSION_PREFIX = "energy-summary:v1:";
const TTL_MS: Record<StatsDimension, number> = {
  hour: 5 * 60 * 1000,
  day: 10 * 60 * 1000,
  month: 30 * 60 * 1000,
  year: 30 * 60 * 1000
};

type CacheEntry = {
  at: number;
  apiData: EnergyStatisticsSummaryDto;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StatsDisplayData[]>>();
const revalidating = new Set<string>();

export function buildEnergySummaryCacheKey(
  params: EnergyStatsQueryParams
): string {
  const ignoreRadio = params.ignoreRadio ?? 0;
  return `${params.dimension}|${params.startTime}|${params.endTime}|${ignoreRadio}`;
}

function isFresh(entry: CacheEntry, dimension: StatsDimension): boolean {
  return Date.now() - entry.at <= TTL_MS[dimension];
}

function readSession(key: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.apiData?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, entry: CacheEntry) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(entry));
  } catch {
    // 数据过大或隐私模式，忽略
  }
}

function readCacheEntry(params: EnergyStatsQueryParams): CacheEntry | null {
  const key = buildEnergySummaryCacheKey(params);
  const mem = memoryCache.get(key);
  if (mem && isFresh(mem, params.dimension)) return mem;

  const stored = readSession(key);
  if (stored && isFresh(stored, params.dimension)) {
    memoryCache.set(key, stored);
    return stored;
  }
  return null;
}

export function getEnergySummaryDisplayFromCache(
  params: EnergyStatsQueryParams
): StatsDisplayData[] | null {
  const entry = readCacheEntry(params);
  if (!entry) return null;
  return transformStatsData(entry.apiData);
}

export function setEnergySummaryCache(
  params: EnergyStatsQueryParams,
  apiData: EnergyStatisticsSummaryDto
) {
  const key = buildEnergySummaryCacheKey(params);
  const entry: CacheEntry = { at: Date.now(), apiData };
  memoryCache.set(key, entry);
  writeSession(key, entry);
}

async function fetchFreshSummary(
  params: EnergyStatsQueryParams,
  timeoutMs?: number
): Promise<StatsDisplayData[]> {
  const key = buildEnergySummaryCacheKey(params);
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const response = (await getEnergyStatisticsSummary(
      params,
      timeoutMs
    )) as Record<string, unknown>;
    const payload = unwrapEnergyStatisticsSummaryResponse(response);
    if (!payload) {
      throw new Error("未获取到用电量汇总数据");
    }
    setEnergySummaryCache(params, payload);
    return transformStatsData(payload);
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

function scheduleRevalidate(
  params: EnergyStatsQueryParams,
  timeoutMs: number | undefined,
  onRevalidated?: (rows: StatsDisplayData[]) => void
) {
  const key = buildEnergySummaryCacheKey(params);
  if (revalidating.has(key)) return;
  revalidating.add(key);

  void fetchFreshSummary(params, timeoutMs)
    .then(rows => {
      onRevalidated?.(rows);
    })
    .catch(() => {
      // 后台刷新失败时保留旧缓存
    })
    .finally(() => {
      revalidating.delete(key);
    });
}

export type LoadEnergySummaryOptions = {
  timeoutMs?: number;
  /** 为 true 时不先读缓存，强制走网络（如用户点击「查询」） */
  force?: boolean;
  /** 命中缓存后在后台静默刷新，完成后回调 */
  onRevalidated?: (rows: StatsDisplayData[]) => void;
};

/**
 * 优先返回缓存（用量统计页与首页共享），可选后台 revalidate。
 */
export async function loadEnergySummaryDisplay(
  params: EnergyStatsQueryParams,
  options: LoadEnergySummaryOptions = {}
): Promise<{ rows: StatsDisplayData[]; fromCache: boolean }> {
  const cached = !options.force
    ? getEnergySummaryDisplayFromCache(params)
    : null;

  if (cached) {
    scheduleRevalidate(params, options.timeoutMs, options.onRevalidated);
    return { rows: cached, fromCache: true };
  }

  const rows = await fetchFreshSummary(params, options.timeoutMs);
  return { rows, fromCache: false };
}

/** 是否有可用缓存（用于决定是否展示 blocking loading） */
export function hasEnergySummaryCache(params: EnergyStatsQueryParams): boolean {
  return getEnergySummaryDisplayFromCache(params) != null;
}
