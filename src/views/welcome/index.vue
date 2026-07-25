<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import dayjs from "dayjs";
import { getWelcomeLoginInfo } from "@/api/user";
import ReCol from "@/components/ReCol";
import { useDark } from "./utils";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { CollectorStatusPie, MailNotifyTrend } from "./components/charts";
import EnergyTrendOverview from "./components/EnergyTrendOverview.vue";
import { getCollectorList } from "@/api/collector";
import type { AlarmEvent } from "@/api/types";
import { getAlarmEventQueryList, getAlarmMailNotifyTrend } from "@/api/alarm";
import { getAlarmTypeLabel } from "@/views/nested/alarm/constants";
import { getSiteEnergyKpi, type SiteEnergyKpi } from "@/api/business-stats";

defineOptions({
  name: "Welcome"
});

const { isDark } = useDark();
const collectorLoading = ref(false);
const collectorCount = ref(0);
const collectorOnlineCount = ref(0);
const collectorOfflineCount = ref(0);
const collectorRows = ref<Record<string, unknown>[]>([]);

/** 系统信息（区域与增值服务状态） */
const regionName = ref("凯晟能耗管理平台");
const regionAddress = ref("—");

const loginInfoLoading = ref(false);
const recentLoginRawTime = ref<string | null>(null);
const loginTimeTick = ref(0);
let loginTimeTimer: ReturnType<typeof setInterval> | null = null;

const lastLogin = ref({ time: "—", ip: "—", address: "—" });
const recentLoginIp = ref("—");
const recentLoginAddress = ref("—");

const formatDaysAgo = (ts?: string | null) => {
  if (!ts) return "—";
  const d = dayjs(ts);
  if (!d.isValid()) return "—";
  const days = dayjs().startOf("day").diff(d.startOf("day"), "day");
  if (days <= 0) return "今天";
  return `${days}天前`;
};

const formatAgoPrecise = (ts?: string | null) => {
  if (!ts) return "—";
  const d = dayjs(ts);
  if (!d.isValid()) return "—";
  let sec = dayjs().diff(d, "second");
  if (sec < 0) sec = 0;
  if (sec < 1) return "刚刚";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}小时${m}分${s}秒前`;
  if (m > 0) return `${m}分${s}秒前`;
  return `${s}秒前`;
};

const recentLoginTimeDisplay = computed(() => {
  void loginTimeTick.value;
  return formatAgoPrecise(recentLoginRawTime.value);
});

const loadLoginInfo = async () => {
  loginInfoLoading.value = true;
  try {
    const info = await getWelcomeLoginInfo();
    recentLoginRawTime.value = info.recent.rawTime;
    recentLoginIp.value = info.recent.ip;
    recentLoginAddress.value = info.recent.address;
    lastLogin.value = {
      time: formatDaysAgo(info.last.rawTime),
      ip: info.last.ip,
      address: info.last.address
    };
  } catch (error) {
    console.error("加载登录信息失败:", error);
    recentLoginRawTime.value = null;
    recentLoginIp.value = "—";
    recentLoginAddress.value = "—";
    lastLogin.value = { time: "—", ip: "—", address: "—" };
  } finally {
    loginInfoLoading.value = false;
  }
};

const systemServiceRows = [
  { label: "邮件服务", value: "已开通", inactive: false },
  {
    label: "邮件剩余条数",
    value: "按阿里云账户余额计费",
    inactive: false
  },
  { label: "微信支付服务", value: "未开通", inactive: true },
  { label: "APP下载", value: "未开通", inactive: true },
  { label: "用户缴费公众号", value: "未开通", inactive: true }
] as const;

const powerLoading = ref(false);
const powerYearLoading = ref(false);
const powerSummaryHasSnapshot = ref(false);
const powerToday = ref(0);
const powerYesterday = ref(0);
const powerThisMonth = ref(0);
const powerLastMonth = ref(0);
const powerThisYear = ref(0);
const powerLastYear = ref(0);
const POWER_SUMMARY_CACHE_KEY = "welcome:power-summary:v7";
const POWER_SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;

const alarmLoading = ref(false);
const alarmList = ref<AlarmEvent[]>([]);
const alarmTotal = ref(0);
const alarmScrollRef = ref<HTMLElement>();
const alarmListStyle = ref<Record<string, string>>({});
/** 单行最小高度，保证三行文字不重叠 */
const ALARM_ROW_MIN = 56;
let alarmLayoutObserver: ResizeObserver | null = null;

const syncAlarmListLayout = () => {
  const el = alarmScrollRef.value;
  const count = alarmList.value.length;
  if (!el || count === 0) {
    alarmListStyle.value = {};
    return;
  }
  const height = el.clientHeight;
  if (height <= 0) return;

  const evenRow = height / count;
  const rowH = evenRow >= ALARM_ROW_MIN ? evenRow : ALARM_ROW_MIN;
  const timeFont = Math.min(13, Math.max(10, Math.round(rowH * 0.17)));
  const bodyFont = Math.min(13, Math.max(11, Math.round(rowH * 0.19)));
  const fillPanel = evenRow >= ALARM_ROW_MIN;

  alarmListStyle.value = {
    "--alarm-row-h": `${Math.floor(rowH)}px`,
    "--alarm-time-fs": `${timeFont}px`,
    "--alarm-body-fs": `${bodyFont}px`,
    minHeight: fillPanel ? `${height}px` : "auto"
  };
};

const setupAlarmLayoutObserver = () => {
  alarmLayoutObserver?.disconnect();
  alarmLayoutObserver = null;
  alarmLayoutObserver = new ResizeObserver(() => {
    syncAlarmListLayout();
  });
  if (alarmScrollRef.value) {
    alarmLayoutObserver.observe(alarmScrollRef.value);
  }
  syncAlarmListLayout();
};

const resolveCollectorNo = (item: AlarmEvent) => {
  if (item.collectorId != null && String(item.collectorId).trim() !== "") {
    const raw = String(item.collectorId).trim();
    const cid = Number(raw);
    if (Number.isFinite(cid)) {
      const row = collectorRows.value.find(
        r => Number(r.id ?? r.collectorId) === cid
      );
      if (row) {
        const no = String(
          row.collectorNo ?? row.code ?? row.collectorCode ?? ""
        ).trim();
        if (no) return no;
      }
    }
    return raw;
  }
  const deviceId = Number(item.deviceId ?? item.meterId);
  if (Number.isFinite(deviceId)) {
    const row = collectorRows.value.find(
      r => Number(r.id ?? r.collectorId) === deviceId
    );
    if (row) {
      const no = String(
        row.collectorNo ?? row.code ?? row.collectorCode ?? ""
      ).trim();
      if (no) return no;
    }
  }
  return "—";
};

const alarmMeterNo = (item: AlarmEvent) => {
  const no = String(item.meterNo ?? item.deviceCode ?? "").trim();
  return no || "—";
};

const alarmCollectorNo = (item: AlarmEvent) => resolveCollectorNo(item);

const alarmTypeText = (item: AlarmEvent) =>
  getAlarmTypeLabel(String(item.alarmType ?? "")) || "—";

const formatAlarmTime = (time?: string) => {
  if (!time) return "—";
  const d = dayjs(time);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(time);
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

const loadCollectorStats = async () => {
  collectorLoading.value = true;
  try {
    const response = await getCollectorList({
      page: 1,
      pageSize: 10000
    });
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
  } catch (error) {
    console.error("加载首页采集器统计失败:", error);
    collectorRows.value = [];
    collectorCount.value = 0;
    collectorOnlineCount.value = 0;
    collectorOfflineCount.value = 0;
  } finally {
    collectorLoading.value = false;
  }
};

const loadSystemRegionInfo = async () => {
  // 系统信息面板区域名称固定展示；区域地址暂无配置时保持 —
  regionName.value = "凯晟能耗管理平台";
  if (!regionAddress.value) {
    regionAddress.value = "—";
  }
};

const unwrapSiteEnergyKpi = (res: unknown): SiteEnergyKpi => {
  if (!res || typeof res !== "object") return {};
  const root = res as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object") {
    const d = data as SiteEnergyKpi;
    if (d.powerToday != null || d.powerThisMonth != null || d.source != null) {
      return d;
    }
  }
  return root as SiteEnergyKpi;
};

const applySiteEnergyKpi = (kpi: SiteEnergyKpi) => {
  powerToday.value = Number(kpi.powerToday) || 0;
  powerYesterday.value = Number(kpi.powerYesterday) || 0;
  powerThisMonth.value = Number(kpi.powerThisMonth) || 0;
  powerLastMonth.value = Number(kpi.powerLastMonth) || 0;
  powerThisYear.value = Number(kpi.powerThisYear) || 0;
  powerLastYear.value = Number(kpi.powerLastYear) || 0;
  powerSummaryHasSnapshot.value = true;
};

const formatPowerNumber = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v);
};

type PowerSummaryCachePayload = {
  at: number;
  todayKey: string;
  yesterdayKey: string;
  thisMonthKey: string;
  lastMonthKey: string;
  thisYearKey: string;
  lastYearKey: string;
  powerToday: number;
  powerYesterday: number;
  powerThisMonth: number;
  powerLastMonth: number;
  powerThisYear: number;
  powerLastYear: number;
};

const computePowerSummaryKeys = () => {
  const today = dayjs();
  return {
    today: today.format("YYYYMMDD"),
    yesterday: today.subtract(1, "day").format("YYYYMMDD"),
    thisMonth: today.format("YYYYMM"),
    lastMonth: today.subtract(1, "month").format("YYYYMM"),
    thisYear: today.format("YYYY"),
    lastYear: today.subtract(1, "year").format("YYYY")
  };
};

type PowerSummaryKeySet = ReturnType<typeof computePowerSummaryKeys>;

const powerSummaryKeysMatch = (
  parsed: PowerSummaryCachePayload,
  keys: PowerSummaryKeySet
) =>
  parsed.todayKey === keys.today &&
  parsed.yesterdayKey === keys.yesterday &&
  parsed.thisMonthKey === keys.thisMonth &&
  parsed.lastMonthKey === keys.lastMonth &&
  parsed.thisYearKey === keys.thisYear &&
  parsed.lastYearKey === keys.lastYear;

const applyPowerSummaryCache = (parsed: PowerSummaryCachePayload) => {
  powerToday.value = Number(parsed.powerToday) || 0;
  powerYesterday.value = Number(parsed.powerYesterday) || 0;
  powerThisMonth.value = Number(parsed.powerThisMonth) || 0;
  powerLastMonth.value = Number(parsed.powerLastMonth) || 0;
  powerThisYear.value = Number(parsed.powerThisYear) || 0;
  powerLastYear.value = Number(parsed.powerLastYear) || 0;
  powerSummaryHasSnapshot.value = true;
};

const loadPowerSummaryCacheRaw = (): PowerSummaryCachePayload | null => {
  try {
    const raw = localStorage.getItem(POWER_SUMMARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PowerSummaryCachePayload;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

/** 进入页面前同步恢复缓存，避免每次先闪 loading */
const hydratePowerSummaryFromStorage = (): boolean => {
  const keys = computePowerSummaryKeys();
  const parsed = loadPowerSummaryCacheRaw();
  if (!parsed || !powerSummaryKeysMatch(parsed, keys)) return false;
  applyPowerSummaryCache(parsed);
  return true;
};

const isPowerSummaryCacheFresh = (parsed: PowerSummaryCachePayload) =>
  Date.now() - Number(parsed.at || 0) <= POWER_SUMMARY_CACHE_TTL_MS;

hydratePowerSummaryFromStorage();

const writePowerSummaryCache = (payload: PowerSummaryCachePayload) => {
  try {
    localStorage.setItem(POWER_SUMMARY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota/storage errors
  }
};

const buildPowerSummaryCachePayload = (
  keys: PowerSummaryKeySet
): PowerSummaryCachePayload => ({
  at: Date.now(),
  todayKey: keys.today,
  yesterdayKey: keys.yesterday,
  thisMonthKey: keys.thisMonth,
  lastMonthKey: keys.lastMonth,
  thisYearKey: keys.thisYear,
  lastYearKey: keys.lastYear,
  powerToday: powerToday.value,
  powerYesterday: powerYesterday.value,
  powerThisMonth: powerThisMonth.value,
  powerLastMonth: powerLastMonth.value,
  powerThisYear: powerThisYear.value,
  powerLastYear: powerLastYear.value
});

/** 首页六项用电 KPI：一次读 fact 表，避免 month/year summary 扇出 3.2 超时 */
const loadPowerSummary = async () => {
  const keys = computePowerSummaryKeys();
  const cached = loadPowerSummaryCacheRaw();
  const cacheUsable =
    cached &&
    powerSummaryKeysMatch(cached, keys) &&
    isPowerSummaryCacheFresh(cached);

  if (cacheUsable) {
    applyPowerSummaryCache(cached);
    return;
  }

  const showBlockingLoad = !powerSummaryHasSnapshot.value;
  if (showBlockingLoad) {
    powerLoading.value = true;
  }
  powerYearLoading.value = true;

  try {
    const res = await getSiteEnergyKpi();
    applySiteEnergyKpi(unwrapSiteEnergyKpi(res));
    writePowerSummaryCache(buildPowerSummaryCachePayload(keys));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("加载近期用电量汇总失败:", e);
    }
    if (!powerSummaryHasSnapshot.value) {
      powerToday.value = 0;
      powerYesterday.value = 0;
      powerThisMonth.value = 0;
      powerLastMonth.value = 0;
      powerThisYear.value = 0;
      powerLastYear.value = 0;
    }
  } finally {
    powerLoading.value = false;
    powerYearLoading.value = false;
  }
};

const loadAlarmTimeline = async () => {
  alarmLoading.value = true;
  try {
    const { code, data } = await getAlarmEventQueryList({
      alarmType: "",
      alarmLevel: "",
      alarmStatus: "",
      alarmTime: "",
      pageSize: 100,
      currentPage: 1
    });
    if (code === 0 && data?.list) {
      alarmList.value = data.list as AlarmEvent[];
      alarmTotal.value = Number(data.total) || alarmList.value.length;
    } else {
      alarmList.value = [];
      alarmTotal.value = 0;
    }
  } catch (e) {
    console.error("加载报警信息失败:", e);
    alarmList.value = [];
    alarmTotal.value = 0;
  } finally {
    alarmLoading.value = false;
  }
};

const collectorOnlineRate = computed(() => {
  const total = collectorOnlineCount.value + collectorOfflineCount.value;
  if (!total) return "在线 0 / 离线 0";
  return `在线 ${collectorOnlineCount.value} / 离线 ${collectorOfflineCount.value}`;
});

const mailTrendLoading = ref(false);
const mailTrendDates = ref<string[]>([]);
const mailTrendSuccess = ref<number[]>([]);
const mailTrendFail = ref<number[]>([]);

const loadMailNotifyTrend = async () => {
  mailTrendLoading.value = true;
  try {
    const res = (await getAlarmMailNotifyTrend(7)) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? {}) as {
      dates?: string[];
      success?: number[];
      fail?: number[];
    };
    if (ok) {
      mailTrendDates.value = Array.isArray(data.dates) ? data.dates : [];
      mailTrendSuccess.value = (data.success ?? []).map(n => Number(n) || 0);
      mailTrendFail.value = (data.fail ?? []).map(n => Number(n) || 0);
    } else {
      mailTrendDates.value = [];
      mailTrendSuccess.value = [];
      mailTrendFail.value = [];
    }
  } catch (e) {
    console.error("加载邮件通知趋势失败:", e);
    mailTrendDates.value = [];
    mailTrendSuccess.value = [];
    mailTrendFail.value = [];
  } finally {
    mailTrendLoading.value = false;
  }
};

const onlineChartWrapRef = ref<HTMLElement>();
const mailChartWrapRef = ref<HTMLElement>();
const topChartHeight = ref(120);
let onlineChartResizeObserver: ResizeObserver | null = null;

const syncOnlineChartHeight = () => {
  const h1 = onlineChartWrapRef.value?.clientHeight ?? 0;
  const h2 = mailChartWrapRef.value?.clientHeight ?? 0;
  const height = Math.max(h1, h2);
  if (height > 0) {
    // 限制上行图表高度，避免把下方「趋势/报警」挤出视口
    topChartHeight.value = Math.min(Math.max(height, 96), 140);
  }
};

const setupOnlineChartResizeObserver = () => {
  onlineChartResizeObserver?.disconnect();
  onlineChartResizeObserver = null;
  onlineChartResizeObserver = new ResizeObserver(() => {
    syncOnlineChartHeight();
  });
  if (onlineChartWrapRef.value) {
    onlineChartResizeObserver.observe(onlineChartWrapRef.value);
  }
  if (mailChartWrapRef.value) {
    onlineChartResizeObserver.observe(mailChartWrapRef.value);
  }
  syncOnlineChartHeight();
};

onMounted(() => {
  // 并行：勿先 await 采集器，否则 KPI/报警被挡住数秒
  loadCollectorStats();
  loadSystemRegionInfo();
  loadPowerSummary();
  loadAlarmTimeline();
  loadMailNotifyTrend();
  loadLoginInfo();
  loginTimeTimer = setInterval(() => {
    loginTimeTick.value++;
  }, 1000);
  void nextTick().then(() => {
    setupOnlineChartResizeObserver();
    setupAlarmLayoutObserver();
  });
});

watch([collectorLoading, mailTrendLoading], async () => {
  await nextTick();
  setupOnlineChartResizeObserver();
});

watch([alarmList, alarmLoading], async () => {
  if (!alarmLoading.value) {
    await nextTick();
    setupAlarmLayoutObserver();
  }
});

onUnmounted(() => {
  alarmLayoutObserver?.disconnect();
  alarmLayoutObserver = null;
  onlineChartResizeObserver?.disconnect();
  onlineChartResizeObserver = null;
  if (loginTimeTimer) {
    clearInterval(loginTimeTimer);
    loginTimeTimer = null;
  }
});
</script>

<template>
  <div class="welcome-dashboard">
    <div class="welcome-section welcome-section--top">
      <el-row :gutter="12" class="welcome-section__row">
        <re-col
          v-motion
          class="welcome-col"
          :value="16"
          :xs="24"
          :initial="{ opacity: 0, y: 100 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 80 } }"
        >
          <div class="welcome-top-left">
            <el-card
              class="bar-card welcome-card welcome-card--online welcome-card--top-stretch"
              shadow="never"
            >
              <div class="flex justify-between items-center gap-2">
                <span class="text-sm font-medium">采集器在线情况</span>
                <span class="text-xs text-text_color_regular">
                  {{ collectorOnlineRate }}
                </span>
              </div>
              <div
                ref="onlineChartWrapRef"
                class="welcome-online-chart-wrap mt-1"
              >
                <CollectorStatusPie
                  :height="topChartHeight"
                  :online="collectorOnlineCount"
                  :offline="collectorOfflineCount"
                  :loading="collectorLoading"
                />
              </div>
            </el-card>

            <el-card
              class="bar-card welcome-card welcome-card--mail welcome-card--top-stretch"
              shadow="never"
            >
              <div class="flex justify-between items-center gap-2">
                <span class="text-sm font-medium">邮件通知情况</span>
                <span class="text-xs text-text_color_regular">近7日</span>
              </div>
              <div
                ref="mailChartWrapRef"
                class="welcome-online-chart-wrap mt-1"
              >
                <MailNotifyTrend
                  :height="topChartHeight"
                  :dates="mailTrendDates"
                  :success="mailTrendSuccess"
                  :fail="mailTrendFail"
                  :loading="mailTrendLoading"
                />
              </div>
            </el-card>

            <el-card
              class="line-card welcome-card welcome-card--count welcome-card--top-stretch"
              shadow="never"
            >
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium">采集器数量</span>
                <div
                  class="w-7 h-7 flex justify-center items-center rounded-md"
                  :style="{
                    backgroundColor: isDark ? 'transparent' : '#effaff'
                  }"
                >
                  <IconifyIconOffline
                    icon="ri:database-2-line"
                    color="#41b6ff"
                    width="16"
                    height="16"
                  />
                </div>
              </div>
              <div class="welcome-count-body mt-1">
                <ReNormalCountTo
                  :duration="1800"
                  :fontSize="'1.15em'"
                  :startVal="0"
                  :endVal="collectorCount"
                />
                <span class="text-xs font-medium text-green-500">
                  {{ collectorLoading ? "同步中" : "实时总量" }}
                </span>
              </div>
            </el-card>
          </div>
        </re-col>

        <re-col
          v-motion
          class="welcome-col welcome-col--side"
          :value="8"
          :xs="24"
          :initial="{ opacity: 0, y: 100 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 200 } }"
        >
          <el-card
            class="welcome-card welcome-card--power-summary welcome-card--top-fill welcome-card--side"
            shadow="never"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">近期数据汇总</span>
            </div>
            <div
              v-loading="powerLoading"
              class="mt-1 power-summary power-summary--stack"
            >
              <p
                v-if="powerLoading && !powerSummaryHasSnapshot"
                class="mb-1 text-[11px] text-text_color_regular"
              >
                首次加载会比较慢，请耐心等待...
              </p>
              <div class="power-summary__grid">
                <div class="power-summary__col">
                  <div class="power-summary__item">
                    <span class="power-summary__label">今日用电量（KW/h）</span>
                    <span
                      class="power-summary__value power-summary__value--red"
                    >
                      {{ formatPowerNumber(powerToday) }}
                    </span>
                  </div>
                  <div class="power-summary__item">
                    <span class="power-summary__label">本月用电量（KW/h）</span>
                    <span
                      class="power-summary__value power-summary__value--red"
                    >
                      {{ formatPowerNumber(powerThisMonth) }}
                    </span>
                  </div>
                  <div class="power-summary__item">
                    <span class="power-summary__label">今年用电量（KW/h）</span>
                    <span
                      v-if="powerYearLoading && powerThisYear === 0"
                      class="power-summary__value power-summary__value--muted"
                    >
                      加载中…
                    </span>
                    <span
                      v-else
                      class="power-summary__value power-summary__value--red"
                    >
                      {{ formatPowerNumber(powerThisYear) }}
                    </span>
                  </div>
                </div>
                <div class="power-summary__col">
                  <div class="power-summary__item">
                    <span class="power-summary__label">昨日用电量（KW/h）</span>
                    <span
                      class="power-summary__value power-summary__value--green"
                    >
                      {{ formatPowerNumber(powerYesterday) }}
                    </span>
                  </div>
                  <div class="power-summary__item">
                    <span class="power-summary__label">上月用电量（KW/h）</span>
                    <span
                      class="power-summary__value power-summary__value--green"
                    >
                      {{ formatPowerNumber(powerLastMonth) }}
                    </span>
                  </div>
                  <div class="power-summary__item">
                    <span class="power-summary__label">去年用电量（KW/h）</span>
                    <span
                      v-if="powerYearLoading && powerLastYear === 0"
                      class="power-summary__value power-summary__value--muted"
                    >
                      加载中…
                    </span>
                    <span
                      v-else
                      class="power-summary__value power-summary__value--green"
                    >
                      {{ formatPowerNumber(powerLastYear) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </re-col>
      </el-row>
    </div>

    <div class="welcome-section welcome-section--pair">
      <el-row :gutter="12" class="welcome-section__row">
        <re-col
          v-motion
          class="welcome-col welcome-col--pair"
          :value="16"
          :xs="24"
          :initial="{ opacity: 0, y: 100 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 320 } }"
        >
          <el-card
            class="bar-card welcome-card welcome-card--trend welcome-card--pair"
            shadow="never"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">用电量趋势统计</span>
            </div>
            <EnergyTrendOverview compact class="mt-2 welcome-trend-chart" />
          </el-card>
        </re-col>

        <re-col
          v-motion
          class="welcome-col welcome-col--pair welcome-col--side"
          :value="8"
          :xs="24"
          :initial="{ opacity: 0, y: 100 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
        >
          <el-card
            class="welcome-card welcome-card--alarm welcome-card--pair welcome-card--side"
            shadow="never"
          >
            <div class="welcome-alarm-head flex justify-between items-center">
              <span class="text-sm font-medium welcome-alarm-title">
                设备报警信息共<span class="welcome-alarm-title__count">{{
                  alarmTotal
                }}</span
                >条
              </span>
            </div>
            <div v-loading="alarmLoading" class="welcome-alarm-body mt-2">
              <el-empty
                v-if="!alarmLoading && alarmList.length === 0"
                description="暂无报警信息"
                :image-size="40"
              />
              <div v-else ref="alarmScrollRef" class="welcome-alarm-scroll">
                <div class="welcome-alarm-list" :style="alarmListStyle">
                  <div
                    v-for="item in alarmList"
                    :key="item.id"
                    class="welcome-alarm-row"
                  >
                    <span class="welcome-alarm-row__dot" aria-hidden="true" />
                    <div class="welcome-alarm-row__main">
                      <p class="welcome-alarm-row__time">
                        {{ formatAlarmTime(item.alarmTime) }}
                      </p>
                      <p class="welcome-alarm-row__line">
                        <span class="welcome-alarm-row__label">电表</span>
                        <span class="welcome-alarm-row__value">{{
                          alarmMeterNo(item)
                        }}</span>
                        <span class="welcome-alarm-row__sep">·</span>
                        <span class="welcome-alarm-row__label">采集器</span>
                        <span class="welcome-alarm-row__value">{{
                          alarmCollectorNo(item)
                        }}</span>
                      </p>
                      <p
                        class="welcome-alarm-row__line welcome-alarm-row__line--type"
                      >
                        <span class="welcome-alarm-row__label">报警类型</span>
                        <span class="welcome-alarm-row__type">{{
                          alarmTypeText(item)
                        }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </re-col>
      </el-row>
    </div>

    <div class="welcome-section welcome-section--bottom">
      <el-row :gutter="12" class="welcome-section__row">
        <re-col
          v-motion
          class="welcome-col"
          :value="12"
          :xs="24"
          :initial="{
            opacity: 0,
            y: 100
          }"
          :enter="{
            opacity: 1,
            y: 0,
            transition: {
              delay: 560
            }
          }"
        >
          <el-card class="welcome-card welcome-card--system" shadow="never">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">系统信息</span>
            </div>
            <div class="welcome-system-info">
              <div class="welcome-system-info__row">
                <span class="welcome-system-info__label">区域名称</span>
                <span class="welcome-system-info__value">{{ regionName }}</span>
              </div>
              <div class="welcome-system-info__row">
                <span class="welcome-system-info__label">区域地址</span>
                <span class="welcome-system-info__value">{{
                  regionAddress
                }}</span>
              </div>
              <div
                v-for="item in systemServiceRows"
                :key="item.label"
                class="welcome-system-info__row"
              >
                <span class="welcome-system-info__label">{{ item.label }}</span>
                <span
                  class="welcome-system-info__value"
                  :class="{
                    'welcome-system-info__value--inactive': item.inactive
                  }"
                >
                  {{ item.value }}
                </span>
              </div>
            </div>
          </el-card>
        </re-col>

        <re-col
          v-motion
          class="welcome-col"
          :value="12"
          :xs="24"
          :initial="{
            opacity: 0,
            y: 100
          }"
          :enter="{
            opacity: 1,
            y: 0,
            transition: {
              delay: 600
            }
          }"
        >
          <el-card
            v-loading="loginInfoLoading"
            class="welcome-card welcome-card--login"
            shadow="never"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">登录信息</span>
            </div>
            <div class="welcome-login-info">
              <div class="welcome-login-info__section">
                <div class="welcome-login-info__title">上次登录</div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">登录时间</span>
                  <span class="welcome-login-info__value">{{
                    lastLogin.time
                  }}</span>
                </div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">登录 IP</span>
                  <span class="welcome-login-info__value">{{
                    lastLogin.ip
                  }}</span>
                </div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">IP 所在地</span>
                  <span class="welcome-login-info__value">{{
                    lastLogin.address
                  }}</span>
                </div>
              </div>
              <div class="welcome-login-info__section">
                <div class="welcome-login-info__title">最近登录</div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">登录时间</span>
                  <span class="welcome-login-info__value">{{
                    recentLoginTimeDisplay
                  }}</span>
                </div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">登录 IP</span>
                  <span class="welcome-login-info__value">{{
                    recentLoginIp
                  }}</span>
                </div>
                <div class="welcome-login-info__row">
                  <span class="welcome-login-info__label">IP 所在地</span>
                  <span class="welcome-login-info__value">{{
                    recentLoginAddress
                  }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </re-col>
      </el-row>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.welcome-dashboard {
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* 固定首页占满内容区高度，与改版前一致，避免页面被撑高 */
  height: calc(100vh - 130px);
  margin-top: -8px;
  overflow: hidden;
}

.welcome-section {
  min-height: 0;
}

.welcome-section--top {
  /* 绝不抢占整屏高度：此前 row height:100% 会解析成视口高度，挤掉中下两行 */
  flex: 0 0 auto;
  max-height: 210px;

  .welcome-section__row {
    align-items: stretch;
    height: auto;
    max-height: 210px;
  }

  :deep(.el-col) {
    display: flex;
    height: auto;
    max-height: 210px;
  }

  .welcome-col {
    height: auto;
    max-height: 210px;
  }
}

.welcome-section--pair {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;

  .welcome-section__row {
    flex: 1;
    height: 100%;
    min-height: 0;
  }
}

.welcome-section--bottom {
  flex: 0 0 auto;
  max-height: 108px;

  .welcome-section__row {
    height: auto;
  }
}

.welcome-col {
  margin-bottom: 0;
}

.welcome-col--pair {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.welcome-top-left {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: stretch;
  width: 100%;
  height: 180px;
  max-height: 180px;
}

.welcome-card--top-stretch {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.welcome-card--top-stretch :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.welcome-card--online,
.welcome-card--mail {
  flex: 1;
  min-width: 0;

  :deep(.el-card__body) {
    padding-top: 6px;
    padding-bottom: 6px;
  }
}

.welcome-card--count {
  flex: 0 0 148px;

  :deep(.el-card__body) {
    padding-top: 6px;
    padding-bottom: 6px;
  }
}

@media (width <= 1100px) {
  .welcome-section--top {
    max-height: none;
  }

  .welcome-top-left {
    flex-wrap: wrap;
    height: auto;
    max-height: none;
  }

  .welcome-card--online,
  .welcome-card--mail {
    flex: 1 1 calc(50% - 8px);
    min-height: 140px;
  }

  .welcome-card--count {
    flex: 1 1 100%;
    min-height: 72px;
  }
}

.welcome-online-chart-wrap {
  flex: 1;
  min-height: 0;
}

.welcome-count-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.welcome-col--side {
  display: flex;
  min-width: 0;
}

.welcome-card--side {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.welcome-card--top-fill {
  height: 100%;
  max-height: 180px;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
}

.welcome-card--pair {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.welcome-card--pair :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.welcome-dashboard :deep(.welcome-col--pair.el-col) {
  display: flex;
  align-items: stretch;
}

.welcome-card--trend .welcome-trend-chart {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.welcome-card--trend :deep(.el-card__body) > .flex.justify-between {
  flex-shrink: 0;
}

.welcome-card--trend :deep(.h-\[220px\]) {
  flex-shrink: 0;
  height: 220px !important;
  min-height: 220px;
}

.welcome-card--trend {
  :deep(.el-card__body) {
    padding-bottom: 8px;
    overflow: hidden;
  }
}

.welcome-card--power-summary .power-summary--stack {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.welcome-card--top-fill.welcome-card--power-summary .power-summary--stack {
  flex: 1;
}

.welcome-card--power-summary.welcome-card--side :deep(.el-card__body) {
  width: 100%;
}

.welcome-card--pair.welcome-card--alarm {
  :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
}

.welcome-card--pair.welcome-card--alarm .welcome-alarm-head {
  flex-shrink: 0;
}

.welcome-card--pair.welcome-card--alarm .welcome-alarm-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.welcome-alarm-scroll {
  flex: 1;
  min-height: 0;
  padding-right: 2px;
  overflow: hidden auto;
  scrollbar-color: rgb(199 201 203) transparent;
  scrollbar-width: thin;
}

.welcome-alarm-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.welcome-alarm-row {
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  height: var(--alarm-row-h, 56px);
  min-height: var(--alarm-row-h, 56px);
  padding: 2px 0;
  overflow: hidden;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.welcome-alarm-row:last-child {
  border-bottom: none;
}

.welcome-alarm-row__dot {
  flex-shrink: 0;
  align-self: flex-start;
  width: 7px;
  height: 7px;
  margin-top: calc(var(--alarm-time-fs, 11px) * 0.55);
  background: linear-gradient(135deg, #f56c6c, #e6a23c);
  border-radius: 50%;
  box-shadow: 0 0 4px rgb(245 108 108 / 45%);
}

.welcome-alarm-row__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  justify-content: center;
  min-width: 0;
  text-align: left;
}

.welcome-alarm-row__time {
  margin: 0;
  font-size: var(--alarm-time-fs, 11px);
  line-height: 1.25;
  color: var(--el-text-color-secondary);
}

.welcome-alarm-row__line {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 4px;
  align-items: baseline;
  margin: 0;
  font-size: var(--alarm-body-fs, 12px);
  line-height: 1.35;
}

.welcome-alarm-row__sep {
  color: var(--el-text-color-placeholder);
}

.welcome-alarm-row__label {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.welcome-alarm-row__value {
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.welcome-alarm-row__type {
  font-weight: 600;
  color: #f56c6c;
  word-break: break-all;
}

.welcome-alarm-scroll::-webkit-scrollbar {
  width: 6px;
}

.welcome-alarm-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.welcome-alarm-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(199 201 203);
  border-radius: 4px;
}

.welcome-alarm-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgb(170 172 175);
}

.welcome-card {
  :deep(.el-card__body) {
    padding: 8px 10px;
  }
}

.welcome-card--alarm {
  overflow: hidden;
}

.welcome-alarm-body {
  flex: 1;
  min-height: 0;
}

:deep(.el-card) {
  --el-card-border-color: none;
}

.welcome-alarm-title__count {
  font-weight: 700;
  color: #f56c6c;
}

.power-summary__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}

.welcome-card--power-summary .power-summary__grid {
  gap: 8px 10px;
  width: 100%;
  min-width: 0;
}

.power-summary__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.power-summary__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.power-summary__label {
  font-size: 11px;
  line-height: 1.3;
  color: var(--el-text-color-regular);
}

.power-summary__value {
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.power-summary__value--red {
  color: #f56c6c;
}

.power-summary__value--green {
  color: #67c23a;
}

.power-summary__value--muted {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.welcome-card--system,
.welcome-card--login {
  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    padding-top: 6px;
    padding-bottom: 6px;
    overflow: hidden;
  }
}

.welcome-system-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  padding: 4px 0 0;
  overflow: hidden;
}

.welcome-system-info__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  font-size: 11px;
  line-height: 1.3;
}

.welcome-system-info__label {
  flex-shrink: 0;
  color: var(--el-text-color-regular);
}

.welcome-system-info__value {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.welcome-system-info__value--inactive {
  font-weight: 600;
  color: #f56c6c;
}

.welcome-login-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  padding: 4px 0 0;
  overflow: hidden;
}

.welcome-login-info__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.welcome-login-info__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.welcome-login-info__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  font-size: 10px;
  line-height: 1.3;
}

.welcome-login-info__label {
  flex-shrink: 0;
  color: var(--el-text-color-regular);
}

.welcome-login-info__value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.main-content {
  margin: 20px 20px 0 !important;
}
</style>
