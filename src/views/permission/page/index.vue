<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getConfig } from "@/config";
import { message } from "@/utils/message";

defineOptions({
  name: "PermissionPage"
});

const STORAGE_KEY = "permission:api-auth:settings";

type ApiMode = "dev" | "prod";
type SyncMode = "on" | "off";

type ApiAuthSettings = {
  authCode: string;
  requestCount: number;
  apiMode: ApiMode;
  syncMode: SyncMode;
  randomString: string;
  defaultMeterType: string;
  apiDocUrl: string;
};

const DEFAULT_RANDOM_STRING = "Bll9omQV1nWSDpLJ030JMAbW";
const DEFAULT_REQUEST_COUNT = 1336;

const meterTypeOptions = [
  { label: "单相", value: "single-phase" },
  { label: "三相", value: "three-phase" },
  { label: "预付费", value: "prepaid" },
  { label: "多费率", value: "multiRate" }
];

const projectName = ref("能耗管理平台");
const statusText = ref("正常");
const saving = ref(false);

const form = ref<ApiAuthSettings>({
  authCode: "",
  requestCount: DEFAULT_REQUEST_COUNT,
  apiMode: "dev",
  syncMode: "on",
  randomString: DEFAULT_RANDOM_STRING,
  defaultMeterType: "",
  apiDocUrl: ""
});

const buildApiDocUrl = () => {
  const target = import.meta.env.VITE_API_TARGET || "http://localhost:8004";
  return `${String(target).replace(/\/$/, "")}/doc.html`;
};

const generateMockAuthCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 24; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApiAuthSettings>;
      form.value = {
        authCode: parsed.authCode || generateMockAuthCode(),
        requestCount: Number(parsed.requestCount) || DEFAULT_REQUEST_COUNT,
        apiMode: parsed.apiMode === "prod" ? "prod" : "dev",
        syncMode: parsed.syncMode === "off" ? "off" : "on",
        randomString: parsed.randomString || DEFAULT_RANDOM_STRING,
        defaultMeterType: parsed.defaultMeterType || "",
        apiDocUrl: parsed.apiDocUrl || buildApiDocUrl()
      };
      return;
    }
  } catch {
    // ignore
  }
  form.value = {
    authCode: generateMockAuthCode(),
    requestCount: DEFAULT_REQUEST_COUNT,
    apiMode: "dev",
    syncMode: "on",
    randomString: DEFAULT_RANDOM_STRING,
    defaultMeterType: "",
    apiDocUrl: buildApiDocUrl()
  };
};

const handleSave = async () => {
  saving.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form.value));
    message("接口授权配置已保存", { type: "success" });
  } catch {
    message("保存失败，请稍后重试", { type: "error" });
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loadSettings();
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
  <div class="api-auth-page">
    <el-card shadow="never" class="api-auth-card">
      <template #header>
        <span class="text-base font-medium">接口授权</span>
      </template>

      <el-descriptions :column="1" border class="api-auth-desc">
        <el-descriptions-item label="名称">
          {{ projectName }}
        </el-descriptions-item>
        <el-descriptions-item label="授权码">
          <span class="api-auth-code">{{ form.authCode }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag type="success" effect="light">{{ statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="接口请求次数">
          {{ form.requestCount }}
        </el-descriptions-item>
        <el-descriptions-item label="接口模式">
          <el-radio-group v-model="form.apiMode">
            <el-radio value="dev">开发模式</el-radio>
            <el-radio value="prod">生产模式</el-radio>
          </el-radio-group>
        </el-descriptions-item>
        <el-descriptions-item label="数据同步模式">
          <el-radio-group v-model="form.syncMode">
            <el-radio value="on">开启同步</el-radio>
            <el-radio value="off">关闭同步</el-radio>
          </el-radio-group>
        </el-descriptions-item>
        <el-descriptions-item label="随机字符串">
          <span class="api-auth-mono">{{ form.randomString }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="默认电表型号">
          <el-select
            v-model="form.defaultMeterType"
            placeholder="请选择"
            clearable
            class="w-full max-w-[280px]"
          >
            <el-option
              v-for="item in meterTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-descriptions-item>
        <el-descriptions-item label="接口在线文档">
          <el-link
            :href="form.apiDocUrl"
            type="primary"
            target="_blank"
            :underline="false"
          >
            {{ form.apiDocUrl }}
          </el-link>
        </el-descriptions-item>
      </el-descriptions>

      <div class="api-auth-actions">
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.api-auth-page {
  padding: 12px;
}

.api-auth-card {
  max-width: 880px;
}

.api-auth-desc {
  :deep(.el-descriptions__label) {
    width: 148px;
    font-weight: 500;
  }

  :deep(.el-descriptions__content) {
    word-break: break-all;
  }
}

.api-auth-code,
.api-auth-mono {
  font-family: Consolas, "Courier New", monospace;
  letter-spacing: 0.02em;
}

.api-auth-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
  margin-top: 20px;
}
</style>
