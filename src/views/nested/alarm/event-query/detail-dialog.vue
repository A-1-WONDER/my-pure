<template>
  <div v-loading="loading">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="报警ID">
        {{ detail.id ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="规则ID">
        {{ detail.ruleId ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="报警类型">
        <el-tag :type="alarmTypeTagType" effect="plain">
          {{ alarmTypeLabel }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="报警级别">
        <el-tag :type="alarmLevelTagType" effect="plain">
          {{ alarmLevelText }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="报警状态">
        <el-tag :type="alarmStatusTagType" effect="plain">
          {{ alarmStatusText }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="报警值">
        {{ formatValue(detail.alarmValue) }}
      </el-descriptions-item>
      <el-descriptions-item label="报警时间">
        {{ formatDate(detail.alarmTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="处理时间">
        {{ formatDate(detail.handledTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="表号">
        {{ detail.meterNo ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="采集器">
        {{ detail.collectorId ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="设备ID">
        {{ detail.deviceId ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="电表主键">
        {{ detail.meterId ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="处理人" :span="2">
        {{ detail.handledBy ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="处理备注" :span="2">
        {{ detail.handlingRemark ?? "-" }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";
import { message } from "@/utils/message";
import { getAlarmEventQueryDetail } from "@/api/alarm-event-query";
import { getAlarmTypeLabel, getAlarmTypeTagType } from "../constants";

const props = defineProps<{
  data?: Record<string, any>;
}>();

const loading = ref(false);
const detail = reactive<Record<string, any>>({
  ...(props.data ?? {})
});

const alarmTypeLabel = computed(() =>
  detail.alarmType ? getAlarmTypeLabel(String(detail.alarmType)) : "-"
);

const alarmTypeTagType = computed(() =>
  detail.alarmType ? getAlarmTypeTagType(String(detail.alarmType)) : "info"
);

const alarmLevelText = computed(() => {
  const map: Record<string, string> = {
    normal: "一般",
    important: "重要",
    urgent: "紧急"
  };
  const raw = detail.alarmLevel;
  if (raw === null || raw === undefined || raw === "") return "-";
  return map[String(raw)] ?? String(raw);
});

const alarmLevelTagType = computed(() => {
  const map: Record<string, string> = {
    normal: "info",
    important: "warning",
    urgent: "danger"
  };
  return map[String(detail.alarmLevel)] ?? "info";
});

const alarmStatusText = computed(() => {
  const map: Record<string, string> = {
    "0": "未处理",
    "1": "已处理",
    "2": "已关闭",
    pending: "未处理",
    processing: "处理中",
    resolved: "已处理",
    closed: "已关闭"
  };
  const raw = detail.alarmStatus;
  if (raw === null || raw === undefined || raw === "") return "-";
  return map[String(raw)] ?? String(raw);
});

const alarmStatusTagType = computed(() => {
  const map: Record<string, string> = {
    "0": "warning",
    "1": "success",
    "2": "info",
    pending: "warning",
    processing: "primary",
    resolved: "success",
    closed: "info"
  };
  return map[String(detail.alarmStatus)] ?? "info";
});

function formatDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const d = dayjs(value as any);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

async function loadDetail() {
  const id = Number(props.data?.id);
  if (!Number.isFinite(id)) return;
  loading.value = true;
  try {
    const res = (await getAlarmEventQueryDetail({ id })) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = res?.data;
    if (ok && data && typeof data === "object") {
      Object.assign(detail, data);
    }
  } catch (error) {
    console.error("获取报警事件详情失败:", error);
    message("详情加载失败，已展示列表快照数据", { type: "warning" });
  } finally {
    loading.value = false;
  }
}

loadDetail();
</script>
