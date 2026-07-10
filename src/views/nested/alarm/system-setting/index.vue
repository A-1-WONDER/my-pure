<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { message } from "@/utils/message";
import {
  getAlarmSystemSetting,
  saveAlarmSystemSetting,
  type AlarmSystemSetting
} from "@/api/alarm";

defineOptions({
  name: "AlarmSystemSetting"
});

const loading = ref(false);
const saving = ref(false);
const electricAlarmEnabled = ref(true);
const powerOffAlarm = ref(true);
const longOfflineAlarm = ref(true);

function applySetting(data?: Partial<AlarmSystemSetting>) {
  electricAlarmEnabled.value = data?.electricAlarmEnabled !== false;
  powerOffAlarm.value = data?.powerOffAlarm !== false;
  longOfflineAlarm.value = data?.longOfflineAlarm !== false;
}

async function loadSetting() {
  loading.value = true;
  try {
    const res = (await getAlarmSystemSetting()) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as AlarmSystemSetting;
    if (ok) {
      applySetting(data);
    }
  } catch {
    message("加载系统报警设置失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  saving.value = true;
  try {
    const payload: AlarmSystemSetting = {
      electricAlarmEnabled: electricAlarmEnabled.value,
      powerOffAlarm: electricAlarmEnabled.value ? powerOffAlarm.value : false,
      longOfflineAlarm: electricAlarmEnabled.value
        ? longOfflineAlarm.value
        : false
    };
    const res = (await saveAlarmSystemSetting(payload)) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    if (ok) {
      applySetting((res?.data ?? payload) as AlarmSystemSetting);
      message("系统报警设置已保存", { type: "success" });
    } else {
      message(String(res?.msg ?? res?.message ?? "保存失败"), {
        type: "warning"
      });
    }
  } catch {
    message("保存失败", { type: "error" });
  } finally {
    saving.value = false;
  }
}

watch(electricAlarmEnabled, enabled => {
  if (!enabled) {
    powerOffAlarm.value = false;
    longOfflineAlarm.value = false;
  }
});

onMounted(() => {
  loadSetting();
});
</script>

<template>
  <div v-loading="loading" class="main">
    <div class="header mb-6">
      <h2 class="text-xl font-bold dark:text-white">系统报警设置</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        配置<strong class="text-gray-700 dark:text-gray-200"
          >电表异常报警</strong
        >
        的全局开关。关闭后对应类型的规则在评估时将不会触发新报警事件。
        报警产生后仍会在右上角消息铃铛的「通知」页签展示站内提醒。
      </p>
    </div>

    <div
      class="config-section bg-bg_color p-6 rounded-lg shadow-sm border border-[var(--el-border-color)] max-w-[720px]"
    >
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 class="text-lg font-semibold dark:text-white">电表异常报警</h3>
        <el-switch v-model="electricAlarmEnabled" />
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        关闭总开关后，所有电表类报警规则将暂停触发（已产生的历史事件不受影响）。
      </p>

      <div class="sub-options space-y-4 pl-1 mb-6">
        <el-checkbox v-model="powerOffAlarm" :disabled="!electricAlarmEnabled">
          断电报警（功率异常 / instant_power 类规则）
        </el-checkbox>
        <el-checkbox
          v-model="longOfflineAlarm"
          :disabled="!electricAlarmEnabled"
        >
          通讯设备长时间离线报警（离线 / 通信超时类规则）
        </el-checkbox>
      </div>

      <el-button type="primary" :loading="saving" @click="onSave">
        保存设置
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-checkbox) {
  align-items: flex-start;
  height: auto;
  white-space: normal;
}
</style>
