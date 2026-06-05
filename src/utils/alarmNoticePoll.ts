import dayjs from "dayjs";
import { getAlarmEventQueryList } from "@/api/alarm";
import { storageLocal } from "@pureadmin/utils";
import { responsiveStorageNameSpace } from "@/config";
import { useAlarmNoticeStore } from "@/store/modules/alarmNotice";
import { getAlarmTypeLabel } from "@/views/nested/alarm/constants";
import type { ListItem } from "@/layout/components/lay-notice/data";

const storageKeyNotifiedIds = () =>
  `${responsiveStorageNameSpace()}alarm-notified-event-ids`;

const MAX_NOTIFIED_IDS = 300;

function loadNotifiedIdSet(): Set<string> {
  const arr = storageLocal().getItem<string[]>(storageKeyNotifiedIds());
  if (!Array.isArray(arr)) return new Set();
  return new Set(arr.map(String));
}

function saveNotifiedIdSet(set: Set<string>) {
  const arr = [...set];
  const tail = arr.slice(-MAX_NOTIFIED_IDS);
  storageLocal().setItem(storageKeyNotifiedIds(), tail);
}

/**
 * 站内提醒去重键：有事件 id 时为纯数字/字符串（与历史 localStorage 已提醒集合兼容）；否则用类型+设备+时间。
 */
export function getAlarmEventDedupeKey(
  row: Record<string, any>
): string | null {
  if (row?.id != null && row.id !== "") {
    const s = String(row.id).trim();
    if (s) return s;
  }
  const typ = String(row.alarmType ?? "").trim();
  const t = String(
    row.alarmTime ?? row.createdAt ?? row.createTime ?? ""
  ).trim();
  const dev = String(
    row.meterNo ?? row.deviceCode ?? row.deviceId ?? row.collectorId ?? ""
  ).trim();
  if (t && (typ || dev)) return `cmp:${typ}|${dev}|${t}`;
  return null;
}

function alarmLevelExtra(level: string | undefined): {
  extra: string;
  status: ListItem["status"];
} {
  const map: Record<string, { extra: string; status: ListItem["status"] }> = {
    urgent: { extra: "紧急", status: "danger" },
    important: { extra: "重要", status: "warning" },
    normal: { extra: "一般", status: "info" }
  };
  if (!level) return { extra: "报警", status: "warning" };
  return map[level] ?? { extra: String(level), status: "info" };
}

function mapEventRowToNotice(row: Record<string, any>): ListItem {
  const typeLabel = getAlarmTypeLabel(String(row.alarmType ?? ""));
  const { extra, status } = alarmLevelExtra(row.alarmLevel);
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
  const desc =
    parts.join(" · ") || "请前往「报警管理 — 报警事件查询」查看与处理。";
  const timeRaw = row.alarmTime ?? row.createdAt ?? row.createTime;
  const dt = timeRaw ? dayjs(timeRaw) : null;
  const datetime = dt?.isValid() ? dt.format("YYYY-MM-DD HH:mm:ss") : "刚刚";

  return {
    avatar: "",
    title: `报警 · ${typeLabel}`,
    description: desc,
    datetime,
    type: "1",
    status,
    extra,
    alarmEventId: getAlarmEventDedupeKey(row) ?? undefined,
    read: false
  };
}

function unwrapList(res: Record<string, any>): any[] {
  const ok = res?.code === 0 || res?.success === true;
  const d = res?.data;
  if (!ok || !d) return [];
  const list = d.list ?? d.content ?? [];
  return Array.isArray(list) ? list : [];
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
/** 本次浏览器会话内首次拉取仅建立基线，不把已有事件当「新报警」推送 */
let sessionFirstPollDone = false;

async function pollOnce() {
  try {
    const res = (await getAlarmEventQueryList({
      currentPage: 1,
      pageSize: 25
    })) as Record<string, any>;
    const list = unwrapList(res);
    const notified = loadNotifiedIdSet();
    const store = useAlarmNoticeStore();

    if (!sessionFirstPollDone) {
      list.forEach((row: any) => {
        const k = getAlarmEventDedupeKey(row);
        if (k) notified.add(k);
      });
      saveNotifiedIdSet(notified);
      sessionFirstPollDone = true;
      return;
    }

    for (const row of list) {
      const key = getAlarmEventDedupeKey(row);
      if (!key) continue;
      if (notified.has(key)) continue;
      notified.add(key);
      store.prependAlarmNotice(mapEventRowToNotice(row));
    }
    saveNotifiedIdSet(notified);
  } catch {
    /* 未登录或接口不可用时静默失败 */
  }
}

/**
 * 启动报警站内通知轮询（依赖顶部栏 lay-notice 挂载后调用）。
 * 新出现的报警事件会写入「通知」页签；同一会话首次拉取不推送历史。
 */
export function startAlarmNoticePolling(intervalMs = 45000) {
  stopAlarmNoticePolling();
  void pollOnce();
  pollTimer = setInterval(() => void pollOnce(), intervalMs);
}

export function stopAlarmNoticePolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** 手动推送一条（便于联调；业务侧也可在收到 WebSocket 时调用） */
export function pushAlarmNoticeFromEvent(row: Record<string, any>) {
  const store = useAlarmNoticeStore();
  store.prependAlarmNotice(mapEventRowToNotice(row));
  const key = getAlarmEventDedupeKey(row);
  if (key) {
    const notified = loadNotifiedIdSet();
    notified.add(key);
    saveNotifiedIdSet(notified);
  }
}
