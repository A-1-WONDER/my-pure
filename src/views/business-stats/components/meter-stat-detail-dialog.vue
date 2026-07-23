<template>
  <div class="detail-dialog">
    <!-- 搜索表单 -->
    <el-form ref="formRef" :inline="true" :model="form" class="search-form">
      <el-form-item label="电表标签" prop="meterNo">
        <el-input
          v-model="form.meterNo"
          placeholder="请输入电表标签"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="在线状态" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择在线状态"
          clearable
          class="w-[170px]!"
        >
          <el-option label="在线" value="NORMAL" />
          <el-option label="故障" value="FAULT" />
          <el-option label="离线" value="OFFLINE" />
        </el-select>
      </el-form-item>
      <el-form-item label="采集器" prop="collectorId">
        <el-input
          v-model="form.collectorId"
          placeholder="请输入采集器ID"
          clearable
          class="w-[170px]!"
          type="number"
        />
      </el-form-item>
      <el-form-item label="用户" prop="userId">
        <el-input
          v-model="form.userId"
          placeholder="请输入用户ID"
          clearable
          class="w-[170px]!"
          type="number"
        />
      </el-form-item>
      <el-form-item label="电表类型" prop="meterType">
        <el-select
          v-model="form.meterType"
          placeholder="请选择电表类型"
          clearable
          class="w-[170px]!"
        >
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
          搜索
        </el-button>
        <el-button :icon="Refresh" @click="resetForm(formRef)">
          重置
        </el-button>
        <el-button
          type="success"
          :icon="Download"
          :loading="exporting"
          @click="exportExcel"
        >
          导出为Excel
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <pure-table
      ref="tableRef"
      row-key="id"
      align-whole="center"
      table-layout="auto"
      :loading="loading"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      :header-cell-style="{
        background: 'var(--el-fill-color-light)',
        color: 'var(--el-text-color-primary)'
      }"
      @page-size-change="handleSizeChange"
      @page-current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed, type PropType } from "vue";
import dayjs from "dayjs";
import { utils, writeFile } from "xlsx";
import { Search, Refresh, Download } from "@element-plus/icons-vue";
import { ElTag } from "element-plus";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import { getElectricMeterDetails } from "@/api/meters";
import type { MeterStatItem } from "@/api/business-stats";
import { METER_ENRICH_BATCH_SIZE } from "@/api/business-stats";
import {
  METER_STAT_PERIOD_META,
  getDetailExportHeaders,
  type MeterStatDetailPeriod
} from "./meter-stat-period";
import {
  buildMeterArchiveByNoMap,
  buildMeterArchiveMap,
  formatCollectorDisplay,
  loadCollectorOptions,
  loadStatsMeterRows,
  runInBatches
} from "./stats-meter-utils";
import {
  buildDetailRowFromMeterStat,
  mergeDetailRowsByMeterId,
  resolveDetailArchive
} from "./meter-stat-detail-enrich";
import { formatMeterEnergyUnit } from "@/views/monitor2/utils/meter-display";
import {
  extractCurrentOnlineStatus,
  getOnlineStatusDisplay
} from "@/views/monitor2/utils/device-online-status";

defineOptions({
  name: "MeterStatDetailDialog"
});

const props = defineProps({
  /** hour | day | month | year — 仅影响用电量列文案与备注 */
  period: {
    type: String as PropType<MeterStatDetailPeriod>,
    default: "hour"
  },
  date: {
    type: String,
    required: true
  },
  hour: {
    type: Number,
    default: undefined
  },
  totalConsumption: {
    type: Number,
    required: true
  },
  meterStats: {
    type: Array as PropType<MeterStatItem[]>,
    default: () => []
  },
  meterType: {
    type: String,
    default: ""
  }
});

const periodMeta = computed(
  () => METER_STAT_PERIOD_META[props.period] ?? METER_STAT_PERIOD_META.hour
);

const formRef = ref();
const tableRef = ref();

const form = reactive({
  meterNo: "",
  meterType: "",
  status: "",
  collectorId: "",
  userId: ""
});

const loading = ref(false);
const exporting = ref(false);
const dataList = ref([]);
/** 当前筛选后的全量数据（导出用，不受分页截断） */
const filteredAllList = ref<Record<string, any>[]>([]);
/** 会话内复用电表档案，避免筛选/翻页重复拉列表 */
let meterArchiveMapCache: Map<number, Record<string, any>> | null = null;
let meterArchiveByNoCache: Map<string, Record<string, any>> | null = null;
let collectorByIdCache: Map<
  number,
  { label: string; installAddress?: string }
> | null = null;
let meterArchiveCacheKey = "";

const getStatusDisplay = (statusValue?: string | number | null) =>
  getOnlineStatusDisplay(statusValue);

const extractResponsePayload = (response: Record<string, any>) => {
  return response?.data?.data ?? response?.data ?? response;
};

const sourceMeterStats = computed(() => props.meterStats || []);

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

// 表头结构共用；用电量列名随 period 变化
const columns = computed(() => [
  {
    label: "序号",
    prop: "id",
    minWidth: 80
  },
  {
    label: "标签",
    prop: "meterNo",
    minWidth: 120
  },
  {
    label: "采集器",
    prop: "collectorId",
    minWidth: 100,
    cellRenderer: scope => {
      return h("span", null, formatCollectorDisplay(scope.row));
    }
  },
  {
    label: "在线状态",
    prop: "status",
    minWidth: 100,
    cellRenderer: scope => {
      const status = getStatusDisplay(
        scope.row.onlineStatus ?? scope.row.status ?? scope.row.laststatus
      );
      return h(
        ElTag,
        {
          size: scope.props.size,
          type: status.type,
          effect: "plain"
        },
        () => status.text
      );
    }
  },
  {
    label: "通讯地址",
    prop: "meterAddress",
    minWidth: 150
  },
  {
    label: "用能单位",
    prop: "collectorName",
    minWidth: 120,
    cellRenderer: scope => {
      return h("span", null, formatMeterEnergyUnit(scope.row));
    }
  },
  {
    label: "电表类型",
    prop: "meterType",
    minWidth: 100,
    cellRenderer: scope => {
      const typeMap = {
        "single-phase": "单相",
        "three-phase": "三相",
        prepaid: "预付费",
        multiRate: "多费率"
      };
      const displayText = typeMap[scope.row.meterType] || scope.row.meterType;
      return h("span", null, () => displayText);
    }
  },
  {
    label: "备注",
    prop: "remark",
    minWidth: 120,
    formatter: ({ remark }) => remark || "-"
  },
  {
    label: periodMeta.value.consumptionLabel,
    prop: "totalConsumption",
    minWidth: 120,
    formatter: ({ totalConsumption }) => `${totalConsumption || 0} kWh`
  },
  {
    label: "其他",
    prop: "otherInfo",
    minWidth: 120,
    cellRenderer: scope => {
      const info = [];
      if (scope.row.voltage) info.push(`${scope.row.voltage}V`);
      if (scope.row.current) info.push(`${scope.row.current}A`);
      if (scope.row.temperature) info.push(`${scope.row.temperature}°C`);
      const displayText = info.join(" / ") || "-";
      return h("span", null, () => displayText);
    }
  }
]);

async function loadMeterArchiveMap() {
  const cacheKey = props.meterType || "__all__";
  if (
    meterArchiveMapCache &&
    meterArchiveByNoCache &&
    collectorByIdCache &&
    meterArchiveCacheKey === cacheKey
  ) {
    return {
      byId: meterArchiveMapCache,
      byNo: meterArchiveByNoCache,
      collectorById: collectorByIdCache
    };
  }

  // 档案/采集器失败不应导致明细整表空白
  let rows: Record<string, any>[] = [];
  try {
    rows = await loadStatsMeterRows(props.meterType || undefined);
  } catch (error) {
    console.warn("加载电表档案失败，明细将仅展示统计原始字段:", error);
  }

  let collectorById = new Map<
    number,
    { label: string; installAddress?: string }
  >();
  try {
    const collectorOptions = await loadCollectorOptions();
    collectorById = new Map(
      collectorOptions.map(item => [
        item.id,
        { label: item.label, installAddress: item.installAddress }
      ])
    );
  } catch (error) {
    console.warn("加载采集器列表失败，采集器列可能缺少名称:", error);
  }

  meterArchiveMapCache = buildMeterArchiveMap(rows);
  meterArchiveByNoCache = buildMeterArchiveByNoMap(rows);
  collectorByIdCache = collectorById;
  meterArchiveCacheKey = cacheKey;
  return {
    byId: meterArchiveMapCache,
    byNo: meterArchiveByNoCache,
    collectorById: collectorByIdCache
  };
}

function buildRowFromMeterStat(
  meterStat: MeterStatItem,
  archive?: Record<string, any>,
  collectorById?: Map<number, { label: string; installAddress?: string }>
) {
  return buildDetailRowFromMeterStat(meterStat, archive, collectorById, {
    meterType: props.meterType,
    remark: periodMeta.value.buildRemark(props.date, props.hour)
  });
}

function applyFilters(rows: Record<string, any>[]) {
  let filteredData = [...rows];

  if (form.meterNo) {
    filteredData = filteredData.filter(item =>
      item.meterNo?.includes(form.meterNo)
    );
  }

  if (form.status) {
    filteredData = filteredData.filter(
      item => String(item.status ?? "").toUpperCase() === form.status
    );
  }

  if (form.meterType) {
    filteredData = filteredData.filter(
      item => item.meterType === form.meterType
    );
  }

  if (form.collectorId) {
    filteredData = filteredData.filter(
      item => item.collectorId === parseInt(form.collectorId)
    );
  }

  if (form.userId) {
    filteredData = filteredData.filter(
      item => item.userId === parseInt(form.userId)
    );
  }

  return filteredData;
}

function applyPagination(rows: Record<string, any>[]) {
  const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  filteredAllList.value = rows;
  dataList.value = rows.slice(startIndex, endIndex);
  pagination.total = rows.length;
}

async function enrichLastStatus(rows: Record<string, any>[]) {
  const targets = rows.filter(row => row.id != null);
  if (!targets.length) return;

  const settled = await runInBatches(
    targets,
    METER_ENRICH_BATCH_SIZE,
    async row => {
      const response = await getElectricMeterDetails(row.id);
      const onlineStatus = extractCurrentOnlineStatus(
        extractResponsePayload(response as Record<string, any>)
      );
      return { id: row.id as number, onlineStatus };
    }
  );

  const statusMap = new Map<number, string | number>();
  settled.forEach(result => {
    if (result.status !== "fulfilled") return;
    const { id, onlineStatus } = result.value;
    if (
      id != null &&
      onlineStatus !== null &&
      onlineStatus !== undefined &&
      onlineStatus !== ""
    ) {
      statusMap.set(id, onlineStatus);
    }
  });

  if (!statusMap.size) return;

  rows.forEach(row => {
    const onlineStatus = statusMap.get(row.id);
    if (onlineStatus === undefined) return;
    row.status = onlineStatus;
    row.onlineStatus = onlineStatus;
  });
}

// 搜索
const onSearch = async () => {
  loading.value = true;

  try {
    const source = sourceMeterStats.value || [];
    if (!source.length) {
      applyPagination([]);
      message("该时段暂无电表明细", { type: "info" });
      return;
    }

    const { byId, byNo, collectorById } = await loadMeterArchiveMap();
    let rows = mergeDetailRowsByMeterId(
      source.map(meterStat => {
        const archive = resolveDetailArchive(meterStat, byId, byNo);
        return buildRowFromMeterStat(meterStat, archive, collectorById);
      })
    );

    applyPagination(applyFilters(rows));
    message("查询成功", { type: "success" });

    // 后台补在线状态，不阻塞首屏
    void enrichLastStatus(rows).then(() => {
      rows = mergeDetailRowsByMeterId(rows);
      applyPagination(applyFilters(rows));
    });
  } catch (error) {
    console.error("查询失败:", error);
    // 兜底：档案异常时仍展示原始统计行，避免整表空白
    try {
      const fallbackRows = mergeDetailRowsByMeterId(
        (sourceMeterStats.value || []).map(meterStat =>
          buildRowFromMeterStat(meterStat)
        )
      );
      applyPagination(applyFilters(fallbackRows));
      message("明细已展示（档案信息加载失败）", { type: "warning" });
    } catch (fallbackError) {
      console.error("明细兜底失败:", fallbackError);
      message("查询失败，请重试", { type: "error" });
    }
  } finally {
    loading.value = false;
  }
};

// 重置表单
const resetForm = formEl => {
  if (!formEl) return;
  formEl.resetFields();
  form.meterNo = "";
  form.meterType = "";
  form.status = "";
  form.collectorId = "";
  form.userId = "";
  pagination.currentPage = 1;
  onSearch();
};

const meterTypeLabel = (meterType?: string) => {
  const typeMap: Record<string, string> = {
    "single-phase": "单相",
    "three-phase": "三相",
    prepaid: "预付费",
    multiRate: "多费率"
  };
  return typeMap[meterType || ""] || meterType || "-";
};

const exportExcel = () => {
  const rows = filteredAllList.value;
  if (!rows.length) {
    message("没有数据可以导出", { type: "warning" });
    return;
  }

  exporting.value = true;
  try {
    const titleList = getDetailExportHeaders(props.period);

    const body = rows.map(item => {
      const collectorText = formatCollectorDisplay(item);
      const statusText = getStatusDisplay(
        item.onlineStatus ?? item.status ?? item.laststatus
      ).text;
      const userText = formatMeterEnergyUnit(item);
      const otherParts: string[] = [];
      if (item.voltage) otherParts.push(`${item.voltage}V`);
      if (item.current) otherParts.push(`${item.current}A`);
      if (item.temperature) otherParts.push(`${item.temperature}°C`);

      return [
        item.id ?? "-",
        item.meterNo || "-",
        collectorText || "-",
        statusText,
        item.meterAddress || "-",
        userText || "-",
        meterTypeLabel(item.meterType),
        item.remark || "-",
        Number(item.totalConsumption || 0),
        otherParts.join(" / ") || "-"
      ];
    });

    const workSheet = utils.aoa_to_sheet([titleList, ...body]);
    const workBook = utils.book_new();
    utils.book_append_sheet(workBook, workSheet, periodMeta.value.sheetName);

    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    const periodPart =
      props.period === "hour"
        ? `${props.date}_${String(props.hour ?? 0).padStart(2, "0")}时`
        : props.date;
    writeFile(
      workBook,
      `${periodMeta.value.filePrefix}_${periodPart}_${dateStr}.xlsx`
    );
    message("导出成功", { type: "success" });
  } catch (error) {
    console.error("导出失败:", error);
    message("导出失败，请重试", { type: "error" });
  } finally {
    exporting.value = false;
  }
};

// 分页处理
const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  onSearch();
};

const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  onSearch();
};

onMounted(() => {
  onSearch();
});
</script>

<style lang="scss" scoped>
.detail-dialog {
  .search-form {
    margin-bottom: 20px;

    :deep(.el-form-item) {
      margin-right: 12px;
      margin-bottom: 12px;
    }
  }
}
</style>
