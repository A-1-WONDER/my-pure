<script setup lang="ts">
import { ref } from "vue";

defineOptions({
  name: "AlarmSystemSetting"
});

/** 电表异常报警总开关（仅前端展示，不保存） */
const electricAlarmEnabled = ref(true);
/** 子项：断电报警 */
const powerOffAlarm = ref(true);
/** 子项：通讯设备长时间离线报警 */
const longOfflineAlarm = ref(true);
</script>

<template>
  <div class="main">
    <div class="header mb-6">
      <h2 class="text-xl font-bold dark:text-white">系统报警设置</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        本页仅配置<strong class="text-gray-700 dark:text-gray-200"
          >电表异常报警</strong
        >相关开关； 报警产生后会在框架右上角<strong
          class="text-gray-700 dark:text-gray-200"
          >消息铃铛</strong
        >的「通知」页签中展示<strong class="text-gray-700 dark:text-gray-200"
          >站内提醒</strong
        >（由报警事件接口轮询同步）。 本页<strong>不含 APP 推送</strong
        >、短信等其它渠道。
      </p>
    </div>

    <el-alert
      class="mb-6 max-w-[720px]"
      type="info"
      :closable="false"
      show-icon
      title="说明"
      description="以下开关与选项仅用于界面展示，不会提交到服务器保存，刷新页面后可能恢复为默认状态。"
    />

    <div
      class="config-section bg-bg_color p-6 rounded-lg shadow-sm border border-[var(--el-border-color)] max-w-[720px]"
    >
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 class="text-lg font-semibold dark:text-white">电表异常报警</h3>
        <el-switch v-model="electricAlarmEnabled" />
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        开启后，下列子项在业务侧生效时才会触发报警逻辑（本页<strong>不</strong>提供
        APP 推送，也不会在此保存到后端）。
      </p>

      <div class="sub-options space-y-4 pl-1">
        <el-checkbox v-model="powerOffAlarm" :disabled="!electricAlarmEnabled">
          断电报警
        </el-checkbox>
        <el-checkbox
          v-model="longOfflineAlarm"
          :disabled="!electricAlarmEnabled"
        >
          通讯设备长时间离线报警
        </el-checkbox>
      </div>
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
