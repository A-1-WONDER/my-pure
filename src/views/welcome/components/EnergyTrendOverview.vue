<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from "vue";
import * as echarts from "echarts";
import dayjs from "dayjs";
import Segmented, { type OptionsType } from "@/components/ReSegmented";
import {
  generateTimeParams,
  simpleStatsApi,
  transformStatsData,
  unwrapEnergyStatisticsSummaryResponse,
  type EnergyStatsQueryParams,
  type StatsDimension,
  type StatsDisplayData
} from "@/api/business-stats";
import {
  hasEnergySummaryCache,
  loadEnergySummaryDisplay
} from "@/utils/energy-summary-cache";
import { message } from "@/utils/message";

const props = withDefaults(
  defineProps<{
    /** 首页等场景下缩小工具区、图表与表格高度 */
    compact?: boolean;
    /** 首页仪表盘：进一步压缩并隐藏明细表格 */
    dashboard?: boolean;
  }>(),
  { compact: false, dashboard: false }
);

/**
 * 演示接口 /api/simple-electric-usage/summary 默认不请求，避免未部署时控制台反复 404。
 * 需要时在 .env.development 设置：VITE_SIMPLE_ELECTRIC_SUMMARY=true
 */
const allowDemoFallback =
  import.meta.env.VITE_SIMPLE_ELECTRIC_SUMMARY === "true";

const chartRef = ref();
const overviewRef = ref<HTMLElement>();
const tableRef = ref<{ doLayout?: () => void }>();
let chartInstance: echarts.ECharts | null = null;
let tableResizeObserver: ResizeObserver | null = null;
const handleResize = () => {
  chartInstance?.resize();
};

const refreshTableLayout = async () => {
  await nextTick();
  tableRef.value?.doLayout?.();
};

const setupTableResizeObserver = () => {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
  if (!props.compact || props.dashboard) return;
  const el = overviewRef.value;
  if (!el || typeof ResizeObserver === "undefined") return;
  tableResizeObserver = new ResizeObserver(() => {
    handleResize();
    tableRef.value?.doLayout?.();
  });
  tableResizeObserver.observe(el);
};

const dimensionOptions: Array<OptionsType> = [
  { label: "小时", value: "hour" },
  { label: "日", value: "day" },
  { label: "月", value: "month" },
  { label: "年", value: "year" }
];

/** 默认「日」：走 meter_daily_energy，秒开；小时会 fan-out 精采接口，仅手动切换时加载 */
const dimensionIndex = ref(1);
const dimension = computed<StatsDimension>(
  () =>
    (dimensionOptions[dimensionIndex.value]?.value as StatsDimension) ?? "hour"
);

const chartTypeOptions: Array<OptionsType> = [
  { label: "柱状图", value: "bar" },
  { label: "折线图", value: "line" }
];
/** 默认柱状图 */
const chartTypeIndex = ref(0);
const chartType = computed<"bar" | "line">(
  () =>
    (chartTypeOptions[chartTypeIndex.value]?.value as "bar" | "line") ?? "bar"
);

const loading = ref(false);
const dataList = ref<StatsDisplayData[]>([]);

const filters = reactive({
  hourDate: dayjs().format("YYYY-MM-DD"),
  /** 日视图：默认最近 7 天（含今天），需整月等场景时在日期范围里自行拉大 */
  dayRange: [
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD")
  ] as string[],
  /** 月视图：默认最近 4 个自然月（含当月），需全年时在月份范围里自行拉大 */
  monthRange: [
    dayjs().subtract(3, "month").format("YYYY-MM"),
    dayjs().format("YYYY-MM")
  ] as string[],
  /** 年视图：默认同一年，减少请求；需多年对比时改年份范围 */
  yearRange: [dayjs().format("YYYY"), dayjs().format("YYYY")] as string[]
});

const currentPickerType = computed(() => {
  switch (dimension.value) {
    case "hour":
      return "date";
    case "day":
      return "daterange";
    case "month":
      return "monthrange";
    case "year":
      return "yearrange";
    default:
      return "date";
  }
});

const currentPickerValue = computed({
  get: () => {
    switch (dimension.value) {
      case "hour":
        return filters.hourDate;
      case "day":
        return filters.dayRange;
      case "month":
        return filters.monthRange;
      case "year":
        return filters.yearRange;
      default:
        return filters.hourDate;
    }
  },
  set: value => {
    switch (dimension.value) {
      case "hour":
        filters.hourDate = String(value || dayjs().format("YYYY-MM-DD"));
        break;
      case "day":
        filters.dayRange = Array.isArray(value)
          ? (value as string[])
          : [
              dayjs().subtract(6, "day").format("YYYY-MM-DD"),
              dayjs().format("YYYY-MM-DD")
            ];
        break;
      case "month":
        filters.monthRange = Array.isArray(value)
          ? (value as string[])
          : [
              dayjs().subtract(3, "month").format("YYYY-MM"),
              dayjs().format("YYYY-MM")
            ];
        break;
      case "year":
        filters.yearRange = Array.isArray(value)
          ? (value as string[])
          : [dayjs().format("YYYY"), dayjs().format("YYYY")];
        break;
    }
  }
});

const pickerFormat = computed(() => {
  switch (dimension.value) {
    case "hour":
      return "YYYY-MM-DD";
    case "day":
      return "YYYY-MM-DD";
    case "month":
      return "YYYY-MM";
    case "year":
      return "YYYY";
    default:
      return "YYYY-MM-DD";
  }
});

const summaryText = computed(() => {
  const totalPower = dataList.value.reduce(
    (sum, item) => sum + Number(item.totalConsumption || 0),
    0
  );
  const maxDevices = dataList.value.reduce(
    (max, item) => Math.max(max, Number(item.deviceCount || 0)),
    0
  );
  return {
    points: dataList.value.length,
    totalPower: totalPower.toFixed(2),
    maxDevices
  };
});

const tableLabel = computed(() => {
  switch (dimension.value) {
    case "hour":
      return "时间";
    case "day":
      return "日期";
    case "month":
      return "月份";
    case "year":
      return "年份";
    default:
      return "时间";
  }
});

const chartTitle = computed(() => {
  switch (dimension.value) {
    case "hour":
      return "用电量小时趋势";
    case "day":
      return "用电量日趋势";
    case "month":
      return "用电量月趋势";
    case "year":
      return "用电量年趋势";
    default:
      return "用电量小时趋势";
  }
});

const normalizeDateRangeEnds = (a: string, b: string): [string, string] => {
  const da = dayjs(a);
  const db = dayjs(b);
  return da.isAfter(db, "day") ? [b, a] : [a, b];
};

const buildSummaryRequestParams = (): EnergyStatsQueryParams => {
  switch (dimension.value) {
    case "hour": {
      const timeParams = generateTimeParams("hour", filters.hourDate);
      return {
        dimension: "hour",
        startTime: timeParams.startTime,
        endTime: timeParams.endTime,
        ignoreRadio: 0 as const
      };
    }
    case "day": {
      const range =
        filters.dayRange?.length === 2
          ? filters.dayRange
          : [
              dayjs().subtract(6, "day").format("YYYY-MM-DD"),
              dayjs().format("YYYY-MM-DD")
            ];
      const [d0, d1] = normalizeDateRangeEnds(range[0], range[1]);
      return {
        dimension: "day",
        startTime: d0.replace(/-/g, ""),
        endTime: d1.replace(/-/g, ""),
        ignoreRadio: 0 as const
      };
    }
    case "month": {
      const range =
        filters.monthRange?.length === 2
          ? filters.monthRange
          : [
              dayjs().subtract(3, "month").format("YYYY-MM"),
              dayjs().format("YYYY-MM")
            ];
      const [m0, m1] = normalizeMonthRangeEnds(range[0], range[1]);
      return {
        dimension: "month",
        startTime: m0.replace("-", ""),
        endTime: m1.replace("-", ""),
        ignoreRadio: 0 as const
      };
    }
    case "year": {
      const fallback = [
        dayjs().format("YYYY"),
        dayjs().format("YYYY")
      ] as string[];
      const yr = filters.yearRange?.length === 2 ? filters.yearRange : fallback;
      let startYear = parseInt(yr[0], 10);
      let endYear = parseInt(yr[1], 10);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        startYear = dayjs().year();
        endYear = dayjs().year();
      }
      if (startYear > endYear) [startYear, endYear] = [endYear, startYear];
      return {
        dimension: "year",
        startTime: String(startYear),
        endTime: String(endYear),
        ignoreRadio: 0 as const
      };
    }
  }
};

const normalizeMonthRangeEnds = (a: string, b: string): [string, string] => {
  const da = dayjs(`${a}-01`);
  const db = dayjs(`${b}-01`);
  return da.isAfter(db, "month") ? [b, a] : [a, b];
};

const listYearMonthsInclusive = (startYm: string, endYm: string): string[] => {
  const [s, e] = normalizeMonthRangeEnds(startYm, endYm);
  const out: string[] = [];
  let cur = dayjs(`${s}-01`);
  const end = dayjs(`${e}-01`);
  while (!cur.isAfter(end, "month")) {
    out.push(cur.format("YYYYMM"));
    cur = cur.add(1, "month");
  }
  return out;
};

const monthRowBounds = (timeKeyYyyyMm: string) => {
  const y = timeKeyYyyyMm.slice(0, 4);
  const m = timeKeyYyyyMm.slice(4, 6);
  const start = dayjs(`${y}-${m}-01`);
  return {
    startTime: start.format("YYYY-MM-DD 00:00:00"),
    endTime: start.endOf("month").format("YYYY-MM-DD 23:59:59")
  };
};

const loadMonthViewFromDeviceMonthPower = async (): Promise<
  StatsDisplayData[]
> => {
  const range =
    filters.monthRange?.length === 2
      ? filters.monthRange
      : [
          dayjs().subtract(3, "month").format("YYYY-MM"),
          dayjs().format("YYYY-MM")
        ];
  const yearMonths = listYearMonthsInclusive(range[0], range[1]);

  const meterResponse = await getMeterList({ page: 1, size: 1000 });
  const meterRows = extractMeterRowsFromApiResponse(
    meterResponse as Record<string, any>
  ).filter(
    (item: Record<string, any>) => resolveMeterRowDeviceId(item) != null
  );

  if (meterRows.length === 0) {
    message("未获取到电表列表，无法统计月用电量", { type: "warning" });
    return [];
  }

  const rows: StatsDisplayData[] = [];

  for (const ym of yearMonths) {
    const settled = await Promise.allSettled(
      meterRows.map((item: Record<string, any>) => {
        const deviceId = resolveMeterRowDeviceId(item)!;
        return getDeviceMonthPower(deviceId, ym).then(res => ({
          meterId: deviceId,
          meterNo: String(item.meterNo ?? item.meterName ?? deviceId),
          totalConsumption: extractMonthPowerValueFromResponse(
            res as Record<string, any>
          )
        }));
      })
    );

    const meterStats = settled
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          meterId: number;
          meterNo: string;
          totalConsumption: number;
        }> => result.status === "fulfilled"
      )
      .map(result => result.value)
      .filter(item => Number.isFinite(item.totalConsumption));

    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + Number(item.totalConsumption || 0),
      0
    );

    const { startTime, endTime } = monthRowBounds(ym);

    rows.push({
      timeKey: ym,
      date: formatTimeKey(ym, "month"),
      totalConsumption: Number(totalConsumption.toFixed(2)),
      deviceCount: meterStats.length,
      meterStats: meterStats.map(item => ({
        meterId: item.meterId,
        meterNo: item.meterNo,
        meterName: item.meterNo,
        totalConsumption: item.totalConsumption,
        startTime,
        endTime
      }))
    });
  }

  return rows.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
};

const loadYearViewFromDeviceYearPower = async (): Promise<
  StatsDisplayData[]
> => {
  const fallback = [dayjs().format("YYYY"), dayjs().format("YYYY")] as string[];
  const yr = filters.yearRange?.length === 2 ? filters.yearRange : fallback;
  let startYear = parseInt(yr[0], 10);
  let endYear = parseInt(yr[1], 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    startYear = dayjs().year();
    endYear = dayjs().year();
  }
  if (startYear > endYear) [startYear, endYear] = [endYear, startYear];

  const meterResponse = await getMeterList({ page: 1, size: 1000 });
  const meterRows = extractMeterRowsFromApiResponse(
    meterResponse as Record<string, any>
  ).filter(
    (item: Record<string, any>) => resolveMeterRowDeviceId(item) != null
  );

  if (meterRows.length === 0) {
    message("未获取到电表列表，无法统计年用电量", { type: "warning" });
    return [];
  }

  const rows: StatsDisplayData[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStr = String(year);
    const settled = await Promise.allSettled(
      meterRows.map((item: Record<string, any>) => {
        const deviceId = resolveMeterRowDeviceId(item)!;
        return getDeviceYearPower(deviceId, yearStr).then(res => ({
          meterId: deviceId,
          meterNo: String(item.meterNo ?? item.meterName ?? deviceId),
          totalConsumption: extractYearPowerValue(res as Record<string, any>)
        }));
      })
    );

    const meterStats = settled
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          meterId: number;
          meterNo: string;
          totalConsumption: number;
        }> => result.status === "fulfilled"
      )
      .map(result => result.value)
      .filter(item => Number.isFinite(item.totalConsumption));

    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + Number(item.totalConsumption || 0),
      0
    );

    rows.push({
      timeKey: yearStr,
      date: `${yearStr}年`,
      totalConsumption: Number(totalConsumption.toFixed(2)),
      deviceCount: meterStats.length,
      meterStats: meterStats.map(item => ({
        meterId: item.meterId,
        meterNo: item.meterNo,
        meterName: item.meterNo,
        totalConsumption: item.totalConsumption,
        startTime: `${yearStr}-01-01 00:00:00`,
        endTime: `${yearStr}-12-31 23:59:59`
      }))
    });
  }

  return rows.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
};

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
};

const updateChart = () => {
  if (!chartInstance) return;

  const xData = dataList.value.map(item => item.date);
  const powerData = dataList.value.map(item =>
    Number(item.totalConsumption || 0)
  );
  const colorMap: Record<StatsDimension, string> = {
    hour: "#409EFF",
    day: "#67C23A",
    month: "#E6A23C",
    year: "#F56C6C"
  };
  const accent = colorMap[dimension.value];
  const isBar = chartType.value === "bar";

  chartInstance.setOption({
    title: {
      text: chartTitle.value,
      left: "center",
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const first = Array.isArray(params) ? params[0] : params;
        return `${first.axisValue}<br/>总用电量: ${first.data} kWh`;
      }
    },
    grid: {
      top: 60,
      left: 40,
      right: 20,
      bottom: 40,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: isBar,
      data: xData
    },
    yAxis: {
      type: "value",
      name: "kWh"
    },
    series: [
      {
        name: "总用电量",
        type: chartType.value,
        smooth: !isBar,
        barMaxWidth: 28,
        data: powerData,
        itemStyle: {
          color: accent
        },
        areaStyle: isBar
          ? undefined
          : {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: `${accent}55` },
                { offset: 1, color: `${accent}10` }
              ])
            }
      }
    ]
  });
};

const applyTrendRows = async (rows: StatsDisplayData[]) => {
  dataList.value = rows;
  await nextTick();
  updateChart();
  await refreshTableLayout();
};

const loadData = async (options?: { force?: boolean }) => {
  const requestParams = buildSummaryRequestParams();
  const hasCache = !options?.force && hasEnergySummaryCache(requestParams);

  if (!hasCache) {
    loading.value = true;
  }

  try {
    const { rows, fromCache } = await loadEnergySummaryDisplay(requestParams, {
      force: options?.force,
      onRevalidated: freshRows => {
        void applyTrendRows(freshRows);
      }
    });

    await applyTrendRows(rows);

    if (fromCache) {
      loading.value = false;
      return;
    }

    if (!rows.length && allowDemoFallback) {
      try {
        const response =
          await simpleStatsApi.getEnergyStatisticsSummary(requestParams);
        const payload = unwrapEnergyStatisticsSummaryResponse(
          response as Record<string, any>
        );
        if (payload) {
          await applyTrendRows(transformStatsData(payload));
          message("首页趋势图当前使用演示数据", { type: "info" });
        }
      } catch {
        // ignore
      }
    } else if (!rows.length) {
      message("未获取到用电量统计数据", { type: "warning" });
    }
  } catch (error) {
    console.error("加载首页用电量趋势失败:", error);
    const err = error as { code?: string; message?: string };
    const isTimeout =
      err?.code === "ECONNABORTED" ||
      String(err?.message ?? "")
        .toLowerCase()
        .includes("timeout");
    dataList.value = [];
    message(
      isTimeout
        ? "用电量统计请求超时，请稍后重试或缩小查询时间范围"
        : String(err?.message ?? "加载首页用电量趋势失败"),
      { type: isTimeout ? "warning" : "error" }
    );
    await nextTick();
    updateChart();
    await refreshTableLayout();
  } finally {
    loading.value = false;
  }
};

const handleDimensionChange = async () => {
  await nextTick();
  loadData();
};

watch(
  () => dimensionIndex.value,
  () => {
    handleDimensionChange();
  }
);

watch(
  () => chartTypeIndex.value,
  async () => {
    await nextTick();
    updateChart();
  }
);

watch(
  () => dataList.value,
  async () => {
    await nextTick();
    updateChart();
    await refreshTableLayout();
  },
  { deep: true }
);

onMounted(async () => {
  await nextTick();
  initChart();
  loadData();
  setupTableResizeObserver();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div
    ref="overviewRef"
    :class="[
      'energy-trend-overview',
      compact && !dashboard && 'energy-trend-overview--compact'
    ]"
  >
    <div
      :class="[
        'energy-trend-toolbar flex items-center justify-between flex-wrap',
        dashboard ? 'mb-1 gap-1' : compact ? 'mb-2 gap-2' : 'mb-4 gap-4'
      ]"
    >
      <div
        :class="[
          'flex items-center flex-wrap',
          dashboard ? 'gap-1' : compact ? 'gap-2' : 'gap-3'
        ]"
      >
        <Segmented v-model="dimensionIndex" :options="dimensionOptions" />
        <Segmented v-model="chartTypeIndex" :options="chartTypeOptions" />
      </div>
      <div
        :class="[
          'flex items-center flex-wrap',
          dashboard ? 'gap-1' : compact ? 'gap-2' : 'gap-3'
        ]"
      >
        <el-date-picker
          v-model="currentPickerValue"
          :type="currentPickerType"
          :value-format="pickerFormat"
          :start-placeholder="
            dimension === 'year'
              ? '开始年份'
              : dimension === 'month'
                ? '开始月份'
                : dimension === 'day'
                  ? '开始日期'
                  : undefined
          "
          :end-placeholder="
            dimension === 'year'
              ? '结束年份'
              : dimension === 'month'
                ? '结束月份'
                : dimension === 'day'
                  ? '结束日期'
                  : undefined
          "
          :class="
            dashboard
              ? dimension === 'month' || dimension === 'day'
                ? 'w-[220px]!'
                : 'w-[170px]!'
              : compact
                ? dimension === 'month' || dimension === 'day'
                  ? 'w-[260px]!'
                  : 'w-[200px]!'
                : dimension === 'month' || dimension === 'day'
                  ? 'w-[300px]!'
                  : 'w-[240px]!'
          "
        />
        <el-button
          type="primary"
          :size="dashboard || compact ? 'small' : 'default'"
          :loading="loading"
          @click="loadData({ force: true })"
        >
          查询
        </el-button>
      </div>
    </div>

    <div
      v-if="!compact"
      :class="[
        'energy-trend-summary grid grid-cols-3 text-sm',
        dashboard ? 'mb-1 gap-1' : 'mb-3 gap-3'
      ]"
    >
      <div :class="['rounded border', dashboard ? 'p-1.5' : 'p-3']">
        <div class="text-text_color_regular">统计点数</div>
        <div :class="['mt-0.5 font-medium', dashboard ? 'text-sm' : 'text-lg']">
          {{ summaryText.points }}
        </div>
      </div>
      <div :class="['rounded border', dashboard ? 'p-1.5' : 'p-3']">
        <div class="text-text_color_regular">总用电量</div>
        <div :class="['mt-0.5 font-medium', dashboard ? 'text-sm' : 'text-lg']">
          {{ summaryText.totalPower }} kWh
        </div>
      </div>
      <div :class="['rounded border', dashboard ? 'p-1.5' : 'p-3']">
        <div class="text-text_color_regular">最大设备数</div>
        <div :class="['mt-0.5 font-medium', dashboard ? 'text-sm' : 'text-lg']">
          {{ summaryText.maxDevices }}
        </div>
      </div>
    </div>

    <div
      ref="chartRef"
      :class="[
        'energy-trend-chart-area w-full',
        dashboard
          ? 'mb-0 h-[120px]'
          : compact
            ? 'mb-2 h-[220px]'
            : 'mb-4 h-[320px]'
      ]"
    />

    <div v-if="!dashboard" class="energy-trend-table-wrap">
      <el-table
        v-if="compact"
        ref="tableRef"
        v-loading="loading"
        :data="dataList"
        height="100%"
        stripe
        size="small"
        class="energy-trend-table--fill"
      >
        <el-table-column :label="tableLabel" prop="date" min-width="140" />
        <el-table-column
          label="总用电量(kWh)"
          prop="totalConsumption"
          min-width="140"
        >
          <template #default="{ row }">
            {{ Number(row.totalConsumption || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          label="统计设备数量"
          prop="deviceCount"
          min-width="120"
        />
      </el-table>

      <el-table
        v-else
        ref="tableRef"
        v-loading="loading"
        :data="dataList"
        :max-height="240"
        stripe
      >
        <el-table-column :label="tableLabel" prop="date" min-width="140" />
        <el-table-column
          label="总用电量(kWh)"
          prop="totalConsumption"
          min-width="140"
        >
          <template #default="{ row }">
            {{ Number(row.totalConsumption || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          label="统计设备数量"
          prop="deviceCount"
          min-width="120"
        />
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.energy-trend-overview--compact {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.energy-trend-overview--compact .energy-trend-toolbar,
.energy-trend-overview--compact .energy-trend-chart-area {
  flex-shrink: 0;
}

.energy-trend-table-wrap {
  flex-shrink: 0;
}

.energy-trend-overview--compact .energy-trend-table-wrap {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.energy-trend-table--fill {
  flex: 1;
  min-height: 0;
}

.energy-trend-table--fill :deep(.el-table__inner-wrapper) {
  height: 100% !important;
}
</style>
