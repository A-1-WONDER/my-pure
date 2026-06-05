<template>
  <div class="collector-basic-business">
    <div class="header p-4 border-b">
      <h3 class="text-lg font-medium">采集器详情信息</h3>
    </div>

    <div class="content p-4 overflow-y-auto" :style="{ maxHeight: '500px' }">
      <!-- 基本信息网格 -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <!-- 采集器号 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">采集器号</div>
          <div class="value font-medium">
            {{ info.collectorCode || "CJQ-001" }}
          </div>
        </div>

        <!-- 状态 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">状态</div>
          <div class="value">
            <el-tag
              :type="info.status === '已连接' ? 'success' : 'danger'"
              size="small"
            >
              {{ info.status || "已连接" }}
            </el-tag>
          </div>
        </div>

        <!-- 电表数量 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">电表数量</div>
          <div class="value font-medium text-blue-600">
            {{ info.meterCount }} 只
          </div>
        </div>

        <!-- 上次在线/断线时间 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">上次在线/断线时间</div>
          <div class="value">
            <span
              :class="
                info.lastStatusChange === '在线'
                  ? 'text-green-600'
                  : 'text-red-600'
              "
            >
              {{ info.lastStatusChangeTime || "2小时前" }}
            </span>
          </div>
        </div>

        <!-- 累计在线时长 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">累计在线时长</div>
          <div class="value font-medium">
            {{ info.totalOnlineTime || "-" }}
          </div>
        </div>

        <!-- 更新时间 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">更新时间</div>
          <div class="value text-gray-600">
            {{ info.updateTime || "-" }}
          </div>
        </div>

        <!-- 固件版本 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">固件版本</div>
          <div class="value font-mono">
            {{ info.firmwareVersion || "-" }}
          </div>
        </div>

        <!-- 通讯服务 -->
        <div class="info-item">
          <div class="label text-gray-500 text-sm mb-1">通讯服务</div>
          <div class="value">
            <el-tag
              :type="
                info.communicationService === '正常' ? 'success' : 'danger'
              "
              size="small"
            >
              {{ info.communicationService || "-" }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 备注信息 -->
      <div class="mb-6">
        <h4 class="text-md font-medium mb-2">备注</h4>
        <div class="remark-box p-3 border rounded bg-gray-50">
          <p class="text-gray-700">
            {{ info.remark || "-" }}
          </p>
        </div>
      </div>

      <!-- 连接设备列表 -->
      <div class="mb-6">
        <h4 class="text-md font-medium mb-2">连接设备列表</h4>
        <el-table :data="connectedDevices" size="small" border>
          <el-table-column prop="deviceId" label="设备ID" width="120" />
          <el-table-column prop="deviceType" label="设备类型" width="100">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.deviceType === '电表' ? 'warning' : 'primary'"
              >
                {{ row.deviceType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="deviceNo" label="设备编号" />
          <el-table-column
            prop="lastCommunication"
            label="最后通信"
            width="120"
          />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.status === '在线' ? 'success' : 'danger'"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="footer p-4 border-t text-right">
      <el-button @click="handleClose"> 返回 </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { reactive, ref, watch } from "vue";
import { getCollectorDetail } from "@/api/collector";
import { getMeterList, getMetersByCollector } from "@/api/meters";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(["close"]);

const loading = ref(false);

const formatDuration = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return "";
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return "";

  const totalHours = end.diff(start, "hour");
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `${days}天 ${hours}小时`;
  return `${hours}小时`;
};

// 采集器信息
const info = reactive({
  id: undefined,
  collectorCode: "",
  status: "",
  meterCount: 0,
  lastStatusChangeTime: "",
  lastStatusChange: "",
  totalOnlineTime: "",
  updateTime: "",
  firmwareVersion: "",
  communicationService: "",
  remark: ""
});

const connectedDevices = ref([]);

const formatCollectorStatus = status => {
  if (status === "NORMAL" || status === 1) return "已连接";
  if (status === "FAULT" || status === "OFFLINE" || status === 0)
    return "未连接";
  return status || "未知";
};

const formatMeterStatus = status => {
  if (status === "NORMAL" || status === "ONLINE" || status === 0) return "在线";
  if (status === "1" || status === 1) return "未在线";
  if (status === "FAULT" || status === "ERROR") return "故障";
  if (status === "OFFLINE") return "离线";
  return status || "未知";
};

const loadCollectorDetail = async collectorId => {
  if (!collectorId) return;
  loading.value = true;
  try {
    const [collectorRes, metersRes, meterListRes] = await Promise.allSettled([
      getCollectorDetail(collectorId),
      getMetersByCollector(collectorId),
      getMeterList({
        collectorId,
        page: 1,
        size: 1000
      })
    ]);

    const collectorData =
      collectorRes.status === "fulfilled"
        ? collectorRes.value?.data || collectorRes.value
        : {};

    Object.assign(info, {
      id: collectorId,
      collectorCode:
        collectorData?.collectorNo ||
        collectorData?.code ||
        props.data.code ||
        "",
      status: formatCollectorStatus(collectorData?.status ?? props.data.status),
      meterCount: Array.isArray(connectedDevices.value)
        ? connectedDevices.value.length
        : 0,
      lastStatusChangeTime:
        collectorData?.lastStatusChangeTime ||
        collectorData?.lastCommunicationTime ||
        collectorData?.updatedAt ||
        props.data.lastCommunicationTime ||
        "",
      lastStatusChange:
        collectorData?.lastStatusChange ||
        (formatCollectorStatus(collectorData?.status ?? props.data.status) ===
        "已连接"
          ? "在线"
          : "离线"),
      totalOnlineTime: collectorData?.totalOnlineTime || "",
      updateTime:
        collectorData?.updateTime ||
        collectorData?.lastCommunicationTime ||
        collectorData?.updatedAt ||
        "",
      firmwareVersion: collectorData?.firmwareVersion || "",
      communicationService: collectorData?.communicationService || "",
      remark: collectorData?.remark || props.data.remark || ""
    });

    const metersData =
      metersRes.status === "fulfilled" ? metersRes.value?.data || [] : [];
    const meterListData =
      meterListRes.status === "fulfilled"
        ? meterListRes.value?.data?.content || meterListRes.value?.content || []
        : [];
    const connectedSource =
      Array.isArray(meterListData) && meterListData.length > 0
        ? meterListData
        : Array.isArray(metersData)
          ? metersData
          : [];
    connectedDevices.value = connectedSource.map(item => ({
      deviceId: item.id,
      deviceType: "电表",
      deviceNo: item.meterNo,
      lastCommunication:
        item.lastReadingTime || item.updatedAt || item.createdAt || "-",
      status: formatMeterStatus(item.laststatus ?? item.status)
    }));

    info.meterCount = Array.isArray(meterListData)
      ? meterListData.length
      : connectedDevices.value.length;
    info.totalOnlineTime = formatDuration(
      props.data.createTime ||
        collectorData?.createdAt ||
        collectorData?.createTime,
      props.data.lastCollectTime ||
        collectorData?.lastCommunicationTime ||
        collectorData?.lastStatusChangeTime ||
        collectorData?.updatedAt
    );
  } catch (error) {
    console.error("加载采集器详情失败:", error);
  } finally {
    loading.value = false;
  }
};

// 当props.data变化时更新信息
watch(
  () => props.data,
  async newData => {
    if (newData) {
      Object.assign(info, {
        id: newData.id,
        collectorCode: newData.code || "",
        status: formatCollectorStatus(newData.status),
        meterCount: 0,
        lastStatusChangeTime:
          newData.lastStatusChangeTime || newData.lastCommunicationTime || "",
        lastStatusChange: newData.lastStatusChange || "",
        totalOnlineTime: newData.totalOnlineTime || "",
        updateTime: newData.updateTime || newData.lastCommunicationTime || "",
        firmwareVersion: newData.firmwareVersion || "",
        communicationService: newData.communicationService || "",
        remark: newData.remark || ""
      });
      connectedDevices.value = [];
      await loadCollectorDetail(newData.id);
    }
  },
  { immediate: true }
);

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
.collector-basic-business {
  display: flex;
  flex-direction: column;
  width: 800px;
  max-height: 700px;
}

.header {
  flex-shrink: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
}

.footer {
  flex-shrink: 0;
}

.info-item {
  padding: 8px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.signal-bar {
  border-radius: 1px;
}

.remark-box {
  min-height: 60px;
}
</style>
