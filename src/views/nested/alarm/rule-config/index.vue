<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import {
  deleteAlarmRule,
  getAlarmRuleList,
  saveAlarmRule,
  type AlarmRulePayload
} from "@/api/alarm";
import { getMeterList } from "@/api/meters";
import { getCollectorArchiveList } from "@/api/collectors";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { addDialog } from "@/components/ReDialog";
import Delete from "~icons/ep/delete";
import Document from "~icons/ep/document";
import Edit from "~icons/ep/edit";
import View from "~icons/ep/view";
import RuleDetailDialog from "./rule-detail-dialog.vue";
import {
  getAlarmTypeLabel,
  getAlarmTypesForCollectorRule,
  getAlarmTypesForMeterRule
} from "../constants";
import {
  alarmLevelLabelText,
  alarmRuleRowToSavePayload,
  extractTargetIds,
  isCollectorTarget,
  mergeNestedRuleSources,
  normalizeAlarmRuleRow
} from "./rule-detail-utils";

function alarmLevelLabel(v: string | undefined) {
  return alarmLevelLabelText(v);
}

/** 表格「ID」列展示用 */
function ruleTableId(row: Record<string, any>): number | string {
  const raw = row.id ?? row.rule_id;
  if (raw == null || raw === "") return "-";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "-";
}

function targetLabelsForRow(row: Record<string, any>): string {
  const ids = extractTargetIds(row);
  const opts = isCollectorTarget(row)
    ? collectorOptions.value
    : meterOptions.value;
  if (!ids.length) return "-";
  return ids
    .map(id => opts.find(o => o.id === id)?.label ?? String(id))
    .join("、");
}

function openRuleDetail(row: Record<string, any>) {
  addDialog({
    title: "报警规则详情",
    width: "60%",
    hideFooter: true,
    props: {
      ruleId: Number(row.id),
      initialData: { ...row },
      resolveTargetLabels: targetLabelsForRow
    },
    contentRenderer: () => RuleDetailDialog
  });
}

defineOptions({
  name: "AlarmRuleConfig"
});

/** 兼容 Spring Page、Result 包裹及 records/items 等字段 */
function unwrapTableList(res: Record<string, any>): any[] {
  if (!res || typeof res !== "object") return [];
  if (Array.isArray(res)) return res;
  const d = res.data ?? res.result ?? res.payload;
  const pick = (x: any) => {
    if (!x || typeof x !== "object") return null;
    if (Array.isArray(x.list)) return x.list;
    if (Array.isArray(x.content)) return x.content;
    if (Array.isArray(x.records)) return x.records;
    if (Array.isArray(x.items)) return x.items;
    if (Array.isArray(x.rows)) return x.rows;
    return null;
  };
  const fromD = pick(d);
  if (fromD) return fromD;
  const fromRoot = pick(res);
  if (fromRoot) return fromRoot;
  if (Array.isArray(d)) return d;
  return [];
}

const meterOptions = ref<{ id: number; label: string }[]>([]);
const collectorOptions = ref<{ id: number; label: string }[]>([]);

const form = reactive({
  ruleName: "",
  targetType: "electric_meter" as "electric_meter" | "collector",
  targetIds: [] as number[],
  alarmType: "electric_meter",
  alarmLevel: "normal" as AlarmRulePayload["alarmLevel"],
  enabled: true,
  effectiveTimeStart: "",
  effectiveTimeEnd: "",
  silenceMinutes: 30,
  metric: "instant_power",
  compareOp: "gt",
  threshold: undefined as number | undefined,
  sustainType: "times" as "times" | "minutes",
  sustainValue: 3,
  collectorCondition: "offline_minutes",
  collectorThreshold: 15,
  remark: ""
});

const saving = ref(false);
const listLoading = ref(false);
const ruleList = ref<any[]>([]);
/** 正在切换启用状态的规则 id，用于禁用开关避免重复提交 */
const togglingEnabledId = ref<number | null>(null);
const ruleDocVisible = ref(false);
/** 非空表示正在编辑已有规则，保存时携带 id */
const editingRuleId = ref<number | null>(null);
/** 从表格载入表单时跳过 targetType 的 watch（避免清空 targetIds） */
let suppressTargetTypeWatch = false;

function coerceAlarmLevelForForm(v: unknown): AlarmRulePayload["alarmLevel"] {
  const s = String(v ?? "normal");
  if (s === "important" || s === "urgent" || s === "normal") return s;
  return "normal";
}

function coerceSelect<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const s = String(v ?? "");
  return (allowed.includes(s as T) ? s : fallback) as T;
}

function coerceAlarmTypeForForm(
  value: unknown,
  targetType: "electric_meter" | "collector"
): string {
  const opts =
    targetType === "collector"
      ? getAlarmTypesForCollectorRule()
      : getAlarmTypesForMeterRule();
  const v = String(value ?? "");
  if (opts.some(o => o.value === v)) return v;
  return (
    opts[0]?.value ??
    (targetType === "collector" ? "collector" : "electric_meter")
  );
}

function scrollFormIntoView() {
  nextTick(() => {
    document.querySelector(".rule-config-sections-box")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

/** 将表格行载入上方表单以便修改后保存 */
function loadRuleRowIntoForm(row: Record<string, any>) {
  const merged = mergeNestedRuleSources(row);
  const n = normalizeAlarmRuleRow(merged);
  const targetType: "electric_meter" | "collector" = isCollectorTarget(n)
    ? "collector"
    : "electric_meter";
  const id = Number(n.id);
  if (!Number.isFinite(id)) {
    message("该行缺少规则 id，无法编辑", { type: "warning" });
    return;
  }

  suppressTargetTypeWatch = true;
  editingRuleId.value = id;
  form.targetType = targetType;
  form.ruleName = String(n.ruleName ?? "");
  form.targetIds = extractTargetIds(merged);
  form.alarmType = coerceAlarmTypeForForm(n.alarmType, targetType);
  form.alarmLevel = coerceAlarmLevelForForm(n.alarmLevel);
  form.enabled =
    n.enabled === true ||
    n.enabled === 1 ||
    n.enabled === "1" ||
    n.enabled === "true";
  form.effectiveTimeStart =
    n.effectiveTimeStart != null ? String(n.effectiveTimeStart) : "";
  form.effectiveTimeEnd =
    n.effectiveTimeEnd != null ? String(n.effectiveTimeEnd) : "";
  form.silenceMinutes =
    n.silenceMinutes != null && Number.isFinite(Number(n.silenceMinutes))
      ? Number(n.silenceMinutes)
      : 30;
  form.remark = n.remark != null ? String(n.remark) : "";

  if (targetType === "electric_meter") {
    form.metric = coerceSelect(
      n.metric,
      ["instant_power", "day_power", "reading_jump", "balance_low"] as const,
      "instant_power"
    );
    form.compareOp = coerceSelect(
      n.compareOp,
      ["gt", "lt", "qoq_up", "qoq_down"] as const,
      "gt"
    );
    form.threshold =
      n.threshold != null &&
      n.threshold !== "" &&
      Number.isFinite(Number(n.threshold))
        ? Number(n.threshold)
        : undefined;
    form.sustainType =
      n.sustainType === "minutes" || n.sustainType === "times"
        ? n.sustainType
        : "times";
    form.sustainValue =
      n.sustainValue != null && Number.isFinite(Number(n.sustainValue))
        ? Number(n.sustainValue)
        : 3;
  } else {
    form.collectorCondition = coerceSelect(
      n.collectorCondition,
      ["offline_minutes", "collect_fail_times"] as const,
      "offline_minutes"
    );
    form.collectorThreshold =
      n.collectorThreshold != null &&
      Number.isFinite(Number(n.collectorThreshold))
        ? Number(n.collectorThreshold)
        : 15;
  }
  suppressTargetTypeWatch = false;

  message("已载入到上方表单，修改后点击保存", { type: "success" });
  scrollFormIntoView();
}

function cancelRuleEdit() {
  editingRuleId.value = null;
  suppressTargetTypeWatch = true;
  form.ruleName = "";
  form.targetType = "electric_meter";
  form.targetIds = [];
  form.alarmType = "electric_meter";
  form.alarmLevel = "normal";
  form.enabled = true;
  form.effectiveTimeStart = "";
  form.effectiveTimeEnd = "";
  form.silenceMinutes = 30;
  form.metric = "instant_power";
  form.compareOp = "gt";
  form.threshold = undefined;
  form.sustainType = "times";
  form.sustainValue = 3;
  form.collectorCondition = "offline_minutes";
  form.collectorThreshold = 15;
  form.remark = "";
  suppressTargetTypeWatch = false;
}

function rowEnabled(row: Record<string, any>): boolean {
  const v = row.enabled ?? row.enable ?? row.isEnabled ?? row.is_enabled;
  return v === true || v === 1 || v === "1" || v === "true";
}

async function handleToggleEnabled(row: Record<string, any>, enabled: boolean) {
  const id = Number(row.id);
  if (!Number.isFinite(id) || togglingEnabledId.value === id) return;
  const prev = rowEnabled(row);
  togglingEnabledId.value = id;
  row.enabled = enabled;
  try {
    const payload = alarmRuleRowToSavePayload(row, { enabled });
    const res = await saveAlarmRule(payload);
    const ok = (res as any)?.code === 0 || (res as any)?.success === true;
    if (ok) {
      message(enabled ? "已启用" : "已停用", { type: "success" });
      await loadRuleList();
    } else {
      row.enabled = prev;
      message(
        (res as any)?.msg ?? (res as any)?.message ?? "更新启用状态失败",
        { type: "warning" }
      );
    }
  } catch {
    row.enabled = prev;
    message("更新启用状态失败", { type: "error" });
  } finally {
    togglingEnabledId.value = null;
  }
}

const isMeterTarget = computed(() => form.targetType === "electric_meter");

const meterAlarmTypeOptions = computed(() => getAlarmTypesForMeterRule());
const collectorAlarmTypeOptions = computed(() =>
  getAlarmTypesForCollectorRule()
);
const alarmTypeOptions = computed(() =>
  isMeterTarget.value
    ? meterAlarmTypeOptions.value
    : collectorAlarmTypeOptions.value
);

watch(
  () => form.targetType,
  t => {
    if (suppressTargetTypeWatch) return;
    form.targetIds = [];
    const opts =
      t === "electric_meter"
        ? getAlarmTypesForMeterRule()
        : getAlarmTypesForCollectorRule();
    form.alarmType = opts[0]?.value ?? "electric_meter";
  }
);

async function loadMeterOptions() {
  try {
    const res = (await getMeterList({ page: 1, size: 500 })) as Record<
      string,
      any
    >;
    const rows = unwrapTableList(res).filter((r: any) => r?.id != null);
    meterOptions.value = rows.map((r: any) => ({
      id: Number(r.id),
      label: `${r.meterNo ?? r.id}${r.meterName ? ` / ${r.meterName}` : ""}`
    }));
  } catch {
    meterOptions.value = [];
  }
}

async function loadCollectorOptions() {
  try {
    const res = (await getCollectorArchiveList({
      page: 1,
      size: 500
    })) as Record<string, any>;
    const rows = unwrapTableList(res);
    collectorOptions.value = rows
      .map((r: any) => {
        const id = Number(r.id ?? r.collectorId ?? r.collector_id);
        const no =
          r.collectorNo ??
          r.collector_no ??
          r.code ??
          r.collectorCode ??
          r.collector_code;
        const name = r.collectorName ?? r.collector_name ?? r.name;
        const label = [no, name].filter(Boolean).join(" / ") || String(id);
        return { id, label };
      })
      .filter(o => Number.isFinite(o.id));
  } catch {
    collectorOptions.value = [];
  }
}

function buildPayload(): AlarmRulePayload {
  const payload: AlarmRulePayload = {
    ruleName: form.ruleName.trim() || "未命名规则",
    targetType: form.targetType,
    targetIds: [...form.targetIds],
    alarmType: form.alarmType,
    alarmLevel: form.alarmLevel,
    enabled: form.enabled,
    effectiveTimeStart: form.effectiveTimeStart || undefined,
    effectiveTimeEnd: form.effectiveTimeEnd || undefined,
    silenceMinutes: form.silenceMinutes,
    metric: isMeterTarget.value ? form.metric : undefined,
    compareOp: isMeterTarget.value ? form.compareOp : undefined,
    threshold: isMeterTarget.value ? form.threshold : undefined,
    sustainType: isMeterTarget.value ? form.sustainType : undefined,
    sustainValue: isMeterTarget.value ? form.sustainValue : undefined,
    collectorCondition: !isMeterTarget.value
      ? form.collectorCondition
      : undefined,
    collectorThreshold: !isMeterTarget.value
      ? form.collectorThreshold
      : undefined,
    remark: form.remark || undefined
  };
  const eid = editingRuleId.value;
  if (eid != null && Number.isFinite(eid)) {
    payload.id = eid;
  }
  return payload;
}

async function handleSave() {
  if (form.targetIds.length === 0) {
    message("请至少选择一个绑定对象", { type: "warning" });
    return;
  }
  if (
    isMeterTarget.value &&
    (form.threshold === undefined || form.threshold === null)
  ) {
    message("请填写电表阈值", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const res = await saveAlarmRule(buildPayload());
    const ok = (res as any)?.code === 0 || (res as any)?.success === true;
    if (ok) {
      message(editingRuleId.value != null ? "规则已更新" : "规则已提交保存", {
        type: "success"
      });
      await loadRuleList();
    } else {
      const errText = (res as any)?.msg ?? (res as any)?.message ?? "保存失败";
      message(errText, { type: "warning" });
    }
  } catch (e: any) {
    const status = e?.response?.status;
    const d = e?.response?.data;
    let detail = "";
    if (d && typeof d === "object") {
      detail =
        d.msg ||
        d.message ||
        d.error ||
        (Array.isArray(d.errors)
          ? d.errors.map((x: any) => x?.defaultMessage || x).join("；")
          : "") ||
        "";
    } else if (typeof d === "string") {
      detail = d;
    }
    if (!detail && e?.message) detail = e.message;

    if (status === 404 || String(detail).includes("404")) {
      message("未找到保存接口，请检查服务是否已部署", {
        type: "error"
      });
    } else if (status === 400) {
      message(
        detail
          ? `保存失败：${detail}`
          : "保存失败：400 参数错误（请查看 Network 响应体）",
        {
          type: "error"
        }
      );
    } else {
      message(detail ? `保存失败：${detail}` : "保存失败", { type: "error" });
    }
  } finally {
    saving.value = false;
  }
}

async function loadRuleList() {
  listLoading.value = true;
  try {
    const res = (await getAlarmRuleList({
      currentPage: 1,
      pageSize: 50
    })) as any;
    const ok = res?.code === 0 || res?.success === true;
    const d = res?.data;
    if (ok && d) {
      const list = d.list ?? d.content ?? [];
      ruleList.value = Array.isArray(list) ? list : [];
    } else {
      ruleList.value = [];
    }
  } catch {
    ruleList.value = [];
  } finally {
    listLoading.value = false;
  }
}

async function handleDelete(row: { id: number }) {
  try {
    const res = await deleteAlarmRule({ id: row.id });
    if ((res as any)?.code === 0) {
      message("已删除", { type: "success" });
      await loadRuleList();
    } else {
      message((res as any)?.msg ?? (res as any)?.message ?? "删除失败", {
        type: "warning"
      });
    }
  } catch {
    message("删除失败", { type: "error" });
  }
}

onMounted(async () => {
  await Promise.all([
    loadMeterOptions(),
    loadCollectorOptions(),
    loadRuleList()
  ]);
});
</script>

<template>
  <div class="main alarm-rule-config">
    <div class="rule-page-title-panel">
      <div class="rule-title-panel-head">
        <div class="rule-title-panel-text">
          <h2 class="text-lg font-semibold text-[var(--el-text-color-primary)]">
            报警规则配置
          </h2>
          <p class="text-sm text-text_color_regular mt-1">
            按对象类型配置阈值与触发条件。
          </p>
        </div>
        <el-button
          type="primary"
          plain
          class="rule-doc-btn shrink-0"
          :icon="useRenderIcon(Document)"
          @click="ruleDocVisible = true"
        >
          规则文档说明
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="ruleDocVisible"
      title="报警规则文档说明"
      width="min(92vw, 720px)"
      class="rule-doc-dialog"
      destroy-on-close
      append-to-body
    >
      <div
        class="rule-doc-body text-sm text-[var(--el-text-color-regular)] leading-relaxed"
      >
        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">一、页面在做什么</h4>
          <p>
            本页用于<strong>新增、保存</strong>电表或采集器侧的报警规则，并在下方表格中<strong>编辑、查看、启用/停用、删除</strong>已有规则。
            规则保存后由<strong>后端规则引擎</strong>按周期或事件判断是否触发报警；前端不负责实时计算阈值。
          </p>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">二、① 对象维度（规则作用在谁身上）</h4>
          <dl class="rule-doc-dl">
            <dt>规则名称</dt>
            <dd>便于在列表中识别的名称，不影响引擎逻辑。</dd>
            <dt>对象类型</dt>
            <dd>
              <strong>电表</strong>：绑定设备来自电表列表中的
              id；<strong>采集器</strong>：绑定设备来自采集器列表中的
              id。切换类型会清空已选绑定并重置可选报警类型。
            </dd>
            <dt>绑定电表 / 绑定采集器</dt>
            <dd>可多选。仅被选中的设备适用本条规则。</dd>
            <dt>报警类型</dt>
            <dd>
              与「报警事件查询」等处使用的类型字典一致，用于事件分类展示；具体是否触发仍取决于后端对类型与条件的实现。
            </dd>
          </dl>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">三、② 通用条件（所有规则共有）</h4>
          <dl class="rule-doc-dl">
            <dt>报警级别</dt>
            <dd>
              一般 / 重要 / 紧急，用于事件展示与后续处理优先级（以后端为准）。
            </dd>
            <dt>启用</dt>
            <dd>关闭后规则不再参与判断；下方表格中也可用开关快速切换。</dd>
            <dt>生效时间窗</dt>
            <dd>
              可选。填写开始、结束时间后，通常表示仅在该时段内判定；不填表示全天。
            </dd>
            <dt>静默期（分钟）</dt>
            <dd>
              同一对象在触发报警后，在静默时间内重复满足条件也可能不再重复推送/落库，用于降噪（以后端策略为准）。
            </dd>
            <dt>备注</dt>
            <dd>运维说明，可选。</dd>
          </dl>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">四、③ 电表专用条件</h4>
          <dl class="rule-doc-dl">
            <dt>比较指标</dt>
            <dd>
              如当前功率、日用电量、读数跳变、余额不足等，对应后端字段
              <code>metric</code>。须与业务含义一致：例如「日用电量」应对
              <code>day_power</code>，不要与「当前功率」<code
                >instant_power</code
              >
              混用。
            </dd>
            <dt>比较符</dt>
            <dd>大于、小于、环比上升/下降等，对应 <code>compareOp</code>。</dd>
            <dt>阈值</dt>
            <dd>
              与指标、比较符联用的数值，单位以后端约定为准（如 kW、kWh）。
            </dd>
            <dt>持续判定</dt>
            <dd>
              <strong>连续次数</strong>：条件需连续满足 N
              次采样/轮询才触发；<strong>持续时间</strong>：需持续满足 N
              分钟。用于避免瞬时抖动误报。
            </dd>
          </dl>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">五、③ 采集器专用条件</h4>
          <dl class="rule-doc-dl">
            <dt>条件类型</dt>
            <dd>
              如离线超过 N 分钟、连续 N 次采集失败等，对应
              <code>collectorCondition</code>。
            </dd>
            <dt>阈值 N</dt>
            <dd>
              与条件类型配套的分钟数或次数，对应
              <code>collectorThreshold</code>。
            </dd>
          </dl>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">六、如何使用（推荐步骤）</h4>
          <ol class="rule-doc-ol">
            <li>选定对象类型，并绑定要监控的设备。</li>
            <li>选择报警类型与级别，配置启用状态、时间窗与静默期。</li>
            <li>
              在「电表」或「采集器」专用区填写指标、比较符、阈值及持续判定。
            </li>
            <li>
              点击<strong>保存规则</strong>；在「已配置规则」中刷新确认是否出现。
            </li>
            <li>
              到<strong>报警事件查询</strong>查看是否产生事件；若无，请核对后端是否已实现对应
              <code>metric</code> 与数据采集。
            </li>
          </ol>
        </section>

        <section class="rule-doc-section">
          <h4 class="rule-doc-h4">七、已配置规则表格</h4>
          <dl class="rule-doc-dl">
            <dt>启用开关</dt>
            <dd>直接调用保存接口更新该规则的启用状态；失败会自动回滚开关。</dd>
            <dt>编辑</dt>
            <dd>
              将本行规则载入上方表单，修改后点击「保存修改」更新；可点「取消编辑」清空表单并恢复为新增状态。
            </dd>
            <dt>详情</dt>
            <dd>
              按 ①②③
              分组展示当前接口能拿到的字段；若多为「-」，说明列表/详情接口未返回完整配置，需后端补全。
            </dd>
            <dt>删除</dt>
            <dd>删除该条规则，请谨慎操作。</dd>
          </dl>
        </section>
      </div>
      <template #footer>
        <el-button type="primary" @click="ruleDocVisible = false"
          >我知道了</el-button
        >
      </template>
    </el-dialog>

    <div
      class="rule-config-sections-box"
      :class="{ 'is-editing-rule': editingRuleId != null }"
    >
      <div v-if="editingRuleId != null" class="rule-edit-mode-bar">
        正在编辑规则（ID：{{ editingRuleId }}），修改后请保存或取消编辑
      </div>
      <el-card shadow="never" class="mb-4 rule-section-card">
        <template #header>
          <span class="font-semibold">① 对象维度</span>
        </template>
        <el-form label-width="120px">
          <el-form-item label="规则名称">
            <el-input
              v-model="form.ruleName"
              clearable
              placeholder="便于识别的规则名称"
              class="max-w-md"
            />
          </el-form-item>
          <el-form-item label="对象类型">
            <el-radio-group v-model="form.targetType">
              <el-radio-button value="electric_meter">电表</el-radio-button>
              <el-radio-button value="collector">采集器</el-radio-button>
            </el-radio-group>
            <div class="text-text_color_regular text-sm mt-2">
              电表侧绑定电表列表中的设备；采集器侧绑定采集器列表中的设备。
            </div>
          </el-form-item>
          <el-form-item :label="isMeterTarget ? '绑定电表' : '绑定采集器'">
            <el-select
              v-model="form.targetIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              :placeholder="isMeterTarget ? '可多选电表' : '可多选采集器'"
              class="w-full! max-w-xl"
            >
              <el-option
                v-for="opt in isMeterTarget ? meterOptions : collectorOptions"
                :key="opt.id"
                :label="opt.label"
                :value="opt.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="报警类型">
            <el-select
              v-model="form.alarmType"
              filterable
              class="w-full! max-w-xl"
              placeholder="请选择报警类型"
            >
              <el-option
                v-for="item in alarmTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <div class="text-text_color_regular text-sm mt-1">
              与「报警事件查询」中的类型选项一致。
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="mb-4 rule-section-card">
        <template #header>
          <span class="font-semibold">② 通用条件</span>
        </template>
        <el-form label-width="120px">
          <el-form-item label="报警级别">
            <el-select v-model="form.alarmLevel" class="w-[200px]!">
              <el-option label="一般" value="normal" />
              <el-option label="重要" value="important" />
              <el-option label="紧急" value="urgent" />
            </el-select>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch
              v-model="form.enabled"
              active-text="启用"
              inactive-text="停用"
            />
          </el-form-item>
          <el-form-item label="生效时间窗">
            <div class="flex flex-wrap items-center gap-2">
              <el-time-select
                v-model="form.effectiveTimeStart"
                start="00:00"
                step="00:30"
                end="23:30"
                placeholder="开始时间"
                clearable
                class="w-[140px]!"
              />
              <span class="text-text_color_regular">至</span>
              <el-time-select
                v-model="form.effectiveTimeEnd"
                start="00:00"
                step="00:30"
                end="23:30"
                placeholder="结束时间"
                clearable
                class="w-[140px]!"
              />
            </div>
            <div class="text-text_color_regular text-sm mt-1">
              可选；不填表示全天生效。
            </div>
          </el-form-item>
          <el-form-item label="静默期(分)">
            <el-input-number
              v-model="form.silenceMinutes"
              :min="0"
              :max="10080"
              controls-position="right"
            />
            <span class="text-text_color_regular text-sm ml-2"
              >同一对象重复告警的最小间隔</span
            >
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="2"
              class="max-w-xl"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card
        v-if="isMeterTarget"
        shadow="never"
        class="mb-4 rule-section-card"
      >
        <template #header>
          <span class="font-semibold">③ 电表专用条件</span>
        </template>
        <el-form label-width="120px">
          <el-form-item label="比较指标">
            <el-select v-model="form.metric" class="w-[220px]!">
              <el-option label="当前功率" value="instant_power" />
              <el-option label="日用电量" value="day_power" />
              <el-option label="读数跳变" value="reading_jump" />
              <el-option label="余额不足" value="balance_low" />
            </el-select>
          </el-form-item>
          <el-form-item label="比较符">
            <el-select v-model="form.compareOp" class="w-[200px]!">
              <el-option label="大于 &gt;" value="gt" />
              <el-option label="小于 &lt;" value="lt" />
              <el-option label="环比上升" value="qoq_up" />
              <el-option label="环比下降" value="qoq_down" />
            </el-select>
          </el-form-item>
          <el-form-item label="阈值">
            <el-input-number
              v-model="form.threshold"
              :precision="2"
              :step="0.1"
              controls-position="right"
              class="w-[200px]!"
            />
          </el-form-item>
          <el-form-item label="持续判定">
            <el-select v-model="form.sustainType" class="w-[140px]!">
              <el-option label="连续次数" value="times" />
              <el-option label="持续时间" value="minutes" />
            </el-select>
            <el-input-number
              v-model="form.sustainValue"
              :min="1"
              :max="9999"
              controls-position="right"
              class="ml-2 w-[140px]!"
            />
            <span class="text-text_color_regular text-sm ml-2"
              >方式与数值需同时填写</span
            >
          </el-form-item>
        </el-form>
      </el-card>

      <el-card v-else shadow="never" class="mb-4 rule-section-card">
        <template #header>
          <span class="font-semibold">③ 采集器专用条件</span>
        </template>
        <el-form label-width="140px">
          <el-form-item label="条件类型">
            <el-select v-model="form.collectorCondition" class="w-[260px]!">
              <el-option label="离线超过 N 分钟" value="offline_minutes" />
              <el-option label="连续 N 次采集失败" value="collect_fail_times" />
            </el-select>
          </el-form-item>
          <el-form-item label="阈值 N">
            <el-input-number
              v-model="form.collectorThreshold"
              :min="1"
              :max="99999"
              controls-position="right"
            />
            <span class="text-text_color_regular text-sm ml-2"
              >分钟或次数，与上方条件类型对应</span
            >
          </el-form-item>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="max-w-xl"
            title="状态映射"
            description="采集器在线、故障、离线等状态由规则引擎统一判断；此处仅配置时间与次数类阈值。"
          />
        </el-form>
      </el-card>

      <div class="rule-save-row">
        <el-button
          v-if="editingRuleId != null"
          class="mr-3"
          @click="cancelRuleEdit"
        >
          取消编辑
        </el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ editingRuleId != null ? "保存修改" : "保存规则" }}
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="font-semibold">已配置规则</span>
          <el-button
            text
            type="primary"
            :loading="listLoading"
            @click="loadRuleList"
            >刷新</el-button
          >
        </div>
      </template>
      <el-table
        v-loading="listLoading"
        :data="ruleList"
        stripe
        border
        empty-text="暂无规则数据"
      >
        <el-table-column label="ID" width="88" align="center">
          <template #default="{ row }">
            {{ ruleTableId(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="ruleName" label="规则名称" min-width="140" />
        <el-table-column prop="targetType" label="对象" width="110">
          <template #default="{ row }">
            {{ row.targetType === "collector" ? "采集器" : "电表" }}
          </template>
        </el-table-column>
        <el-table-column prop="alarmType" label="报警类型" min-width="140">
          <template #default="{ row }">
            {{ getAlarmTypeLabel(row.alarmType) }}
          </template>
        </el-table-column>
        <el-table-column prop="alarmLevel" label="级别" width="100">
          <template #default="{ row }">
            {{ alarmLevelLabel(row.alarmLevel) }}
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="启用" width="132" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="rowEnabled(row)"
              inline-prompt
              active-text="启用"
              inactive-text="停用"
              :disabled="togglingEnabledId === row.id"
              @change="
                (v: string | number | boolean) =>
                  handleToggleEnabled(row, Boolean(v))
              "
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="148" fixed="right" align="center">
          <template #default="{ row }">
            <div class="rule-op-cell">
              <el-button
                link
                type="primary"
                size="small"
                class="rule-op-btn"
                :icon="useRenderIcon(Edit)"
                @click="loadRuleRowIntoForm(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                class="rule-op-btn"
                :icon="useRenderIcon(View)"
                @click="openRuleDetail(row)"
              >
                详情
              </el-button>
              <el-popconfirm
                title="确认删除该规则？"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button
                    link
                    type="danger"
                    size="small"
                    class="rule-op-btn"
                    :icon="useRenderIcon(Delete)"
                  >
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.alarm-rule-config {
  /* 外边距由布局 .main-content { margin: 24px } 统一，与 event-query 一致 */
  padding: 0 0 8px;
}

/* 大标题：白底卡片（暗色主题用面板背景色） */
.rule-page-title-panel {
  padding: 16px 20px;
  margin-bottom: 16px;
  background-color: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

html.dark .rule-page-title-panel {
  background-color: var(--el-bg-color);
  box-shadow: none;
}

.rule-title-panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.rule-title-panel-text {
  flex: 1;
  min-width: 0;
}

.rule-doc-btn {
  margin-top: 2px;
}

.rule-doc-body {
  max-height: min(65vh, 520px);
  padding-right: 6px;
  overflow-y: auto;
}

.rule-doc-section {
  margin-bottom: 18px;
}

.rule-doc-section:last-child {
  margin-bottom: 0;
}

.rule-doc-h4 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.rule-doc-dl {
  margin: 0;
}

.rule-doc-dl dt {
  margin-top: 10px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.rule-doc-dl dt:first-child {
  margin-top: 0;
}

.rule-doc-dl dd {
  padding-left: 0;
  margin: 4px 0 0;
}

.rule-doc-dl code {
  padding: 0 4px;
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.rule-doc-ol {
  padding-left: 1.25rem;
  margin: 0;
}

.rule-doc-ol li {
  margin-bottom: 6px;
}

/* ①②③ 与保存按钮：同一外层盒 */
.rule-config-sections-box {
  padding: 16px 20px 20px;
  margin-bottom: 16px;
  background-color: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

html.dark .rule-config-sections-box {
  background-color: var(--el-bg-color);
  box-shadow: none;
}

/* 点击「编辑」载入表单后：整盒色调与边框区分于「新增」状态 */
.rule-config-sections-box.is-editing-rule {
  background-color: #ecf5ff;
  border-color: var(--el-color-primary-light-5);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    0 4px 14px rgb(64 158 255 / 10%);
}

html.dark .rule-config-sections-box.is-editing-rule {
  background-color: color-mix(
    in srgb,
    var(--el-color-primary) 14%,
    var(--el-bg-color)
  );
  border-color: color-mix(in srgb, var(--el-color-primary) 45%, transparent);
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--el-color-primary) 35%, transparent);
}

.rule-edit-mode-bar {
  padding: 10px 20px;
  margin: -16px -20px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-bottom: 1px solid
    color-mix(in srgb, var(--el-color-primary) 22%, transparent);
  border-radius: 7px 7px 0 0;
}

html.dark .rule-edit-mode-bar {
  color: var(--el-color-primary-light-3);
  background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  border-bottom-color: color-mix(
    in srgb,
    var(--el-color-primary) 30%,
    transparent
  );
}

.rule-section-card {
  border: 1px solid var(--el-border-color-extra-light);
}

/* ③ 与保存按钮之间的间距由 rule-save-row 承担 */
.rule-config-sections-box > .el-card:last-of-type {
  margin-bottom: 0 !important;
}

.rule-save-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
  margin-top: 16px;
}

.rule-op-cell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
}

.rule-op-btn {
  padding: 0 6px;
  margin: 0 !important;
}
</style>
