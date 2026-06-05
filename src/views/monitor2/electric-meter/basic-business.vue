<template>
  <div class="electric-meter-basic-business">
    <div class="header p-4 border-b">
      <h3 class="text-lg font-medium">电表基本业务信息</h3>
    </div>

    <div class="content p-4 overflow-y-auto" :style="{ maxHeight: '500px' }">
      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">电表编号</div>
          <div class="value font-medium">{{ info.meterNo || "-" }}</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">用户名称</div>
          <div class="value font-medium">{{ info.userName || "-" }}</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">安装地址</div>
          <div class="value font-medium">{{ info.address || "-" }}</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">当前读数</div>
          <div class="value font-medium">
            {{ info.currentReading || "-" }} kWh
          </div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">电压</div>
          <div class="value font-medium">{{ info.voltage || "-" }} V</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">电流</div>
          <div class="value font-medium">{{ info.current || "-" }} A</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">功率</div>
          <div class="value font-medium">{{ info.power || "-" }} kW</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">状态</div>
          <div class="value font-medium">
            <el-tag
              :type="
                info.status === 1
                  ? 'success'
                  : info.status === 2
                    ? 'warning'
                    : 'danger'
              "
            >
              {{
                info.status === 1 ? "正常" : info.status === 2 ? "告警" : "停用"
              }}
            </el-tag>
          </div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">安装时间</div>
          <div class="value font-medium">{{ info.installTime || "-" }}</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">最后抄表时间</div>
          <div class="value font-medium">{{ info.lastReadTime || "-" }}</div>
        </div>
        <div class="p-3 border rounded">
          <div class="label text-gray-500 text-sm mb-1">日用电量</div>
          <div class="value font-medium">{{ info.dayPower || "-" }} kWh</div>
        </div>
      </div>

      <div class="mt-4 p-3 border rounded">
        <div class="label text-gray-500 text-sm mb-2">小时用电量</div>
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="(value, index) in hourPowersPreview"
            :key="index"
            class="rounded border bg-white p-2 text-center"
          >
            <div class="text-xs text-gray-500">{{ index }}:00</div>
            <div class="font-medium">{{ value }} kWh</div>
          </div>
        </div>
      </div>

      <div class="mt-4 p-3 border rounded">
        <div class="label text-gray-500 text-sm mb-1">备注</div>
        <div class="value">{{ info.remark || "-" }}</div>
      </div>
    </div>

    <div class="footer p-4 border-t flex justify-end space-x-2">
      <el-button @click="onRefresh">刷新</el-button>
      <el-button @click="onOpen1">打开1</el-button>
      <el-button @click="onClose">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { computed, reactive, watch } from "vue";
import { getDeviceDayPower, getDeviceHourPower } from "@/api/business-stats";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(["refresh", "open1", "close"]);

const info = reactive({
  id: undefined as number | undefined,
  meterNo: "",
  userName: "",
  address: "",
  currentReading: "",
  voltage: "",
  current: "",
  power: "",
  dayPower: "",
  hourPowers: [] as number[],
  status: 1,
  installTime: "",
  lastReadTime: "",
  remark: ""
});

const resetInfo = () => {
  info.id = undefined;
  info.meterNo = "";
  info.userName = "";
  info.address = "";
  info.currentReading = "";
  info.voltage = "";
  info.current = "";
  info.power = "";
  info.dayPower = "";
  info.hourPowers = [];
  info.status = 1;
  info.installTime = "";
  info.lastReadTime = "";
  info.remark = "";
};

const hourPowersPreview = computed(() =>
  Array.isArray(info.hourPowers) && info.hourPowers.length > 0
    ? info.hourPowers.slice(0, 24)
    : Array(24).fill(0)
);

const extractPayload = (response: Record<string, any>) =>
  response?.data?.data ?? response?.data ?? response;

const loadDayPower = async () => {
  if (!info.id) return;

  try {
    const date = dayjs().format("YYYY-MM-DD");
    const response = await getDeviceDayPower(Number(info.id), date);
    const payload = extractPayload(response as Record<string, any>);
    const value = payload?.dayPower ?? payload?.power;
    info.dayPower = value !== null && value !== undefined ? String(value) : "";
  } catch (error) {
    console.error("获取电表日用电量失败:", error);
    info.dayPower = "";
  }
};

const loadHourPower = async () => {
  if (!info.id) return;

  try {
    const date = dayjs().format("YYYY-MM-DD");
    const response = await getDeviceHourPower(Number(info.id), date);
    const payload = extractPayload(response as Record<string, any>);
    const hours = Array.isArray(payload?.hours) ? payload.hours : [];
    const hourMap = new Map<number, number>();

    hours.forEach(item => {
      const hourValue =
        item?.hour !== null && item?.hour !== undefined
          ? Number(item.hour)
          : item?.hourKey
            ? Number(String(item.hourKey).slice(-2))
            : undefined;
      const powerValue = item?.hourPower ?? item?.power ?? 0;

      if (hourValue !== undefined && !Number.isNaN(hourValue)) {
        hourMap.set(hourValue, Number(powerValue) || 0);
      }
    });

    info.hourPowers = Array.from({ length: 24 }, (_, hour) => {
      return hourMap.get(hour) ?? 0;
    });
  } catch (error) {
    console.error("获取电表小时用电量失败:", error);
    info.hourPowers = Array(24).fill(0);
  }
};

const syncInfo = (rawData?: Record<string, any>) => {
  resetInfo();
  if (!rawData || typeof rawData !== "object") return;

  info.id =
    rawData.id !== null && rawData.id !== undefined
      ? Number(rawData.id)
      : undefined;
  info.meterNo = rawData.meterNo ?? rawData.tag ?? "";
  info.userName = rawData.userName ?? rawData.username ?? "";
  info.address = rawData.address ?? rawData.installAddress ?? "";
  info.currentReading = String(
    rawData.currentReading ?? rawData.reading ?? rawData.initialReading ?? ""
  );
  info.voltage = String(rawData.voltage ?? "");
  info.current = String(rawData.current ?? "");
  info.power = String(rawData.power ?? "");
  info.status = Number(rawData.status ?? rawData.laststatus ?? 1) || 1;
  info.installTime = rawData.installTime ?? rawData.createTime ?? "";
  info.lastReadTime = rawData.lastReadTime ?? rawData.updateTime ?? "";
  info.remark = rawData.remark ?? "";
  loadDayPower();
  loadHourPower();
};

watch(
  () => props.data,
  newData => {
    syncInfo(newData as Record<string, any>);
  },
  { deep: true, immediate: true }
);

const onRefresh = () => emit("refresh");
const onOpen1 = () => emit("open1");
const onClose = () => emit("close");
</script>

<style scoped>
.electric-meter-basic-business {
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
}
</style>
