<template>
  <div class="main">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>电用量月统计</span>
          <el-button type="primary" :icon="Download" @click="exportExcel">
            导出Excel
          </el-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form ref="formRef" :inline="true" :model="form" class="search-form">
        <el-form-item label="统计月份范围" prop="monthRange">
          <el-date-picker
            v-model="form.monthRange"
            type="monthrange"
            start-placeholder="开始月份"
            end-placeholder="结束月份"
            value-format="YYYY-MM"
            class="w-[300px]!"
          />
        </el-form-item>
        <el-form-item label="电表类型" prop="meterType">
          <el-select
            v-model="form.meterType"
            placeholder="请选择电表类型"
            clearable
            class="w-[150px]!"
          >
            <el-option label="全部" value="" />
            <el-option label="单相" value="single-phase" />
            <el-option label="三相" value="three-phase" />
            <el-option label="预付费" value="prepaid" />
            <el-option label="多费率" value="multiRate" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :icon="Search"
            :loading="loading"
            @click="onSearch({ force: true })"
          >
            查询
          </el-button>
          <el-button :icon="Refresh" @click="resetForm(formRef)">
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="loading"
        title="正在加载月统计（优先汇总接口，首次可能需数十秒；再次打开会更快）"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />

      <!-- 统计图表 -->
      <div class="chart-container">
        <div ref="chartRef" style="width: 100%; height: 400px" />
      </div>

      <!-- 数据表格 -->
      <pure-table
        ref="tableRef"
        row-key="timeKey"
        align-whole="center"
        table-layout="auto"
        :loading="loading"
        :data="dataList"
        :columns="columns"
        :header-cell-style="{
          background: 'var(--el-fill-color-light)',
          color: 'var(--el-text-color-primary)'
        }"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from "vue";
import * as echarts from "echarts";
import { Search, Refresh, Download } from "@element-plus/icons-vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { utils, writeFile } from "xlsx";
import dayjs from "dayjs";
import { getMeterList } from "@/api/meters";
import {
  extractMeterRowsFromApiResponse,
  extractMonthPowerValueFromResponse,
  getDeviceMonthPower,
  resolveMeterRowDeviceId,
  type StatsDisplayData,
  type StatsDimension
} from "@/api/business-stats";
import {
  hasEnergySummaryCache,
  loadEnergySummaryDisplay
} from "@/utils/energy-summary-cache";

defineOptions({
  name: "BusinessStatsMonthlyElectric"
});

const formRef = ref();
const tableRef = ref();
const chartRef = ref();
let chartInstance: echarts.ECharts | null = null;

const form = reactive({
  /** 默认最近 3 个自然月（含当月）；看全年时在此拉大范围 */
  monthRange: [
    dayjs().subtract(2, "month").format("YYYY-MM"),
    dayjs().format("YYYY-MM")
  ] as string[],
  meterType: ""
});

const loading = ref(false);
const dataList = ref<StatsDisplayData[]>([]);
/** 逐设备回退时每批并发数，避免压垮外部接口 */
const MONTH_REQUEST_BATCH_SIZE = 5;
const MONTH_SUMMARY_TIMEOUT_MS = 120000;

const chunkMeters = (meters: Record<string, any>[], size: number) => {
  const chunks: Record<string, any>[][] = [];
  for (let i = 0; i < meters.length; i += size) {
    chunks.push(meters.slice(i, i + size));
  }
  return chunks;
};

const filterStatsByMeterIds = (
  rows: StatsDisplayData[],
  allowedIds: Set<number>
): StatsDisplayData[] => {
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

const loadMonthlyStatsFromMonthPower = async () => {
  const range =
    form.monthRange?.length === 2
      ? form.monthRange
      : [
          dayjs().subtract(2, "month").format("YYYY-MM"),
          dayjs().format("YYYY-MM")
        ];
  const yearMonths = listYearMonthsInclusive(range[0], range[1]);

  const meterResponse = await getMeterList({
    page: 1,
    size: 1000,
    meterType: form.meterType || undefined
  });
  const meterRows = extractMeterRowsFromApiResponse(
    meterResponse as Record<string, any>
  ).filter(
    (item: Record<string, any>) => resolveMeterRowDeviceId(item) != null
  );

  if (meterRows.length === 0) {
    return [];
  }

  const rows: StatsDisplayData[] = [];

  for (const ym of yearMonths) {
    const year = ym.slice(0, 4);
    const monthStr = ym.slice(4, 6);
    const dateLabel = `${year}-${monthStr}`;
    const meterStats: Array<{
      meterId: number;
      meterNo: string;
      totalConsumption: number;
    }> = [];

    const chunks = chunkMeters(meterRows, MONTH_REQUEST_BATCH_SIZE);
    for (const chunk of chunks) {
      const settled = await Promise.allSettled(
        chunk.map((item: Record<string, any>) => {
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

      settled.forEach((result, index) => {
        const item = chunk[index];
        const deviceId = resolveMeterRowDeviceId(item)!;
        const meterNo = String(item.meterNo ?? item.meterName ?? deviceId);
        if (result.status === "fulfilled") {
          const v = result.value.totalConsumption;
          if (Number.isFinite(v)) {
            meterStats.push({
              meterId: deviceId,
              meterNo,
              totalConsumption: v
            });
          }
        }
      });
    }

    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + Number(item.totalConsumption || 0),
      0
    );

    rows.push({
      timeKey: ym,
      date: dateLabel,
      totalConsumption: Number(totalConsumption.toFixed(2)),
      deviceCount: meterStats.length,
      meterStats: meterStats.map(item => ({
        meterId: item.meterId,
        meterNo: item.meterNo,
        meterName: item.meterNo,
        totalConsumption: item.totalConsumption,
        startTime: `${year}-${monthStr}-01 00:00:00`,
        endTime: `${year}-${monthStr}-${dayjs(`${year}-${monthStr}-01`).daysInMonth()} 23:59:59`
      }))
    });
  }

  return rows.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
};

const loadMonthlyStatsFromSummary = async (options?: {
  force?: boolean;
}): Promise<StatsDisplayData[]> => {
  const range =
    form.monthRange?.length === 2
      ? form.monthRange
      : [
          dayjs().subtract(2, "month").format("YYYY-MM"),
          dayjs().format("YYYY-MM")
        ];
  const [sYm, eYm] = normalizeMonthRangeEnds(range[0], range[1]);
  const params = {
    dimension: "month" as StatsDimension,
    startTime: dayjs(`${sYm}-01`).format("YYYYMM"),
    endTime: dayjs(`${eYm}-01`).format("YYYYMM"),
    ignoreRadio: 0 as const
  };

  const { rows } = await loadEnergySummaryDisplay(params, {
    force: options?.force,
    timeoutMs: MONTH_SUMMARY_TIMEOUT_MS
  });

  if (form.meterType) {
    const meterResponse = await getMeterList({
      page: 1,
      size: 1000,
      meterType: form.meterType
    });
    const filteredMeters = extractMeterRowsFromApiResponse(
      meterResponse as Record<string, any>
    );
    const allowedIds = new Set(
      filteredMeters
        .map((m: Record<string, any>) => resolveMeterRowDeviceId(m))
        .filter((id): id is number => id != null)
    );
    return filterStatsByMeterIds(rows, allowedIds);
  }
  return rows;
};

const columns = [
  {
    label: "月份",
    prop: "date",
    minWidth: 100
  },
  {
    label: "总用电量(kWh)",
    prop: "totalConsumption",
    minWidth: 120,
    formatter: ({ totalConsumption }) => totalConsumption.toFixed(2)
  },
  {
    label: "统计设备数量",
    prop: "deviceCount",
    minWidth: 120
  }
];

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  chartInstance = echarts.init(chartRef.value);

  const option = {
    title: {
      text: "电用量月统计趋势图",
      left: "center"
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value} kWh<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ["总用电量"],
      top: 30
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "80",
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: true,
      data: []
    },
    yAxis: {
      type: "value",
      name: "用电量(kWh)"
    },
    series: [
      {
        name: "总用电量",
        type: "bar",
        data: [],
        itemStyle: {
          color: "#E6A23C"
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 更新图表数据（与所选月份范围一致）
const updateChart = (data: StatsDisplayData[]) => {
  if (!chartInstance) return;

  const labels = data.map(d => d.date);
  const powerData = data.map(d => d.totalConsumption);

  chartInstance.setOption({
    xAxis: {
      data: labels
    },
    series: [
      {
        data: powerData
      }
    ]
  });
};

// 搜索
const onSearch = async (options?: { force?: boolean }) => {
  const range =
    form.monthRange?.length === 2
      ? form.monthRange
      : [
          dayjs().subtract(2, "month").format("YYYY-MM"),
          dayjs().format("YYYY-MM")
        ];
  const [sYm, eYm] = normalizeMonthRangeEnds(range[0], range[1]);
  const summaryParams = {
    dimension: "month" as StatsDimension,
    startTime: dayjs(`${sYm}-01`).format("YYYYMM"),
    endTime: dayjs(`${eYm}-01`).format("YYYYMM"),
    ignoreRadio: 0 as const
  };
  const hasCache = !options?.force && hasEnergySummaryCache(summaryParams);

  loading.value = !hasCache;

  try {
    try {
      dataList.value = await loadMonthlyStatsFromSummary(options);
    } catch (summaryError) {
      const reason =
        summaryError instanceof Error
          ? summaryError.message
          : String(summaryError);
      console.info(`月汇总接口失败，回退逐设备统计: ${reason}`);
      loading.value = true;
      dataList.value = await loadMonthlyStatsFromMonthPower();
      message("汇总接口较慢或失败，已改用逐设备查询", { type: "warning" });
    }

    if (dataList.value.length === 0) {
      message("该时间段暂无电用量月统计数据", { type: "info" });
    } else if (!hasCache || options?.force) {
      message("查询成功", { type: "success" });
    }
    updateChart(dataList.value);
  } catch (error) {
    // 网络或系统错误
    console.error("查询电用量月统计失败:", error);

    let errorMsg = "查询失败，请重试";
    const err = error as Error;
    if (err.message?.includes("Network Error")) {
      errorMsg = "网络连接失败，请检查后端服务是否运行";
    } else if (err.message?.includes("timeout")) {
      errorMsg = "请求超时，请检查网络连接";
    }

    message(errorMsg, { type: "error" });
    dataList.value = [];
  } finally {
    loading.value = false;
  }
};

// 重置表单
const resetForm = formEl => {
  if (!formEl) return;
  formEl.resetFields();
  form.monthRange = [
    dayjs().subtract(2, "month").format("YYYY-MM"),
    dayjs().format("YYYY-MM")
  ];
  form.meterType = "";
  onSearch({ force: true });
};

// 导出Excel
const exportExcel = () => {
  if (dataList.value.length === 0) {
    message("没有数据可以导出", { type: "warning" });
    return;
  }

  // 准备数据
  const res = dataList.value.map(item => {
    return [item.date, item.totalConsumption.toFixed(2), item.deviceCount];
  });

  // 添加表头
  res.unshift(["月份", "总用电量(kWh)", "统计设备数量"]);

  // 创建Excel
  const workSheet = utils.aoa_to_sheet(res);
  const workBook = utils.book_new();
  utils.book_append_sheet(workBook, workSheet, "电用量月统计");

  // 导出文件
  const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  writeFile(workBook, `电用量月统计_${dateStr}.xlsx`);

  message("导出成功", { type: "success" });
};

onMounted(() => {
  nextTick(() => {
    initChart();
    onSearch();
  });
});

// 组件卸载时销毁图表
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style lang="scss" scoped>
.main {
  padding: 24px;
}

.box-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.search-form {
  margin-bottom: 20px;

  :deep(.el-form-item) {
    margin-right: 12px;
    margin-bottom: 12px;
  }
}

.chart-container {
  padding: 20px;
  margin: 20px 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}
</style>
