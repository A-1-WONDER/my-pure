<template>
  <div class="main">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>电用量年统计</span>
          <el-button type="primary" :icon="Download" @click="exportExcel">
            导出Excel
          </el-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form ref="formRef" :inline="true" :model="form" class="search-form">
        <el-form-item label="统计年份范围" prop="yearRange">
          <el-date-picker
            v-model="form.yearRange"
            type="yearrange"
            start-placeholder="开始年份"
            end-placeholder="结束年份"
            value-format="YYYY"
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
        <el-form-item label="采集器" prop="collectorIds">
          <CollectorMultiSelect v-model="form.collectorIds" />
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
        title="首次加载时会比较慢，耐心等待即可"
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
import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  nextTick,
  computed,
  h
} from "vue";
import * as echarts from "echarts";
import { Search, Refresh, Download } from "@element-plus/icons-vue";
import { ElButton } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { utils, writeFile } from "xlsx";
import dayjs from "dayjs";
import { openMeterStatDetailDialog } from "../components/open-meter-stat-detail";
import CollectorMultiSelect from "../components/CollectorMultiSelect.vue";
import {
  chunkMeters,
  filterStatsByMeterIds,
  loadScopedStatsMeters
} from "../components/stats-meter-utils";
import {
  METER_ENRICH_BATCH_SIZE,
  extractYearPowerValue,
  getDeviceYearPower,
  resolveMeterRowDeviceId,
  type StatsDimension,
  type StatsDisplayData
} from "@/api/business-stats";
import {
  hasEnergySummaryCache,
  loadEnergySummaryDisplay
} from "@/utils/energy-summary-cache";

defineOptions({
  name: "BusinessStatsYearlyElectric"
});

const formRef = ref();
const tableRef = ref();
const chartRef = ref();
let chartInstance: echarts.ECharts | null = null;

const form = reactive({
  /** 默认同一年，减少请求；需多年对比时拉大范围（数据走 year-power 聚合） */
  yearRange: [dayjs().format("YYYY"), dayjs().format("YYYY")],
  meterType: "",
  collectorIds: [] as number[]
});

const loading = ref(false);
const dataList = ref<StatsDisplayData[]>([]);
const YEAR_REQUEST_BATCH_SIZE = METER_ENRICH_BATCH_SIZE;
const YEAR_SUMMARY_TIMEOUT_MS = 120000;

// 计算年份范围
const yearRangeComputed = computed(() => {
  if (!form.yearRange || form.yearRange.length !== 2) {
    const y = dayjs().year();
    return [y, y];
  }
  let sy = parseInt(form.yearRange[0], 10);
  let ey = parseInt(form.yearRange[1], 10);
  if (!Number.isFinite(sy) || !Number.isFinite(ey)) {
    const y = dayjs().year();
    return [y, y];
  }
  if (sy > ey) [sy, ey] = [ey, sy];
  return [sy, ey];
});

const loadYearlyStatsFromYearPower = async (): Promise<{
  rows: StatsDisplayData[];
  meterCount: number;
  failedCount: number;
}> => {
  const [startYear, endYear] = yearRangeComputed.value;
  const { meterRows } = await loadScopedStatsMeters({
    meterType: form.meterType || undefined,
    collectorIds: form.collectorIds
  });

  if (meterRows.length === 0) {
    return { rows: [], meterCount: 0, failedCount: 0 };
  }

  const rows: StatsDisplayData[] = [];
  let failedCount = 0;

  for (let year = startYear; year <= endYear; year++) {
    const yearStr = String(year);
    const meterStats: Array<{
      meterId: number;
      meterNo: string;
      totalConsumption: number;
    }> = [];

    // 分批请求，避免一次并发过多导致整批超时
    const chunks = chunkMeters(meterRows, YEAR_REQUEST_BATCH_SIZE);
    for (const chunk of chunks) {
      const settled = await Promise.allSettled(
        chunk.map((item: Record<string, any>) => {
          const deviceId = resolveMeterRowDeviceId(item)!;
          return getDeviceYearPower(deviceId, yearStr).then(res => ({
            meterId: deviceId,
            meterNo: String(item.meterNo ?? item.meterName ?? deviceId),
            totalConsumption: extractYearPowerValue(res as Record<string, any>)
          }));
        })
      );

      settled.forEach((result, index) => {
        const item = chunk[index];
        const deviceId = resolveMeterRowDeviceId(item)!;
        const meterNo = String(item.meterNo ?? item.meterName ?? deviceId);
        if (result.status === "fulfilled") {
          meterStats.push(result.value);
        } else {
          failedCount += 1;
          // 失败设备按 0 用电量计入，避免统计设备数被置为 0
          meterStats.push({
            meterId: deviceId,
            meterNo,
            totalConsumption: 0
          });
        }
      });
    }

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

  return { rows, meterCount: meterRows.length, failedCount };
};

const loadYearlyStatsFromSummary = async (options?: {
  force?: boolean;
}): Promise<StatsDisplayData[]> => {
  const [startYear, endYear] = yearRangeComputed.value;
  const params = {
    dimension: "year" as StatsDimension,
    startTime: String(startYear),
    endTime: String(endYear),
    ignoreRadio: 0 as const,
    collectorIds: form.collectorIds?.length ? [...form.collectorIds] : undefined
  };
  const { rows } = await loadEnergySummaryDisplay(params, {
    force: options?.force,
    timeoutMs: YEAR_SUMMARY_TIMEOUT_MS
  });
  if (form.meterType) {
    const { allowedIds, meterRows } = await loadScopedStatsMeters({
      meterType: form.meterType,
      collectorIds: form.collectorIds
    });
    if (meterRows.length === 0) {
      return [];
    }
    if (allowedIds.size > 0) {
      return filterStatsByMeterIds(rows, allowedIds);
    }
  }
  return rows;
};

const columns = [
  {
    label: "年份",
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
  },
  {
    label: "查看明细",
    prop: "detail",
    minWidth: 120,
    cellRenderer: scope =>
      h(
        ElButton,
        {
          type: "primary",
          size: "small",
          onClick: () => showDetailDialog(scope.row)
        },
        { default: () => "查看明细" }
      )
  }
];

const showDetailDialog = (row: StatsDisplayData) => {
  openMeterStatDetailDialog({
    period: "year",
    date: row.date,
    totalConsumption: row.totalConsumption,
    meterStats: row.meterStats || [],
    meterType: form.meterType
  });
};

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  chartInstance = echarts.init(chartRef.value);

  const option = {
    title: {
      text: "电用量年统计趋势图",
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
        barMaxWidth: 48,
        data: [],
        itemStyle: {
          color: "#F56C6C"
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 更新图表数据
const updateChart = (data: StatsDisplayData[]) => {
  if (!chartInstance) return;

  // 提取年份和用电量数据
  const years = data.map(item => item.date.replace("年", ""));
  const powerData = data.map(item => item.totalConsumption);

  chartInstance.setOption({
    xAxis: {
      data: years.map(y => `${y}年`)
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
  const [startYear, endYear] = yearRangeComputed.value;
  const summaryParams = {
    dimension: "year" as StatsDimension,
    startTime: String(startYear),
    endTime: String(endYear),
    ignoreRadio: 0 as const,
    collectorIds: form.collectorIds?.length ? [...form.collectorIds] : undefined
  };
  const hasCache = !options?.force && hasEnergySummaryCache(summaryParams);

  loading.value = !hasCache;

  try {
    try {
      dataList.value = await loadYearlyStatsFromSummary(options);
    } catch (summaryError) {
      const reason =
        summaryError instanceof Error
          ? summaryError.message
          : String(summaryError);
      console.info(`年汇总接口失败，回退逐设备统计: ${reason}`);
      loading.value = true;
      const { rows, failedCount } = await loadYearlyStatsFromYearPower();
      dataList.value = rows;
      if (rows.length > 0 && failedCount > 0) {
        message(`部分设备超时（${failedCount}次），已按可用数据统计`, {
          type: "warning"
        });
      }
    }

    if (dataList.value.length === 0) {
      message("该时间段暂无电用量年统计数据", { type: "info" });
    } else if (!hasCache || options?.force) {
      message("查询成功", { type: "success" });
    }

    updateChart(dataList.value);
  } catch (error) {
    console.error("查询电用量年统计失败:", error);

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
  form.yearRange = [dayjs().format("YYYY"), dayjs().format("YYYY")];
  form.meterType = "";
  form.collectorIds = [];
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
  res.unshift(["年份", "总用电量(kWh)", "统计设备数量"]);

  // 创建Excel
  const workSheet = utils.aoa_to_sheet(res);
  const workBook = utils.book_new();
  utils.book_append_sheet(workBook, workSheet, "电用量年统计");

  // 导出文件
  const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  writeFile(workBook, `电用量年统计_${dateStr}.xlsx`);

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
