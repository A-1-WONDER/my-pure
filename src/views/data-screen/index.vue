<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick
} from "vue";
import { useRouter } from "vue-router";
import { useFullscreen } from "@vueuse/core";
import dayjs from "dayjs";
import * as echarts from "echarts";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { getCollectorList } from "@/api/collector";
import { getEladminUserPage } from "@/api/system";
import type { AlarmEvent } from "@/api/types";
import { getAlarmEventQueryList } from "@/api/alarm";
import { getMeterList } from "@/api/meters";
import {
  getEnergyStatisticsSummary,
  transformStatsData,
  unwrapEnergyStatisticsSummaryResponse,
  extractMeterRowsFromApiResponse,
  extractDayPowerValueFromResponse,
  resolveMeterRowDeviceId,
  getDeviceDayPower,
  getDeviceHourPower,
  generateTimeParams,
  type EnergyStatsQueryParams,
  type StatsDimension,
  type StatsDisplayData,
  type MeterStatItem
} from "@/api/business-stats";
import CloseLine from "~icons/ri/close-line";
import FullscreenExitLine from "~icons/ri/fullscreen-exit-line";
import FullscreenLine from "~icons/ri/fullscreen-line";
import WaterIcon from "~icons/ri/contrast-drop-2-line";
import ElectricIcon from "~icons/ri/flashlight-line";
import UserIcon from "~icons/ri/user-line";
import DashboardLine from "~icons/ri/dashboard-3-line";
import RouterLine from "~icons/ri/router-line";
import AlarmWarningLine from "~icons/ri/alarm-warning-line";
import {
  ALARM_GROUP_ORDER,
  getAlarmGroupLabel,
  getAlarmLevelLabel,
  getAlarmTypeLabel
} from "@/views/nested/alarm/constants";

type CollectorEventRow = {
  collectorNo: string;
  event: "上线" | "下线";
  eventTime: string;
  minutesAgo: string;
};

type CollectorRankRow = {
  rank: number;
  collectorNo: string;
  consumption: number;
};

defineOptions({
  name: "DataScreen"
});

const router = useRouter();
const { isFullscreen, toggle: toggleScreenFullscreen } = useFullscreen();

/**
 * 月/年统计仅走汇总接口（后端 Redis：energy:summary:month:...）
 * GET /api/external/energy-statistics/summary
 */
const ENERGY_SUMMARY_TIMEOUT_MS = 120000;
const SUMMARY_SERIES_CACHE_MS = 10 * 60 * 1000;
const DATA_SCREEN_WEB_FS_CLASS = "data-screen-web-fullscreen";

const summarySeriesCache = new Map<
  string,
  { at: number; rows: StatsDisplayData[] }
>();

/** 图表 / KPI：近 4 个自然月（含四月等稍早月份；过大范围易触发 120s 超时） */
const buildMonthChartSummaryParams = () => {
  const endTime = dayjs().format("YYYYMM");
  const startTime = dayjs().subtract(3, "month").format("YYYYMM");
  const chartMonthKeys: string[] = [];
  let cur = dayjs(`${startTime.slice(0, 4)}-${startTime.slice(4, 6)}-01`);
  const end = dayjs(`${endTime.slice(0, 4)}-${endTime.slice(4, 6)}-01`);
  while (!cur.isAfter(end, "month")) {
    chartMonthKeys.push(cur.format("YYYYMM"));
    cur = cur.add(1, "month");
  }
  return {
    params: {
      dimension: "month" as StatsDimension,
      startTime,
      endTime,
      ignoreRadio: 0 as const
    },
    chartMonthKeys
  };
};

const buildSingleMonthSummaryParams = (
  yearMonth: string
): EnergyStatsQueryParams => ({
  dimension: "month",
  startTime: yearMonth,
  endTime: yearMonth,
  ignoreRadio: 0
});

/** 顶部 KPI 用：本月 + 上月，共 2 个月 */
const buildMonthKpiSummaryParams = () => {
  const endTime = dayjs().format("YYYYMM");
  const startTime = dayjs().subtract(1, "month").format("YYYYMM");
  return {
    dimension: "month" as StatsDimension,
    startTime,
    endTime,
    ignoreRadio: 0 as const
  };
};

/** 月汇总缓存行（图表 3 月；同比单月另查后合并） */
const monthSummaryAllRows = ref<StatsDisplayData[]>([]);

const WEEKDAY_ZH = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六"
];
const clockDate = ref(dayjs().format("YYYY-MM-DD"));
const clockTime = ref(dayjs().format("HH:mm:ss"));
const clockWeekday = ref(WEEKDAY_ZH[dayjs().day()]);

const tickClock = () => {
  const now = dayjs();
  clockDate.value = now.format("YYYY-MM-DD");
  clockTime.value = now.format("HH:mm:ss");
  clockWeekday.value = WEEKDAY_ZH[now.day()];
};

let clockTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const basicInfoLoading = ref(false);
const waterMeterCount = ref(0);
const electricMeterCount = ref(0);
const userCount = ref(0);

const collectorLoading = ref(false);
const collectorCount = ref(0);
const collectorOnlineCount = ref(0);
const collectorOfflineCount = ref(0);
const collectorEventList = ref<CollectorEventRow[]>([]);
const collectorRows = ref<Record<string, unknown>[]>([]);

const powerLoading = ref(false);
const powerToday = ref(0);
const powerYesterday = ref(0);
const powerThisMonth = ref(0);
const powerLastMonth = ref(0);
const POWER_SUMMARY_CACHE_KEY = "welcome:power-summary:v1";
const POWER_SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;

const energyDimension = ref<StatsDimension>("day");
const energyStatsLoading = ref(false);
const energyStatsList = ref<StatsDisplayData[]>([]);

const yoyPercent = ref("—");
const momPercent = ref("—");
const energyCurrentLabel = ref("当日用电量");
const energyCurrentValue = ref(0);
const energyRankTitle = ref("今日用电量排名");
const energyRankList = ref<CollectorRankRow[]>([]);
const rankLoading = ref(false);

let cachedMeters: Record<string, unknown>[] | null = null;

const alarmLoading = ref(false);
const alarmList = ref<AlarmEvent[]>([]);

const collectorPieRef = ref<HTMLElement>();
const energyChartRef = ref<HTMLElement>();
const alarmPieRef = ref<HTMLElement>();
let collectorPieChart: echarts.ECharts | null = null;
let energyChart: echarts.ECharts | null = null;
let alarmPieChart: echarts.ECharts | null = null;

const dimensionTabs: { label: string; value: StatsDimension }[] = [
  { label: "时", value: "hour" },
  { label: "日", value: "day" },
  { label: "月", value: "month" }
];

const energyYoyTip = computed(() => {
  switch (energyDimension.value) {
    case "hour":
      return "同比：上一小时 vs 昨日同一小时";
    case "day":
      return "同比：今日用电量 vs 去年同日";
    case "month":
      return "同比：本月用电量 vs 去年同月";
    default:
      return "";
  }
});

const energyMomTip = computed(() => {
  switch (energyDimension.value) {
    case "hour":
      return "环比：上一小时 vs 再上一小时";
    case "day":
      return "环比：今日用电量 vs 昨日";
    case "month":
      return "环比：本月用电量 vs 上月";
    default:
      return "";
  }
});

const onlineRate = computed(() => {
  const total = collectorOnlineCount.value + collectorOfflineCount.value;
  if (!total) return 0;
  return Math.round((collectorOnlineCount.value / total) * 100);
});

const ALARM_GROUP_COLORS: Record<string, string> = {
  表计类: "#4db8ff",
  采集器类: "#2dd4a0",
  通信类: "#f0b429",
  数据类: "#ff5c75",
  其他: "#ff9a4d"
};

const alarmTypeStats = computed(() => {
  const map = new Map<string, number>();
  alarmList.value.forEach(item => {
    const key = getAlarmGroupLabel(item.alarmType || "");
    map.set(key, (map.get(key) || 0) + 1);
  });
  return ALARM_GROUP_ORDER.map(groupKey => {
    const name =
      groupKey === "meter"
        ? "表计类"
        : groupKey === "collector"
          ? "采集器类"
          : groupKey === "communication"
            ? "通信类"
            : groupKey === "data"
              ? "数据类"
              : "其他";
    return { name, value: map.get(name) || 0 };
  }).filter(item => item.value > 0);
});

const resolveCollectorNoById = (id: number) => {
  const row = collectorRows.value.find(
    item => Number(item.id ?? item.collectorId) === id
  );
  if (!row) return "";
  return String(row.collectorNo ?? row.code ?? row.collectorCode ?? "");
};

const alarmDeviceLabel = (item: AlarmEvent) => {
  if (item.meterNo) return String(item.meterNo);
  if (item.collectorId != null && item.collectorId !== "") {
    const cid = Number(item.collectorId);
    if (Number.isFinite(cid)) {
      const no = resolveCollectorNoById(cid);
      if (no) return no;
    }
    return String(item.collectorId);
  }
  const deviceId = Number(item.deviceId ?? item.meterId);
  if (Number.isFinite(deviceId)) {
    const meter = cachedMeters?.find(m => Number(m.id) === deviceId);
    if (meter?.meterNo) return String(meter.meterNo);
    const no = resolveCollectorNoById(deviceId);
    if (no) return no;
  }
  return item.deviceCode || item.deviceName || "—";
};

const alarmTypeText = (item: AlarmEvent) =>
  getAlarmTypeLabel(item.alarmType || "") || "—";

const alarmDetailText = (item: AlarmEvent) => {
  if (item.alarmContent) return item.alarmContent;
  const parts: string[] = [];
  if (item.alarmLevel) {
    parts.push(`级别：${getAlarmLevelLabel(String(item.alarmLevel))}`);
  }
  if (
    item.alarmValue !== null &&
    item.alarmValue !== undefined &&
    item.alarmValue !== ""
  ) {
    parts.push(`当前值：${item.alarmValue}`);
  }
  if (item.handlingRemark) parts.push(String(item.handlingRemark));
  return parts.length ? parts.join(" · ") : "—";
};

const techChartTheme = {
  text: "#f8fbff",
  body: "#e3f0fa",
  muted: "#b9cfe4",
  axis: "rgba(185, 207, 228, 0.55)",
  split: "rgba(77, 184, 255, 0.22)",
  cyan: "#6ecfff",
  accent: "#4db8ff",
  green: "#2dd4a0",
  orange: "#ff9a4d",
  warning: "#f0b429",
  danger: "#ff5c75",
  offline: "#8aa0b8",
  tipBg: "rgba(10, 34, 64, 0.92)",
  tipBorder: "#4db8ff"
};

const formatKwh = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

const formatPercentChange = (current: number, base: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) {
    return "—";
  }
  const pct = ((current - base) / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
};

const formatMinutesAgo = (time: string) => {
  const t = dayjs(time);
  if (!t.isValid()) return "—";
  const minutes = dayjs().diff(t, "minute");
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
};

const formatHoursAgo = (time: string) => {
  const t = dayjs(time);
  if (!t.isValid()) return "—";
  const hours = dayjs().diff(t, "hour");
  if (hours < 1) return "1小时内";
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
};

const isWaterMeterType = (type: unknown) => {
  const t = String(type ?? "").toUpperCase();
  return t.includes("WATER") || t.includes("水");
};

const isElectricMeterType = (type: unknown) => {
  const t = String(type ?? "").toUpperCase();
  return t.includes("ELECTRIC") || t.includes("电");
};

const normalizeCollectorOnline = (status: unknown) => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  return (
    normalized === "NORMAL" ||
    normalized === "ONLINE" ||
    normalized === "1" ||
    normalized === "在线"
  );
};

const buildCollectorEvents = (rows: Record<string, unknown>[]) => {
  collectorEventList.value = rows
    .map(item => {
      const eventTime = String(
        item.lastStatusChangeTime ||
          item.lastCommunicationTime ||
          item.updatedAt ||
          item.updateTime ||
          ""
      );
      if (!eventTime) return null;
      const isOnline = normalizeCollectorOnline(item.status);
      return {
        collectorNo: String(item.collectorNo || item.code || item.id || "—"),
        event: isOnline ? ("上线" as const) : ("下线" as const),
        eventTime,
        minutesAgo: formatMinutesAgo(eventTime)
      };
    })
    .filter((item): item is CollectorEventRow => item !== null)
    .sort((a, b) => dayjs(b.eventTime).valueOf() - dayjs(a.eventTime).valueOf())
    .slice(0, 20);
};

async function fetchEnergySeries(
  params: EnergyStatsQueryParams,
  timeoutMs = ENERGY_SUMMARY_TIMEOUT_MS
): Promise<StatsDisplayData[]> {
  const cacheKey = `${params.dimension}:${params.startTime}:${params.endTime}:${params.ignoreRadio ?? 0}`;
  const cached = summarySeriesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SUMMARY_SERIES_CACHE_MS) {
    return cached.rows;
  }

  try {
    const response = (await getEnergyStatisticsSummary(
      params,
      timeoutMs
    )) as Record<string, unknown>;
    const payload = unwrapEnergyStatisticsSummaryResponse(response);
    if (!payload || Number(payload.status) !== 1) {
      console.warn(
        "[数据大屏] 汇总接口无有效数据:",
        params,
        payload?.msg ?? response
      );
      return [];
    }
    const rows = transformStatsData(payload);
    summarySeriesCache.set(cacheKey, { at: Date.now(), rows });
    return rows;
  } catch (e) {
    console.error("[数据大屏] 汇总接口请求失败:", params, e);
    return [];
  }
}

const buildEnergyStatsParams = (): EnergyStatsQueryParams => {
  switch (energyDimension.value) {
    case "hour": {
      const p = generateTimeParams("hour", dayjs().format("YYYY-MM-DD"));
      return {
        dimension: "hour",
        startTime: p.startTime,
        endTime: p.endTime,
        ignoreRadio: 0
      };
    }
    case "day":
      return {
        dimension: "day",
        startTime: dayjs().subtract(6, "day").format("YYYYMMDD"),
        endTime: dayjs().format("YYYYMMDD"),
        ignoreRadio: 0
      };
    case "month":
      return buildMonthChartSummaryParams().params;
    default:
      return {
        dimension: "day",
        startTime: dayjs().subtract(6, "day").format("YYYYMMDD"),
        endTime: dayjs().format("YYYYMMDD"),
        ignoreRadio: 0
      };
  }
};

const loadBasicInfo = async () => {
  basicInfoLoading.value = true;
  try {
    const [meterResult, userResult] = await Promise.allSettled([
      getMeterList({ page: 1, size: 10000 }),
      getEladminUserPage({ page: 1, size: 1 })
    ]);

    if (meterResult.status === "fulfilled") {
      const meters = extractMeterRowsFromApiResponse(
        (meterResult.value || {}) as Record<string, unknown>
      );
      waterMeterCount.value = meters.filter(m =>
        isWaterMeterType(m.meterType)
      ).length;
      electricMeterCount.value = meters.filter(m =>
        isElectricMeterType(m.meterType)
      ).length;
    } else {
      console.error("加载表具统计失败:", meterResult.reason);
    }

    if (userResult.status === "fulfilled") {
      const userRes = userResult.value as {
        totalElements?: number;
        content?: unknown[];
      };
      userCount.value =
        Number(userRes?.totalElements) ||
        (Array.isArray(userRes?.content) ? userRes.content.length : 0);
    } else {
      console.error("加载用户统计失败:", userResult.reason);
    }
  } catch (e) {
    console.error("加载基础信息失败:", e);
  } finally {
    basicInfoLoading.value = false;
  }
};

const loadCollectorStats = async () => {
  collectorLoading.value = true;
  try {
    const response = await getCollectorList({ page: 1, pageSize: 10000 });
    const rows = Array.isArray(response?.content) ? response.content : [];
    collectorRows.value = rows;
    collectorCount.value =
      Number(response?.totalElements) || rows.length || collectorCount.value;
    const online = rows.filter(item =>
      normalizeCollectorOnline(item?.status)
    ).length;
    collectorOnlineCount.value = online;
    collectorOfflineCount.value = Math.max(rows.length - online, 0);
    if (collectorCount.value < rows.length) {
      collectorCount.value = rows.length;
    }
    buildCollectorEvents(rows);
    updateCollectorPieChart();
  } catch (error) {
    console.error("加载采集器统计失败:", error);
    collectorCount.value = 0;
    collectorOnlineCount.value = 0;
    collectorOfflineCount.value = 0;
    collectorRows.value = [];
    collectorEventList.value = [];
    updateCollectorPieChart();
  } finally {
    collectorLoading.value = false;
  }
};

const loadMetersCache = async () => {
  if (cachedMeters) return cachedMeters;
  const meterRes = await getMeterList({ page: 1, size: 10000 });
  cachedMeters = extractMeterRowsFromApiResponse(
    (meterRes || {}) as Record<string, unknown>
  );
  return cachedMeters;
};

const buildCollectorRank = (
  meterStats: MeterStatItem[],
  options?: { limit?: number; includeAllCollectors?: boolean }
) => {
  const collectorNoById = new Map<number, string>();
  collectorRows.value.forEach(item => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) return;
    collectorNoById.set(id, String(item.collectorNo || item.code || id));
  });

  const meters = cachedMeters || [];
  const meterById = new Map<number, Record<string, unknown>>();
  const meterByNo = new Map<string, Record<string, unknown>>();
  meters.forEach((m: Record<string, unknown>) => {
    const id = Number(m.id);
    if (Number.isFinite(id)) meterById.set(id, m);
    if (m.meterNo) meterByNo.set(String(m.meterNo), m);
  });

  const sumByCollector = new Map<string, number>();
  meterStats.forEach(m => {
    const meter =
      meterById.get(Number(m.meterId)) ||
      meterByNo.get(String(m.meterNo || ""));
    const cid = Number(meter?.collectorId);
    const collectorNo =
      (Number.isFinite(cid) ? collectorNoById.get(cid) : undefined) ||
      String(m.meterNo || "未知");
    sumByCollector.set(
      String(collectorNo),
      (sumByCollector.get(String(collectorNo)) || 0) +
        Number(m.totalConsumption || 0)
    );
  });

  if (options?.includeAllCollectors) {
    collectorRows.value.forEach(item => {
      const no = String(item.collectorNo || item.code || item.id || "");
      if (no && !sumByCollector.has(no)) {
        sumByCollector.set(no, 0);
      }
    });
  }

  let list = [...sumByCollector.entries()]
    .map(([collectorNo, consumption]) => ({ collectorNo, consumption }))
    .sort((a, b) => b.consumption - a.consumption);

  if (options?.limit != null) {
    list = list.slice(0, options.limit);
  }

  return list.map((item, index) => ({
    rank: index + 1,
    collectorNo: item.collectorNo,
    consumption: item.consumption
  }));
};

/** 排名序号背景：名次越靠前颜色越深，越往后越浅 */
const getRankBadgeStyle = (rank: number, total: number) => {
  const ratio = total > 1 ? (rank - 1) / (total - 1) : 0;
  const lightness = 32 + ratio * 38;
  const saturation = 92 - ratio * 28;
  return {
    background: `linear-gradient(135deg, hsl(205 ${saturation}% ${lightness}%), hsl(200 ${saturation - 8}% ${lightness + 14}%))`,
    boxShadow: `0 0 10px hsl(205 ${saturation}% ${lightness + 8}% / 45%)`
  };
};

/** 获取指定自然日的电表明细（汇总接口无明细时回退逐表 day-power） */
const fetchDayMeterStats = async (dayKey: string): Promise<MeterStatItem[]> => {
  const dayRows = await fetchEnergySeries({
    dimension: "day",
    startTime: dayKey,
    endTime: dayKey,
    ignoreRadio: 0
  });
  const row = dayRows.find(r => r.timeKey === dayKey);
  if (row?.meterStats?.length) {
    return row.meterStats;
  }

  const meters = (await loadMetersCache()).filter(m =>
    isElectricMeterType(m.meterType)
  );
  if (!meters.length) return [];

  const dateStr = dayjs(dayKey, "YYYYMMDD").format("YYYY-MM-DD");
  const settled = await Promise.allSettled(
    meters.map((item: Record<string, unknown>) => {
      const deviceId = resolveMeterRowDeviceId(item as Record<string, unknown>);
      if (!deviceId) return Promise.resolve(null);
      return getDeviceDayPower(deviceId, dateStr).then(res => ({
        meterId: deviceId,
        meterNo: String(item.meterNo ?? deviceId),
        meterName: String(item.meterNo ?? ""),
        totalConsumption: extractDayPowerValueFromResponse(
          res as Record<string, unknown>
        ),
        startTime: `${dateStr} 00:00:00`,
        endTime: `${dateStr} 23:59:59`
      }));
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<MeterStatItem | null> =>
        r.status === "fulfilled" && r.value != null
    )
    .map(r => r.value as MeterStatItem)
    .filter(m => Number.isFinite(Number(m.totalConsumption)));
};

const extractHourPowerFromResponse = (
  response: Record<string, unknown>,
  hour: number
) => {
  const layers: unknown[] = [
    (response as Record<string, unknown>)?.data,
    response
  ];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    const hours = (layer as Record<string, unknown>).hours;
    if (!Array.isArray(hours)) continue;
    const item = hours.find((h: Record<string, unknown>) => {
      if (h.hour != null && Number(h.hour) === hour) return true;
      const key = String(h.hourKey ?? "");
      if (key.length >= 2) {
        return Number(key.slice(-2)) === hour;
      }
      return false;
    }) as Record<string, unknown> | undefined;
    if (item) {
      const v = Number(item.hourPower ?? item.power ?? 0);
      if (Number.isFinite(v)) return v;
    }
  }
  return 0;
};

/** 获取指定小时各电表明细 */
const fetchHourMeterStats = async (target: dayjs.Dayjs) => {
  const hourKey = target.format("YYYYMMDDHH");
  const row = await fetchHourBucket(target, energyStatsList.value);
  if (row?.meterStats?.length) {
    return row.meterStats;
  }

  const meters = (await loadMetersCache()).filter(m =>
    isElectricMeterType(m.meterType)
  );
  if (!meters.length) return [];

  const dateStr = target.format("YYYY-MM-DD");
  const hourNum = target.hour();
  const settled = await Promise.allSettled(
    meters.map((item: Record<string, unknown>) => {
      const deviceId = resolveMeterRowDeviceId(item);
      if (!deviceId) return Promise.resolve(null);
      return getDeviceHourPower(deviceId, dateStr).then(res => ({
        meterId: deviceId,
        meterNo: String(item.meterNo ?? deviceId),
        meterName: String(item.meterNo ?? ""),
        totalConsumption: extractHourPowerFromResponse(
          res as Record<string, unknown>,
          hourNum
        ),
        startTime: target.format("YYYY-MM-DD HH:00:00"),
        endTime: target.add(1, "hour").format("YYYY-MM-DD HH:00:00")
      }));
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<MeterStatItem | null> =>
        r.status === "fulfilled" && r.value != null
    )
    .map(r => r.value as MeterStatItem);
};

/** 从已缓存的月汇总中取某月电表明细（不再调用逐设备 month-power） */
const getMonthMeterStatsFromSummary = (monthKey: string): MeterStatItem[] => {
  const sources = [...monthSummaryAllRows.value, ...energyStatsList.value];
  const row = sources.find(r => r.timeKey === monthKey);
  return row?.meterStats?.length ? row.meterStats : [];
};

/** 同比：单独查去年同月（1 个月），不阻塞主图表 */
const loadMonthYoyPercent = async (
  thisMonthKey: string,
  lastYearMonthKey: string,
  currentValue: number
) => {
  let lastYearVal = Number(
    monthSummaryAllRows.value.find(r => r.timeKey === lastYearMonthKey)
      ?.totalConsumption || 0
  );
  if (!lastYearVal) {
    const yoyRows = await fetchEnergySeries(
      buildSingleMonthSummaryParams(lastYearMonthKey),
      90000
    );
    const row = yoyRows.find(r => r.timeKey === lastYearMonthKey);
    if (row) {
      monthSummaryAllRows.value = [
        ...monthSummaryAllRows.value.filter(
          r => r.timeKey !== lastYearMonthKey
        ),
        row
      ];
      lastYearVal = Number(row.totalConsumption || 0);
    }
  }
  yoyPercent.value =
    lastYearVal === 0
      ? "暂无去年同期"
      : formatPercentChange(currentValue, lastYearVal);
};

/** 取指定小时桶；优先用已加载的今日序列，跨天则补请求该日小时数据 */
const fetchHourBucket = async (
  target: dayjs.Dayjs,
  cachedRows: StatsDisplayData[]
) => {
  const timeKey = target.format("YYYYMMDDHH");
  const hit = cachedRows.find(r => r.timeKey === timeKey);
  if (hit) return hit;

  const params = generateTimeParams("hour", target.format("YYYY-MM-DD"));
  const rows = await fetchEnergySeries({
    dimension: "hour",
    startTime: params.startTime,
    endTime: params.endTime,
    ignoreRadio: 0
  });
  return rows.find(r => r.timeKey === timeKey);
};

const loadEnergySidePanel = async () => {
  rankLoading.value = true;
  try {
    await loadMetersCache();
    if (collectorRows.value.length === 0) {
      await loadCollectorStats();
    }
    const dim = energyDimension.value;
    const now = dayjs();
    const todayKey = now.format("YYYYMMDD");
    const yesterdayKey = now.subtract(1, "day").format("YYYYMMDD");
    const thisMonthKey = now.format("YYYYMM");
    const lastMonthKey = now.subtract(1, "month").format("YYYYMM");
    const lastYearDayKey = now.subtract(1, "year").format("YYYYMMDD");
    const lastYearMonthKey = now.subtract(1, "year").format("YYYYMM");

    if (dim === "hour") {
      const prevHour = now.subtract(1, "hour");
      const prevPrevHour = now.subtract(2, "hour");
      const yesterdaySameHour = prevHour.subtract(1, "day");

      const [prevRow, prevPrevRow, yoyRow] = await Promise.all([
        fetchHourBucket(prevHour, energyStatsList.value),
        fetchHourBucket(prevPrevHour, energyStatsList.value),
        fetchHourBucket(yesterdaySameHour, energyStatsList.value)
      ]);

      const hourLabel = `${prevHour.format("HH")}:00-${prevHour.add(1, "hour").format("HH")}:00`;
      energyCurrentLabel.value = "上一小时用电量";
      energyRankTitle.value = `上一小时用电排名（${hourLabel}）`;
      energyCurrentValue.value = Number(prevRow?.totalConsumption || 0);

      const prevPrevVal = Number(prevPrevRow?.totalConsumption || 0);
      momPercent.value = formatPercentChange(
        energyCurrentValue.value,
        prevPrevVal
      );

      const yoyVal = Number(yoyRow?.totalConsumption || 0);
      yoyPercent.value =
        yoyVal === 0
          ? "暂无同比数据"
          : formatPercentChange(energyCurrentValue.value, yoyVal);

      const prevHourMeterStats = await fetchHourMeterStats(prevHour);
      energyRankList.value = buildCollectorRank(prevHourMeterStats, {
        includeAllCollectors: true
      });
      return;
    }

    if (dim === "day") {
      energyCurrentLabel.value = "当日用电量";
      energyRankTitle.value = "日用电量排名";
      energyCurrentValue.value = Number(
        energyStatsList.value.find(r => r.timeKey === todayKey)
          ?.totalConsumption ??
          energyStatsList.value.at(-1)?.totalConsumption ??
          0
      );

      const yesterdayVal = Number(
        energyStatsList.value.find(r => r.timeKey === yesterdayKey)
          ?.totalConsumption || 0
      );
      momPercent.value = formatPercentChange(
        energyCurrentValue.value,
        yesterdayVal
      );

      const lastYearRows = await fetchEnergySeries({
        dimension: "day",
        startTime: lastYearDayKey,
        endTime: lastYearDayKey,
        ignoreRadio: 0
      });
      const lastYearVal = Number(
        lastYearRows.find(r => r.timeKey === lastYearDayKey)
          ?.totalConsumption || 0
      );
      yoyPercent.value =
        lastYearVal === 0
          ? "暂无去年同期"
          : formatPercentChange(energyCurrentValue.value, lastYearVal);

      const todayMeterStats = await fetchDayMeterStats(todayKey);
      if (todayMeterStats.length) {
        energyCurrentValue.value = Number(
          todayMeterStats
            .reduce((s, m) => s + Number(m.totalConsumption || 0), 0)
            .toFixed(2)
        );
      }
      energyRankList.value = buildCollectorRank(todayMeterStats, {
        includeAllCollectors: true
      });
      return;
    }

    if (dim === "month") {
      energyCurrentLabel.value = "本月用电量";
      energyRankTitle.value = "本月用电量排名";
      energyCurrentValue.value = Number(
        energyStatsList.value.find(r => r.timeKey === thisMonthKey)
          ?.totalConsumption ??
          energyStatsList.value.at(-1)?.totalConsumption ??
          0
      );

      const lastMonthVal = Number(
        energyStatsList.value.find(r => r.timeKey === lastMonthKey)
          ?.totalConsumption || 0
      );
      momPercent.value = formatPercentChange(
        energyCurrentValue.value,
        lastMonthVal
      );

      const monthMeterStats = getMonthMeterStatsFromSummary(thisMonthKey);
      if (monthMeterStats.length) {
        energyCurrentValue.value = Number(
          monthMeterStats
            .reduce((s, m) => s + Number(m.totalConsumption || 0), 0)
            .toFixed(2)
        );
      }
      energyRankList.value = buildCollectorRank(monthMeterStats, {
        includeAllCollectors: true
      });

      yoyPercent.value = "同比加载中…";
      void loadMonthYoyPercent(
        thisMonthKey,
        lastYearMonthKey,
        energyCurrentValue.value
      ).catch(() => {
        yoyPercent.value = "暂无同比数据";
      });
    }
  } catch (e) {
    console.error("加载用电量侧栏数据失败:", e);
    energyCurrentValue.value = 0;
    yoyPercent.value = "—";
    momPercent.value = "—";
    energyRankList.value = [];
  } finally {
    rankLoading.value = false;
  }
};

type PowerSummaryCachePayload = {
  at: number;
  todayKey: string;
  yesterdayKey: string;
  thisMonthKey: string;
  lastMonthKey: string;
  powerToday: number;
  powerYesterday: number;
  powerThisMonth: number;
  powerLastMonth: number;
};

const readPowerSummaryCache = (
  todayKey: string,
  yesterdayKey: string,
  thisMonthKey: string,
  lastMonthKey: string
) => {
  try {
    const raw = localStorage.getItem(POWER_SUMMARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PowerSummaryCachePayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - Number(parsed.at || 0) > POWER_SUMMARY_CACHE_TTL_MS)
      return null;
    if (
      parsed.todayKey !== todayKey ||
      parsed.yesterdayKey !== yesterdayKey ||
      parsed.thisMonthKey !== thisMonthKey ||
      parsed.lastMonthKey !== lastMonthKey
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const loadPowerSummary = async () => {
  powerLoading.value = true;
  try {
    const today = dayjs().format("YYYYMMDD");
    const yesterday = dayjs().subtract(1, "day").format("YYYYMMDD");
    const thisMonth = dayjs().format("YYYYMM");
    const lastMonth = dayjs().subtract(1, "month").format("YYYYMM");

    const cached = readPowerSummaryCache(
      today,
      yesterday,
      thisMonth,
      lastMonth
    );
    if (cached) {
      powerToday.value = cached.powerToday;
      powerYesterday.value = cached.powerYesterday;
      powerThisMonth.value = cached.powerThisMonth;
      powerLastMonth.value = cached.powerLastMonth;
      return;
    }

    const [dayRows, monthRowsAll] = await Promise.all([
      fetchEnergySeries({
        dimension: "day",
        startTime: yesterday,
        endTime: today,
        ignoreRadio: 0
      }),
      fetchEnergySeries(buildMonthKpiSummaryParams())
    ]);
    monthSummaryAllRows.value = monthRowsAll;

    const byKey = (rows: StatsDisplayData[], key: string) =>
      Number(rows.find(r => r.timeKey === key)?.totalConsumption || 0);

    powerToday.value = byKey(dayRows, today);
    powerYesterday.value = byKey(dayRows, yesterday);
    powerThisMonth.value = byKey(monthRowsAll, thisMonth);
    powerLastMonth.value = byKey(monthRowsAll, lastMonth);

    localStorage.setItem(
      POWER_SUMMARY_CACHE_KEY,
      JSON.stringify({
        at: Date.now(),
        todayKey: today,
        yesterdayKey: yesterday,
        thisMonthKey: thisMonth,
        lastMonthKey: lastMonth,
        powerToday: powerToday.value,
        powerYesterday: powerYesterday.value,
        powerThisMonth: powerThisMonth.value,
        powerLastMonth: powerLastMonth.value
      })
    );
  } catch (e) {
    console.error("加载用电量汇总失败:", e);
  } finally {
    powerLoading.value = false;
  }
};

const loadEnergyStatsChart = async () => {
  energyStatsLoading.value = true;
  try {
    if (energyDimension.value === "month") {
      const { params, chartMonthKeys } = buildMonthChartSummaryParams();
      const chartRows = await fetchEnergySeries(params);
      monthSummaryAllRows.value = chartRows;
      energyStatsList.value = chartRows;
    } else {
      monthSummaryAllRows.value = [];
      energyStatsList.value = await fetchEnergySeries(buildEnergyStatsParams());
    }
    updateEnergyChart();
    await loadEnergySidePanel();
  } catch (e) {
    console.error("加载用电量统计失败:", e);
    energyStatsList.value = [];
    updateEnergyChart();
    await loadEnergySidePanel();
  } finally {
    energyStatsLoading.value = false;
  }
};

const loadAlarmTimeline = async () => {
  alarmLoading.value = true;
  try {
    await loadMetersCache();
    const { code, data } = await getAlarmEventQueryList({
      alarmType: "",
      alarmLevel: "",
      alarmStatus: "",
      alarmTime: "",
      pageSize: 30,
      currentPage: 1
    });
    if (code === 0 && data?.list) {
      alarmList.value = data.list as AlarmEvent[];
    } else {
      alarmList.value = [];
    }
    updateAlarmPieChart();
  } catch (e) {
    console.error("加载报警信息失败:", e);
    alarmList.value = [];
    updateAlarmPieChart();
  } finally {
    alarmLoading.value = false;
  }
};

const updateCollectorPieChart = () => {
  if (!collectorPieChart) return;
  collectorPieChart.setOption({
    tooltip: {
      trigger: "item",
      backgroundColor: techChartTheme.tipBg,
      borderColor: techChartTheme.tipBorder,
      textStyle: { color: techChartTheme.text }
    },
    legend: {
      bottom: 0,
      textStyle: { color: techChartTheme.body, fontSize: 11 },
      icon: "circle"
    },
    title: {
      text: String(collectorOnlineCount.value + collectorOfflineCount.value),
      subtext: "采集器",
      left: "center",
      top: "36%",
      textStyle: { fontSize: 22, fontWeight: 700, color: techChartTheme.cyan },
      subtextStyle: { fontSize: 11, color: techChartTheme.muted }
    },
    series: [
      {
        type: "pie",
        radius: ["46%", "66%"],
        center: ["50%", "40%"],
        label: {
          formatter: "{b}\n{c}",
          color: techChartTheme.body,
          fontSize: 11
        },
        itemStyle: { borderColor: "#0a2240", borderWidth: 2 },
        data: [
          {
            value: collectorOnlineCount.value,
            name: "在线",
            itemStyle: { color: techChartTheme.green }
          },
          {
            value: collectorOfflineCount.value,
            name: "离线",
            itemStyle: { color: techChartTheme.offline }
          }
        ]
      }
    ]
  });
};

const updateEnergyChart = () => {
  if (!energyChart) return;
  const xData = energyStatsList.value.map(i => i.date);
  const yData = energyStatsList.value.map(i => Number(i.totalConsumption || 0));
  const isBar =
    energyDimension.value === "hour" || energyDimension.value === "month";

  energyChart.setOption({
    tooltip: {
      trigger: "axis",
      backgroundColor: techChartTheme.tipBg,
      borderColor: techChartTheme.tipBorder,
      textStyle: { color: techChartTheme.text }
    },
    grid: { top: 28, left: 8, right: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: xData,
      axisLine: { lineStyle: { color: techChartTheme.axis } },
      axisTick: { lineStyle: { color: techChartTheme.axis } },
      axisLabel: { color: techChartTheme.body, fontSize: 11 }
    },
    yAxis: {
      type: "value",
      name: "用电量",
      nameTextStyle: {
        color: techChartTheme.muted,
        fontSize: 12,
        padding: [0, 0, 0, 4]
      },
      axisLine: { lineStyle: { color: techChartTheme.axis } },
      axisTick: { lineStyle: { color: techChartTheme.axis } },
      axisLabel: { color: techChartTheme.body, fontSize: 11 },
      splitLine: { lineStyle: { color: techChartTheme.split } }
    },
    series: [
      {
        type: isBar ? "bar" : "line",
        smooth: !isBar,
        barMaxWidth: 22,
        data: yData,
        itemStyle: { color: techChartTheme.accent },
        areaStyle: !isBar
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(77, 184, 255, 0.35)" },
                { offset: 1, color: "rgba(77, 184, 255, 0.02)" }
              ])
            }
          : undefined
      }
    ]
  });
};

const updateAlarmPieChart = () => {
  if (!alarmPieChart) return;
  const data = alarmTypeStats.value.length
    ? alarmTypeStats.value
    : [{ name: "暂无报警", value: 1 }];

  alarmPieChart.setOption({
    tooltip: {
      trigger: "item",
      backgroundColor: techChartTheme.tipBg,
      borderColor: techChartTheme.tipBorder,
      textStyle: { color: techChartTheme.text },
      formatter: (p: { name: string; value: number; percent: number }) =>
        p.name === "暂无报警"
          ? p.name
          : `${p.name}<br/>${p.value} 条（${p.percent}%）`
    },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: techChartTheme.body, fontSize: 10 },
      icon: "circle",
      pageTextStyle: { color: techChartTheme.muted }
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "62%"],
        center: ["50%", "42%"],
        label: {
          show: data.length <= 4,
          formatter: "{b}\n{c}",
          color: techChartTheme.body,
          fontSize: 10
        },
        labelLine: { length: 8, length2: 6 },
        data: data.map(item => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color:
              item.name === "暂无报警"
                ? "rgba(77, 184, 255, 0.25)"
                : ALARM_GROUP_COLORS[item.name] || techChartTheme.accent
          }
        }))
      }
    ]
  });
};

const initCharts = async () => {
  await nextTick();
  if (collectorPieRef.value) {
    collectorPieChart = echarts.init(collectorPieRef.value);
    updateCollectorPieChart();
  }
  if (energyChartRef.value) {
    energyChart = echarts.init(energyChartRef.value);
    updateEnergyChart();
  }
  if (alarmPieRef.value) {
    alarmPieChart = echarts.init(alarmPieRef.value);
    updateAlarmPieChart();
  }
};

const handleResize = () => {
  collectorPieChart?.resize();
  energyChart?.resize();
  alarmPieChart?.resize();
};

const enterWebFullscreen = () => {
  document.documentElement.classList.add(DATA_SCREEN_WEB_FS_CLASS);
};

const leaveWebFullscreen = () => {
  document.documentElement.classList.remove(DATA_SCREEN_WEB_FS_CLASS);
};

const exitScreen = () => {
  if (isFullscreen.value) toggleScreenFullscreen();
  leaveWebFullscreen();
  router.back();
};

const refreshLiveData = () => {
  loadCollectorStats();
  loadAlarmTimeline();
};

watch(energyDimension, () => {
  loadEnergyStatsChart();
});

onMounted(async () => {
  enterWebFullscreen();

  tickClock();
  clockTimer = setInterval(tickClock, 1000);

  refreshTimer = setInterval(refreshLiveData, 60000);

  await initCharts();
  window.addEventListener("resize", handleResize);

  await loadCollectorStats();
  await Promise.all([
    loadBasicInfo(),
    loadPowerSummary(),
    loadEnergyStatsChart(),
    loadAlarmTimeline()
  ]);
});

onBeforeUnmount(() => {
  if (isFullscreen.value) toggleScreenFullscreen();
  leaveWebFullscreen();
  if (clockTimer) clearInterval(clockTimer);
  if (refreshTimer) clearInterval(refreshTimer);
  window.removeEventListener("resize", handleResize);
  collectorPieChart?.dispose();
  energyChart?.dispose();
  alarmPieChart?.dispose();
  collectorPieChart = null;
  energyChart = null;
  alarmPieChart = null;
});
</script>

<template>
  <div class="data-screen">
    <div class="data-screen__bg">
      <div class="data-screen__gradient" />
      <div class="data-screen__grid" />
      <div class="data-screen__hex" />
      <div class="data-screen__horizon" />
      <div class="data-screen__glow data-screen__glow--left" />
      <div class="data-screen__glow data-screen__glow--right" />
      <div class="data-screen__glow data-screen__glow--center" />
      <div class="data-screen__scanline" />
      <div class="data-screen__frame" aria-hidden="true">
        <i class="data-screen__frame-corner data-screen__frame-corner--tl" />
        <i class="data-screen__frame-corner data-screen__frame-corner--tr" />
        <i class="data-screen__frame-corner data-screen__frame-corner--bl" />
        <i class="data-screen__frame-corner data-screen__frame-corner--br" />
      </div>
    </div>

    <header class="data-screen__header">
      <div class="data-screen__header-side data-screen__header-side--left">
        <div class="data-screen__clock-block">
          <div class="data-screen__clock-week">{{ clockWeekday }}</div>
          <div class="data-screen__clock-main">
            <span
              class="data-screen__clock-date font-digital font-digital--value"
              >{{ clockDate }}</span
            >
            <span
              class="data-screen__clock-time font-digital font-digital--value"
              >{{ clockTime }}</span
            >
          </div>
        </div>
      </div>
      <h1 class="data-screen__title">
        <div
          class="data-screen__title-ornament data-screen__title-ornament--top"
          aria-hidden="true"
        >
          <span class="data-screen__title-wing" />
          <span class="data-screen__title-gem" />
          <span
            class="data-screen__title-wing data-screen__title-wing--mirror"
          />
        </div>
        <span class="data-screen__title-text">能源数据可视化大屏</span>
        <div
          class="data-screen__title-ornament data-screen__title-ornament--bottom"
          aria-hidden="true"
        >
          <span class="data-screen__title-beam data-screen__title-beam--left" />
          <span class="data-screen__title-core">
            <i class="data-screen__title-notch" />
            <i class="data-screen__title-bar" />
            <i class="data-screen__title-node" />
            <i class="data-screen__title-bar data-screen__title-bar--short" />
            <i
              class="data-screen__title-notch data-screen__title-notch--mirror"
            />
          </span>
          <span
            class="data-screen__title-beam data-screen__title-beam--right"
          />
        </div>
      </h1>
      <div class="data-screen__header-side data-screen__header-side--right">
        <button
          class="data-screen__fullscreen"
          type="button"
          :title="isFullscreen ? '退出屏幕全屏' : '屏幕全屏'"
          @click="toggleScreenFullscreen"
        >
          <IconifyIconOffline
            :icon="isFullscreen ? FullscreenExitLine : FullscreenLine"
          />
          {{ isFullscreen ? "退出全屏" : "屏幕全屏" }}
        </button>
        <button class="data-screen__exit" type="button" @click="exitScreen">
          <IconifyIconOffline :icon="CloseLine" />
          退出
        </button>
      </div>
    </header>

    <main class="data-screen__columns">
      <!-- 左列 -->
      <aside class="data-screen__col data-screen__col--left">
        <div class="data-panel" style="

--delay: 0.05s">
          <div class="data-panel__corner data-panel__corner--tl" />
          <div class="data-panel__corner data-panel__corner--tr" />
          <div class="data-panel__corner data-panel__corner--bl" />
          <div class="data-panel__corner data-panel__corner--br" />
          <div class="data-panel__head">
            <div class="data-panel__head-row">
              <span class="data-panel__head-deco" aria-hidden="true">
                <IconifyIconOffline
                  :icon="DashboardLine"
                  class="data-panel__head-deco-icon"
                />
              </span>
              <span class="data-panel__head-title">基础信息</span>
            </div>
            <div class="data-panel__head-wave" aria-hidden="true" />
          </div>
          <div v-loading="basicInfoLoading" class="basic-info-grid">
            <div class="basic-info-item">
              <div class="basic-info-item__icon">
                <IconifyIconOffline :icon="WaterIcon" />
              </div>
              <ReNormalCountTo
                :duration="1600"
                fontSize="1.6rem"
                :startVal="0"
                :endVal="waterMeterCount"
              />
              <span class="basic-info-item__label">水表（只）</span>
            </div>
            <div class="basic-info-item">
              <div class="basic-info-item__icon basic-info-item__icon--elec">
                <IconifyIconOffline :icon="ElectricIcon" />
              </div>
              <ReNormalCountTo
                :duration="1600"
                fontSize="1.6rem"
                :startVal="0"
                :endVal="electricMeterCount"
              />
              <span class="basic-info-item__label">电表（只）</span>
            </div>
            <div class="basic-info-item">
              <div class="basic-info-item__icon basic-info-item__icon--user">
                <IconifyIconOffline :icon="UserIcon" />
              </div>
              <ReNormalCountTo
                :duration="1600"
                fontSize="1.6rem"
                :startVal="0"
                :endVal="userCount"
              />
              <span class="basic-info-item__label">用户（个）</span>
            </div>
          </div>
        </div>

        <div class="data-panel data-panel--grow" style="

--delay: 0.15s">
          <div class="data-panel__corner data-panel__corner--tl" />
          <div class="data-panel__corner data-panel__corner--tr" />
          <div class="data-panel__corner data-panel__corner--bl" />
          <div class="data-panel__corner data-panel__corner--br" />
          <div class="data-panel__head">
            <div class="data-panel__head-row">
              <span class="data-panel__head-deco" aria-hidden="true">
                <IconifyIconOffline
                  :icon="RouterLine"
                  class="data-panel__head-deco-icon"
                />
              </span>
              <span class="data-panel__head-title">采集器在线情况</span>
            </div>
            <div class="data-panel__head-wave" aria-hidden="true" />
          </div>
          <div
            ref="collectorPieRef"
            class="data-panel__chart data-panel__chart--sm"
          />
          <div v-loading="collectorLoading" class="data-panel__scroll-wrap">
            <div
              v-if="!collectorLoading && collectorEventList.length === 0"
              class="data-panel__empty"
            >
              暂无采集器记录
            </div>
            <div v-else class="data-panel__scroll-inner">
              <table class="data-panel__table">
                <thead>
                  <tr>
                    <th>采集器</th>
                    <th>事件</th>
                    <th>发生时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in collectorEventList"
                    :key="`c-${row.collectorNo}-${idx}`"
                  >
                    <td>{{ row.collectorNo }}</td>
                    <td>
                      <span
                        :class="row.event === '上线' ? 'tag--on' : 'tag--off'"
                      >
                        {{ row.event }}
                      </span>
                    </td>
                    <td>{{ row.minutesAgo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中列 -->
      <section class="data-screen__col data-screen__col--center">
        <div class="data-screen__kpis" style="

--delay: 0.1s">
          <div
            v-for="(item, index) in [
              {
                label: '采集器总量',
                value: collectorCount,
                unit: '台',
                color: '#4db8ff',
                loading: collectorLoading,
                narrow: true
              },
              {
                label: '今日用电量',
                value: powerToday,
                color: '#2dd4a0',
                loading: powerLoading,
                decimal: true
              },
              {
                label: '本月用电量',
                value: powerThisMonth,
                color: '#6ecfff',
                loading: powerLoading,
                decimal: true
              },
              {
                label: '在线率',
                value: onlineRate,
                unit: '%',
                color: '#ffb84d',
                loading: collectorLoading,
                narrow: true
              }
            ]"
            :key="item.label"
            class="data-panel data-panel--kpi"
            :class="{ 'data-panel--kpi-narrow': item.narrow }"
            :style="{
              '--panel-accent': item.color,
              '--delay': `${index * 0.08}s`
            }"
          >
            <div class="data-panel__corner data-panel__corner--tl" />
            <div class="data-panel__corner data-panel__corner--tr" />
            <div class="data-panel__corner data-panel__corner--bl" />
            <div class="data-panel__corner data-panel__corner--br" />
            <p class="data-panel__label">{{ item.label }}</p>
            <div class="data-panel__value">
              <template v-if="item.decimal">
                <span class="data-panel__number">{{
                  formatKwh(item.value)
                }}</span>
              </template>
              <template v-else>
                <ReNormalCountTo
                  :duration="2000"
                  :fontSize="'1.75rem'"
                  :startVal="0"
                  :endVal="Number(item.value)"
                />
                <span v-if="item.unit" class="data-panel__unit">{{
                  item.unit
                }}</span>
              </template>
            </div>
          </div>
        </div>

        <div class="data-panel data-panel--grow" style="

--delay: 0.2s">
          <div class="data-panel__corner data-panel__corner--tl" />
          <div class="data-panel__corner data-panel__corner--tr" />
          <div class="data-panel__corner data-panel__corner--bl" />
          <div class="data-panel__corner data-panel__corner--br" />
          <div class="data-panel__head data-panel__head--between">
            <div class="data-panel__head-main">
              <div class="data-panel__head-row">
                <span class="data-panel__head-deco" aria-hidden="true">
                  <IconifyIconOffline
                    :icon="ElectricIcon"
                    class="data-panel__head-deco-icon"
                  />
                </span>
                <span class="data-panel__head-title">用电量统计</span>
              </div>
              <div class="data-panel__head-wave" aria-hidden="true" />
            </div>
            <div class="dimension-tabs">
              <button
                v-for="tab in dimensionTabs"
                :key="tab.value"
                type="button"
                class="dimension-tabs__btn"
                :class="{ 'is-active': energyDimension === tab.value }"
                @click="energyDimension = tab.value"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>
          <div class="energy-panel__body">
            <div
              ref="energyChartRef"
              v-loading="energyStatsLoading"
              class="data-panel__chart data-panel__chart--energy"
            />
            <div class="energy-panel__stats">
              <div class="energy-panel__stat">
                <span class="energy-panel__stat-label">{{
                  energyCurrentLabel
                }}</span>
                <div class="energy-panel__stat-value">
                  <span
                    class="energy-panel__stat-num font-digital font-digital--value"
                    >{{ formatKwh(energyCurrentValue) }}</span
                  >
                  <span class="energy-panel__stat-unit">kWh</span>
                </div>
              </div>
              <div class="energy-panel__stat" :title="energyYoyTip">
                <span class="energy-panel__stat-label">同比</span>
                <strong
                  class="energy-panel__stat-pct"
                  :class="[
                    yoyPercent.startsWith('+')
                      ? 'is-up'
                      : yoyPercent.startsWith('-')
                        ? 'is-down'
                        : '',
                    /^[+-]?\d/.test(yoyPercent)
                      ? 'font-digital font-digital--value'
                      : 'is-text'
                  ]"
                >
                  {{ yoyPercent }}
                </strong>
              </div>
              <div class="energy-panel__stat" :title="energyMomTip">
                <span class="energy-panel__stat-label">环比</span>
                <strong
                  class="energy-panel__stat-pct"
                  :class="[
                    momPercent.startsWith('+')
                      ? 'is-up'
                      : momPercent.startsWith('-')
                        ? 'is-down'
                        : '',
                    /^[+-]?\d/.test(momPercent)
                      ? 'font-digital font-digital--value'
                      : 'is-text'
                  ]"
                >
                  {{ momPercent }}
                </strong>
              </div>
            </div>
            <div
              v-loading="rankLoading"
              class="energy-panel__rank energy-panel__rank--cards"
            >
              <p class="energy-panel__rank-title">{{ energyRankTitle }}</p>
              <div class="energy-rank-cards">
                <div
                  v-if="!rankLoading && energyRankList.length === 0"
                  class="energy-panel__empty"
                >
                  暂无排名数据
                </div>
                <div
                  v-for="item in energyRankList"
                  :key="`${energyDimension}-rank-${item.rank}-${item.collectorNo}`"
                  class="energy-rank-card"
                >
                  <span
                    class="energy-rank-card__no"
                    :style="getRankBadgeStyle(item.rank, energyRankList.length)"
                  >
                    {{ item.rank }}
                  </span>
                  <div class="energy-rank-card__body">
                    <span class="energy-rank-card__collector">{{
                      item.collectorNo
                    }}</span>
                    <span class="energy-rank-card__value">
                      {{ formatKwh(item.consumption) }} kWh
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="data-panel data-panel--water" style="

--delay: 0.3s">
          <div class="data-panel__corner data-panel__corner--tl" />
          <div class="data-panel__corner data-panel__corner--tr" />
          <div class="data-panel__corner data-panel__corner--bl" />
          <div class="data-panel__corner data-panel__corner--br" />
          <div class="data-panel__head">
            <div class="data-panel__head-row">
              <span class="data-panel__head-deco" aria-hidden="true">
                <IconifyIconOffline
                  :icon="WaterIcon"
                  class="data-panel__head-deco-icon"
                />
              </span>
              <span class="data-panel__head-title">用水量统计</span>
            </div>
            <div class="data-panel__head-wave" aria-hidden="true" />
          </div>
          <div class="data-panel__placeholder">
            <IconifyIconOffline :icon="WaterIcon" class="placeholder-icon" />
            <p>用水量统计模块预留</p>
            <span>接口对接后可在此展示趋势与汇总</span>
          </div>
        </div>
      </section>

      <!-- 右列 -->
      <aside class="data-screen__col data-screen__col--right">
        <div class="data-panel data-panel--grow" style="

--delay: 0.15s">
          <div class="data-panel__corner data-panel__corner--tl" />
          <div class="data-panel__corner data-panel__corner--tr" />
          <div class="data-panel__corner data-panel__corner--bl" />
          <div class="data-panel__corner data-panel__corner--br" />
          <div class="data-panel__head">
            <div class="data-panel__head-row">
              <span class="data-panel__head-deco" aria-hidden="true">
                <IconifyIconOffline
                  :icon="AlarmWarningLine"
                  class="data-panel__head-deco-icon"
                />
              </span>
              <span class="data-panel__head-title">报警信息</span>
            </div>
            <div class="data-panel__head-wave" aria-hidden="true" />
          </div>
          <div
            ref="alarmPieRef"
            class="data-panel__chart data-panel__chart--sm"
          />
          <div v-loading="alarmLoading" class="data-panel__scroll-wrap">
            <div
              v-if="!alarmLoading && alarmList.length === 0"
              class="data-panel__empty"
            >
              暂无报警信息
            </div>
            <div
              v-else
              class="data-panel__scroll-inner data-panel__scroll-inner--alarm"
            >
              <table class="data-panel__table">
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>报警类型</th>
                    <th>报警详情</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in alarmList" :key="`a-${item.id}`">
                    <td>{{ alarmDeviceLabel(item) }}</td>
                    <td>{{ alarmTypeText(item) }}</td>
                    <td class="col-detail">{{ alarmDetailText(item) }}</td>
                    <td>{{ formatHoursAgo(item.alarmTime) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&display=swap");

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (width <= 1400px) {
  .data-screen__columns {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .data-screen__col {
    min-height: 320px;
  }
}

@media (width <= 1280px) {
  .data-screen__header {
    grid-template-columns: 1fr;
    gap: 10px;
    min-height: auto;
    padding-bottom: 14px;
  }

  .data-screen__title {
    order: -1;
    max-width: 100%;
  }

  .data-screen__header-side--left,
  .data-screen__header-side--right {
    justify-content: center;
  }

  .data-screen__title-text {
    letter-spacing: 0.14em;
  }
}

.data-screen {
  /* 基础色板 */
  --ds-bg-deep: #0a2240;
  --ds-bg-mid: #0e3254;
  --ds-bg-top: #0e3254;
  --ds-bg-bottom: #071a32;
  --ds-accent: #4db8ff;
  --ds-accent-bright: #6ecfff;
  --ds-text: #f8fbff;
  --ds-text-body: #e3f0fa;
  --ds-text-muted: #b9cfe4;
  --ds-success: #2dd4a0;
  --ds-warning: #f0b429;
  --ds-danger: #ff5c75;
  --ds-todo: #ff9a4d;
  --ds-todo-bright: #ffb84d;
  --ds-offline: #8aa0b8;
  --ds-panel-bg: rgb(14 50 84 / 55%);
  --ds-card-accent: rgb(77 184 255 / 12%);
  --ds-panel-border: var(--tech-edge-dim);
  --ds-glow: rgb(77 184 255 / 14%);
  --ds-card-inner: rgb(10 34 64 / 62%);

  /* 基础外框 */
  --frame-w: 1px;
  --frame-color: #4db8ff;
  --tech-edge: rgb(77 184 255 / 50%);
  --tech-edge-dim: rgb(77 184 255 / 22%);
  --glass-edge: rgb(77 184 255 / 36%);

  /* 发光 / 顶光 */
  --tech-frame-glow: 0 0 18px rgb(77 184 255 / 10%);
  --tech-line-glow: 0 0 8px rgb(77 184 255 / 42%);

  /* 四角 bracket */
  --frame-corner-size: 18px;
  --frame-corner-w: 3px;

  /* 面板顶光分色 */
  --flow-color-ingest: #4db8ff;
  --flow-color-analyze: #6ecfff;
  --flow-color-alert: #ffb84d;
  --flow-color-output: #2dd4a0;
  --flow-color: var(--flow-color-ingest);

  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--ds-text);
  background: linear-gradient(
    168deg,
    var(--ds-bg-mid) 0%,
    var(--ds-bg-deep) 42%,
    #0c2a48 68%,
    var(--ds-bg-bottom) 100%
  );
}

/* 数码管风格：仅用于数字/百分比，文字使用默认白色 */
.font-digital {
  font-family: Orbitron, "Share Tech Mono", Consolas, monospace;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.font-digital--value {
  color: var(--ds-accent-bright);
  text-shadow:
    0 0 4px rgb(110 207 255 / 95%),
    0 0 12px rgb(77 184 255 / 65%),
    0 0 24px rgb(77 184 255 / 35%);
}

.data-screen__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.data-screen__gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 90% 55% at 50% -8%,
      rgb(77 184 255 / 16%) 0%,
      transparent 58%
    ),
    radial-gradient(
      ellipse 70% 50% at 12% 88%,
      rgb(14 50 84 / 55%) 0%,
      transparent 55%
    ),
    radial-gradient(
      ellipse 60% 45% at 88% 78%,
      rgb(110 207 255 / 10%) 0%,
      transparent 50%
    );
}

.data-screen__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(77 184 255 / 7%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(77 184 255 / 7%) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.75;
  mask-image: radial-gradient(
    ellipse 85% 75% at 50% 45%,
    #000 25%,
    transparent 88%
  );
}

.data-screen__hex {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1' d='M28 0 L56 16 L56 50 L28 66 L0 50 L0 16 Z M28 34 L56 50 L56 84 L28 100 L0 84 L0 50 Z'/%3E%3C/svg%3E");
  background-size: 56px 100px;
  opacity: 1;
  mask-image: radial-gradient(
    ellipse 95% 90% at 50% 48%,
    #000 45%,
    transparent 98%
  );
}

.data-screen__horizon {
  position: absolute;
  right: 0;
  bottom: 18%;
  left: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(77 184 255 / 35%) 20%,
    rgb(110 207 255 / 55%) 50%,
    rgb(77 184 255 / 35%) 80%,
    transparent 100%
  );
  box-shadow:
    0 0 20px rgb(77 184 255 / 28%),
    0 -40px 80px rgb(10 34 64 / 35%);
  opacity: 0.55;
}

.data-screen__glow {
  position: absolute;
  border-radius: 50%;
  opacity: 0.38;
  filter: blur(90px);

  &--left {
    top: 6%;
    left: -4%;
    width: 480px;
    height: 480px;
    background: #0e3254;
  }

  &--right {
    right: -4%;
    bottom: 6%;
    width: 440px;
    height: 440px;
    background: #0a2240;
  }

  &--center {
    top: 38%;
    left: 50%;
    width: 360px;
    height: 280px;
    background: rgb(77 184 255 / 28%);
    opacity: 0.22;
    transform: translateX(-50%);
  }
}

.data-screen__scanline {
  display: none;
}

.data-screen__frame {
  position: absolute;
  inset: 10px 12px;
  pointer-events: none;
  border: 2px solid var(--tech-edge);
  box-shadow: var(--tech-frame-glow);
}

.data-screen__frame-corner {
  position: absolute;
  width: var(--frame-corner-size);
  height: var(--frame-corner-size);
  border-color: var(--frame-color);
  border-style: solid;
  box-shadow: var(--tech-line-glow);

  &--tl {
    top: -1px;
    left: -1px;
    border-width: var(--frame-corner-w) 0 0 var(--frame-corner-w);
  }

  &--tr {
    top: -1px;
    right: -1px;
    border-width: var(--frame-corner-w) var(--frame-corner-w) 0 0;
  }

  &--bl {
    bottom: -1px;
    left: -1px;
    border-width: 0 0 var(--frame-corner-w) var(--frame-corner-w);
  }

  &--br {
    right: -1px;
    bottom: -1px;
    border-width: 0 var(--frame-corner-w) var(--frame-corner-w) 0;
  }
}

.data-screen__header {
  position: relative;
  z-index: 2;
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-height: 96px;
  padding: 10px 20px 12px;
  background: linear-gradient(
    180deg,
    rgb(14 50 84 / 70%) 0%,
    rgb(10 34 64 / 30%) 100%
  );
  border-bottom: var(--frame-w) solid var(--tech-edge);
  box-shadow:
    0 4px 24px rgb(0 0 0 / 35%),
    inset 0 1px 0 rgb(110 207 255 / 14%),
    var(--tech-frame-glow);
  backdrop-filter: blur(10px);
}

.data-screen__header-side {
  display: flex;
  align-items: center;
  min-width: 0;

  &--left {
    justify-content: flex-start;
    max-width: 100%;
  }

  &--right {
    gap: 10px;
    justify-content: flex-end;
    max-width: 100%;
  }
}

.data-screen__fullscreen,
.data-screen__exit {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 14px;
  font-size: 0.85rem;
  color: var(--ds-text);
  cursor: pointer;
  background: rgb(14 50 84 / 55%);
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgb(110 207 255 / 12%);
  backdrop-filter: blur(6px);
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;

  &:hover {
    color: var(--ds-text);
    background: rgb(77 184 255 / 22%);
    border-color: rgb(110 207 255 / 60%);
    box-shadow: 0 0 16px rgb(77 184 255 / 30%);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
}

.data-screen__exit {
  color: #ffb0ba;
  border-color: rgb(255 92 117 / 40%);

  &:hover {
    color: var(--ds-text);
    background: rgb(255 92 117 / 28%);
    border-color: rgb(255 92 117 / 60%);
  }
}

.data-screen__title {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-self: center;
  max-width: min(560px, 46vw);
  margin: 0;
  text-align: center;
}

.data-screen__title-text {
  display: inline-block;
  font-size: clamp(1.15rem, 1.5vw + 0.9rem, 1.5rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--ds-text);
  letter-spacing: 0.22em;
  white-space: nowrap;
  text-shadow:
    0 0 12px rgb(77 184 255 / 70%),
    0 0 28px rgb(110 207 255 / 40%);
}

.data-screen__title-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.data-screen__title-ornament--top {
  gap: 14px;
  margin-bottom: 2px;
}

.data-screen__title-wing {
  flex: 1;
  max-width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(77 184 255 / 85%));

  &--mirror {
    background: linear-gradient(90deg, rgb(77 184 255 / 85%), transparent);
  }
}

.data-screen__title-gem {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: #6ecfff;
  box-shadow:
    0 0 10px rgb(110 207 255 / 90%),
    0 0 18px rgb(77 184 255 / 65%);
  transform: rotate(45deg);
}

.data-screen__title-ornament--bottom {
  gap: 0;
  margin-top: 2px;
}

.data-screen__title-beam {
  flex: 1;
  max-width: 140px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(77 184 255 / 30%) 40%,
    rgb(110 207 255 / 75%) 100%
  );

  &--right {
    background: linear-gradient(
      90deg,
      rgb(110 207 255 / 75%) 0%,
      rgb(77 184 255 / 30%) 60%,
      transparent 100%
    );
  }
}

.data-screen__title-core {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  padding: 0 10px;
}

.data-screen__title-notch {
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid rgb(77 184 255 / 85%);

  &--mirror {
    border-right: 6px solid rgb(77 184 255 / 85%);
    border-left: none;
  }
}

.data-screen__title-bar {
  width: 72px;
  height: 2px;
  background: linear-gradient(
    90deg,
    rgb(14 50 84 / 35%),
    #4db8ff,
    rgb(14 50 84 / 35%)
  );
  box-shadow: 0 0 10px rgb(77 184 255 / 50%);

  &--short {
    width: 36px;
    opacity: 0.75;
  }
}

.data-screen__title-node {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  background: #6ecfff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgb(110 207 255 / 85%);
}

.data-screen__clock-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 8px 14px;
  background: rgb(14 50 84 / 45%);
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgb(110 207 255 / 12%),
    0 0 20px rgb(77 184 255 / 18%);
  backdrop-filter: blur(8px);
}

.data-screen__clock-week {
  font-size: 1.1rem;
  line-height: 1.2;
  color: #fff;
  letter-spacing: 0.12em;
}

.data-screen__clock-main {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: baseline;
  font-size: 1.8rem;
  line-height: 1.15;
}

.data-screen__clock-date {
  opacity: 0.92;
}

.data-screen__clock-time {
  font-size: 2rem;
  letter-spacing: 0.12em;
}

.data-screen__columns {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  padding: 12px 16px 16px;
  isolation: isolate;
}

.data-screen__col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;

  &--left {
    --flow-color: var(--flow-color-ingest);
  }

  &--center {
    --flow-color: var(--flow-color-analyze);
  }

  &--right {
    --flow-color: var(--flow-color-alert);
  }
}

.data-panel {
  --panel-accent: var(--flow-color);

  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px 14px;
  overflow: hidden;
  background: linear-gradient(
    145deg,
    var(--ds-panel-bg) 0%,
    var(--ds-card-accent) 100%
  );
  border: var(--frame-w) solid var(--tech-edge);
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--flow-color) 18%, transparent),
    0 4px 20px rgb(0 0 0 / 32%),
    var(--tech-frame-glow);
  animation: panel-in 0.3s ease both;
  animation-delay: var(--delay, 0s);

  &::before {
    position: absolute;
    top: 0;
    right: 8%;
    left: 8%;
    height: 2px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      var(--flow-color),
      transparent
    );
    box-shadow: var(--tech-line-glow);
  }

  &--grow {
    flex: 1;
    min-height: 0;
  }

  &--water {
    --flow-color: var(--flow-color-output);

    flex-shrink: 0;
    height: 140px;
  }
}

.data-panel__corner {
  position: absolute;
  width: var(--frame-corner-size);
  height: var(--frame-corner-size);
  border-color: var(--flow-color);
  border-style: solid;
  filter: drop-shadow(
    0 0 6px color-mix(in srgb, var(--flow-color) 55%, transparent)
  );

  &--tl {
    top: -1px;
    left: -1px;
    border-width: var(--frame-corner-w) 0 0 var(--frame-corner-w);
  }

  &--tr {
    top: -1px;
    right: -1px;
    border-width: var(--frame-corner-w) var(--frame-corner-w) 0 0;
  }

  &--bl {
    bottom: -1px;
    left: -1px;
    border-width: 0 0 var(--frame-corner-w) var(--frame-corner-w);
  }

  &--br {
    right: -1px;
    bottom: -1px;
    border-width: 0 var(--frame-corner-w) var(--frame-corner-w) 0;
  }
}

.data-panel__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;

  &--between {
    flex-flow: row wrap;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.data-panel__head-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.data-panel__head-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.data-panel__head-deco {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--flow-color) 22%, transparent) 0%,
    transparent 72%
  );
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 8px;
  box-shadow:
    0 0 20px color-mix(in srgb, var(--flow-color) 28%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--flow-color) 12%, transparent);
}

.data-panel__head-deco-icon {
  width: 20px;
  height: 20px;
  color: var(--flow-color);
  filter: drop-shadow(
    0 0 6px color-mix(in srgb, var(--flow-color) 45%, transparent)
  );
}

.data-panel__head-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-text);
  letter-spacing: 0.12em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--flow-color) 35%, transparent);
}

.data-panel__head-wave {
  position: relative;
  width: 100%;
  max-width: 220px;
  height: 10px;
  overflow: hidden;

  &::before {
    position: absolute;
    inset: auto 0 3px;
    height: 1px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--flow-color) 80%, transparent) 35%,
      color-mix(in srgb, var(--flow-color) 65%, transparent) 65%,
      transparent 100%
    );
    box-shadow: var(--tech-line-glow);
  }

  &::after {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 200%;
    height: 8px;
    content: "";
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8' preserveAspectRatio='none'%3E%3Cpath fill='none' stroke='rgba(77,184,255,0.45)' stroke-width='1' d='M0 4 Q15 0 30 4 T60 4 T90 4 T120 4'/%3E%3C/svg%3E")
      repeat-x;
    background-size: 60px 8px;
    opacity: 0.9;
  }
}

.basic-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.basic-info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 10px 6px;
  text-align: center;
  background: var(--ds-card-inner);
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgb(248 251 255 / 8%);

  :deep(.count-to) {
    color: #4db8ff;
    text-shadow: 0 0 8px rgb(77 184 255 / 45%);
  }

  &:nth-child(2) :deep(.count-to) {
    color: #2dd4a0;
    text-shadow: 0 0 8px rgb(45 212 160 / 40%);
  }

  &:nth-child(3) :deep(.count-to) {
    color: #ffb84d;
    text-shadow: 0 0 8px rgb(255 184 77 / 40%);
  }
}

.basic-info-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 22px;
  color: #4db8ff;
  background: rgb(77 184 255 / 6%);
  border-radius: 50%;
  box-shadow: 0 0 12px rgb(77 184 255 / 20%);

  &--elec {
    color: #2dd4a0;
    background: rgb(45 212 160 / 6%);
    box-shadow: 0 0 12px rgb(45 212 160 / 20%);
  }

  &--user {
    color: #ffb84d;
    background: rgb(255 184 77 / 6%);
    box-shadow: 0 0 12px rgb(255 184 77 / 20%);
  }
}

.basic-info-item__label {
  font-size: 11px;
  color: #fff;
}

.data-panel__chart {
  flex-shrink: 0;
  width: 100%;

  &--sm {
    height: 150px;
  }

  &--energy {
    flex: 1;
    min-width: 0;
    min-height: 160px;
  }
}

.energy-panel__body {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
}

.energy-panel__stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  width: 118px;
  padding: 4px 8px;
  background: transparent;
  border-left: var(--frame-w) solid var(--tech-edge-dim);
  border-radius: 0 4px 4px 0;
}

.energy-panel__stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.energy-panel__stat-label {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.06em;
}

.energy-panel__stat-value {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  line-height: 1.1;
}

.energy-panel__stat-num {
  font-size: 1.375rem;
}

.energy-panel__stat-unit {
  font-size: 0.95rem;
  color: #fff;
  opacity: 0.92;
}

.energy-panel__stat-pct {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
  word-break: break-all;

  &.is-text {
    font-size: 12px;
    font-weight: 500;
    color: rgb(255 255 255 / 78%);
  }

  &.is-up {
    color: #2dd4a0;
    text-shadow:
      0 0 6px rgb(45 212 160 / 80%),
      0 0 14px rgb(45 212 160 / 40%);
  }

  &.is-down {
    color: #ff9a4d;
    text-shadow:
      0 0 6px rgb(255 154 77 / 75%),
      0 0 14px rgb(255 154 77 / 35%);
  }
}

.energy-panel__empty {
  padding: 8px 0;
  font-size: 12px;
  color: rgb(255 255 255 / 72%);
  text-align: center;
}

.energy-panel__rank {
  display: flex;
  flex-shrink: 1;
  flex-direction: column;
  width: 156px;
  min-width: 0;
  min-height: 0;
  padding: 4px 8px;
  border-left: var(--frame-w) solid var(--tech-edge-dim);

  &--cards {
    width: min(188px, 28%);
    max-width: 188px;
  }
}

.energy-panel__rank-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.06em;
}

.energy-rank-cards {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding-right: 2px;
  overflow: hidden auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(138 160 184 / 38%);
    border-radius: 2px;
  }
}

.energy-rank-card {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: var(--ds-card-inner);
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    border-color: rgb(185 207 228 / 55%);
    box-shadow: 0 0 16px rgb(138 160 184 / 22%);
  }
}

.energy-rank-card__no {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  border-radius: 5px;
}

.energy-rank-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.energy-rank-card__collector {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
}

.energy-rank-card__value {
  font-size: 11px;
  font-weight: 600;
  color: #2dd4a0;
}

.data-panel__scroll-wrap {
  flex: 1;
  min-height: 0;
  margin-top: 4px;
  overflow: hidden;
}

.data-panel__scroll-inner {
  height: 100%;
  overflow: auto;
}

.data-panel__table {
  width: 100%;
  font-size: 11px;
  border-collapse: collapse;

  th,
  td {
    padding: 5px 6px;
    text-align: left;
    border-bottom: var(--frame-w) dashed var(--tech-edge-dim);
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    font-weight: 600;
    color: #fff;
    background: rgb(22 50 88 / 48%);
  }

  td {
    color: #fff;
  }

  .col-detail {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tag--on {
  color: #2dd4a0;
}

.tag--off {
  color: #ff9a4d;
}

.data-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60px;
  font-size: 12px;
  color: rgb(255 255 255 / 72%);
}

.data-screen__kpis {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 0.5fr 1fr 1fr 0.5fr;
  gap: 10px;
}

.data-panel--kpi {
  /* KPI 仍可用行内 --panel-accent 覆盖；未设置时走中列亮青 */
  --flow-color: var(--panel-accent, var(--flow-color-analyze));

  min-height: 88px;
  background: linear-gradient(
    160deg,
    var(--ds-panel-bg) 0%,
    var(--ds-card-accent) 100%
  );
  border-color: var(--glass-edge);
  box-shadow:
    inset 0 1px 0 rgb(110 207 255 / 12%),
    0 4px 20px rgb(10 34 64 / 35%),
    var(--tech-frame-glow);
}

.data-panel--kpi-narrow {
  padding: 10px 12px;

  :deep(.count-to) {
    font-size: 1.4rem !important;
  }
}

.data-panel__label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--ds-text-muted);
}

.data-panel__value {
  display: flex;
  gap: 4px;
  align-items: baseline;
}

.data-panel__number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--panel-accent, #4db8ff);
}

.data-panel__unit {
  font-size: 12px;
  color: var(--ds-text-body);
}

.dimension-tabs {
  display: flex;
  gap: 6px;
}

.dimension-tabs__btn {
  padding: 3px 12px;
  font-size: 12px;
  color: var(--ds-text-body);
  cursor: pointer;
  background: transparent;
  border: var(--frame-w) solid var(--glass-edge);
  border-radius: 3px;
  transition: all 0.2s;

  &.is-active,
  &:hover {
    color: var(--ds-text);
    background: rgb(77 184 255 / 22%);
    border-color: #6ecfff;
    box-shadow: 0 0 14px rgb(77 184 255 / 32%);
  }
}

.data-panel__placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: rgb(255 255 255 / 72%);
  text-align: center;

  .placeholder-icon {
    font-size: 28px;
    color: rgb(185 207 228 / 45%);
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #fff;
  }

  span {
    font-size: 11px;
    color: rgb(255 255 255 / 65%);
  }
}
</style>

<style lang="scss">
/* 大屏网页全屏：占满视口并禁止页面滚动，不触发浏览器原生全屏 */
html.data-screen-web-fullscreen,
html.data-screen-web-fullscreen body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
