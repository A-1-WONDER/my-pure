<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { message } from "@/utils/message";
import {
  getPartnerIntegration,
  type PartnerApiItem,
  type PartnerErrorCodeItem,
  type PartnerIntegrationInfo
} from "@/api/external-auth";

defineOptions({
  name: "PermissionPage"
});

const loading = ref(false);
const copying = ref(false);

const info = ref<PartnerIntegrationInfo>({
  baseUrl: "",
  apiPrefix: "/api/open/v1",
  docVersion: "客户版 v1",
  apiDocUrl: "",
  enabled: null,
  appId: "",
  tokenTtlSeconds: null,
  authHeader: "Authorization",
  tokenPrefix: "Bearer",
  loginHint: "",
  noticeHint: "",
  errorCodes: [],
  apis: []
});

const apiRows = computed(() => info.value.apis || []);
const errorRows = computed(() => info.value.errorCodes || []);

const enabledTag = computed(() => {
  if (info.value.enabled === true) {
    return { type: "success" as const, text: "已启用" };
  }
  if (info.value.enabled === false) {
    return { type: "danger" as const, text: "未启用" };
  }
  return { type: "info" as const, text: "未知" };
});

function applyInfo(data?: Partial<PartnerIntegrationInfo>) {
  info.value = {
    baseUrl: data?.baseUrl || "",
    apiPrefix: data?.apiPrefix || "/api/open/v1",
    docVersion: data?.docVersion || "客户版 v1",
    apiDocUrl: data?.apiDocUrl || "",
    enabled: data?.enabled ?? null,
    appId: data?.appId || "",
    tokenTtlSeconds: data?.tokenTtlSeconds ?? null,
    authHeader: data?.authHeader || "Authorization",
    tokenPrefix: data?.tokenPrefix || "Bearer",
    loginHint: data?.loginHint || "",
    noticeHint: data?.noticeHint || "",
    errorCodes: Array.isArray(data?.errorCodes) ? data!.errorCodes! : [],
    apis: Array.isArray(data?.apis) ? data!.apis! : []
  };
}

const loadInfo = async () => {
  loading.value = true;
  try {
    const res = (await getPartnerIntegration()) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as PartnerIntegrationInfo;
    if (ok || data?.baseUrl || data?.apiPrefix) {
      applyInfo(data);
      return;
    }
    message(String(res?.msg ?? res?.message ?? "加载对接信息失败"), {
      type: "warning"
    });
  } catch {
    message("加载对接信息失败", { type: "error" });
  } finally {
    loading.value = false;
  }
};

function buildGuideText(): string {
  const i = info.value;
  const lines: string[] = [
    "【开放接口对接说明】",
    `文档版本: ${i.docVersion || "客户版 v1"}`,
    "",
    `Base URL: ${i.baseUrl || "（请确认后端地址）"}`,
    `接口前缀: ${i.apiPrefix || "/api/open/v1"}`,
    `开放接口: ${i.enabled === true ? "已启用" : i.enabled === false ? "未启用" : "未知"}`,
    `appId: ${i.appId || "（配置侧发放）"}`,
    `Token 有效期: ${i.tokenTtlSeconds != null ? `${i.tokenTtlSeconds} 秒` : "（见配置）"}`,
    `文档: ${i.apiDocUrl || "以交付《开放接口对接文档（客户版）v1》为准"}`,
    "",
    "鉴权方式:",
    i.loginHint ||
      "POST /api/open/v1/auth/token 换票，后续 Authorization: Bearer <accessToken>",
    `请求头: ${i.authHeader}: ${i.tokenPrefix} <accessToken>`,
    "",
    "错误码:"
  ];
  (i.errorCodes || []).forEach((e: PartnerErrorCodeItem) => {
    lines.push(`- ${e.code} (HTTP ${e.http}): ${e.meaning || ""}`);
  });
  if (i.noticeHint) {
    lines.push("", "注意:", i.noticeHint);
  }
  lines.push("", "可调用接口:");
  (i.apis || []).forEach((api: PartnerApiItem) => {
    lines.push(`- ${api.method} ${api.path}  ${api.description || ""}`);
  });
  lines.push("", "appSecret 由我方单独发放，本文不包含密钥。");
  return lines.join("\n");
}

const handleCopy = async () => {
  copying.value = true;
  try {
    const text = buildGuideText();
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    message("对接说明已复制到剪贴板", { type: "success" });
  } catch {
    message("复制失败，请手动选择文本", { type: "error" });
  } finally {
    copying.value = false;
  }
};

onMounted(() => {
  void loadInfo();
});
</script>

<template>
  <div v-loading="loading" class="partner-page">
    <el-card shadow="never" class="partner-card">
      <template #header>
        <div class="partner-header">
          <div>
            <h2 class="partner-title">开放接口对接</h2>
            <p class="partner-subtitle">
              摘要页，权威说明以交付《开放接口对接文档（客户版）v1》为准；不展示
              appSecret。
            </p>
          </div>
          <el-tag type="success" effect="plain" size="large">
            {{ info.docVersion || "客户版 v1" }}
          </el-tag>
        </div>
      </template>

      <div class="partner-body">
        <section class="partner-section">
          <div class="partner-section__title">接入概览</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Base URL">
              <span class="mono">{{ info.baseUrl || "—" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="接口前缀">
              <span class="mono">{{ info.apiPrefix || "/api/open/v1" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="开放接口">
              <el-tag :type="enabledTag.type" effect="plain" size="small">
                {{ enabledTag.text }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="appId">
              <span class="mono">{{ info.appId || "—" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="Token 有效期">
              <span v-if="info.tokenTtlSeconds != null">
                {{ info.tokenTtlSeconds }} 秒
              </span>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="文档">
              <span>{{ info.apiDocUrl || "—" }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">鉴权步骤</div>
          <ol class="partner-steps">
            <li>
              <code>POST /api/open/v1/auth/token</code>
              ，JSON 体传入
              <code>appId</code>、<code>appSecret</code>
              换取
              <code>accessToken</code>
            </li>
            <li>
              后续请求头：
              <code
                >{{ info.authHeader }}:
                {{ info.tokenPrefix }} &lt;accessToken&gt;</code
              >
            </li>
            <li>
              Token 无效或过期 →
              <code>HTTP 401</code> / <code>code=40101</code>，请重新换票
            </li>
          </ol>
          <p v-if="info.loginHint" class="partner-hint">{{ info.loginHint }}</p>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">错误码</div>
          <el-table :data="errorRows" border stripe style="width: 100%">
            <el-table-column prop="code" label="code" width="100" />
            <el-table-column prop="http" label="HTTP" width="90" />
            <el-table-column prop="meaning" label="含义" min-width="220" />
          </el-table>
          <p v-if="info.noticeHint" class="partner-hint">
            {{ info.noticeHint }}
          </p>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">可调用接口</div>
          <el-table :data="apiRows" border stripe style="width: 100%">
            <el-table-column prop="method" label="方法" width="90" />
            <el-table-column prop="path" label="路径" min-width="320">
              <template #default="{ row }">
                <span class="mono">{{ row.path }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" />
          </el-table>
        </section>
      </div>

      <div class="partner-footer">
        <div class="partner-footer__actions">
          <el-button :loading="loading" @click="loadInfo">重新加载</el-button>
          <el-button type="primary" :loading="copying" @click="handleCopy">
            复制对接说明
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.partner-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 108px);
  min-height: 560px;
  padding: 12px;
}

.partner-card {
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

.partner-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.partner-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.partner-subtitle {
  max-width: 720px;
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.partner-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  min-height: 0;
  padding: 20px 24px;
  overflow: auto;
}

.partner-section__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.partner-hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.partner-steps {
  padding-left: 20px;
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: var(--el-text-color-primary);

  code {
    padding: 1px 6px;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }
}

.mono {
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  word-break: break-all;
}

.partner-footer {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.partner-footer__actions {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
}

@media (width <= 768px) {
  .partner-page {
    height: auto;
    min-height: calc(100vh - 108px);
  }

  .partner-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
