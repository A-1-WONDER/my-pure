/**
 * 监控2：电表 / 采集器在线状态展示统一口径（与精采 3.2 / collectors.status 一致）
 *
 * 采集器库表 status：0 离线、1 在线
 * 3.2 设备 status：0 离线、1 在线、2 待机、3 故障…
 * ElectricMeterDto.onlineStatus 是 Boolean，需转成 0/1
 *
 * 展示优先级（本项目落地方案）：
 *   1. 实时 onlineCode / boxStatus / deviceStatus / onlineStatus
 *   2. 所属采集器 collectorOnline（库表 status）
 * 禁止：signalStrength（库默认常为 25）、meters.status（启用位）、lastStatus、用「有无电量」代替在线。
 */

export type OnlineTagType = "success" | "warning" | "danger" | "info";

export type OnlineStatusDisplay = {
  text: string;
  type: OnlineTagType;
};

const STATUS_DISPLAY: Record<string, OnlineStatusDisplay> = {
  "0": { text: "离线", type: "warning" },
  "1": { text: "在线", type: "success" },
  "2": { text: "待机", type: "info" },
  "3": { text: "故障", type: "danger" },
  "4": { text: "维修", type: "danger" },
  "5": { text: "调模", type: "info" },
  ONLINE: { text: "在线", type: "success" },
  NORMAL: { text: "在线", type: "success" },
  OFFLINE: { text: "离线", type: "warning" },
  FAULT: { text: "故障", type: "danger" },
  ERROR: { text: "故障", type: "danger" },
  STANDBY: { text: "待机", type: "info" },
  TRUE: { text: "在线", type: "success" },
  FALSE: { text: "离线", type: "warning" },
  UNKNOWN: { text: "未知", type: "info" }
};

const WRAPPER_STATUS_CODES = new Set([
  "200",
  "201",
  "204",
  "400",
  "401",
  "403",
  "404",
  "500"
]);

export function getOnlineStatusDisplay(
  statusValue?: string | number | boolean | null
): OnlineStatusDisplay {
  if (statusValue === null || statusValue === undefined || statusValue === "") {
    return STATUS_DISPLAY.UNKNOWN;
  }
  if (typeof statusValue === "boolean") {
    return statusValue ? STATUS_DISPLAY["1"] : STATUS_DISPLAY["0"];
  }
  const key = String(statusValue).trim().toUpperCase();
  if (WRAPPER_STATUS_CODES.has(key)) {
    return STATUS_DISPLAY.UNKNOWN;
  }
  return STATUS_DISPLAY[key] || { text: String(statusValue), type: "info" };
}

/** 把任意候选值收成数字码；无法识别返回 undefined（注意：0 是有效离线） */
export function coerceOnlineCode(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (WRAPPER_STATUS_CODES.has(String(value))) return undefined;
    return value;
  }
  const raw = String(value).trim();
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (WRAPPER_STATUS_CODES.has(upper)) return undefined;
  if (upper === "TRUE" || upper === "ONLINE" || upper === "NORMAL") return 1;
  if (upper === "FALSE" || upper === "OFFLINE") return 0;
  if (upper === "FAULT" || upper === "ERROR") return 3;
  if (upper === "STANDBY") return 2;
  if (/^-?\d+(\.0+)?$/.test(raw)) {
    return Number(raw);
  }
  return undefined;
}

/**
 * 电表列表专用：与采集器页同步。
 * 优先实时态 → 采集器态；永不返回「未知」；无线索则离线。
 * 明确忽略 lastStatus / signalStrength / meters 启用 status。
 */
export function resolveMeterListOnlineDisplay(
  row: Record<string, unknown> | null | undefined
): OnlineStatusDisplay {
  if (!row) return STATUS_DISPLAY["0"];

  const candidates = [
    row.onlineCode,
    row.deviceStatus,
    row.boxStatus,
    row.boxstatus,
    row.commsStatus,
    row.onlineStatus,
    row.collectorOnline
  ];

  for (const v of candidates) {
    const code = coerceOnlineCode(v);
    if (code !== undefined) {
      return getOnlineStatusDisplay(code);
    }
  }

  return STATUS_DISPLAY["0"];
}

export function pickCurrentOnlineStatus(
  row: Record<string, unknown> | null | undefined
): number | undefined {
  if (!row) return undefined;
  const preferred = [
    row.onlineCode,
    row.deviceStatus,
    row.boxStatus,
    row.boxstatus,
    row.commsStatus,
    row.onlineStatus,
    row.collectorOnline
  ];
  for (const v of preferred) {
    const code = coerceOnlineCode(v);
    if (code !== undefined) return code;
  }
  return undefined;
}

export function extractCurrentOnlineStatus(
  response: Record<string, unknown> | null | undefined
): number | undefined {
  if (!response) return undefined;
  const layers = [
    response,
    response.data as Record<string, unknown> | undefined,
    (response.data as Record<string, unknown> | undefined)?.data as
      | Record<string, unknown>
      | undefined
  ];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    const code = pickCurrentOnlineStatus(layer as Record<string, unknown>);
    if (code !== undefined) return code;
  }
  return undefined;
}

/** 从采集器列表响应解出 content */
export function unwrapCollectorListRows(
  result: Record<string, unknown> | null | undefined
): Record<string, unknown>[] {
  if (!result) return [];
  const layers = [
    result,
    result.data as Record<string, unknown> | undefined,
    (result.data as Record<string, unknown> | undefined)?.data as
      | Record<string, unknown>
      | undefined
  ];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    const content = (layer as { content?: unknown }).content;
    if (Array.isArray(content)) return content as Record<string, unknown>[];
    const list = (layer as { list?: unknown }).list;
    if (Array.isArray(list)) return list as Record<string, unknown>[];
  }
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return [];
}

/**
 * 用采集器库表 status 生成 id → 在线码（与采集器管理页同源）。
 * 供电表管理、用量明细等共用，保证全站一致。
 */
export function buildCollectorOnlineMap(
  collectors: Record<string, unknown>[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of collectors) {
    const id = Number(item.id ?? item.collectorId);
    const code = coerceOnlineCode(item.status);
    if (Number.isFinite(id) && code !== undefined) {
      map.set(id, code);
    }
  }
  return map;
}

/**
 * 给电表行写入 onlineCode / collectorOnline。
 * 优先级：电表实时 onlineStatus/boxStatus/onlineCode → 所属采集器 status → 离线。
 * 不用信号强度；有用量不等于在线。
 */
export function stampMetersWithCollectorOnline<T extends Record<string, any>>(
  meters: T[],
  collectorOnline: Map<number, number>
): T[] {
  return meters.map(meter => {
    const collectorId = Number(meter?.collectorId);
    const fromCollector = Number.isFinite(collectorId)
      ? collectorOnline.get(collectorId)
      : undefined;

    const hasOnlineStatusField =
      meter?.onlineStatus !== null && meter?.onlineStatus !== undefined;
    const fromRealtime =
      coerceOnlineCode(meter?.onlineCode) ??
      (hasOnlineStatusField
        ? coerceOnlineCode(meter.onlineStatus)
        : undefined) ??
      coerceOnlineCode(meter?.boxStatus) ??
      coerceOnlineCode(meter?.boxstatus) ??
      coerceOnlineCode(meter?.deviceStatus);

    const onlineCode =
      fromRealtime !== undefined
        ? fromRealtime
        : fromCollector !== undefined
          ? fromCollector
          : 0;
    return {
      ...meter,
      collectorOnline: fromCollector,
      onlineCode,
      commsStatus: onlineCode
    };
  });
}

/** 筛选项 NORMAL/FAULT/OFFLINE 或数字码 → 是否匹配行展示态 */
export function meterRowMatchesOnlineFilter(
  row: Record<string, unknown>,
  filterValue: string | number | null | undefined
): boolean {
  if (filterValue === null || filterValue === undefined || filterValue === "") {
    return true;
  }
  const display = resolveMeterListOnlineDisplay(row);
  const key = String(filterValue).trim().toUpperCase();
  if (key === "NORMAL" || key === "ONLINE" || key === "1") {
    return display.text === "在线";
  }
  if (key === "OFFLINE" || key === "0") {
    return display.text === "离线";
  }
  if (key === "FAULT" || key === "ERROR" || key === "3") {
    return display.text === "故障";
  }
  return display.text === getOnlineStatusDisplay(filterValue).text;
}
