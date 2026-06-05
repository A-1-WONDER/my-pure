<template>
  <div class="main">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>电用量小时统计</span>
          <el-button type="primary" :icon="Download" @click="exportExcel">
            导出Excel
          </el-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form ref="formRef" :inline="true" :model="form" class="search-form">
        <el-form-item label="统计日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="请选择统计日期"
            value-format="YYYY-MM-DD"
            class="w-[200px]!"
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
        row-key="hour"
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
import { addDialog } from "@/components/ReDialog";
import DetailDialog from "./detail-dialog.vue";
import {
  getEnergyStatisticsSummary,
  simpleStatsApi,
  generateTimeParams,
  transformStatsData,
  unwrapEnergyStatisticsSummaryResponse,
  getEnergyStatisticsSummaryErrorMessage,
  type StatsDisplayData,
  type StatsDimension
} from "@/api/business-stats";

defineOptions({
  name: "BusinessStatsHourlyElectric"
});

const allowDemoFallback = !import.meta.env.PROD;

const formRef = ref();
const tableRef = ref();
const chartRef = ref();
let chartInstance: echarts.ECharts | null = null;

const form = reactive({
  date: dayjs().format("YYYY-MM-DD"),
  meterType: ""
});

const loading = ref(false);
const dataList = ref<StatsDisplayData[]>([]);

const columns = [
  {
    label: "序号",
    type: "index",
    minWidth: 80
  },
  {
    label: "小时",
    prop: "hour",
    minWidth: 80,
    formatter: ({ hour }) => `${hour}:00`
  },
  {
    label: "日期",
    prop: "date",
    minWidth: 120
  },
  {
    label: "总用电量(kWh)",
    prop: "totalConsumption",
    minWidth: 150,
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
    cellRenderer: scope => {
      const handleClick = () => {
        showDetailDialog(scope.row);
      };

      return h(
        ElButton,
        {
          type: "primary",
          size: "small",
          onClick: handleClick
        },
        {
          default: () => "查看明细"
        }
      );
    }
  }
];

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  chartInstance = echarts.init(chartRef.value);

  const option = {
    title: {
      text: "电用量小时统计",
      left: "center"
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        let result = `${params[0].axisValue}:00<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value} kWh<br/>`;
        });
        return result;
      }
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "60",
      containLabel: true
    },
    xAxis: {
      type: "category",
      name: "h",
      nameLocation: "middle",
      nameGap: 30,
      data: Array.from({ length: 24 }, (_, i) => i),
      axisLabel: {
        formatter: function (value) {
          return `${value}:00`;
        }
      }
    },
    yAxis: {
      type: "value",
      name: "kWh",
      min: 0,
      axisLabel: {
        formatter: "{value}"
      }
    },
    series: [
      {
        name: "总用电量",
        type: "bar",
        barWidth: "60%",
        data: [],
        itemStyle: {
          color: "#409EFF"
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 更新图表数据
const updateChart = (data: StatsDisplayData[]) => {
  if (!chartInstance) return;

  console.log("更新图表，数据长度:", data.length);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const powerData = hours.map(hour => {
    const item = data.find(d => d.hour === hour);
    const value = item ? item.totalConsumption : 0;
    console.log(`小时 ${hour}: 值 ${value}`);
    return value;
  });

  console.log("功率数据:", powerData);

  // 计算最大值，设置合适的y轴范围
  const maxPower = Math.max(...powerData);
  const maxY = maxPower > 0 ? Math.ceil((maxPower * 1.2) / 10) * 10 : 100;

  console.log("最大功率:", maxPower, "Y轴最大值:", maxY);

  chartInstance.setOption({
    yAxis: {
      max: maxY,
      interval: maxY / 5
    },
    xAxis: {
      data: hours
    },
    series: [
      {
        data: powerData
      }
    ]
  });

  console.log("图表更新完成");
};

// 搜索
const onSearch = async () => {
  loading.value = true;

  try {
    // 生成时间参数
    const timeParams = generateTimeParams("hour", form.date);

    // 准备请求参数
    const requestParams = {
      dimension: "hour" as StatsDimension,
      startTime: timeParams.startTime,
      endTime: timeParams.endTime,
      ignoreRadio: 0
    };

    console.log("发送的请求参数:", requestParams);

    // 首先尝试调用原版API
    let response;
    try {
      response = await getEnergyStatisticsSummary(requestParams);
      console.log("原版API响应:", response);
      console.log("原版API响应结构:", {
        success: response?.success,
        data: response?.data,
        message: response?.message
      });
    } catch (primaryError) {
      if (!allowDemoFallback) throw primaryError;
      console.log("原版API调用失败，尝试简化版API:", primaryError);
      response = await simpleStatsApi.getEnergyStatisticsSummary(requestParams);
      console.log("简化版API响应:", response);
      console.log("简化版API响应结构:", {
        success: response?.success,
        data: response?.data,
        message: response?.message
      });

      // 标记为使用简化版数据
      if (response && response.success) {
        message("使用演示数据（简化版接口）", { type: "info" });
      }
    }

    console.log("最终响应:", response);

    const apiData = unwrapEnergyStatisticsSummaryResponse(
      response as Record<string, any>
    );

    if (apiData) {
      console.log("API数据状态:", apiData.status);
      console.log("API数据结构:", apiData);

      try {
        console.log("开始转换数据...");
        dataList.value = transformStatsData(apiData);

        console.log("转换后的数据:", dataList.value);
        console.log("数据长度:", dataList.value.length);

        if (dataList.value.length === 0) {
          message("该时间段暂无电用量小时统计数据", { type: "info" });
        } else {
          message("查询成功", { type: "success" });
          console.log("第一条数据:", dataList.value[0]);
        }

        updateChart(dataList.value);
      } catch (err) {
        console.error("数据转换错误:", err);
        const msg = err instanceof Error ? err.message : String(err);
        message("数据处理失败: " + msg, { type: "error" });
        dataList.value = [];
      }
    } else {
      const errorMsg = getEnergyStatisticsSummaryErrorMessage(
        response as Record<string, any>
      );
      console.log("API业务逻辑失败或响应格式不匹配:", errorMsg);
      message(errorMsg, { type: "error" });
      dataList.value = [];
    }
  } catch (error) {
    // 网络或系统错误
    console.error("查询电用量小时统计失败:", error);

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
  form.date = dayjs().format("YYYY-MM-DD");
  form.meterType = "";
  onSearch();
};

// 导出Excel
const exportExcel = () => {
  if (dataList.value.length === 0) {
    message("没有数据可以导出", { type: "warning" });
    return;
  }

  // 准备数据
  const res = dataList.value.map((item, index) => {
    return [
      index + 1,
      `${item.hour}:00`,
      item.date,
      item.totalConsumption.toFixed(2),
      item.deviceCount
    ];
  });

  // 添加表头
  res.unshift(["序号", "小时", "日期", "总用电量(kWh)", "统计设备数量"]);

  // 创建Excel
  const workSheet = utils.aoa_to_sheet(res);
  const workBook = utils.book_new();
  utils.book_append_sheet(workBook, workSheet, "电用量小时统计");

  // 导出文件
  const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  writeFile(workBook, `电用量小时统计_${dateStr}.xlsx`);

  message("导出成功", { type: "success" });
};

onMounted(() => {
  nextTick(() => {
    initChart();
    onSearch();
  });
});

// 查看明细对话框
const showDetailDialog = row => {
  console.log("查看明细:", row);

  addDialog({
    title: `电表明细 - ${row.date} ${row.hour}:00`,
    width: "90%",
    fullscreenIcon: true,
    contentRenderer: () => DetailDialog,
    props: {
      date: row.date,
      hour: row.hour,
      totalConsumption: row.totalConsumption,
      meterStats: row.meterStats,
      meterType: form.meterType
    },
    on: {
      close: () => {
        console.log("明细对话框关闭");
      }
    }
  });
};

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
