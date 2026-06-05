<template>
  <div class="alarm-rule-detail-dialog">
    <div class="header p-4 border-b border-[var(--el-border-color)]">
      <h3 class="text-lg font-medium dark:text-white">报警规则详情</h3>
      <p
        v-if="detailApiEnabled"
        class="text-xs text-gray-500 dark:text-gray-400 mt-1"
      >
        打开时已请求详情并与列表数据合并；若请求失败则仅展示列表中已有字段。
      </p>
    </div>

    <div
      class="content p-4 overflow-y-auto min-h-[220px]"
      :style="{ maxHeight: 'min(70vh, 640px)' }"
    >
      <el-skeleton v-if="loading" :rows="12" animated />
      <template v-else>
        <el-alert
          v-if="fetchNote"
          :title="fetchNote"
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
        />
        <el-alert
          v-if="showDataIncompleteHint"
          type="warning"
          :closable="false"
          show-icon
          class="mb-4"
          title="为什么很多项是「-」？"
        >
          <p class="text-sm leading-relaxed m-0">
            此处展示内容<strong>全部来自接口返回</strong>。若规则列表只返回摘要（如编号、名称、对象、报警类型、级别、是否启用），未包含绑定对象、阈值、比较指标、静默期等完整信息，对应项将显示为「-」。
          </p>
          <p class="text-sm leading-relaxed mt-2 mb-0">
            <strong>说明：</strong
            >需要后端在规则列表或详情接口中返回完整规则字段后，本页才能逐项展示。
          </p>
        </el-alert>

        <div v-for="sec in sections" :key="sec.title" class="detail-section">
          <div class="section-head">{{ sec.title }}</div>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="(item, idx) in sec.items"
              :key="`${idx}-${item.label}`"
              class="info-item"
              :class="{ 'col-span-2': item.wide }"
            >
              <div class="label text-gray-500 dark:text-gray-400 text-sm mb-1">
                {{ item.label }}
              </div>
              <div
                class="value font-medium text-[var(--el-text-color-primary)] whitespace-pre-wrap break-all"
              >
                {{ item.value }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="footer p-4 border-t border-[var(--el-border-color)] text-right">
      <el-button @click="handleClose">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getAlarmRuleDetail } from "@/api/alarm";
import {
  buildAlarmRuleDetailSections,
  extractTargetIds,
  isCollectorTarget,
  mergeNestedRuleSources,
  normalizeAlarmRuleRow,
  type RuleDetailSection
} from "./rule-detail-utils";

const props = defineProps<{
  ruleId: number;
  initialData: Record<string, any>;
  resolveTargetLabels: (row: Record<string, any>) => string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(true);
const sections = ref<RuleDetailSection[]>([]);
const fetchNote = ref("");
const showDataIncompleteHint = ref(false);

function unwrapDetailPayload(res: Record<string, any> | null | undefined) {
  if (!res) return null;
  if (res.code != null && res.code !== 0) return null;
  if (res.success === false) return null;

  const d =
    res.data ?? res.result ?? res.payload ?? (res as Record<string, any>).body;
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;

  const inner =
    (d as Record<string, any>).rule ??
    (d as Record<string, any>).detail ??
    (d as Record<string, any>).item ??
    (d as Record<string, any>).data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, any>;
  }
  return d as Record<string, any>;
}

const detailApiEnabled = (() => {
  const v = import.meta.env.VITE_ENABLE_ALARM_RULE_DETAIL;
  return v === "true" || v === "1";
})();

onMounted(async () => {
  let merged = mergeNestedRuleSources({ ...props.initialData });
  fetchNote.value = "";

  if (detailApiEnabled) {
    try {
      const res = (await getAlarmRuleDetail({
        id: Number(props.ruleId)
      })) as Record<string, any>;
      const extra = unwrapDetailPayload(res);
      if (extra) {
        merged = mergeNestedRuleSources({ ...merged, ...extra });
      } else if (res && res.code != null && res.code !== 0) {
        const msg = res.msg ?? res.message ?? "";
        if (msg)
          fetchNote.value = `详情接口未返回成功：${msg}，以下为列表中的数据。`;
      }
    } catch {
      fetchNote.value =
        "规则详情接口请求失败，以下为列表中的数据。保存后请点击「刷新」再打开可尽量同步。";
    }
  }

  const normalized = normalizeAlarmRuleRow(merged);
  sections.value = buildAlarmRuleDetailSections(
    normalized,
    props.resolveTargetLabels
  );

  const ids = extractTargetIds(merged);
  const col = isCollectorTarget(normalized);
  const noBindings = ids.length === 0;
  const meterCondMissing =
    !col &&
    (normalized.threshold === undefined ||
      normalized.threshold === null ||
      normalized.threshold === "") &&
    (normalized.metric === undefined ||
      normalized.metric === null ||
      normalized.metric === "");
  const collectorCondMissing =
    col &&
    (normalized.collectorThreshold === undefined ||
      normalized.collectorThreshold === null ||
      normalized.collectorThreshold === "") &&
    (normalized.collectorCondition === undefined ||
      normalized.collectorCondition === null ||
      normalized.collectorCondition === "");
  showDataIncompleteHint.value =
    noBindings || meterCondMissing || collectorCondMissing;

  loading.value = false;
});

function handleClose() {
  emit("close");
}
</script>

<style scoped>
.alarm-rule-detail-dialog {
  display: flex;
  flex-direction: column;
  width: 800px;
  max-height: 85vh;
}

.header {
  flex-shrink: 0;
}

.content {
  flex: 1;
  overflow: hidden auto;
}

.footer {
  flex-shrink: 0;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-head {
  padding-bottom: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-item {
  padding: 8px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

html.dark .info-item {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
}
</style>
