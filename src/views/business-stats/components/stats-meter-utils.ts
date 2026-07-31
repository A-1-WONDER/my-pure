import { getMeterList } from "@/api/meters";
import { getCollectorList } from "@/api/collector";
import {
  DAY_POWER_BATCH_SIZE,
  STATS_METER_PAGE_SIZE,
  countStatsDevices,
  extractDayPowerValueFromResponse,
  extractMeterRowsFromApiResponse,
  getDeviceDayPowerBatch,
  resolveMeterRowDeviceId,
  type StatsDisplayData
} from "@/api/business-stats";
import {
  buildCollectorOnlineMap,
  unwrapCollectorListRows
} from "@/views/monitor2/utils/device-online-status";

export type CollectorOption = {
  id: number;
  label: string;
  /** 采集器安装位置（明细「通讯地址」用） */
  installAddress?: string;
};

/** 跨「查看明细」弹窗复用，避免每次点开都重拉档案 */
const DETAIL_ARCHIVE_TTL_MS = 5 * 60 * 1000;
const STATS_METER_TIMEOUT_MS = 60000;

type MeterRowsCache = { at: number; rows: Record<string, any>[] };
type CollectorArchiveCache = {
  at: number;
  options: CollectorOption[];
  onlineMap: Map<number, number>;
};

const meterRowsCacheByType = new Map<string, MeterRowsCache>();
let collectorArchiveCache: CollectorArchiveCache | null = null;
const meterRowsInflight = new Map<string, Promise<Record<string, any>[]>>();
let collectorArchiveInflight: Promise<CollectorArchiveCache> | null = null;

/** 将数组按固定大小切块（用于批量日用电等） */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function mapCollectorOptions(list: Record<string, any>[]): CollectorOption[] {
  return list
    .map((item: Record<string, any>) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) return null;
      const label =
        item.collectorName ||
        item.name ||
        item.collectorNo ||
        item.code ||
        `采集器${id}`;
      const installAddress = String(
        item.installAddress ?? item.location ?? ""
      ).trim();
      return {
        id,
        label: String(label),
        installAddress: installAddress || undefined
      };
    })
    .filter((item): item is CollectorOption => item != null);
}

/** 用量统计参与计算的电表档案（≤100 表场景一次拉全；带短缓存） */
export async function loadStatsMeterRows(meterType?: string) {
  const key = meterType || "__all__";
  const hit = meterRowsCacheByType.get(key);
  if (hit && Date.now() - hit.at < DETAIL_ARCHIVE_TTL_MS) {
    return hit.rows;
  }
  const inflight = meterRowsInflight.get(key);
  if (inflight) return inflight;

  const promise = getMeterList(
    {
      page: 1,
      size: STATS_METER_PAGE_SIZE,
      meterType: meterType || undefined
    },
    STATS_METER_TIMEOUT_MS
  )
    .then(response => {
      const rows = extractMeterRowsFromApiResponse(
        response as Record<string, any>
      ).filter(
        (item: Record<string, any>) => resolveMeterRowDeviceId(item) != null
      );
      meterRowsCacheByType.set(key, { at: Date.now(), rows });
      return rows;
    })
    .finally(() => {
      meterRowsInflight.delete(key);
    });

  meterRowsInflight.set(key, promise);
  return promise;
}

async function loadCollectorArchive(): Promise<CollectorArchiveCache> {
  if (
    collectorArchiveCache &&
    Date.now() - collectorArchiveCache.at < DETAIL_ARCHIVE_TTL_MS
  ) {
    return collectorArchiveCache;
  }
  if (collectorArchiveInflight) return collectorArchiveInflight;

  collectorArchiveInflight = getCollectorList(
    { page: 1, pageSize: 200 },
    STATS_METER_TIMEOUT_MS
  )
    .then(res => {
      const rows = unwrapCollectorListRows(res as Record<string, unknown>);
      const payload: CollectorArchiveCache = {
        at: Date.now(),
        options: mapCollectorOptions(rows as Record<string, any>[]),
        onlineMap: buildCollectorOnlineMap(rows)
      };
      collectorArchiveCache = payload;
      return payload;
    })
    .finally(() => {
      collectorArchiveInflight = null;
    });

  return collectorArchiveInflight;
}

/** 采集器下拉选项（多选筛选用；含安装位置供明细通讯地址） */
export async function loadCollectorOptions(): Promise<CollectorOption[]> {
  const archive = await loadCollectorArchive();
  return archive.options;
}

/** 明细弹窗：电表档案 + 采集器名称/在线态（并行 + 跨弹窗缓存） */
export async function loadDetailArchiveContext(meterType?: string) {
  const [meterRows, collectors] = await Promise.all([
    loadStatsMeterRows(meterType || undefined).catch(
      () => [] as Record<string, any>[]
    ),
    loadCollectorArchive().catch(
      (): CollectorArchiveCache => ({
        at: 0,
        options: [],
        onlineMap: new Map()
      })
    )
  ]);

  const collectorById = new Map(
    collectors.options.map(item => [
      item.id,
      { label: item.label, installAddress: item.installAddress }
    ])
  );

  return {
    byId: buildMeterArchiveMap(meterRows),
    byNo: buildMeterArchiveByNoMap(meterRows),
    collectorById,
    collectorOnline: collectors.onlineMap
  };
}

/** 未选采集器 = 全部；已选 = 仅保留 collectorId 落在集合内的电表 */
export function filterMetersByCollectorIds(
  meterRows: Record<string, any>[],
  collectorIds?: number[] | null
) {
  if (!collectorIds?.length) return meterRows;
  const allowed = new Set(collectorIds.map(Number));
  return meterRows.filter(row => allowed.has(Number(row.collectorId)));
}

export function meterIdsFromRows(
  meterRows: Record<string, any>[]
): Set<number> {
  return new Set(
    meterRows
      .map(row => resolveMeterRowDeviceId(row))
      .filter((id): id is number => id != null)
  );
}

/** 按电表 id 过滤统计行（summary 结果二次收窄） */
export function filterStatsByMeterIds(
  rows: StatsDisplayData[],
  allowedIds: Set<number>
): StatsDisplayData[] {
  if (!allowedIds.size) return rows;
  return rows
    .map(row => {
      const meterStats = (row.meterStats || []).filter(item =>
        allowedIds.has(Number(item.meterId))
      );
      const totalConsumption = meterStats.reduce(
        (sum, item) => sum + Number(item.totalConsumption || 0),
        0
      );
      return {
        ...row,
        meterStats,
        totalConsumption: Number(totalConsumption.toFixed(2)),
        deviceCount: countStatsDevices(meterStats)
      };
    })
    .filter(row => row.meterStats.length > 0 || row.totalConsumption > 0);
}

/**
 * 按电表类型 + 多选采集器得到参与统计的电表，并返回允许的 meterId 集合。
 * 未选采集器时返回全部电表（allowedIds 为全量 id）。
 */
export async function loadScopedStatsMeters(options?: {
  meterType?: string;
  collectorIds?: number[] | null;
}) {
  const all = await loadStatsMeterRows(options?.meterType || undefined);
  const meterRows = filterMetersByCollectorIds(all, options?.collectorIds);
  return {
    meterRows,
    allowedIds: meterIdsFromRows(meterRows)
  };
}

export function buildMeterArchiveMap(
  meterRows: Record<string, any>[]
): Map<number, Record<string, any>> {
  const map = new Map<number, Record<string, any>>();
  for (const row of meterRows) {
    const id = resolveMeterRowDeviceId(row);
    if (id != null) map.set(id, row);
  }
  return map;
}

/** 额外按表号索引，便于小时统计 mid 映射失败时仍能对上档案 */
export function buildMeterArchiveByNoMap(
  meterRows: Record<string, any>[]
): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>();
  for (const row of meterRows) {
    const no = String(row.meterNo ?? "").trim();
    if (no) map.set(no, row);
  }
  return map;
}

/** 采集器列展示：名称优先，编号次之 */
export function formatCollectorDisplay(row: {
  collectorName?: string | null;
  collectorNo?: string | null;
  collectorId?: number | string | null;
}): string {
  const name = String(row.collectorName ?? "").trim();
  if (name) return name;
  const no = String(row.collectorNo ?? "").trim();
  if (no) return no;
  if (row.collectorId != null && row.collectorId !== "") {
    return `采集器${row.collectorId}`;
  }
  return "-";
}

function extractBatchDayPowerItems(
  res: Record<string, any>
): Record<string, any>[] {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

/** 指定日期：批量拉取多表日用电（每批最多 100 表，顺序请求各批） */
export async function fetchMeterDayStatsForDate(
  meterRows: Record<string, any>[],
  date: string
): Promise<
  Array<{ meterId: number; meterNo: string; totalConsumption: number }>
> {
  const pairs = meterRows
    .map(row => ({ row, deviceId: resolveMeterRowDeviceId(row) }))
    .filter(
      (p): p is { row: Record<string, any>; deviceId: number } =>
        p.deviceId != null
    );

  const stats: Array<{
    meterId: number;
    meterNo: string;
    totalConsumption: number;
  }> = [];

  for (const chunk of chunkArray(pairs, DAY_POWER_BATCH_SIZE)) {
    const deviceIds = chunk.map(p => p.deviceId);
    const res = (await getDeviceDayPowerBatch(deviceIds, date)) as Record<
      string,
      any
    >;
    const items = extractBatchDayPowerItems(res);
    const powerById = new Map<number, number>();
    for (const item of items) {
      const id = Number(item.deviceId);
      if (!Number.isFinite(id)) continue;
      powerById.set(id, extractDayPowerValueFromResponse(item));
    }
    for (const { row, deviceId } of chunk) {
      const raw = powerById.get(deviceId);
      const totalConsumption =
        raw !== undefined && Number.isFinite(raw) ? Number(raw) : 0;
      stats.push({
        meterId: deviceId,
        meterNo: String(row.meterNo ?? row.meterName ?? deviceId),
        totalConsumption
      });
    }
  }

  return stats;
}

/** 按批次执行异步任务，控制并发（用于明细补状态、月年回退等） */
export async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (const batch of chunkArray(items, batchSize)) {
    const settled = await Promise.allSettled(batch.map(worker));
    results.push(...settled);
  }
  return results;
}

/** 与 chunkArray 同义，兼容月/年统计页命名 */
export const chunkMeters = chunkArray;
