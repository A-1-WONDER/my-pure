import { getMeterList } from "@/api/meters";
import { getCollectorList } from "@/api/collector";
import {
  DAY_POWER_BATCH_SIZE,
  STATS_METER_PAGE_SIZE,
  extractDayPowerValueFromResponse,
  extractMeterRowsFromApiResponse,
  getDeviceDayPowerBatch,
  resolveMeterRowDeviceId,
  type StatsDisplayData
} from "@/api/business-stats";

export type CollectorOption = {
  id: number;
  label: string;
};

/** 将数组按固定大小切块（用于批量日用电等） */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** 用量统计参与计算的电表档案（≤100 表场景一次拉全） */
export async function loadStatsMeterRows(meterType?: string) {
  const response = await getMeterList({
    page: 1,
    size: STATS_METER_PAGE_SIZE,
    meterType: meterType || undefined
  });
  return extractMeterRowsFromApiResponse(
    response as Record<string, any>
  ).filter(
    (item: Record<string, any>) => resolveMeterRowDeviceId(item) != null
  );
}

/** 采集器下拉选项（多选筛选用） */
export async function loadCollectorOptions(): Promise<CollectorOption[]> {
  const res = (await getCollectorList({
    page: 1,
    size: 200
  })) as Record<string, any>;
  const list =
    res?.content ?? res?.data?.content ?? res?.data?.list ?? res?.list ?? [];
  if (!Array.isArray(list)) return [];

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
      return { id, label: String(label) };
    })
    .filter((item): item is CollectorOption => item != null);
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
        deviceCount: meterStats.length
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
      const totalConsumption = powerById.get(deviceId);
      if (
        totalConsumption === undefined ||
        !Number.isFinite(totalConsumption)
      ) {
        continue;
      }
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
