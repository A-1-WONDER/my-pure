import dayjs from "dayjs";
import { http } from "@/utils/http";
import {
  buildEladminLogQueryParams,
  mapEladminOperationLog,
  type EladminPageResult
} from "@/api/eladmin-system-adapter";
import { getAlarmEventQueryList } from "@/api/alarm";
import { getAlarmTypeLabel } from "@/views/nested/alarm/constants";
import type { ListItem } from "@/layout/components/lay-notice/data";
import { getAlarmEventDedupeKey } from "@/utils/alarmNoticePoll";

function isLoginLogRow(row: { summary?: string; behavior?: string }) {
  const text = `${row.summary ?? ""}${row.behavior ?? ""}`;
  return text.includes("登录");
}

function unwrapAlarmList(res: Record<string, any>): any[] {
  const ok = res?.code === 0 || res?.success === true;
  const d = res?.data;
  if (!ok || !d) return [];
  const list = d.list ?? d.content ?? [];
  return Array.isArray(list) ? list : [];
}

function alarmLevelMeta(level: string | undefined): {
  extra: string;
  status: ListItem["status"];
} {
  const map: Record<string, { extra: string; status: ListItem["status"] }> = {
    urgent: { extra: "紧急", status: "danger" },
    important: { extra: "重要", status: "warning" },
    normal: { extra: "一般", status: "info" }
  };
  if (!level) return { extra: "待处理", status: "warning" };
  const hit = map[level];
  return hit
    ? { extra: `待处理 · ${hit.extra}`, status: hit.status }
    : { extra: "待处理", status: "warning" };
}

function formatLogTime(timeRaw: unknown): string {
  if (!timeRaw) return "—";
  const dt = dayjs(String(timeRaw));
  return dt.isValid() ? dt.format("YYYY-MM-DD HH:mm:ss") : String(timeRaw);
}

function mapLogRowToMessage(
  row: ReturnType<typeof mapEladminOperationLog>
): ListItem {
  const summary = (row.summary ?? "").trim() || "系统消息";
  const meta = [row.ip, row.address, row.browser].filter(Boolean).join(" · ");
  return {
    avatar: "",
    title: summary,
    description: meta || "个人操作记录",
    datetime: formatLogTime(row.operatingTime),
    type: "2"
  };
}

function mapAlarmRowToTodo(row: Record<string, any>): ListItem {
  const typeLabel = getAlarmTypeLabel(String(row.alarmType ?? ""));
  const { extra, status } = alarmLevelMeta(row.alarmLevel);
  const parts: string[] = [];
  if (row.meterNo) parts.push(`表号 ${row.meterNo}`);
  if (row.deviceId) parts.push(`设备 ${row.deviceId}`);
  if (row.collectorId) parts.push(`采集器 ${row.collectorId}`);
  if (
    row.alarmValue !== undefined &&
    row.alarmValue !== null &&
    row.alarmValue !== ""
  ) {
    parts.push(`报警值 ${row.alarmValue}`);
  }
  const desc = parts.join(" · ") || "请前往「报警管理 — 报警事件查询」处理。";
  const timeRaw = row.alarmTime ?? row.createdAt ?? row.createTime;

  return {
    avatar: "",
    title: `待处理 · ${typeLabel}`,
    description: desc,
    datetime: formatLogTime(timeRaw),
    type: "3",
    status,
    extra,
    alarmEventId: getAlarmEventDedupeKey(row) ?? undefined
  };
}

/** 站内信「消息」：当前用户操作日志（排除登录类） */
export async function fetchSiteMessages(): Promise<ListItem[]> {
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs/user",
    {
      params: buildEladminLogQueryParams({ page: 1, pageSize: 20 })
    }
  );
  return (res?.content ?? [])
    .map(mapEladminOperationLog)
    .filter(row => !isLoginLogRow(row))
    .map(mapLogRowToMessage);
}

/** 站内信「待办」：未处理报警事件 */
export async function fetchSiteTodos(): Promise<ListItem[]> {
  const res = (await getAlarmEventQueryList({
    currentPage: 1,
    pageSize: 20,
    alarmStatus: "pending"
  })) as Record<string, any>;
  return unwrapAlarmList(res).map(mapAlarmRowToTodo);
}
