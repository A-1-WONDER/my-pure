<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  getAlarmSystemSetting,
  saveAlarmSystemSetting,
  type AlarmItemToggle,
  type AlarmSystemSetting
} from "@/api/alarm";

defineOptions({
  name: "AlarmSystemSetting"
});

type AlarmRow = {
  key: string;
  title: string;
  desc: string;
  hasTemp?: boolean;
};

const METER_ROWS: AlarmRow[] = [
  {
    key: "phase_a_power_reverse",
    title: "A相有功功率反向",
    desc: "指示电流方向是否正常，进出线接反时触发报警。"
  },
  {
    key: "phase_b_power_reverse",
    title: "B相有功功率反向",
    desc: "指示电流方向是否正常，进出线接反时触发报警。"
  },
  {
    key: "phase_c_power_reverse",
    title: "C相有功功率反向",
    desc: "指示电流方向是否正常，进出线接反时触发报警。"
  },
  {
    key: "power_off",
    title: "断电报警",
    desc: "指示线路通断状态，表端拉闸状态时触发报警。拉闸原因通常包含余额不足、手动拉闸、超负荷、开表盖。"
  },
  {
    key: "cover_open",
    title: "开盖报警",
    desc: "支持开盖检测的设备表盖打开时触发报警，可防止非法打开电表盖的偷电行为。"
  },
  {
    key: "phase_a_overload",
    title: "A相过载",
    desc: "设备运行期间长时间超过设定的负荷限制，通常会引起电表跳闸断电。（长时间超过额定最大功率易导致设备过热损坏并引起安全问题）"
  },
  {
    key: "phase_b_overload",
    title: "B相过载",
    desc: "设备运行期间B相线路长时间超过设定的负荷限制，通常会引起电表跳闸断电。（长时间超过额定最大功率易导致设备过热损坏并引起安全问题）"
  },
  {
    key: "phase_c_overload",
    title: "C相过载",
    desc: "设备运行期间C相线路长时间超过设定的负荷限制，通常会引起电表跳闸断电。（长时间超过额定最大功率易导致设备过热损坏并引起安全问题）"
  },
  {
    key: "metering_fault",
    title: "计量故障",
    desc: "设备因电网剧烈波动或内部元器件损坏原因导致无法正常计量。"
  },
  {
    key: "meter_comm_fail",
    title: "电表连续通讯异常",
    desc: "后台与设备连续通讯失败超过10次以上。"
  },
  {
    key: "meter_signal_weak",
    title: "设备信号弱",
    desc: "设备信号完全无法保障通讯时报警。"
  },
  {
    key: "continuous_low_usage",
    title: "连续用电量过低",
    desc: "系统设置一定时间段内用电量低于阈值触发报警，可用于检查用户异常或窃电行为。需在「报警管理 > 报警用量设置」里配置。"
  },
  {
    key: "continuous_high_usage",
    title: "连续用电量过高",
    desc: "系统设置一定时间段内用电量高于阈值触发报警，可用于检查用户异常或窃电行为。需在「报警管理 > 报警用量设置」里配置。"
  },
  {
    key: "temp_high",
    title: "温度过高",
    desc: "设备温度超过设定阈值时触发报警。",
    hasTemp: true
  },
  {
    key: "power_factor_low",
    title: "总功率因数超下限",
    desc: "指示三相电表总功率因数过低，用电质量差。（需特定款表支持）"
  },
  {
    key: "current_imbalance",
    title: "电流不平衡",
    desc: "指示三相电表三相负荷不平衡，增加线路损耗。（需特定款表支持）"
  },
  {
    key: "voltage_imbalance",
    title: "电压不平衡",
    desc: "指示三相电表三相负荷不平衡，增加线路损耗。（需特定款表支持）"
  },
  {
    key: "current_reverse_phase",
    title: "电流逆相序",
    desc: "指示三相电表交流电电流的相位与电压相反。（需特定款表支持）"
  },
  {
    key: "voltage_reverse_phase",
    title: "电压逆相序",
    desc: "指示三相电表三相电压的相序与正常顺序相反。（需特定款表支持）"
  }
];

const COLLECTOR_ROWS: AlarmRow[] = [
  {
    key: "collector_signal_weak",
    title: "设备信号弱",
    desc: "设备信号完全无法保障通讯时报警。"
  },
  {
    key: "collector_long_offline",
    title: "通讯设备长时间离线",
    desc: "设备长时间离线，后台无法正常采集数据。"
  }
];

const TEMP_OPTIONS = [60, 70, 80, 90, 100, 110, 120];

const emailRule = /^(?:[a-zA-Z0-9_+\-.]+)@(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$/;

const loading = ref(false);
const saving = ref(false);
/** 最近一次从服务端确认成功的保存/加载时刻 */
const lastSyncedAt = ref("");
const lastSyncedHint = computed(() =>
  lastSyncedAt.value ? `已与服务器同步 · ${lastSyncedAt.value}` : ""
);

function markSynced() {
  lastSyncedAt.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
}

function defaultToggle(): AlarmItemToggle {
  return { allowAlarm: true, emailNotify: false };
}

function buildDefaultMeterMap(): Record<string, AlarmItemToggle> {
  const map: Record<string, AlarmItemToggle> = {};
  for (const row of METER_ROWS) {
    map[row.key] = defaultToggle();
  }
  return map;
}

function buildDefaultCollectorMap(): Record<string, AlarmItemToggle> {
  const map: Record<string, AlarmItemToggle> = {};
  for (const row of COLLECTOR_ROWS) {
    map[row.key] = defaultToggle();
  }
  return map;
}

const form = reactive({
  email1: "",
  email2: "",
  tempHighThreshold: 80,
  meterAlarms: buildDefaultMeterMap(),
  collectorAlarms: buildDefaultCollectorMap()
});

function ensureMaps() {
  for (const row of METER_ROWS) {
    if (!form.meterAlarms[row.key]) {
      form.meterAlarms[row.key] = defaultToggle();
    }
  }
  for (const row of COLLECTOR_ROWS) {
    if (!form.collectorAlarms[row.key]) {
      form.collectorAlarms[row.key] = defaultToggle();
    }
  }
}

function onAllowChange(item: AlarmItemToggle, allowed: boolean) {
  item.allowAlarm = allowed;
  if (!allowed) {
    item.emailNotify = false;
  }
}

function applySetting(data?: Partial<AlarmSystemSetting>) {
  form.email1 = data?.email1 ?? "";
  form.email2 = data?.email2 ?? "";
  form.tempHighThreshold = data?.tempHighThreshold || 80;
  form.meterAlarms = buildDefaultMeterMap();
  form.collectorAlarms = buildDefaultCollectorMap();

  if (data?.meterAlarms) {
    for (const [k, v] of Object.entries(data.meterAlarms)) {
      if (!form.meterAlarms[k]) continue;
      form.meterAlarms[k] = {
        allowAlarm: v?.allowAlarm !== false,
        emailNotify: !!v?.emailNotify
      };
    }
  } else if (
    data?.powerOffAlarm !== undefined ||
    data?.electricAlarmEnabled !== undefined
  ) {
    const enabled = data.electricAlarmEnabled !== false;
    for (const row of METER_ROWS) {
      form.meterAlarms[row.key] = {
        allowAlarm:
          enabled && (row.key !== "power_off" || data.powerOffAlarm !== false),
        emailNotify: false
      };
    }
  }

  if (data?.collectorAlarms) {
    for (const [k, v] of Object.entries(data.collectorAlarms)) {
      if (!form.collectorAlarms[k]) continue;
      form.collectorAlarms[k] = {
        allowAlarm: v?.allowAlarm !== false,
        emailNotify: !!v?.emailNotify
      };
    }
  } else if (data?.longOfflineAlarm !== undefined) {
    const on = data.longOfflineAlarm !== false;
    for (const row of COLLECTOR_ROWS) {
      form.collectorAlarms[row.key] = { allowAlarm: on, emailNotify: false };
    }
  }

  ensureMaps();
}

const email1Error = computed(() => {
  const v = form.email1.trim();
  if (!v) return "";
  return emailRule.test(v) ? "" : "邮箱1格式不正确";
});

const email2Error = computed(() => {
  const v = form.email2.trim();
  if (!v) return "";
  return emailRule.test(v) ? "" : "邮箱2格式不正确";
});

async function loadSetting() {
  loading.value = true;
  try {
    const res = (await getAlarmSystemSetting()) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as AlarmSystemSetting;
    if (ok) {
      applySetting(data);
      markSynced();
    } else {
      ensureMaps();
    }
  } catch {
    ensureMaps();
    message("加载系统报警设置失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function buildPayload(): AlarmSystemSetting {
  return {
    email1: form.email1.trim(),
    email2: form.email2.trim(),
    tempHighThreshold: form.tempHighThreshold,
    meterAlarms: { ...form.meterAlarms },
    collectorAlarms: { ...form.collectorAlarms }
  };
}

async function onSave() {
  if (email1Error.value || email2Error.value) {
    message("请先修正邮箱格式", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    const res = (await saveAlarmSystemSetting(payload)) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    if (ok) {
      applySetting((res?.data ?? payload) as AlarmSystemSetting);
      markSynced();
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

function onRechargeMail() {
  message("请联系运维或管理员为报警邮箱账户充值", { type: "info" });
}

onMounted(() => {
  ensureMaps();
  loadSetting();
});
</script>

<template>
  <div v-loading="loading" class="main alarm-sys">
    <div class="alarm-sys__header">
      <div>
        <h2 class="alarm-sys__title">系统报警设置</h2>
        <p class="alarm-sys__subtitle">
          配置管理员接收邮箱，以及电能表、采集器各类报警的启用与邮件通知。
        </p>
        <p v-if="lastSyncedHint" class="alarm-sys__sync">
          {{ lastSyncedHint }}
        </p>
      </div>
      <el-button type="primary" :loading="saving" @click="onSave">
        保存设置
      </el-button>
    </div>

    <!-- 邮件通知 -->
    <section class="alarm-card">
      <h3 class="alarm-card__title">邮件通知</h3>
      <ul class="alarm-card__tips">
        <li>该页面设置的报警触发邮件仅发送给管理员，每次触发发送一次。</li>
        <li>
          请确保邮件余额充足，发送失败不扣费。
          <el-button
            class="alarm-card__link-btn"
            link
            type="primary"
            @click="onRechargeMail"
          >
            充值邮件
          </el-button>
        </li>
        <li>最多支持设置 2 个邮箱接收报警通知信息。</li>
      </ul>
      <div class="alarm-card__emails">
        <el-form-item label="邮箱1" :error="email1Error" label-width="64px">
          <el-input
            v-model="form.email1"
            clearable
            placeholder="请输入邮箱"
            maxlength="80"
            class="alarm-card__email-input"
          />
        </el-form-item>
        <el-form-item label="邮箱2" :error="email2Error" label-width="64px">
          <el-input
            v-model="form.email2"
            clearable
            placeholder="请输入邮箱"
            maxlength="80"
            class="alarm-card__email-input"
          />
        </el-form-item>
      </div>
    </section>

    <!-- 电能表报警设置 -->
    <section class="alarm-card">
      <h3 class="alarm-card__title">电能表报警设置</h3>
      <div class="alarm-list">
        <div v-for="row in METER_ROWS" :key="row.key" class="alarm-row">
          <div class="alarm-row__body">
            <div class="alarm-row__title">{{ row.title }}</div>
            <div class="alarm-row__desc">{{ row.desc }}</div>
            <div v-if="row.hasTemp" class="alarm-row__extra">
              <span class="alarm-row__extra-label">温度阈值</span>
              <el-select
                v-model="form.tempHighThreshold"
                class="alarm-row__temp"
                :disabled="!form.meterAlarms[row.key]?.allowAlarm"
              >
                <el-option
                  v-for="t in TEMP_OPTIONS"
                  :key="t"
                  :label="`${t}℃`"
                  :value="t"
                />
              </el-select>
            </div>
          </div>
          <div class="alarm-row__actions">
            <div class="alarm-row__switch">
              <span>允许报警</span>
              <el-switch
                :model-value="form.meterAlarms[row.key].allowAlarm"
                @update:model-value="
                  (v: boolean) => onAllowChange(form.meterAlarms[row.key], v)
                "
              />
            </div>
            <div class="alarm-row__switch">
              <span>邮件通知</span>
              <el-switch
                v-model="form.meterAlarms[row.key].emailNotify"
                :disabled="!form.meterAlarms[row.key]?.allowAlarm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 采集器报警设置 -->
    <section class="alarm-card">
      <h3 class="alarm-card__title">采集器报警设置</h3>
      <div class="alarm-list">
        <div v-for="row in COLLECTOR_ROWS" :key="row.key" class="alarm-row">
          <div class="alarm-row__body">
            <div class="alarm-row__title">{{ row.title }}</div>
            <div class="alarm-row__desc">{{ row.desc }}</div>
          </div>
          <div class="alarm-row__actions">
            <div class="alarm-row__switch">
              <span>允许报警</span>
              <el-switch
                :model-value="form.collectorAlarms[row.key].allowAlarm"
                @update:model-value="
                  (v: boolean) =>
                    onAllowChange(form.collectorAlarms[row.key], v)
                "
              />
            </div>
            <div class="alarm-row__switch">
              <span>邮件通知</span>
              <el-switch
                v-model="form.collectorAlarms[row.key].emailNotify"
                :disabled="!form.collectorAlarms[row.key]?.allowAlarm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="alarm-sys__footer">
      <span v-if="lastSyncedHint" class="alarm-sys__sync">{{
        lastSyncedHint
      }}</span>
      <el-button type="primary" :loading="saving" @click="onSave">
        保存设置
      </el-button>
    </div>
  </div>
</template>

<style lang="scss">
/* class 挂在页面根上（与布局注入的 main-content 同一节点），勿用 :has 后代选择 */
.main-content.alarm-sys {
  margin: 24px 24px 0 !important;
}
</style>

<style lang="scss" scoped>
.alarm-sys {
  /* 勿设 width:100%：根节点已有 main-content 外边距，100% 会撑破右侧留白 */
  box-sizing: border-box;
  min-height: 100%;
  padding-bottom: 8px;
}

.alarm-sys__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.alarm-sys__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.alarm-sys__subtitle {
  max-width: min(720px, 100%);
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.alarm-sys__sync {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-color-success);
}

.alarm-card {
  box-sizing: border-box;
  width: 100%;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
}

.alarm-card__title {
  margin: 0 0 14px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.alarm-card__tips {
  padding-left: 18px;
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--el-text-color-regular);

  li + li {
    margin-top: 4px;
  }
}

.alarm-card__link-btn {
  margin-left: 4px;
  vertical-align: baseline;
}

.alarm-card__emails {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 4px 24px;
  width: 100%;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
  }
}

.alarm-card__email-input {
  width: 100%;
}

.alarm-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.alarm-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 16px 0;
  border-top: 1px solid var(--el-border-color-extra-light);

  &:first-child {
    padding-top: 4px;
    border-top: none;
  }
}

.alarm-row__body {
  flex: 1 1 0;
  min-width: min(100%, 240px);
}

.alarm-row__title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.alarm-row__desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-secondary);
}

.alarm-row__extra {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.alarm-row__extra-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.alarm-row__temp {
  width: min(140px, 100%);
}

.alarm-row__actions {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding-top: 2px;
}

.alarm-row__switch {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.alarm-sys__footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (width <= 900px) {
  .alarm-row__actions {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (width <= 560px) {
  .alarm-row__actions {
    gap: 16px;
  }
}
</style>
