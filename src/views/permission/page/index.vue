<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getConfig } from "@/config";
import { message } from "@/utils/message";
import {
  getExternalApiAuthSettings,
  saveExternalApiAuthSettings,
  type ExternalApiAuthSettings
} from "@/api/external-auth";

defineOptions({
  name: "PermissionPage"
});

const SECRET_MASK = "******";

const meterTypeOptions = [
  { label: "单相", value: "single-phase" },
  { label: "三相", value: "three-phase" },
  { label: "预付费", value: "prepaid" },
  { label: "多费率", value: "multiRate" }
];

const projectName = ref("能耗管理平台");
const statusText = ref("正常");
const loading = ref(false);
const saving = ref(false);

const form = ref<ExternalApiAuthSettings>({
  authCode: "",
  requestCount: 0,
  apiMode: "dev",
  syncMode: "on",
  randomString: "",
  defaultMeterType: "",
  apiDocUrl: ""
});

const isHealthy = computed(() => statusText.value === "正常");
const syncEnabled = computed(() => form.value.syncMode === "on");
const apiModeLabel = computed(() =>
  form.value.apiMode === "prod" ? "生产模式" : "开发模式"
);

const buildApiDocUrl = () => {
  const target = import.meta.env.VITE_API_TARGET || "http://localhost:8004";
  return `${String(target).replace(/\/$/, "")}/doc.html`;
};

function applySettings(data?: Partial<ExternalApiAuthSettings>) {
  form.value = {
    authCode: data?.authCode || "",
    requestCount: Number(data?.requestCount) || 0,
    apiMode: data?.apiMode === "prod" ? "prod" : "dev",
    syncMode: data?.syncMode === "off" ? "off" : "on",
    randomString: data?.randomString || "",
    defaultMeterType: data?.defaultMeterType || "",
    apiDocUrl: data?.apiDocUrl || buildApiDocUrl()
  };
  if (data?.statusText) {
    statusText.value = data.statusText;
  } else {
    statusText.value = form.value.syncMode === "on" ? "正常" : "已关闭";
  }
}

const loadSettings = async () => {
  loading.value = true;
  try {
    const res = (await getExternalApiAuthSettings()) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as ExternalApiAuthSettings;
    if (ok) {
      applySettings(data);
      return;
    }
    message(String(res?.msg ?? res?.message ?? "加载接口授权配置失败"), {
      type: "warning"
    });
  } catch {
    message("加载接口授权配置失败", { type: "error" });
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const payload: ExternalApiAuthSettings = { ...form.value };
    if (payload.randomString === SECRET_MASK) {
      payload.randomString = SECRET_MASK;
    }
    const res = (await saveExternalApiAuthSettings(payload)) as Record<
      string,
      any
    >;
    const ok = res?.code === 0 || res?.success === true;
    if (ok) {
      applySettings((res?.data ?? payload) as ExternalApiAuthSettings);
      message("接口授权配置已保存", { type: "success" });
    } else {
      message(String(res?.msg ?? res?.message ?? "保存失败"), {
        type: "warning"
      });
    }
  } catch {
    message("保存失败，请稍后重试", { type: "error" });
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadSettings();
  try {
    const config = await getConfig();
    if (config?.Title) {
      projectName.value = String(config.Title);
    }
  } catch {
    // keep default
  }
});
</script>

<template>
  <div v-loading="loading" class="api-auth-page">
    <el-card shadow="never" class="api-auth-card">
      <template #header>
        <div class="api-auth-header">
          <div class="api-auth-header__main">
            <h2 class="api-auth-title">接口授权</h2>
            <p class="api-auth-subtitle">
              管理第三方数据同步授权、接口运行模式与安全参数。保存后立即写入
              Redis 并覆盖运行时配置，无需重启后端。
            </p>
          </div>
          <div class="api-auth-header__tags">
            <el-tag
              :type="isHealthy ? 'success' : 'info'"
              effect="dark"
              size="large"
            >
              {{ statusText }}
            </el-tag>
            <el-tag
              :type="syncEnabled ? 'primary' : 'warning'"
              effect="plain"
              size="large"
            >
              {{ syncEnabled ? "同步已开启" : "同步已关闭" }}
            </el-tag>
            <el-tag effect="plain" size="large">{{ apiModeLabel }}</el-tag>
          </div>
        </div>
      </template>

      <div class="api-auth-body">
        <div class="api-auth-stats">
          <div class="api-auth-stat">
            <span class="api-auth-stat__label">平台名称</span>
            <span class="api-auth-stat__value">{{ projectName }}</span>
          </div>
          <div class="api-auth-stat">
            <span class="api-auth-stat__label">授权码</span>
            <span class="api-auth-stat__value api-auth-mono api-auth-code">
              {{ form.authCode || "—" }}
            </span>
          </div>
          <div class="api-auth-stat">
            <span class="api-auth-stat__label">累计请求次数</span>
            <span class="api-auth-stat__value api-auth-stat__number">
              {{ form.requestCount.toLocaleString() }}
            </span>
          </div>
        </div>

        <div class="api-auth-sections">
          <section class="api-auth-section">
            <div class="api-auth-section__title">运行配置</div>
            <el-descriptions :column="2" border class="api-auth-desc">
              <el-descriptions-item label="接口模式" :span="1">
                <el-radio-group v-model="form.apiMode">
                  <el-radio value="dev">开发模式</el-radio>
                  <el-radio value="prod">生产模式</el-radio>
                </el-radio-group>
                <p class="api-auth-hint">
                  生产模式将启用匿名同步签名校验与抄表回调验签。
                </p>
              </el-descriptions-item>
              <el-descriptions-item label="数据同步" :span="1">
                <el-radio-group v-model="form.syncMode">
                  <el-radio value="on">开启同步</el-radio>
                  <el-radio value="off">关闭同步</el-radio>
                </el-radio-group>
                <p class="api-auth-hint">
                  关闭后定时任务与手动同步将不再拉取第三方设备数据。
                </p>
              </el-descriptions-item>
              <el-descriptions-item label="默认电表型号" :span="2">
                <el-select
                  v-model="form.defaultMeterType"
                  placeholder="请选择默认型号"
                  clearable
                  class="api-auth-select"
                >
                  <el-option
                    v-for="item in meterTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="api-auth-section">
            <div class="api-auth-section__title">安全与凭证</div>
            <el-descriptions :column="2" border class="api-auth-desc">
              <el-descriptions-item label="授权码" :span="2">
                <span class="api-auth-code api-auth-mono">{{
                  form.authCode
                }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="随机字符串" :span="2">
                <span class="api-auth-mono">{{
                  form.randomString || "—"
                }}</span>
                <p class="api-auth-hint">
                  对应
                  anonymous-sync.secret，展示已脱敏；不修改时保存不会改变原值。
                </p>
              </el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="api-auth-section">
            <div class="api-auth-section__title">接口文档</div>
            <el-descriptions :column="1" border class="api-auth-desc">
              <el-descriptions-item label="在线文档">
                <el-link
                  :href="form.apiDocUrl"
                  type="primary"
                  target="_blank"
                  underline="never"
                  class="api-auth-link"
                >
                  {{ form.apiDocUrl }}
                </el-link>
              </el-descriptions-item>
            </el-descriptions>
          </section>
        </div>
      </div>

      <div class="api-auth-footer">
        <span class="api-auth-footer__tip">
          配置优先读取 Redis 缓存；重启后仍会合并 application-local.yml
          中的机密项。
        </span>
        <div class="api-auth-footer__actions">
          <el-button :loading="loading" @click="loadSettings"
            >重新加载</el-button
          >
          <el-button type="primary" :loading="saving" @click="handleSave">
            保存配置
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.api-auth-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 108px);
  min-height: 560px;
  padding: 12px;
}

.api-auth-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  :deep(.el-card__header) {
    flex-shrink: 0;
    padding: 20px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }
}

.api-auth-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
}

.api-auth-header__main {
  flex: 1;
  min-width: 0;
}

.api-auth-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.api-auth-subtitle {
  max-width: 720px;
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.api-auth-header__tags {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.api-auth-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  padding: 20px 24px;
  overflow: auto;
}

.api-auth-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.api-auth-stat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 96px;
  padding: 18px 20px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.api-auth-stat__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.api-auth-stat__value {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.api-auth-stat__number {
  font-size: 28px;
  line-height: 1.2;
}

.api-auth-sections {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 20px;
}

.api-auth-section__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.api-auth-desc {
  :deep(.el-descriptions__label) {
    width: 140px;
    font-weight: 500;
  }

  :deep(.el-descriptions__content) {
    word-break: break-all;
  }

  :deep(.el-descriptions__cell) {
    vertical-align: top;
  }
}

.api-auth-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.api-auth-select {
  width: 100%;
  max-width: 320px;
}

.api-auth-code,
.api-auth-mono {
  font-family: Consolas, "Courier New", monospace;
  letter-spacing: 0.02em;
}

.api-auth-link {
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
}

.api-auth-footer {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--el-fill-color-blank);
  border-top: 1px solid var(--el-border-color-lighter);
}

.api-auth-footer__tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.api-auth-footer__actions {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
}

@media (width <= 1100px) {
  .api-auth-stats {
    grid-template-columns: 1fr;
  }

  .api-auth-header {
    flex-direction: column;
  }

  .api-auth-header__tags {
    justify-content: flex-start;
  }
}

@media (width <= 768px) {
  .api-auth-page {
    height: auto;
    min-height: calc(100vh - 108px);
  }

  .api-auth-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .api-auth-footer__actions {
    justify-content: flex-end;
  }
}
</style>
