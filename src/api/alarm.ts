import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/**
 * 报警规则 — 与后端 POST /alarm-rule-save 一致
 * targetType: electric_meter | collector
 * targetIds: 电表填 GET /api/meters 每条记录的 id；采集器填 GET /api/collectors 每条记录的 id
 */
export interface AlarmRulePayload {
  id?: number;
  ruleName: string;
  targetType: "electric_meter" | "collector";
  /** 电表：/api/meters 的 id；采集器：/api/collectors 的 id */
  targetIds: number[];
  alarmType: string;
  alarmLevel: "normal" | "important" | "urgent";
  enabled: boolean;
  effectiveTimeStart?: string;
  effectiveTimeEnd?: string;
  silenceMinutes?: number;
  /** 电表：指标 */
  metric?: string;
  compareOp?: string;
  threshold?: number;
  sustainType?: "times" | "minutes";
  sustainValue?: number;
  /** 采集器：offline_minutes | collect_fail_times */
  collectorCondition?: string;
  collectorThreshold?: number;
  remark?: string;
}

/**
 * 组装 POST /alarm-rule-save 请求体：去掉 undefined、数字字段强转，避免 400。
 */
export function buildAlarmRuleSaveBody(
  data: AlarmRulePayload
): Record<string, unknown> {
  const targetIds = data.targetIds
    .map(v => Number(v))
    .filter(n => Number.isFinite(n));
  const enabled = Boolean(data.enabled);
  const body: Record<string, unknown> = {
    ruleName: (data.ruleName ?? "").trim() || "未命名规则",
    targetType: data.targetType,
    targetIds,
    alarmType: data.alarmType,
    alarmLevel: data.alarmLevel,
    enabled,
    enable: enabled
  };
  if (data.id != null && Number.isFinite(Number(data.id))) {
    body.id = Number(data.id);
  }
  if (data.effectiveTimeStart)
    body.effectiveTimeStart = data.effectiveTimeStart;
  if (data.effectiveTimeEnd) body.effectiveTimeEnd = data.effectiveTimeEnd;
  if (
    data.silenceMinutes != null &&
    Number.isFinite(Number(data.silenceMinutes))
  ) {
    body.silenceMinutes = Number(data.silenceMinutes);
  }
  if (data.metric) body.metric = data.metric;
  if (data.compareOp) body.compareOp = data.compareOp;
  if (data.threshold != null && Number.isFinite(Number(data.threshold))) {
    body.threshold = Number(data.threshold);
  }
  if (data.sustainType) body.sustainType = data.sustainType;
  if (data.sustainValue != null && Number.isFinite(Number(data.sustainValue))) {
    body.sustainValue = Number(data.sustainValue);
  }
  if (data.collectorCondition)
    body.collectorCondition = data.collectorCondition;
  if (
    data.collectorThreshold != null &&
    Number.isFinite(Number(data.collectorThreshold))
  ) {
    body.collectorThreshold = Number(data.collectorThreshold);
  }
  if (data.remark) body.remark = data.remark;
  return body;
}

/** 报警规则新增/更新 */
export const saveAlarmRule = (data: AlarmRulePayload) => {
  return http.request<Result>("post", "/api/alarm-rule-save", {
    data: buildAlarmRuleSaveBody(data)
  });
};

/** 报警规则分页列表 */
export const getAlarmRuleList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/alarm-rule-list", { data });
};

/** 报警规则详情 */
export const getAlarmRuleDetail = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-rule-detail", { data });
};

/** 报警规则删除 */
export const deleteAlarmRule = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-rule-delete", { data });
};

/** 报警事件分页查询 */
export const getAlarmEventQueryList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/alarm-event-query", { data });
};

/** 清空全部报警事件 */
export const clearAllAlarmEvents = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-event-clear-all", { data });
};

/** 批量删除报警事件 */
export const batchDeleteAlarmEvents = (ids: number[]) => {
  return http.request<Result>("post", "/api/alarm-event-batch-delete", {
    data: { ids }
  });
};

export interface AlarmSystemSetting {
  electricAlarmEnabled: boolean;
  powerOffAlarm: boolean;
  longOfflineAlarm: boolean;
}

/** 查询系统报警设置 */
export const getAlarmSystemSetting = () => {
  return http.request<Result<AlarmSystemSetting>>(
    "post",
    "/api/alarm-system-setting-get"
  );
};

/** 保存系统报警设置 */
export const saveAlarmSystemSetting = (data: AlarmSystemSetting) => {
  return http.request<Result<AlarmSystemSetting>>(
    "post",
    "/api/alarm-system-setting-save",
    { data }
  );
};
