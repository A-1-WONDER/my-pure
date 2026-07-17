import dayjs, { type Dayjs } from "dayjs";
import {
  extractDayPowerValueFromResponse,
  extractMonthPowerValueFromResponse,
  extractYearPowerValue,
  getDeviceDayPower,
  getDeviceHourPower,
  getDeviceMonthPower,
  getDeviceYearPower
} from "@/api/business-stats";

export type UsageDimension = "hour" | "day" | "month" | "year";

export type UsageSeriesPoint = {
  label: string;
  power: number;
};

export type UsageSummary = {
  currentHourPower: number;
  todayPower: number;
  currentMonthPower: number;
  currentYearPower: number;
  currentHourLabel: string;
  todayLabel: string;
  currentMonthLabel: string;
  currentYearLabel: string;
};

export type MeterUsageCacheEntry = {
  meterId: number;
  anchorDate: string;
  summary: UsageSummary | null;
  summaryError: string;
  summaryFetchedAt: string;
  hourSeries: UsageSeriesPoint[] | null;
  daySeries: UsageSeriesPoint[] | null;
  monthSeries: UsageSeriesPoint[] | null;
  yearSeries: UsageSeriesPoint[] | null;
  seriesError: Partial<Record<UsageDimension, string>>;
};

const MONTH_TREND_LOOKBACK = 6;
const MONTH_BATCH_SIZE = 2;
const DAY_LOOKBACK = 7;
const DAY_BATCH_SIZE = 4;
const YEAR_LOOKBACK = 2;

/** 会话缓存：key = meterId|YYYY-MM-DD */
const usageCache = new Map<string, MeterUsageCacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function normalizeUsageAnchorDate(date?: string | Date | null): string {
  const d = date ? dayjs(date) : dayjs();
  return (d.isValid() ? d : dayjs()).format("YYYY-MM-DD");
}

function cacheKey(meterId: number, anchorDate: string) {
  return `${meterId}|${normalizeUsageAnchorDate(anchorDate)}`;
}

function emptySummary(anchor: Dayjs): UsageSummary {
  const isToday = anchor.isSame(dayjs(), "day");
  return {
    currentHourPower: 0,
    todayPower: 0,
    currentMonthPower: 0,
    currentYearPower: 0,
    currentHourLabel: isToday ? dayjs().format("HH:00") : "--",
    todayLabel: anchor.format("YYYY-MM-DD"),
    currentMonthLabel: anchor.format("YYYY-MM"),
    currentYearLabel: anchor.format("YYYY")
  };
}

export function getMeterUsageCache(
  meterId: number,
  anchorDate?: string
): MeterUsageCacheEntry {
  const date = normalizeUsageAnchorDate(anchorDate);
  const key = cacheKey(meterId, date);
  let entry = usageCache.get(key);
  if (!entry) {
    entry = {
      meterId,
      anchorDate: date,
      summary: null,
      summaryError: "",
      summaryFetchedAt: "",
      hourSeries: null,
      daySeries: null,
      monthSeries: null,
      yearSeries: null,
      seriesError: {}
    };
    usageCache.set(key, entry);
  }
  return entry;
}

export function invalidateMeterUsageCache(
  meterId?: number,
  anchorDate?: string
) {
  if (meterId == null) {
    usageCache.clear();
    inFlight.clear();
    return;
  }
  if (anchorDate) {
    const key = cacheKey(meterId, anchorDate);
    usageCache.delete(key);
    for (const k of [...inFlight.keys()]) {
      if (
        k.startsWith(`${key}:`) ||
        k === `${meterId}:${normalizeUsageAnchorDate(anchorDate)}:summary`
      ) {
        inFlight.delete(k);
      }
    }
    // also clear inFlight with meterId|date prefix
    const prefix = `${meterId}|${normalizeUsageAnchorDate(anchorDate)}`;
    for (const k of [...inFlight.keys()]) {
      if (k.startsWith(prefix)) inFlight.delete(k);
    }
    return;
  }
  const prefix = `${meterId}|`;
  for (const key of [...usageCache.keys()]) {
    if (key.startsWith(prefix)) usageCache.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(`${meterId}|`) || key.startsWith(`${meterId}:`)) {
      inFlight.delete(key);
    }
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function extractPayload(response: Record<string, any>) {
  return response?.data?.data ?? response?.data ?? response;
}

/** 解析 hour-power 为 24 点；顺带算当日合计与当前小时（历史日则此时为 0） */
export function parseHourPowerSeries(
  response: Record<string, any>,
  anchorDate?: string
): {
  series: UsageSeriesPoint[];
  todaySum: number;
  currentHourPower: number;
} {
  const payload = extractPayload(response);
  const hours = Array.isArray(payload?.hours) ? payload.hours : [];
  const hourMap = new Map<number, number>();

  hours.forEach((item: Record<string, any>) => {
    const hourValue =
      item?.hour !== null && item?.hour !== undefined
        ? Number(item.hour)
        : item?.hourKey
          ? Number(String(item.hourKey).slice(-2))
          : undefined;
    const powerValue = Number(item?.hourPower ?? item?.power ?? 0);
    if (hourValue !== undefined && Number.isFinite(hourValue)) {
      hourMap.set(hourValue, Number.isFinite(powerValue) ? powerValue : 0);
    }
  });

  const series = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    power: Number((hourMap.get(hour) ?? 0).toFixed(2))
  }));
  const todaySum = Number(
    series.reduce((sum, item) => sum + item.power, 0).toFixed(2)
  );
  const anchor = dayjs(normalizeUsageAnchorDate(anchorDate));
  const isToday = anchor.isSame(dayjs(), "day");
  const currentHour = isToday ? dayjs().hour() : -1;
  return {
    series,
    todaySum,
    currentHourPower: currentHour >= 0 ? (series[currentHour]?.power ?? 0) : 0
  };
}

async function withInFlight<T>(
  key: string,
  runner: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = runner().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** 预取摘要四卡（相对 anchorDate） */
export async function prefetchMeterUsageSummary(
  meterId: number,
  anchorDate?: string
): Promise<MeterUsageCacheEntry> {
  const date = normalizeUsageAnchorDate(anchorDate);
  const entry = getMeterUsageCache(meterId, date);
  if (entry.summary) {
    return entry;
  }

  const anchor = dayjs(date);
  return withInFlight(`${meterId}|${date}:summary`, async () => {
    const summary = emptySummary(anchor);
    const yearMonth = anchor.format("YYYYMM");
    const year = anchor.format("YYYY");
    const errors: string[] = [];

    const settled = await Promise.allSettled([
      getDeviceHourPower(meterId, date),
      getDeviceDayPower(meterId, date),
      getDeviceMonthPower(meterId, yearMonth),
      getDeviceYearPower(meterId, year)
    ]);

    if (settled[0].status === "fulfilled") {
      const parsed = parseHourPowerSeries(
        settled[0].value as Record<string, any>,
        date
      );
      entry.hourSeries = parsed.series;
      summary.currentHourPower = parsed.currentHourPower;
      summary.todayPower = parsed.todaySum;
    } else {
      errors.push("时");
      console.warn("摘要小时用电失败:", settled[0].reason);
    }

    if (settled[1].status === "fulfilled") {
      const dayPower = extractDayPowerValueFromResponse(
        settled[1].value as Record<string, any>
      );
      if (Number.isFinite(dayPower) && dayPower > 0) {
        summary.todayPower = Number(dayPower.toFixed(2));
      }
    } else {
      errors.push("日");
      console.warn("摘要日用电失败:", settled[1].reason);
    }

    if (settled[2].status === "fulfilled") {
      summary.currentMonthPower = Number(
        extractMonthPowerValueFromResponse(
          settled[2].value as Record<string, any>
        ).toFixed(2)
      );
    } else {
      errors.push("月");
      console.warn("摘要月用电失败:", settled[2].reason);
    }

    if (settled[3].status === "fulfilled") {
      summary.currentYearPower = Number(
        extractYearPowerValue(settled[3].value as Record<string, any>).toFixed(
          2
        )
      );
    } else {
      errors.push("年");
      console.warn("摘要年用电失败:", settled[3].reason);
    }

    entry.summary = summary;
    entry.summaryFetchedAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
    entry.summaryError =
      errors.length >= 4
        ? "用量摘要加载失败"
        : errors.length
          ? `部分摘要加载失败（${errors.join("/")}）`
          : "";
    return entry;
  });
}

async function loadHourSeries(
  meterId: number,
  entry: MeterUsageCacheEntry,
  date: string
) {
  if (entry.hourSeries?.length) return;
  const response = await getDeviceHourPower(meterId, date);
  const parsed = parseHourPowerSeries(response as Record<string, any>, date);
  entry.hourSeries = parsed.series;
  if (entry.summary) {
    entry.summary.currentHourPower = parsed.currentHourPower;
    if (!entry.summary.todayPower) {
      entry.summary.todayPower = parsed.todaySum;
    }
  }
}

async function loadDaySeries(
  meterId: number,
  entry: MeterUsageCacheEntry,
  date: string
) {
  if (entry.daySeries?.length) return;
  const end = dayjs(date);
  const days = Array.from({ length: DAY_LOOKBACK }, (_, index) =>
    end.subtract(DAY_LOOKBACK - 1 - index, "day")
  );
  const points: UsageSeriesPoint[] = [];
  for (const chunk of chunkArray(days, DAY_BATCH_SIZE)) {
    const settled = await Promise.allSettled(
      chunk.map(async d => {
        const day = d.format("YYYY-MM-DD");
        const res = await getDeviceDayPower(meterId, day);
        return {
          label: d.format("MM-DD"),
          power: Number(
            extractDayPowerValueFromResponse(
              res as Record<string, any>
            ).toFixed(2)
          )
        };
      })
    );
    settled.forEach((result, index) => {
      const d = chunk[index];
      if (result.status === "fulfilled") {
        points.push(result.value);
      } else {
        points.push({ label: d.format("MM-DD"), power: 0 });
      }
    });
  }
  entry.daySeries = points;
}

async function loadMonthSeries(
  meterId: number,
  entry: MeterUsageCacheEntry,
  date: string
) {
  if (entry.monthSeries?.length) return;
  const end = dayjs(date);
  const months = Array.from({ length: MONTH_TREND_LOOKBACK }, (_, index) =>
    end.subtract(MONTH_TREND_LOOKBACK - 1 - index, "month")
  );
  const points: UsageSeriesPoint[] = [];
  for (const chunk of chunkArray(months, MONTH_BATCH_SIZE)) {
    const settled = await Promise.allSettled(
      chunk.map(async m => {
        const res = await getDeviceMonthPower(meterId, m.format("YYYYMM"));
        return {
          label: m.format("YYYY-MM"),
          power: Number(
            extractMonthPowerValueFromResponse(
              res as Record<string, any>
            ).toFixed(2)
          )
        };
      })
    );
    settled.forEach((result, index) => {
      const m = chunk[index];
      if (result.status === "fulfilled") {
        points.push(result.value);
      } else {
        points.push({ label: m.format("YYYY-MM"), power: 0 });
      }
    });
  }
  entry.monthSeries = points;
  if (entry.summary) {
    const current = end.format("YYYY-MM");
    const hit = points.find(p => p.label === current);
    if (hit) entry.summary.currentMonthPower = hit.power;
  }
}

async function loadYearSeries(
  meterId: number,
  entry: MeterUsageCacheEntry,
  date: string
) {
  if (entry.yearSeries?.length) return;
  const end = dayjs(date);
  const years = Array.from({ length: YEAR_LOOKBACK }, (_, index) =>
    end.subtract(YEAR_LOOKBACK - 1 - index, "year")
  );
  const settled = await Promise.allSettled(
    years.map(async y => {
      const res = await getDeviceYearPower(meterId, y.format("YYYY"));
      return {
        label: y.format("YYYY"),
        power: Number(
          extractYearPowerValue(res as Record<string, any>).toFixed(2)
        )
      };
    })
  );
  entry.yearSeries = settled.map((result, index) => {
    const y = years[index];
    if (result.status === "fulfilled") return result.value;
    return { label: y.format("YYYY"), power: 0 };
  });
  if (entry.summary) {
    const current = end.format("YYYY");
    const hit = entry.yearSeries.find(p => p.label === current);
    if (hit) entry.summary.currentYearPower = hit.power;
  }
}

/** 按维度懒加载曲线（相对 anchorDate） */
export async function ensureMeterUsageSeries(
  meterId: number,
  dimension: UsageDimension,
  anchorDate?: string
): Promise<MeterUsageCacheEntry> {
  const date = normalizeUsageAnchorDate(anchorDate);
  const entry = getMeterUsageCache(meterId, date);
  const key = `${meterId}|${date}:series:${dimension}`;

  return withInFlight(key, async () => {
    try {
      if (dimension === "hour") await loadHourSeries(meterId, entry, date);
      else if (dimension === "day") await loadDaySeries(meterId, entry, date);
      else if (dimension === "month")
        await loadMonthSeries(meterId, entry, date);
      else await loadYearSeries(meterId, entry, date);
      delete entry.seriesError[dimension];
    } catch (error) {
      console.warn(`加载${dimension}曲线失败:`, error);
      entry.seriesError[dimension] = "曲线数据加载失败";
    }
    return entry;
  });
}

export function getSeriesForDimension(
  entry: MeterUsageCacheEntry,
  dimension: UsageDimension
): UsageSeriesPoint[] {
  if (dimension === "hour") return entry.hourSeries ?? [];
  if (dimension === "day") return entry.daySeries ?? [];
  if (dimension === "month") return entry.monthSeries ?? [];
  return entry.yearSeries ?? [];
}
