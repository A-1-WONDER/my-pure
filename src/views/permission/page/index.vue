<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getConfig } from "@/config";
import { message } from "@/utils/message";
import {
  getExternalApiAuthSettings,
  saveExternalApiAuthSettings,
  testExternalApiConnection,
  type ExternalApiAuthSettings
} from "@/api/system";

defineOptions({
  name: "PermissionPage"
});

const meterTypeOptions = [
  { label: "单相", value: "single-phase" },
  { label: "三相", value: "three-phase" },
  { label: "预付费", value: "prepaid" },
  { label: "多费率", value: "multiRate" }
];

const projectName = ref("能耗管理平台");
const saving = ref(false);
const testing = ref(false);
const loading = ref(false);

const form = ref<ExternalApiAuthSettings>({
  authCode: "",
  requestCount: 0,
  apiMode: "dev",
  syncMode: "on",
  randomString: "",
  defaultMeterType: "",
  apiDocUrl: "",
  status: "正常",
  baseUrl: ""
});

const statusTagType = computed(() => {
  const status = form.value.status ?? "";
  if (status.includes("正常")) return "success";
  if (status.includes("关闭")) return "warning";
  return "info";
});

const buildApiDocUrl = () => {
  const target = import.meta.env.VITE_API_TARGET || "http://localhost:8004";
  return `${String(target).replace(/\/$/, "")}/doc.html`;
};

const loadSettings = async () => {
  loading.value = true;
  try {
    const config = await getConfig();
    if (config?.Title) {
      projectName.value = String(config.Title);
    }
    const data = await getExternalApiAuthSettings({
      projectName: projectName.value,
      apiDocUrl: buildApiDocUrl()
    });
    form.value = {
      ...form.value,
      ...data,
      apiDocUrl: data.apiDocUrl || buildApiDocUrl()
    };
  } catch {
    message("加载接口授权配置失败，请确认已登录且具有 external:list 权限", {
      type: "error"
    });
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const data = await saveExternalApiAuthSettings({
      ...form.value,
      projectName: projectName.value,
      apiDocUrl: form.value.apiDocUrl || buildApiDocUrl()
    });
    form.value = { ...form.value, ...data };
    message("接口授权配置已保存", { type: "success" });
  } catch {
    message("保存失败，请稍后重试", { type: "error" });
  } finally {
    saving.value = false;
  }
};

const handleTestConnection = async () => {
  testing.value = true;
  try {
    const result = await testExternalApiConnection();
    if (result?.success === false) {
      message(String(result.error || result.message || "连接测试失败"), {
        type: "error"
      });
      return;
    }
    message("第三方 API 连接测试成功", { type: "success" });
  } catch {
    message("连接测试失败", { type: "error" });
  } finally {
    testing.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="api-auth-page">
    <el-card v-loading="loading" shadow="never" class="api-auth-card">
      <template #header>
        <div class="api-auth-card__header">
          <span class="text-base font-medium">接口授权</span>
          <div class="api-auth-card__actions">
            <el-button :loading="testing" @click="handleTestConnection">
              测试连接
            </el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">
              保存
            </el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border class="api-auth-desc">
        <el-descriptions-item label="名称" :span="2">
          {{ projectName }}
        </el-descriptions-item>
        <el-descriptions-item label="授权码" :span="2">
          <span class="api-auth-code">{{ form.authCode || "未配置" }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="statusTagType" effect="light">
            {{ form.status || "未知" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="接口请求次数">
          {{ form.requestCount ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="第三方 API 地址" :span="2">
          {{ form.baseUrl || "-" }}
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
        <el-descriptions-item label="随机字符串" :span="2">
          <el-input v-model="form.randomString" clearable />
        </el-descriptions-item>
        <el-descriptions-item label="默认电表型号" :span="2">
          <el-select
            v-model="form.defaultMeterType"
            placeholder="请选择"
            clearable
            class="w-full max-w-[320px]"
          >
            <el-option
              v-for="item in meterTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-descriptions-item>
        <el-descriptions-item label="接口在线文档" :span="2">
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
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.api-auth-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 130px);
  min-height: 0;
  padding: 12px;
}

.api-auth-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

:deep(.api-auth-card .el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

.api-auth-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.api-auth-card__actions {
  display: flex;
  gap: 8px;
}

.api-auth-desc {
  flex: 1;
  width: 100%;

  :deep(.el-descriptions__label) {
    width: 148px;
    font-weight: 500;
  }

  :deep(.el-descriptions__content) {
    word-break: break-all;
  }
}

.api-auth-code {
  font-family: Consolas, "Courier New", monospace;
  letter-spacing: 0.02em;
}
</style>
