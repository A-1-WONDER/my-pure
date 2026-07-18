<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import {
  getPartnerIntegration,
  savePartnerUsername,
  type PartnerApiItem,
  type PartnerIntegrationInfo
} from "@/api/external-auth";

defineOptions({
  name: "PermissionPage"
});

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const copying = ref(false);

const info = ref<PartnerIntegrationInfo>({
  baseUrl: "",
  apiDocUrl: "",
  partnerUsername: "partner_api",
  authHeader: "Authorization",
  tokenPrefix: "Bearer",
  loginHint: "",
  apis: []
});

const partnerUsername = ref("partner_api");

const apiRows = computed(() => info.value.apis || []);

function applyInfo(data?: Partial<PartnerIntegrationInfo>) {
  info.value = {
    baseUrl: data?.baseUrl || "",
    apiDocUrl: data?.apiDocUrl || "",
    partnerUsername: data?.partnerUsername || "partner_api",
    authHeader: data?.authHeader || "Authorization",
    tokenPrefix: data?.tokenPrefix || "Bearer",
    loginHint: data?.loginHint || "",
    apis: Array.isArray(data?.apis) ? data!.apis! : []
  };
  partnerUsername.value = info.value.partnerUsername;
}

const loadInfo = async () => {
  loading.value = true;
  try {
    const res = (await getPartnerIntegration()) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as PartnerIntegrationInfo;
    if (ok || data?.baseUrl) {
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

const handleSave = async () => {
  const name = partnerUsername.value.trim();
  if (!name) {
    message("请填写对接账号用户名", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const res = (await savePartnerUsername(name)) as Record<string, any>;
    const ok = res?.code === 0 || res?.success === true;
    const data = (res?.data ?? res) as PartnerIntegrationInfo;
    if (ok || data?.partnerUsername) {
      applyInfo(data);
      message("对接账号名已保存", { type: "success" });
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

function buildGuideText(): string {
  const i = info.value;
  const lines: string[] = [
    "【接口权限 / 对接说明】",
    "",
    `Base URL: ${i.baseUrl || "（请确认后端地址）"}`,
    `在线文档: ${i.apiDocUrl || ""}`,
    `对接账号: ${partnerUsername.value.trim() || i.partnerUsername}`,
    "",
    "鉴权方式:",
    i.loginHint || "登录获取 token，请求头 Authorization: Bearer <token>",
    `请求头: ${i.authHeader}: ${i.tokenPrefix} <token>`,
    "",
    "可调用接口:"
  ];
  (i.apis || []).forEach((api: PartnerApiItem) => {
    lines.push(`- ${api.method} ${api.path}  ${api.description || ""}`);
  });
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

const goUserManage = () => {
  router.push("/system/user").catch(() => {
    message("请到「系统 → 用户」创建同名对接账号并赋权", { type: "info" });
  });
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
            <h2 class="partner-title">接口权限</h2>
          </div>
          <el-tag type="success" effect="plain" size="large">仅本系统</el-tag>
        </div>
      </template>

      <div class="partner-body">
        <section class="partner-section">
          <div class="partner-section__title">接入地址</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Base URL">
              <span class="mono">{{ info.baseUrl || "—" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="在线文档">
              <el-link
                v-if="info.apiDocUrl"
                :href="info.apiDocUrl"
                type="primary"
                target="_blank"
                underline="never"
                class="mono"
              >
                {{ info.apiDocUrl }}
              </el-link>
              <span v-else>—</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">对接账号</div>
          <div class="partner-account">
            <el-input
              v-model="partnerUsername"
              placeholder="如 partner_api"
              class="partner-account__input"
              clearable
            />
            <el-button type="primary" :loading="saving" @click="handleSave">
              保存账号名
            </el-button>
            <el-button @click="goUserManage">去创建用户</el-button>
          </div>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">鉴权步骤</div>
          <ol class="partner-steps">
            <li><code>GET /auth/code</code> 获取验证码</li>
            <li>
              <code>POST /auth/login</code> 登录（密码 RSA
              加密，与前端一致）拿到 token
            </li>
            <li>
              后续请求头：
              <code
                >{{ info.authHeader }}:
                {{ info.tokenPrefix }} &lt;token&gt;</code
              >
            </li>
          </ol>
        </section>

        <section class="partner-section">
          <div class="partner-section__title">可调用接口</div>
          <el-table :data="apiRows" border stripe style="width: 100%">
            <el-table-column prop="method" label="方法" width="90" />
            <el-table-column prop="path" label="路径" min-width="280">
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

.partner-account {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.partner-account__input {
  width: 240px;
  max-width: 100%;
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
