<template>
  <div class="main">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>电用量日统计</span>
          <el-button type="primary" :icon="Download" @click="exportExcel">
            导出Excel
          </el-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form ref="formRef" :inline="true" :model="form" class="search-form">
        <el-form-item label="统计日期范围" prop="dayRange">
          <el-date-picker
            v-model="form.dayRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
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
            @click="onSearch"
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
        row-key="date"
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
import { ref, reactive, onMounted, onUnmounted, nextTick, h } from "vue";
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
  fetchMeterDayStatsForDate,
  filterStatsByMeterIds,
  loadScopedStatsMeters
} from "../components/stats-meter-utils";
import {
  simpleStatsApi,
  transformStatsData,
  unwrapEnergyStatisticsSummaryResponse,
  getEnergyStatisticsSummaryErrorMessage,
  type StatsDisplayData,
  type StatsDimension
} from "@/api/business-stats";

defineOptions({
  name: "BusinessStatsDailyElectric"
});

const allowDemoFallback = !import.meta.env.PROD;

const formRef = ref();
const tableRef = ref();
const chartRef = ref();
let chartInstance: echarts.ECharts | null = null;

const form = reactive({
  /** 默认最近 7 天（含今天）；看整月时在日期范围里拉大 */
  dayRange: [
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD")
  ] as string[],
  meterType: "",
  collectorIds: [] as number[]
});

const loading = ref(false);
const dataList = ref<StatsDisplayData[]>([]);

const normalizeDailyDeviceCount = (rows: StatsDisplayData[]) => {
  return rows.map(row => {
    const activeCount = (row.meterStats || []).filter(item => {
      const n = Number(item?.totalConsumption ?? 0);
      return Number.isFinite(n) && n > 0;
    }).length;
    return {
      ...row,
      deviceCount: activeCount
    };
  });
};

const normalizeDateRangeEnds = (a: string, b: string): [string, string] => {
  const da = dayjs(a);
  const db = dayjs(b);
  return da.isAfter(db, "day") ? [b, a] : [a, b];
};

const listDatesInclusive = (start: string, end: string): string[] => {
  const [s, e] = normalizeDateRangeEnds(start, end);
  const out: string[] = [];
  let cur = dayjs(s);
  const last = dayjs(e);
  while (!cur.isAfter(last, "day")) {
    out.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  return out;
};

const loadDailyStatsFromDayPower = async () => {
  const { meterRows } = await loadScopedStatsMeters({
    meterType: form.meterType || undefined,
    collectorIds: form.collectorIds
  });

  if (meterRows.length === 0) {
    return [];
  }

  const dr =
    form.dayRange?.length === 2
      ? form.dayRange
      : [
          dayjs().subtract(6, "day").format("YYYY-MM-DD"),
          dayjs().format("YYYY-MM-DD")
        ];
  const dates = listDatesInclusive(dr[0], dr[1]);
  const rows: StatsDisplayData[] = [];

  // 按天顺序请求：每天 1～2 次批量接口（50 表 ≈ 7 天 7 次），避免 D×M 并发风暴
  for (const date of dates) {
    const meterStats = await fetchMeterDayStatsForDate(meterRows, date);
    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + Number(item.totalConsumption || 0),
      0
    );
    const activeDeviceCount = meterStats.filter(
      item => Number(item.totalConsumption || 0) > 0
    ).length;

    rows.push({
      timeKey: dayjs(date).format("YYYYMMDD"),
      date,
      totalConsumption: Number(totalConsumption.toFixed(2)),
      deviceCount: activeDeviceCount,
      meterStats: meterStats.map(item => ({
        meterId: item.meterId,
        meterNo: item.meterNo,
        meterName: item.meterNo,
        totalConsumption: item.totalConsumption,
        startTime: `${date} 00:00:00`,
        endTime: `${date} 23:59:59`
      }))
    });
  }

  return rows;
};

const columns = [
  {
    label: "日期",
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
    period: "day",
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
      text: "电用量日统计趋势图",
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
      boundaryGap: false,
      data: []
    },
    yAxis: {
      type: "value",
      name: "用电量(kWh)"
    },
    series: [
      {
        name: "总用电量",
        type: "line",
        smooth: true,
        data: [],
        itemStyle: {
          color: "#67C23A"
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(103, 194, 58, 0.3)" },
            { offset: 1, color: "rgba(103, 194, 58, 0.1)" }
          ])
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 更新图表数据
const updateChart = (data: StatsDisplayData[]) => {
  if (!chartInstance) return;

  const dates = data.map(item => item.date);
  const powerData = data.map(item => item.totalConsumption);

  chartInstance.setOption({
    xAxis: {
      data: dates
    },
    series: [
      {
        data: powerData
      }
    ]
  });
};

// 搜索
const onSearch = async () => {
  loading.value = true;

  try {
    try {
      dataList.value = await loadDailyStatsFromDayPower();
      if (dataList.value.length === 0) {
        message("该时间段暂无电用量日统计数据", { type: "info" });
      } else {
        message("查询成功", { type: "success" });
      }
      updateChart(dataList.value);
    } catch (primaryError) {
      if (!allowDemoFallback) throw primaryError;
      console.log("day-power聚合调用失败，尝试汇总接口回退:", primaryError);
      const dr =
        form.dayRange?.length === 2
          ? form.dayRange
          : [
              dayjs().subtract(6, "day").format("YYYY-MM-DD"),
              dayjs().format("YYYY-MM-DD")
            ];
      const [d0, d1] = normalizeDateRangeEnds(dr[0], dr[1]);
      const requestParams = {
        dimension: "day" as StatsDimension,
        startTime: d0.replace(/-/g, ""),
        endTime: d1.replace(/-/g, ""),
        ignoreRadio: 0 as const,
        collectorIds: form.collectorIds?.length
          ? [...form.collectorIds]
          : undefined
      };
      const response =
        await simpleStatsApi.getEnergyStatisticsSummary(requestParams);
      console.log("简化版API响应:", response);
      if (response && response.success) {
        message("使用演示数据（简化版接口）", { type: "info" });
      }
      const apiData = unwrapEnergyStatisticsSummaryResponse(
        response as Record<string, any>
      );
      if (apiData) {
        let rows = normalizeDailyDeviceCount(transformStatsData(apiData));
        if (form.meterType) {
          const { allowedIds, meterRows } = await loadScopedStatsMeters({
            meterType: form.meterType,
            collectorIds: form.collectorIds
          });
          if (meterRows.length === 0) {
            rows = [];
          } else if (allowedIds.size > 0) {
            rows = normalizeDailyDeviceCount(
              filterStatsByMeterIds(rows, allowedIds)
            );
          }
        }
        dataList.value = rows;
        updateChart(dataList.value);
      } else {
        const errorMsg = getEnergyStatisticsSummaryErrorMessage(
          response as Record<string, any>
        );
        message(errorMsg, { type: "error" });
        dataList.value = [];
      }
    }
  } catch (error) {
    // 网络或系统错误
    console.error("查询电用量日统计失败:", error);

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
  form.dayRange = [
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD")
  ];
  form.meterType = "";
  form.collectorIds = [];
  onSearch();
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
  res.unshift(["日期", "总用电量(kWh)", "统计设备数量"]);

  // 创建Excel
  const workSheet = utils.aoa_to_sheet(res);
  const workBook = utils.book_new();
  utils.book_append_sheet(workBook, workSheet, "电用量日统计");

  // 导出文件
  const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  writeFile(workBook, `电用量日统计_${dateStr}.xlsx`);

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
