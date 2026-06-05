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
import { ref, reactive, onMounted, h, computed } from "vue";
import { Search, Refresh } from "@element-plus/icons-vue";
import { ElTag } from "element-plus";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import {
  getMeterDetailWithExt,
  getElectricMeterDetails,
  type MeterDetailData
} from "@/api/meters";
import { getCollectorDetail } from "@/api/collector";
import type { MeterStatItem } from "@/api/business-stats";

defineOptions({
  name: "HourlyElectricDetailDialog"
});

const props = defineProps({
  date: {
    type: String,
    required: true
  },
  hour: {
    type: Number,
    required: true
  },
  totalConsumption: {
    type: Number,
    required: true
  },
  meterStats: {
    type: Array as () => MeterStatItem[],
    default: () => []
  },
  meterType: {
    type: String,
    default: ""
  }
});

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
const dataList = ref([]);

const statusMap = {
  "0": { text: "在线", type: "success" },
  "1": { text: "未在线", type: "warning" },
  NORMAL: { text: "在线", type: "success" },
  ONLINE: { text: "在线", type: "success" },
  FAULT: { text: "故障", type: "danger" },
  ERROR: { text: "故障", type: "danger" },
  OFFLINE: { text: "离线", type: "warning" }
};

const getStatusDisplay = (statusValue?: string | number | null) => {
  if (statusValue === null || statusValue === undefined || statusValue === "") {
    return { text: "未知", type: "info" };
  }
  return (
    statusMap[String(statusValue).toUpperCase()] || {
      text: String(statusValue),
      type: "info"
    }
  );
};

const extractLastStatus = (response: Record<string, any>) => {
  return (
    response?.data?.laststatus ??
    response?.data?.lastStatus ??
    response?.data?.data?.laststatus ??
    response?.data?.data?.lastStatus ??
    response?.data?.status ??
    response?.data?.data?.status ??
    response?.status ??
    response?.laststatus ??
    response?.lastStatus
  );
};

const extractResponsePayload = (response: Record<string, any>) => {
  return response?.data?.data ?? response?.data ?? response;
};

const resolveMeterId = (meterStat: Record<string, any>) => {
  if (meterStat?.meterId !== null && meterStat?.meterId !== undefined) {
    return Number(meterStat.meterId);
  }

  const meterName = String(meterStat?.meterName || "");
  const meterNo = String(meterStat?.meterNo || "");
  const candidates = [meterName, meterNo];

  for (const value of candidates) {
    const match = value.match(/(?:mid:|meterId:|deviceId:)?(\d+)/i);
    if (match) return Number(match[1]);
  }

  return undefined;
};

const mergeRowsByMeterId = (rows: Record<string, any>[]) => {
  const mergedMap = new Map<string | number, Record<string, any>>();

  rows.forEach(row => {
    const key = row.id ?? row.meterNo ?? row.meterName;
    if (key === null || key === undefined || key === "") return;

    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...row });
      return;
    }

    const existing = mergedMap.get(key);
    existing.totalConsumption =
      Number(existing.totalConsumption || 0) +
      Number(row.totalConsumption || 0);

    if (!existing.meterNo && row.meterNo) existing.meterNo = row.meterNo;
    if (!existing.collectorId && row.collectorId)
      existing.collectorId = row.collectorId;
    if (!existing.collectorName && row.collectorName)
      existing.collectorName = row.collectorName;
    if (!existing.collectorNo && row.collectorNo)
      existing.collectorNo = row.collectorNo;
    if (!existing.status && row.status) existing.status = row.status;
    if (!existing.laststatus && row.laststatus)
      existing.laststatus = row.laststatus;
    if (!existing.signalStrength && row.signalStrength)
      existing.signalStrength = row.signalStrength;
    if (!existing.meterAddress && row.meterAddress)
      existing.meterAddress = row.meterAddress;
    if (!existing.userId && row.userId) existing.userId = row.userId;
    if (!existing.userInfo && row.userInfo) existing.userInfo = row.userInfo;
    if (!existing.meterType && row.meterType)
      existing.meterType = row.meterType;
    if (!existing.remainingAmount && row.remainingAmount)
      existing.remainingAmount = row.remainingAmount;
    if (!existing.voltage && row.voltage) existing.voltage = row.voltage;
    if (!existing.current && row.current) existing.current = row.current;
    if (!existing.temperature && row.temperature)
      existing.temperature = row.temperature;
  });

  return Array.from(mergedMap.values()).map(item => ({
    ...item,
    totalConsumption: Number(Number(item.totalConsumption || 0).toFixed(2))
  }));
};

const sourceMeterStats = computed(() => props.meterStats || []);

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

// 使用电表管理的表头结构
const columns = [
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
      const displayText = scope.row.collectorNo
        ? scope.row.collectorNo
        : scope.row.collectorName
          ? scope.row.collectorName
          : `采集器${scope.row.collectorId || ""}`;
      return h("span", null, () => displayText);
    }
  },
  {
    label: "在线状态",
    prop: "status",
    minWidth: 100,
    cellRenderer: scope => {
      const status = getStatusDisplay(
        scope.row.laststatus ?? scope.row.lastStatus ?? scope.row.status
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
    label: "用户",
    prop: "userId",
    minWidth: 100,
    cellRenderer: scope => {
      const displayText = scope.row.userInfo?.userName
        ? scope.row.userInfo.userName
        : scope.row.userName
          ? scope.row.userName
          : `用户${scope.row.userId || ""}`;
      return h("span", null, () => displayText);
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
    label: "本小时用电量",
    prop: "totalConsumption",
    minWidth: 120,
    formatter: ({ totalConsumption }) => `${totalConsumption || 0} kWh`
  },
  {
    label: "剩余金额",
    prop: "remainingAmount",
    minWidth: 100,
    formatter: ({ remainingAmount }) => `¥${remainingAmount || 0}`
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
];

// 搜索
const onSearch = async () => {
  loading.value = true;

  try {
    const detailResults = await Promise.allSettled(
      sourceMeterStats.value.map(async meterStat => {
        const resolvedMeterId = resolveMeterId(
          meterStat as Record<string, any>
        );
        const [detailRes, electricDetailRes] = await Promise.allSettled([
          resolvedMeterId !== undefined
            ? getMeterDetailWithExt(resolvedMeterId)
            : Promise.reject(new Error("缺少meterId")),
          resolvedMeterId !== undefined
            ? getElectricMeterDetails(resolvedMeterId)
            : Promise.reject(new Error("缺少meterId"))
        ]);

        const detailData =
          detailRes.status === "fulfilled"
            ? (extractResponsePayload(
                detailRes.value as Record<string, any>
              ) as MeterDetailData)
            : undefined;
        const electricDetailData =
          electricDetailRes.status === "fulfilled"
            ? extractResponsePayload(
                electricDetailRes.value as Record<string, any>
              )
            : undefined;
        const laststatus = extractLastStatus(
          electricDetailData as Record<string, any>
        );
        const collectorId =
          detailData?.collectorId ?? electricDetailData?.collectorId;
        const collectorRes =
          collectorId !== null && collectorId !== undefined
            ? await getCollectorDetail(collectorId).catch(() => undefined)
            : undefined;
        const collectorData = collectorRes
          ? (extractResponsePayload(
              collectorRes as Record<string, any>
            ) as Record<string, any>)
          : undefined;

        console.log("小时用量明细-采集器信息排查:", {
          meterStat,
          meterId: meterStat.meterId,
          resolvedMeterId,
          detailResStatus: detailRes.status,
          detailData,
          electricDetailResStatus: electricDetailRes.status,
          electricDetailData,
          extractedLastStatus: laststatus,
          collectorIdFromDetail: detailData?.collectorId,
          collectorIdFromElectricDetail: electricDetailData?.collectorId,
          finalCollectorId: collectorId,
          collectorRes,
          collectorData
        });

        const assembledRow = {
          id: resolvedMeterId,
          meterNo:
            meterStat.meterNo ||
            detailData?.meterNo ||
            electricDetailData?.meterNo,
          meterName: /^mid:\d+$/i.test(String(meterStat.meterName || ""))
            ? meterStat.meterNo ||
              detailData?.meterNo ||
              electricDetailData?.meterNo
            : meterStat.meterName || detailData?.meterName,
          collectorId,
          collectorName:
            collectorData?.collectorName ||
            collectorData?.name ||
            detailData?.collectorName ||
            electricDetailData?.collectorName ||
            `采集器${collectorId || ""}`,
          collectorNo:
            collectorData?.collectorNo ||
            collectorData?.code ||
            detailData?.collectorNo ||
            electricDetailData?.collectorNo ||
            (collectorId !== null && collectorId !== undefined
              ? String(collectorId)
              : undefined),
          collectorStatus: collectorData?.status ?? collectorData?.enabled,
          status:
            laststatus ?? detailData?.status ?? electricDetailData?.status,
          laststatus,
          signalStrength:
            (detailData as any)?.signalStrength ??
            electricDetailData?.signalStrength,
          meterAddress:
            detailData?.meterAddress || electricDetailData?.meterAddress,
          userId:
            detailData?.userInfo?.userId ??
            electricDetailData?.userInfo?.userId,
          userInfo: detailData?.userInfo || electricDetailData?.userInfo,
          meterType:
            detailData?.meterType ||
            electricDetailData?.meterType ||
            props.meterType,
          remark: `${props.date} ${String(props.hour).padStart(2, "0")}:00 时段统计`,
          totalConsumption: meterStat.totalConsumption,
          remainingAmount:
            detailData?.remainingAmount ?? electricDetailData?.remainingAmount,
          voltage: detailData?.voltage ?? electricDetailData?.voltage,
          current: detailData?.current ?? electricDetailData?.current,
          temperature:
            detailData?.temperature ?? electricDetailData?.temperature
        };

        console.log("小时用量明细-最终行数据:", assembledRow);
        return assembledRow;
      })
    );

    let filteredData = detailResults
      .filter(result => result.status === "fulfilled")
      .map(result => result.value);

    filteredData = mergeRowsByMeterId(filteredData);

    // 应用筛选条件
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

    // 分页处理
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;

    dataList.value = filteredData.slice(startIndex, endIndex);
    pagination.total = filteredData.length;

    if (detailResults.some(result => result.status === "rejected")) {
      message("部分电表详情获取失败，已展示可用真实数据", { type: "warning" });
    } else {
      message("查询成功", { type: "success" });
    }
  } catch (error) {
    console.error("查询失败:", error);
    message("查询失败，请重试", { type: "error" });
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
  console.log("明细对话框加载，参数:", props);
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
