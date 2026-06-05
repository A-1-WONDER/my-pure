/**
 * 报警规则详情：归一化列表/详情接口的各种字段名与结构，并生成展示项。
 */
import dayjs from "dayjs";
import type { AlarmRulePayload } from "@/api/alarm";
import { getAlarmTypeLabel } from "../constants";

export type RuleDetailItem = {
  label: string;
  value: string;
  /** 占满两列 */
  wide?: boolean;
};

/** 详情弹窗按配置页 ①②③ 分组 */
export type RuleDetailSection = {
  title: string;
  items: RuleDetailItem[];
};

const ALARM_LEVEL_LABEL: Record<string, string> = {
  normal: "一般",
  important: "重要",
  urgent: "紧急"
};

const METRIC_LABEL: Record<string, string> = {
  instant_power: "当前功率",
  day_power: "日用电量",
  reading_jump: "读数跳变",
  balance_low: "余额不足"
};

const COMPARE_LABEL: Record<string, string> = {
  gt: "大于",
  lt: "小于",
  qoq_up: "环比上升",
  qoq_down: "环比下降"
};

const SUSTAIN_LABEL: Record<string, string> = {
  times: "连续次数",
  minutes: "持续时间（分钟）"
};

const COLLECTOR_COND_LABEL: Record<string, string> = {
  offline_minutes: "离线超过 N 分钟",
  collect_fail_times: "连续 N 次采集失败"
};

export function alarmLevelLabelText(v: string | undefined) {
  if (v === undefined || v === null || v === "") return "-";
  return ALARM_LEVEL_LABEL[String(v)] ?? "未识别";
}

/** 详情弹窗：报警类型仅展示中文，未知时不回显英文编码 */
function alarmTypeDisplayZh(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  const raw = String(v);
  const label = getAlarmTypeLabel(raw);
  if (label && label !== raw) return label;
  return "未识别";
}

/** 详情弹窗：比较指标中文 */
function metricDisplayZh(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  const s = String(v);
  return METRIC_LABEL[s] ?? "未识别";
}

/** 详情弹窗：比较符中文 */
function compareOpDisplayZh(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  const s = String(v);
  return COMPARE_LABEL[s] ?? "未识别";
}

/** 详情弹窗：持续方式中文 */
function sustainTypeDisplayZh(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  const s = String(v);
  return SUSTAIN_LABEL[s] ?? "未识别";
}

/** 详情弹窗：采集器条件类型中文 */
function collectorConditionDisplayZh(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  const s = String(v);
  return COLLECTOR_COND_LABEL[s] ?? "未识别";
}

function hasMeaningfulValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

/** 读取标量字段：兼容 camelCase / snake_case，保留 0、false */
function pickScalar(row: Record<string, any>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const v = row[key];
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (hasMeaningfulValue(v)) return v;
  }
  return undefined;
}

function pickEnabled(row: Record<string, any>): unknown {
  if ("enabled" in row && row.enabled !== undefined && row.enabled !== null) {
    return row.enabled;
  }
  if ("enable" in row && row.enable !== undefined && row.enable !== null) {
    return row.enable;
  }
  return pickScalar(row, "is_enabled", "isEnabled");
}

/**
 * 将规则里常见的「嵌套配置对象」摊平到一层，便于读取阈值、指标等字段。
 * 后端列表接口常只返回 summary，完整字段可能在 config / ruleConfig 等子对象中。
 */
export function mergeNestedRuleSources(
  raw: Record<string, any>
): Record<string, any> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, any> = { ...raw };
  const nestKeys = [
    "ruleConfig",
    "rule_config",
    "ruleConfigVO",
    "config",
    "configuration",
    "condition",
    "conditions",
    "ruleCondition",
    "rule_condition",
    "meterCondition",
    "meter_condition",
    "electricMeterRule",
    "electric_meter_rule",
    "collectorRule",
    "collector_rule",
    "payload",
    "alarmRule",
    "alarm_rule",
    "detail",
    "ext",
    "extra",
    "properties"
  ];
  for (const k of nestKeys) {
    const v = raw[k];
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, v);
    }
  }
  return out;
}

function normalizeTargetType(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === "collector") return "collector";
  if (
    s === "electric_meter" ||
    s === "electricmeter" ||
    s === "meter" ||
    s === "electric"
  ) {
    return "electric_meter";
  }
  return String(v);
}

export function extractTargetIds(row: Record<string, any>): number[] {
  const merged = mergeNestedRuleSources(row);
  const nested =
    merged.targets ??
    merged.targetList ??
    merged.meterList ??
    merged.collectorList ??
    merged.bindMeters ??
    merged.bindCollectors ??
    merged.targetDetails;

  if (
    Array.isArray(nested) &&
    nested.length > 0 &&
    typeof nested[0] === "object"
  ) {
    return nested
      .map((x: any) =>
        Number(
          x.id ??
            x.meterId ??
            x.collectorId ??
            x.targetId ??
            x.deviceId ??
            x.meter_id ??
            x.collector_id
        )
      )
      .filter(n => Number.isFinite(n));
  }

  const raw =
    merged.targetIds ??
    merged.target_ids ??
    merged.targetIdList ??
    merged.target_id_list ??
    merged.meterIds ??
    merged.meter_ids ??
    merged.collectorIds ??
    merged.collector_ids ??
    merged.electricMeterIds ??
    merged.electric_meter_ids;

  if (Array.isArray(raw)) {
    return raw.map((x: any) => Number(x)).filter(n => Number.isFinite(n));
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        return p.map((x: any) => Number(x)).filter(n => Number.isFinite(n));
      }
    } catch {
      /* ignore */
    }
    return raw
      .split(/[,;，；\s]+/)
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n));
  }

  const single = pickScalar(merged, "targetId", "target_id");
  if (single !== undefined && single !== null && single !== "") {
    const n = Number(single);
    if (Number.isFinite(n)) return [n];
  }
  const meterSingle = pickScalar(merged, "meterId", "meter_id");
  if (meterSingle !== undefined && meterSingle !== null && meterSingle !== "") {
    const n = Number(meterSingle);
    if (Number.isFinite(n)) return [n];
  }
  const colSingle = pickScalar(merged, "collectorId", "collector_id");
  if (colSingle !== undefined && colSingle !== null && colSingle !== "") {
    const n = Number(colSingle);
    if (Number.isFinite(n)) return [n];
  }
  return [];
}

export function normalizeAlarmRuleRow(
  row: Record<string, any>
): Record<string, any> {
  const merged = mergeNestedRuleSources(row);
  const targetIds = extractTargetIds(merged);
  return {
    ...merged,
    id: pickScalar(merged, "id", "rule_id") ?? merged.id,
    ruleName: pickScalar(merged, "ruleName", "rule_name", "name"),
    targetType: normalizeTargetType(
      pickScalar(merged, "targetType", "target_type")
    ),
    targetIds,
    alarmType: pickScalar(merged, "alarmType", "alarm_type"),
    alarmLevel: pickScalar(merged, "alarmLevel", "alarm_level"),
    enabled: pickEnabled(merged),
    effectiveTimeStart: pickScalar(
      merged,
      "effectiveTimeStart",
      "effective_time_start",
      "effectiveStart",
      "effective_start",
      "timeWindowStart",
      "startTime"
    ),
    effectiveTimeEnd: pickScalar(
      merged,
      "effectiveTimeEnd",
      "effective_time_end",
      "effectiveEnd",
      "effective_end",
      "timeWindowEnd",
      "endTime"
    ),
    silenceMinutes: pickScalar(
      merged,
      "silenceMinutes",
      "silence_minutes",
      "silentMinutes",
      "silent_minutes",
      "silencePeriod",
      "silence_period",
      "muteMinutes",
      "mute_minutes"
    ),
    metric: pickScalar(
      merged,
      "metric",
      "metric_type",
      "metricType",
      "compareMetric",
      "compare_metric"
    ),
    compareOp: pickScalar(
      merged,
      "compareOp",
      "compare_op",
      "operator",
      "compareOperator",
      "compare_operator"
    ),
    threshold: pickScalar(
      merged,
      "threshold",
      "thresholdValue",
      "threshold_value",
      "limitValue",
      "limit_value"
    ),
    sustainType: pickScalar(
      merged,
      "sustainType",
      "sustain_type",
      "durationType"
    ),
    sustainValue: pickScalar(
      merged,
      "sustainValue",
      "sustain_value",
      "durationValue",
      "duration_value",
      "sustainCount"
    ),
    collectorCondition: pickScalar(
      merged,
      "collectorCondition",
      "collector_condition",
      "collectorCond",
      "collector_cond"
    ),
    collectorThreshold: pickScalar(
      merged,
      "collectorThreshold",
      "collector_threshold",
      "collectorLimit",
      "collector_limit"
    ),
    remark: pickScalar(merged, "remark", "remarks", "comment", "description"),
    createdAt: pickScalar(
      merged,
      "createdAt",
      "created_at",
      "createTime",
      "create_time",
      "gmtCreate",
      "gmt_create"
    ),
    updatedAt: pickScalar(
      merged,
      "updatedAt",
      "updated_at",
      "updateTime",
      "update_time",
      "gmtModified",
      "gmt_modified"
    )
  };
}

export function isCollectorTarget(row: Record<string, any>): boolean {
  const t = normalizeAlarmRuleRow(row).targetType;
  return String(t).toLowerCase() === "collector";
}

function formatEnabled(v: unknown): string {
  if (v === true || v === 1 || v === "1" || v === "true") return "是";
  if (v === false || v === 0 || v === "0" || v === "false") return "否";
  return "-";
}

function formatMaybeTime(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const d = dayjs(v as string | number | Date);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(v);
}

function coerceAlarmLevel(v: unknown): AlarmRulePayload["alarmLevel"] {
  const s = String(v ?? "normal");
  if (s === "important" || s === "urgent" || s === "normal") return s;
  return "normal";
}

function rowEnabledToBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function optionalStrField(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  return String(v);
}

/**
 * 将列表/详情行转为保存接口所需结构（用于仅改启用等场景）。
 */
export function alarmRuleRowToSavePayload(
  row: Record<string, any>,
  overrides?: Partial<AlarmRulePayload>
): AlarmRulePayload {
  const merged = mergeNestedRuleSources(row);
  const n = normalizeAlarmRuleRow(merged);
  const isCol = isCollectorTarget(n);
  const targetType: AlarmRulePayload["targetType"] = isCol
    ? "collector"
    : "electric_meter";
  const idNum = Number(n.id);

  const payload: AlarmRulePayload = {
    id: Number.isFinite(idNum) ? idNum : undefined,
    ruleName: String(n.ruleName ?? "").trim() || "未命名规则",
    targetType,
    targetIds: extractTargetIds(n),
    alarmType: String(n.alarmType ?? (isCol ? "collector" : "electric_meter")),
    alarmLevel: coerceAlarmLevel(n.alarmLevel),
    enabled: rowEnabledToBool(pickEnabled(merged)),
    effectiveTimeStart: optionalStrField(n.effectiveTimeStart),
    effectiveTimeEnd: optionalStrField(n.effectiveTimeEnd),
    silenceMinutes:
      n.silenceMinutes != null && Number.isFinite(Number(n.silenceMinutes))
        ? Number(n.silenceMinutes)
        : 30,
    remark: optionalStrField(n.remark)
  };

  if (isCol) {
    if (n.collectorCondition)
      payload.collectorCondition = String(n.collectorCondition);
    if (
      n.collectorThreshold != null &&
      Number.isFinite(Number(n.collectorThreshold))
    ) {
      payload.collectorThreshold = Number(n.collectorThreshold);
    }
  } else {
    if (n.metric) payload.metric = String(n.metric);
    if (n.compareOp) payload.compareOp = String(n.compareOp);
    if (n.threshold != null && Number.isFinite(Number(n.threshold))) {
      payload.threshold = Number(n.threshold);
    }
    if (n.sustainType === "times" || n.sustainType === "minutes") {
      payload.sustainType = n.sustainType;
    }
    if (n.sustainValue != null && Number.isFinite(Number(n.sustainValue))) {
      payload.sustainValue = Number(n.sustainValue);
    }
  }

  return { ...payload, ...overrides };
}

function makeSectionPusher(out: RuleDetailItem[]) {
  return (label: string, value: unknown, wide = false) => {
    if (value === null || value === undefined || value === "") {
      out.push({ label, value: "-", wide });
    } else {
      out.push({ label, value: String(value), wide });
    }
  };
}

/**
 * 与配置页结构一致：① 对象维度、② 通用条件、③ 电表/采集器专用条件
 */
export function buildAlarmRuleDetailSections(
  normalized: Record<string, any>,
  resolveTargetLabels: (row: Record<string, any>) => string
): RuleDetailSection[] {
  const n = normalized;
  const sec1: RuleDetailItem[] = [];
  const sec2: RuleDetailItem[] = [];
  const sec3: RuleDetailItem[] = [];
  const p1 = makeSectionPusher(sec1);
  const p2 = makeSectionPusher(sec2);
  const p3 = makeSectionPusher(sec3);

  p1("规则编号", n.id);
  p1("规则名称", n.ruleName);
  p1("对象类型", isCollectorTarget(n) ? "采集器" : "电表");
  p1("绑定对象", resolveTargetLabels(n), true);
  p1("报警类型", alarmTypeDisplayZh(n.alarmType));
  const ids = extractTargetIds(n);
  p1("绑定对象编号列表", ids.length ? ids.join("、") : "-", true);

  p2("报警级别", alarmLevelLabelText(n.alarmLevel as string | undefined));
  p2("启用", formatEnabled(n.enabled));
  p2("生效开始", n.effectiveTimeStart);
  p2("生效结束", n.effectiveTimeEnd);
  p2("静默期(分钟)", n.silenceMinutes);
  p2("备注", n.remark, true);
  sec2.push({
    label: "创建时间",
    value: formatMaybeTime(n.createdAt),
    wide: true
  });
  sec2.push({
    label: "更新时间",
    value: formatMaybeTime(n.updatedAt),
    wide: true
  });

  if (!isCollectorTarget(n)) {
    p3("比较指标", metricDisplayZh(n.metric));
    p3("比较符", compareOpDisplayZh(n.compareOp));
    p3("阈值", n.threshold);
    p3("持续方式", sustainTypeDisplayZh(n.sustainType));
    p3("持续值", n.sustainValue);
  } else {
    p3("条件类型", collectorConditionDisplayZh(n.collectorCondition));
    p3("阈值 N", n.collectorThreshold);
  }

  return [
    { title: "① 对象维度", items: sec1 },
    { title: "② 通用条件", items: sec2 },
    {
      title: isCollectorTarget(n) ? "③ 采集器专用条件" : "③ 电表专用条件",
      items: sec3
    }
  ];
}
