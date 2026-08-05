<template>
  <div class="meter-basic-business">
    <div class="header p-4 border-b">
      <h3 class="text-lg font-medium">{{ config.name }}基本业务信息</h3>
    </div>

    <div class="content p-4">
      <el-tabs v-model="activeTab" class="biz-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">
                {{ config.name }}编号
              </div>
              <div class="value font-medium">
                {{ displayMeterNo }}
              </div>
            </div>
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">
                {{ isElectric ? "用能单位" : "用户名称" }}
              </div>
              <div class="value font-medium">
                {{ displayUserCell }}
              </div>
            </div>
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">安装地址</div>
              <div class="value font-medium">
                {{ displayAddress }}
              </div>
            </div>
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">当前读数</div>
              <div class="value font-medium">
                <template v-if="displayTotalReading !== '-'">
                  {{ displayTotalReading }} {{ config.unit }}
                </template>
                <template v-else>-</template>
              </div>
            </div>

            <!-- 电表管理不展示电压/电流/功率；水/气等仍展示扩展字段 -->
            <template v-for="field in extraFieldsToShow" :key="field.prop">
              <div class="p-3 border rounded">
                <div class="label text-gray-500 text-sm mb-1">
                  {{ field.label }}
                </div>
                <div class="value font-medium">
                  {{ info[field.prop] ?? "-" }}
                  <span v-if="field.formatter" class="ml-1">{{
                    field.formatter
                  }}</span>
                </div>
              </div>
            </template>

            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">状态</div>
              <div class="value font-medium">
                <el-tag
                  :type="meterListStatus.type"
                  effect="plain"
                  size="small"
                >
                  {{ meterListStatus.text }}
                </el-tag>
              </div>
            </div>
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">安装时间</div>
              <div class="value font-medium">
                {{ displayInstallTime }}
              </div>
            </div>
            <div class="p-3 border rounded">
              <div class="label text-gray-500 text-sm mb-1">最后抄表时间</div>
              <div class="value font-medium">
                {{ displayLastReadTime }}
              </div>
            </div>
          </div>

          <div class="mt-4 p-3 border rounded">
            <div class="label text-gray-500 text-sm mb-1">备注</div>
            <div class="value">
              {{ displayRemark }}
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="用量统计" name="statistics" lazy>
          <div class="p-4">
            <template v-if="!isElectric">
              <div class="py-8 text-center text-sm text-gray-500">
                当前仅电表接入时/日/月/年能耗统计
              </div>
            </template>
            <template v-else>
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <el-date-picker
                  v-model="usageQueryDate"
                  type="date"
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  :clearable="false"
                  class="w-[170px]!"
                />
                <el-button
                  type="primary"
                  :loading="usageSummaryLoading || usageSeriesLoading"
                  @click="onUsageQuery"
                >
                  查询
                </el-button>
                <el-button
                  type="success"
                  :loading="usageExporting"
                  @click="exportUsageExcel"
                >
                  导出为Excel
                </el-button>
                <span class="text-xs text-gray-400">
                  <template v-if="usageSummaryLoading">加载中...</template>
                  <template v-else-if="usageSummaryFetchedAt">
                    更新于 {{ usageSummaryFetchedAt }}
                  </template>
                </span>
              </div>

              <div class="mb-2 flex items-center justify-between">
                <h4 class="text-md font-medium">用量摘要</h4>
              </div>
              <div
                v-if="usageSummaryError"
                class="mb-3 text-xs text-orange-500"
              >
                {{ usageSummaryError }}
              </div>
              <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div class="rounded border p-3 text-center">
                  <div class="mb-1 text-xs text-gray-500">此时</div>
                  <div class="text-xl font-bold text-blue-600">
                    {{ formatPower(usageSummary.currentHourPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ usageSummary.currentHourLabel }}
                  </div>
                </div>
                <div class="rounded border p-3 text-center">
                  <div class="mb-1 text-xs text-gray-500">当日</div>
                  <div class="text-xl font-bold text-cyan-600">
                    {{ formatPower(usageSummary.todayPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ usageSummary.todayLabel }}
                  </div>
                </div>
                <div class="rounded border p-3 text-center">
                  <div class="mb-1 text-xs text-gray-500">当月</div>
                  <div class="text-xl font-bold text-green-600">
                    {{ formatPower(usageSummary.currentMonthPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ usageSummary.currentMonthLabel }}
                  </div>
                </div>
                <div class="rounded border p-3 text-center">
                  <div class="mb-1 text-xs text-gray-500">当年</div>
                  <div class="text-xl font-bold text-purple-600">
                    {{ formatPower(usageSummary.currentYearPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ usageSummary.currentYearLabel }}
                  </div>
                </div>
              </div>

              <div
                class="mb-2 flex flex-wrap items-center justify-between gap-2"
              >
                <h4 class="text-md font-medium">用量趋势</h4>
                <el-radio-group
                  v-model="usageDimension"
                  size="small"
                  @change="onUsageDimensionChange"
                >
                  <el-radio-button value="hour">时</el-radio-button>
                  <el-radio-button value="day">日</el-radio-button>
                  <el-radio-button value="month">月</el-radio-button>
                  <el-radio-button value="year">年</el-radio-button>
                </el-radio-group>
              </div>
              <div class="relative rounded border bg-gray-50 p-4">
                <div
                  v-if="usageSeriesError"
                  class="py-8 text-center text-sm text-red-500"
                >
                  {{ usageSeriesError }}
                </div>
                <template v-else>
                  <div
                    v-if="usageSeriesLoading"
                    class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 text-sm text-gray-400"
                  >
                    曲线加载中...
                  </div>
                  <div ref="usageTrendRef" style="width: 100%; height: 260px" />
                </template>
              </div>
            </template>
          </div>
        </el-tab-pane>

        <el-tab-pane label="告警记录" name="alarms" lazy>
          <div class="tab-pane-body">
            <el-empty
              v-if="alarmData.length === 0"
              description="暂无告警记录"
              :image-size="80"
            />
            <el-table
              v-else
              v-loading="alarmLoading"
              :data="alarmData"
              style="width: 100%"
              :max-height="alarmTableMaxHeight"
            >
              <el-table-column prop="time" label="时间" width="180" />
              <el-table-column prop="type" label="告警类型" width="140">
                <template #default="{ row }">
                  <el-tag
                    :type="
                      row.level === 'high'
                        ? 'danger'
                        : row.level === 'medium'
                          ? 'warning'
                          : 'info'
                    "
                  >
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="description"
                label="描述"
                min-width="160"
              />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'resolved' ? 'success' : 'warning'"
                  >
                    {{ row.status === "resolved" ? "已处理" : "未处理" }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="操作记录" name="operations" lazy>
          <div class="tab-pane-body tab-pane-body--scroll">
            <el-empty
              v-if="!operationLoading && operationActivities.length === 0"
              description="暂无操作记录"
              :image-size="80"
            />
            <el-timeline v-else v-loading="operationLoading">
              <el-timeline-item
                v-for="(activity, index) in operationActivities"
                :key="index"
                :timestamp="activity.timestamp"
              >
                {{ activity.content }}
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="footer p-4 border-t flex justify-end space-x-2">
      <el-button @click="onRefresh">刷新</el-button>
      <el-button @click="onClose">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import * as echarts from "echarts";
import { utils, writeFile } from "xlsx";
import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  watch,
  computed,
  nextTick
} from "vue";
import { message } from "@/utils/message";
import { getCollectorDetail } from "@/api/collector";
import { getAlarmEventQueryList } from "@/api/alarm-event-query";
import { getOperationLogsList } from "@/api/system";
import { getAlarmTypeLabel } from "@/views/nested/alarm/constants";
import {
  formatMeterEnergyUnit,
  formatMeterInstallAddress
} from "../utils/meter-display";
import { resolveMeterListOnlineDisplay } from "../utils/device-online-status";
import {
  ensureMeterUsageSeries,
  getMeterUsageCache,
  getSeriesForDimension,
  invalidateMeterUsageCache,
  normalizeUsageAnchorDate,
  prefetchMeterUsageSummary,
  type UsageDimension,
  type UsageSummary
} from "../utils/meter-usage-stats";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  meterType: {
    type: String,
    default: "water"
  },
  config: {
    type: Object,
    required: true
  }
});

/** 告警表体内滚动高度：适配弹窗，避免整页撑破 */
const alarmTableMaxHeight = computed(() => {
  if (typeof window === "undefined") return 360;
  return Math.max(220, Math.min(420, Math.floor(window.innerHeight * 0.45)));
});

const emit = defineEmits(["refresh", "close"]);

const activeTab = ref("basic");

const isElectric = computed(() => props.meterType === "electric");

const listRow = computed(
  () =>
    (props.data && typeof props.data === "object" ? props.data : {}) as Record<
      string,
      any
    >
);

/** 电表：用能单位（采集器名称）；其它表：用户名称 */
const displayUserCell = computed(() => {
  const r = listRow.value;
  if (isElectric.value) {
    return formatMeterEnergyUnit(r);
  }
  return (
    r.remark ||
    r.userInfo?.userName ||
    r.userName ||
    (r.userId != null && r.userId !== "" ? `用户${r.userId}` : "-")
  );
});

const displayMeterNo = computed(() => listRow.value.meterNo || "-");

const collectorCreateFmt = ref("");
const collectorLastCollectFmt = ref("");
/** 采集器详情回填的安装位置（location / installAddress） */
const collectorLocationFmt = ref("");

const displayAddress = computed(() => {
  if (!isElectric.value) {
    return listRow.value.address || listRow.value.installAddress || "-";
  }
  const fromRow = formatMeterInstallAddress({
    ...listRow.value,
    collectorInstallAddress:
      listRow.value.collectorInstallAddress || collectorLocationFmt.value
  });
  return fromRow;
});

const displayRemark = computed(() => listRow.value.remark || "-");

/** 电表：与列表「累计用电量」totalPower 一致 */
const displayTotalReading = computed(() => {
  if (isElectric.value) {
    const p = listRow.value.totalPower;
    if (p == null || p === "") return "0";
    return String(p);
  }
  const v = listRow.value.currentReading;
  return v != null && v !== "" ? String(v) : "-";
});

/** 与电表管理列表「在线状态」列一致 */
const meterListStatus = computed(() =>
  resolveMeterListOnlineDisplay(listRow.value)
);

const extraFieldsToShow = computed(() => {
  if (isElectric.value) return [];
  return props.config?.extraFields ?? [];
});

const usageTrendRef = ref<HTMLElement | null>(null);
let usageTrendChart: echarts.ECharts | null = null;

const usageDimension = ref<UsageDimension>("hour");
const usageQueryDate = ref(dayjs().format("YYYY-MM-DD"));
const usageExporting = ref(false);
const usageSummaryLoading = ref(false);
const usageSeriesLoading = ref(false);
const usageSummaryError = ref("");
const usageSeriesError = ref("");
const usageSummaryFetchedAt = ref("");
const usageSummary = reactive<UsageSummary>({
  currentHourPower: 0,
  todayPower: 0,
  currentMonthPower: 0,
  currentYearPower: 0,
  currentHourLabel: dayjs().format("HH:00"),
  todayLabel: dayjs().format("YYYY-MM-DD"),
  currentMonthLabel: dayjs().format("YYYY-MM"),
  currentYearLabel: dayjs().format("YYYY")
});

const formatTs = (v: unknown) => {
  if (v == null || v === "") return "";
  const d = dayjs(v as string);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(v);
};

const formatPower = (value?: number) => Number(value || 0).toFixed(2);

const resolveMeterId = () => {
  const raw = listRow.value.id;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const resolveAnchorDate = () =>
  normalizeUsageAnchorDate(
    usageQueryDate.value || dayjs().format("YYYY-MM-DD")
  );

const applySummaryFromCache = (meterId: number) => {
  const entry = getMeterUsageCache(meterId, resolveAnchorDate());
  if (entry.summary) {
    Object.assign(usageSummary, entry.summary);
  }
  usageSummaryError.value = entry.summaryError || "";
  usageSummaryFetchedAt.value = entry.summaryFetchedAt || "";
};

const updateUsageTrendChart = (points: { label: string; power: number }[]) => {
  if (!isElectric.value || !usageTrendRef.value) return;

  if (usageTrendChart && usageTrendChart.getDom() !== usageTrendRef.value) {
    usageTrendChart.dispose();
    usageTrendChart = null;
  }

  if (!usageTrendChart) {
    usageTrendChart = echarts.init(usageTrendRef.value);
  }

  const dimLabel =
    usageDimension.value === "hour"
      ? "时"
      : usageDimension.value === "day"
        ? "日"
        : usageDimension.value === "month"
          ? "月"
          : "年";

  usageTrendChart.setOption(
    {
      tooltip: {
        trigger: "axis",
        formatter: params => {
          const first = Array.isArray(params) ? params[0] : params;
          return `${first.axisValue}<br/>用电量: ${formatPower(first.data)} ${props.config.unit}`;
        }
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "12%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: points.map(item => item.label)
      },
      yAxis: {
        type: "value",
        name: `用量(${props.config.unit})`
      },
      series: [
        {
          name: `${dimLabel}用电量`,
          type: "bar",
          data: points.map(item => item.power),
          itemStyle: { color: "#409EFF" },
          barMaxWidth: 28
        }
      ]
    },
    true
  );
};

async function prefetchUsageSummary(force = false) {
  if (!isElectric.value) return;
  const meterId = resolveMeterId();
  if (meterId == null) {
    usageSummaryError.value = "缺少电表ID，无法加载用量摘要";
    return;
  }
  const anchor = resolveAnchorDate();
  usageQueryDate.value = anchor;

  if (force) {
    invalidateMeterUsageCache(meterId, anchor);
  }

  applySummaryFromCache(meterId);
  if (!force && getMeterUsageCache(meterId, anchor).summary) {
    return;
  }

  usageSummaryLoading.value = true;
  try {
    const entry = await prefetchMeterUsageSummary(meterId, anchor);
    applySummaryFromCache(meterId);
    if (entry.summary) Object.assign(usageSummary, entry.summary);
  } catch (error) {
    console.error("预取用量摘要失败:", error);
    usageSummaryError.value = "用量摘要加载失败";
  } finally {
    usageSummaryLoading.value = false;
  }
}

async function loadUsageSeriesForDimension(dimension: UsageDimension) {
  if (!isElectric.value) return;
  const meterId = resolveMeterId();
  if (meterId == null) {
    usageSeriesError.value = "缺少电表ID";
    return;
  }
  const anchor = resolveAnchorDate();

  usageSeriesLoading.value = true;
  usageSeriesError.value = "";
  try {
    if (!getMeterUsageCache(meterId, anchor).summary) {
      await prefetchMeterUsageSummary(meterId, anchor);
      applySummaryFromCache(meterId);
    }
    const entry = await ensureMeterUsageSeries(meterId, dimension, anchor);
    applySummaryFromCache(meterId);
    usageSeriesError.value = entry.seriesError[dimension] || "";
    const points = getSeriesForDimension(entry, dimension);
    await nextTick();
    updateUsageTrendChart(points);
  } catch (error) {
    console.error("加载用量曲线失败:", error);
    usageSeriesError.value = "曲线数据加载失败";
  } finally {
    usageSeriesLoading.value = false;
  }
}

const onUsageDimensionChange = () => {
  void loadUsageSeriesForDimension(usageDimension.value);
};

const onUsageQuery = async () => {
  await prefetchUsageSummary(true);
  await loadUsageSeriesForDimension(usageDimension.value);
};

const exportUsageExcel = async () => {
  if (!isElectric.value) {
    message("当前仅电表支持导出用量", { type: "warning" });
    return;
  }
  const meterId = resolveMeterId();
  if (meterId == null) {
    message("缺少电表ID", { type: "warning" });
    return;
  }

  usageExporting.value = true;
  try {
    const anchor = resolveAnchorDate();
    await prefetchMeterUsageSummary(meterId, anchor);
    const entry = await ensureMeterUsageSeries(
      meterId,
      usageDimension.value,
      anchor
    );
    applySummaryFromCache(meterId);
    const points = getSeriesForDimension(entry, usageDimension.value);
    if (!points.length) {
      message("没有可导出的曲线数据", { type: "warning" });
      return;
    }

    const dimLabel =
      usageDimension.value === "hour"
        ? "时"
        : usageDimension.value === "day"
          ? "日"
          : usageDimension.value === "month"
            ? "月"
            : "年";
    const meterNo = displayMeterNo.value;
    const unit = props.config.unit || "kWh";

    const sheetData: (string | number)[][] = [
      ["电表编号", meterNo],
      ["查询日期", anchor],
      ["统计维度", dimLabel],
      [],
      ["摘要项", "数值", "说明"],
      [
        "此时",
        Number(usageSummary.currentHourPower || 0),
        usageSummary.currentHourLabel
      ],
      ["当日", Number(usageSummary.todayPower || 0), usageSummary.todayLabel],
      [
        "当月",
        Number(usageSummary.currentMonthPower || 0),
        usageSummary.currentMonthLabel
      ],
      [
        "当年",
        Number(usageSummary.currentYearPower || 0),
        usageSummary.currentYearLabel
      ],
      [],
      ["时间点", `用电量(${unit})`],
      ...points.map(p => [p.label, Number(p.power || 0)])
    ];

    const workSheet = utils.aoa_to_sheet(sheetData);
    const workBook = utils.book_new();
    utils.book_append_sheet(workBook, workSheet, `${dimLabel}用量`);
    const fileName = `电表用量_${meterNo}_${anchor}_${dimLabel}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
    writeFile(workBook, fileName);
    message("导出成功", { type: "success" });
  } catch (error) {
    console.error("导出用量失败:", error);
    message("导出失败，请重试", { type: "error" });
  } finally {
    usageExporting.value = false;
  }
};

async function loadCollectorTimes() {
  collectorCreateFmt.value = "";
  collectorLastCollectFmt.value = "";
  collectorLocationFmt.value = "";
  if (!isElectric.value) return;
  const cid = listRow.value.collectorId;
  if (cid == null || cid === "") return;
  try {
    const res = await getCollectorDetail(Number(cid));
    const c =
      (res as Record<string, any>)?.data?.data ??
      (res as Record<string, any>)?.data ??
      res ??
      {};
    collectorCreateFmt.value = formatTs(c.createTime ?? c.createdAt);
    collectorLastCollectFmt.value = formatTs(
      c.lastCollectTime ?? c.lastCommunicationTime
    );
    const location = String(
      c.installAddress ?? c.location ?? c.address ?? ""
    ).trim();
    if (location && location !== "-" && location !== "—") {
      collectorLocationFmt.value = location;
    }
  } catch {
    /* 使用行内字段兜底 */
  }
}

/** 电表：与采集器管理「创建时间」一致（优先接口） */
const displayInstallTime = computed(() => {
  if (isElectric.value) {
    return (
      collectorCreateFmt.value ||
      formatTs(listRow.value.installTime || listRow.value.createTime) ||
      "-"
    );
  }
  return formatTs(info.installTime) || info.installTime || "-";
});

/** 电表：与采集器管理「最后采集时间」一致（优先接口） */
const displayLastReadTime = computed(() => {
  if (isElectric.value) {
    return (
      collectorLastCollectFmt.value ||
      formatTs(
        listRow.value.lastReadTime ||
          listRow.value.lastReadingTime ||
          listRow.value.updatedAt
      ) ||
      "-"
    );
  }
  return formatTs(info.lastReadTime) || info.lastReadTime || "-";
});

// 表信息
const info = reactive({
  meterNo: "",
  userName: "",
  address: "",
  currentReading: "",
  status: 1,
  installTime: "",
  lastReadTime: "",
  remark: ""
});

type AlarmRow = {
  time: string;
  type: string;
  level: "high" | "medium" | "low" | string;
  description: string;
  status: "resolved" | "pending" | string;
};

/** 告警记录 */
const alarmData = ref<AlarmRow[]>([]);
const alarmLoading = ref(false);

const operationActivities = ref<{ content: string; timestamp: string }[]>([]);
const operationLoading = ref(false);

function mapAlarmStatus(status: unknown): "resolved" | "pending" {
  if (
    status === 1 ||
    status === 2 ||
    status === "resolved" ||
    status === "handled"
  ) {
    return "resolved";
  }
  return "pending";
}

function mapAlarmLevel(level?: string) {
  if (level === "urgent") return "high";
  if (level === "important") return "medium";
  return "low";
}

async function loadAlarmRecords() {
  const meterId = listRow.value.id;
  if (meterId == null || meterId === "") {
    alarmData.value = [];
    return;
  }
  alarmLoading.value = true;
  try {
    const res = (await getAlarmEventQueryList({
      deviceId: String(meterId),
      meterNo: listRow.value.meterNo,
      currentPage: 1,
      pageSize: 20
    })) as Record<string, any>;
    const list =
      res?.data?.list ?? res?.data?.content ?? res?.list ?? res?.content ?? [];
    alarmData.value = (Array.isArray(list) ? list : []).map(
      (row: Record<string, any>) => ({
        time: formatTs(row.alarmTime) || "-",
        type: getAlarmTypeLabel(row.alarmType ?? ""),
        level: mapAlarmLevel(row.alarmLevel),
        description:
          row.handlingRemark ||
          (row.alarmValue != null ? `当前值 ${row.alarmValue}` : "报警事件"),
        status: mapAlarmStatus(row.alarmStatus)
      })
    );
  } catch {
    alarmData.value = [];
  } finally {
    alarmLoading.value = false;
  }
}

async function loadOperationRecords() {
  const meterNo = listRow.value.meterNo;
  if (!meterNo) {
    operationActivities.value = [];
    return;
  }
  operationLoading.value = true;
  try {
    const { code, data } = await getOperationLogsList({
      blurry: String(meterNo),
      page: 1,
      pageSize: 20
    });
    const list = code === 0 ? (data?.list ?? []) : [];
    // getOperationLogsList 经 mapEladminOperationLog 后字段为 summary/module/operatingTime/username
    operationActivities.value = list.map((row: Record<string, any>) => {
      const action = row.summary || row.module || row.description || "系统操作";
      const who = row.username ? String(row.username) : "";
      return {
        content: who ? `${who} · ${action}` : action,
        timestamp:
          formatTs(row.operatingTime || row.createTime || row.loginTime) || "-"
      };
    });
  } catch {
    operationActivities.value = [];
  } finally {
    operationLoading.value = false;
  }
}

function syncRowData() {
  if (!props.data) return;
  Object.assign(info, props.data);
  (props.config?.extraFields ?? []).forEach(field => {
    if (props.data[field.prop] !== undefined) {
      info[field.prop] = props.data[field.prop];
    }
  });
}

onMounted(() => {
  syncRowData();
  loadCollectorTimes();
  void prefetchUsageSummary();
  loadAlarmRecords();
});

watch(
  () => listRow.value.id,
  (id, prevId) => {
    syncRowData();
    if (id === prevId) return;
    loadCollectorTimes();
    void prefetchUsageSummary();
    loadAlarmRecords();
    if (activeTab.value === "operations") {
      loadOperationRecords();
    }
    if (activeTab.value === "statistics" && isElectric.value) {
      void loadUsageSeriesForDimension(usageDimension.value);
    }
  }
);

watch(
  () => props.meterType,
  () => {
    loadCollectorTimes();
    void prefetchUsageSummary();
  }
);

watch(
  () => activeTab.value,
  async value => {
    if (value === "statistics") {
      await prefetchUsageSummary();
      await loadUsageSeriesForDimension(usageDimension.value);
    }
    if (value === "alarms") {
      loadAlarmRecords();
    }
    if (value === "operations") {
      loadOperationRecords();
    }
  }
);

onUnmounted(() => {
  if (usageTrendChart) {
    usageTrendChart.dispose();
    usageTrendChart = null;
  }
});

const onRefresh = () => {
  loadCollectorTimes();
  const meterId = resolveMeterId();
  if (meterId != null) {
    invalidateMeterUsageCache(meterId, resolveAnchorDate());
  }
  void prefetchUsageSummary(true).then(() => {
    if (activeTab.value === "statistics") {
      void loadUsageSeriesForDimension(usageDimension.value);
    }
  });
  loadAlarmRecords();
  if (activeTab.value === "operations") {
    loadOperationRecords();
  }
  emit("refresh");
};

const onClose = () => {
  emit("close");
};
</script>

<style scoped>
.meter-basic-business {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  max-height: min(700px, 80vh);
  overflow: hidden;
}

.header,
.footer {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.biz-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.biz-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
}

.biz-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.biz-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-pane-body {
  box-sizing: border-box;
  padding: 8px 4px 4px;
}

.tab-pane-body--scroll {
  max-height: min(420px, 45vh);
  overflow: auto;
}
</style>
