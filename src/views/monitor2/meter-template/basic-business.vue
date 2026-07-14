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
              <div class="label text-gray-500 text-sm mb-1">用户名称</div>
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
            <div class="mb-4">
              <h4 class="text-md font-medium mb-2">月度用量统计</h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="p-3 border rounded text-center">
                  <div class="text-gray-500 text-sm mb-1">本月用量</div>
                  <div class="text-2xl font-bold text-blue-600">
                    {{ formatPower(monthlyStats.currentMonthPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ monthlyStats.currentMonthLabel }}
                  </div>
                </div>
                <div class="p-3 border rounded text-center">
                  <div class="text-gray-500 text-sm mb-1">上月用量</div>
                  <div class="text-2xl font-bold text-green-600">
                    {{ formatPower(monthlyStats.previousMonthPower) }}
                    {{ config.unit }}
                  </div>
                  <div class="mt-1 text-xs text-gray-400">
                    {{ monthlyStats.previousMonthLabel }}
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div class="mb-2 flex items-center justify-between">
                <h4 class="text-md font-medium">用量趋势</h4>
                <span v-if="monthlyStats.loading" class="text-xs text-gray-400">
                  加载中...
                </span>
              </div>
              <div class="rounded border bg-gray-50 p-4">
                <div
                  v-if="monthlyStats.error"
                  class="py-8 text-center text-sm text-red-500"
                >
                  {{ monthlyStats.error }}
                </div>
                <div
                  v-else-if="!isElectric"
                  class="py-8 text-center text-sm text-gray-500"
                >
                  当前仅电表接入月统计接口
                </div>
                <div
                  v-else
                  ref="monthTrendRef"
                  style="width: 100%; height: 260px"
                />
              </div>
            </div>
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
import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  watch,
  computed,
  nextTick
} from "vue";
import { getCollectorDetail } from "@/api/collector";
import { getDeviceMonthPower } from "@/api/business-stats";
import { getAlarmEventQueryList } from "@/api/alarm-event-query";
import { getOperationLogsList } from "@/api/system";
import { getAlarmTypeLabel } from "@/views/nested/alarm/constants";

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

/** 电表：与列表「序号」列一致（id）；其它表：与列表「用户」列一致 */
const displayUserCell = computed(() => {
  const r = listRow.value;
  if (isElectric.value) {
    return r.id != null && r.id !== "" ? String(r.id) : "-";
  }
  return (
    r.remark ||
    r.userInfo?.userName ||
    r.userName ||
    (r.userId != null && r.userId !== "" ? `用户${r.userId}` : "-")
  );
});

const displayMeterNo = computed(() => listRow.value.meterNo || "-");

const displayAddress = computed(
  () => listRow.value.address || listRow.value.installAddress || "-"
);

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
const meterListStatus = computed(() => {
  const s = listRow.value.status;
  const statusMap: Record<
    string,
    { text: string; type: "success" | "danger" | "warning" | "info" }
  > = {
    NORMAL: { text: "在线", type: "success" },
    FAULT: { text: "故障", type: "danger" },
    OFFLINE: { text: "离线", type: "warning" }
  };
  const key = s != null ? String(s).toUpperCase() : "";
  return statusMap[key] || { text: "未知", type: "info" };
});

const extraFieldsToShow = computed(() => {
  if (isElectric.value) return [];
  return props.config?.extraFields ?? [];
});

const collectorCreateFmt = ref("");
const collectorLastCollectFmt = ref("");
const monthTrendRef = ref();
let monthTrendChart: echarts.ECharts | null = null;

const monthlyStats = reactive({
  loading: false,
  error: "",
  currentMonthLabel: dayjs().format("YYYY-MM"),
  currentMonthPower: 0,
  previousMonthLabel: dayjs().subtract(1, "month").format("YYYY-MM"),
  previousMonthPower: 0,
  trend: [] as Array<{ label: string; power: number }>
});

/** 月统计接口在本弹窗内成功拉取完成时的本地时间（YYYY-MM-DD HH:mm:ss） */
const monthlyStatsGeneratedAt = ref("");

const formatTs = (v: unknown) => {
  if (v == null || v === "") return "";
  const d = dayjs(v as string);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(v);
};

const extractMonthPowerValue = (response: Record<string, any>) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  const value = payload?.monthPower ?? payload?.power;
  return typeof value === "number" ? value : Number(value || 0);
};

const formatPower = (value?: number) => Number(value || 0).toFixed(2);

const MONTH_TREND_LOOKBACK = 6;
const MONTH_REQUEST_BATCH_SIZE = 2;

const chunkMonths = (months: dayjs.Dayjs[], size: number) => {
  const chunks: dayjs.Dayjs[][] = [];
  for (let i = 0; i < months.length; i += size) {
    chunks.push(months.slice(i, i + size));
  }
  return chunks;
};

const updateMonthTrendChart = () => {
  if (!isElectric.value || !monthTrendRef.value || monthlyStats.error) return;

  if (!monthTrendChart) {
    monthTrendChart = echarts.init(monthTrendRef.value);
  }

  monthTrendChart.setOption({
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
      top: "10%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: monthlyStats.trend.map(item => item.label)
    },
    yAxis: {
      type: "value",
      name: `用量(${props.config.unit})`
    },
    series: [
      {
        name: "用电量",
        type: "bar",
        data: monthlyStats.trend.map(item => item.power),
        itemStyle: {
          color: "#409EFF"
        },
        barMaxWidth: 32
      }
    ]
  });
};

async function loadMonthlyStatistics() {
  monthlyStats.loading = true;
  monthlyStats.error = "";
  monthlyStatsGeneratedAt.value = "";
  monthlyStats.currentMonthLabel = dayjs().format("YYYY-MM");
  monthlyStats.previousMonthLabel = dayjs()
    .subtract(1, "month")
    .format("YYYY-MM");
  monthlyStats.currentMonthPower = 0;
  monthlyStats.previousMonthPower = 0;
  monthlyStats.trend = [];

  if (!isElectric.value) {
    monthlyStats.loading = false;
    return;
  }

  const meterId = listRow.value.id;
  if (meterId == null || meterId === "") {
    monthlyStats.error = "缺少电表编号，无法加载月统计数据";
    monthlyStats.loading = false;
    return;
  }

  try {
    const months = Array.from({ length: MONTH_TREND_LOOKBACK }, (_, index) =>
      dayjs().subtract(MONTH_TREND_LOOKBACK - 1 - index, "month")
    );
    const responses: Array<{
      label: string;
      yearMonth: string;
      power: number | null;
    }> = [];
    let failedCount = 0;

    // 分批请求，避免并发过高；单月失败不影响其他月份展示
    const monthChunks = chunkMonths(months, MONTH_REQUEST_BATCH_SIZE);
    for (const monthChunk of monthChunks) {
      const settled = await Promise.allSettled(
        monthChunk.map(async month => {
          const yearMonth = month.format("YYYY-MM");
          const yearMonthParam = month.format("YYYYMM");
          const response = await getDeviceMonthPower(
            Number(meterId),
            yearMonthParam
          );
          return {
            label: month.format("M月"),
            yearMonth,
            power: extractMonthPowerValue(response as Record<string, any>)
          };
        })
      );

      settled.forEach((result, index) => {
        const month = monthChunk[index];
        const fallback = {
          label: month.format("M月"),
          yearMonth: month.format("YYYY-MM"),
          power: null
        };
        if (result.status === "fulfilled") {
          responses.push(result.value);
        } else {
          failedCount += 1;
          responses.push(fallback);
          console.warn("月统计单月请求超时/失败:", fallback.yearMonth);
        }
      });
    }

    monthlyStats.trend = responses.map(item => ({
      label: item.label,
      power: item.power === null ? 0 : Number(item.power.toFixed(2))
    }));

    const currentMonth = dayjs().format("YYYY-MM");
    const previousMonth = dayjs().subtract(1, "month").format("YYYY-MM");
    monthlyStats.currentMonthPower =
      responses.find(item => item.yearMonth === currentMonth)?.power ?? 0;
    monthlyStats.previousMonthPower =
      responses.find(item => item.yearMonth === previousMonth)?.power ?? 0;

    monthlyStatsGeneratedAt.value = dayjs().format("YYYY-MM-DD HH:mm:ss");

    if (failedCount > 0 && failedCount < months.length) {
      monthlyStats.error = `部分月份加载失败（${failedCount}/${months.length}），已显示近${MONTH_TREND_LOOKBACK}个月可用数据`;
    } else if (failedCount >= months.length) {
      monthlyStats.error = "月统计接口数据加载失败";
    }

    await nextTick();
    updateMonthTrendChart();
  } catch (error) {
    console.error("加载月统计数据失败:", error);
    monthlyStats.error = "月统计接口数据加载失败";
    monthlyStatsGeneratedAt.value = "";
  } finally {
    monthlyStats.loading = false;
  }
}

async function loadCollectorTimes() {
  collectorCreateFmt.value = "";
  collectorLastCollectFmt.value = "";
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
    operationActivities.value = list.map((row: Record<string, any>) => ({
      content: row.description || row.method || "系统操作",
      timestamp: formatTs(row.createTime) || "-"
    }));
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
  loadMonthlyStatistics();
  loadAlarmRecords();
});

watch(
  () => props.data,
  () => {
    syncRowData();
    loadCollectorTimes();
    loadMonthlyStatistics();
    loadAlarmRecords();
    if (activeTab.value === "operations") {
      loadOperationRecords();
    }
  },
  { deep: true }
);

watch(
  () => props.meterType,
  () => {
    loadCollectorTimes();
    loadMonthlyStatistics();
  }
);

watch(
  () => activeTab.value,
  async value => {
    if (value === "statistics") {
      await nextTick();
      updateMonthTrendChart();
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
  if (monthTrendChart) {
    monthTrendChart.dispose();
    monthTrendChart = null;
  }
});

const onRefresh = () => {
  loadCollectorTimes();
  loadMonthlyStatistics();
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
