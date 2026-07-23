/**
 * 监控2：电表 / 采集器在线状态展示统一口径（与精采 3.2 / collectors.status 一致）
 *
 * 采集器库表 status：0 离线、1 在线
 * 3.2 设备 status：0 离线、1 在线、2 待机、3 故障…
 * ElectricMeterDto.onlineStatus 是 Boolean，需转成 0/1
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
 * 优先 onlineCode → 采集器态 → 详情态 → 信号兜底。
 * 永不返回「未知」：实在没有线索时显示离线。
 */
export function resolveMeterListOnlineDisplay(
  row: Record<string, unknown> | null | undefined
): OnlineStatusDisplay {
  if (!row) return STATUS_DISPLAY["0"];

  const candidates = [
    row.onlineCode,
    row.collectorOnline,
    row.deviceStatus,
    row.boxStatus,
    row.boxstatus,
    row.commsStatus,
    row.onlineStatus
  ];

  for (const v of candidates) {
    const code = coerceOnlineCode(v);
    if (code !== undefined) {
      return getOnlineStatusDisplay(code);
    }
  }

  const signal = Number(row.signalStrength);
  if (Number.isFinite(signal) && signal > 0) {
    return STATUS_DISPLAY["1"];
  }

  const statusCode = coerceOnlineCode(row.status);
  if (statusCode !== undefined) {
    return getOnlineStatusDisplay(statusCode);
  }

  return STATUS_DISPLAY["0"];
}

export function pickCurrentOnlineStatus(
  row: Record<string, unknown> | null | undefined
): number | undefined {
  if (!row) return undefined;
  const preferred = [
    row.onlineCode,
    row.collectorOnline,
    row.deviceStatus,
    row.boxStatus,
    row.boxstatus,
    row.commsStatus,
    row.onlineStatus,
    row.status
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
