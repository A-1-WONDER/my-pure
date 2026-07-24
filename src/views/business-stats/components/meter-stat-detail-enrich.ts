/**
 * 小时明细：档案关联 + 采集器名称/通讯地址组装（从弹窗抽出便于集成测）。
 */
import { formatMeterEnergyUnit } from "@/views/monitor2/utils/meter-display";

export type DetailCollectorInfo = {
  label: string;
  installAddress?: string;
};

export type MeterStatLike = {
  meterId?: number | string | null;
  meterNo?: string | null;
  meterName?: string | null;
  collectorId?: number | string | null;
  totalConsumption?: number | null;
};

export function resolveDetailMeterId(
  meterStat: Record<string, any>
): number | undefined {
  if (meterStat?.meterId !== null && meterStat?.meterId !== undefined) {
    const n = Number(meterStat.meterId);
    return Number.isFinite(n) ? n : undefined;
  }
  const midMatch = String(meterStat?.meterName || "").match(/^mid:(\d+)$/i);
  if (midMatch) {
    const n = Number(midMatch[1]);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function resolveDetailArchive(
  meterStat: MeterStatLike,
  byId: Map<number, Record<string, any>>,
  byNo: Map<string, Record<string, any>>
) {
  const id = resolveDetailMeterId(meterStat as Record<string, any>);
  if (id != null && byId.has(id)) {
    return byId.get(id);
  }
  const meterNo = String(meterStat.meterNo ?? "").trim();
  if (meterNo && byNo.has(meterNo)) {
    return byNo.get(meterNo);
  }
  return undefined;
}

export function buildDetailRowFromMeterStat(
  meterStat: MeterStatLike,
  archive?: Record<string, any>,
  collectorById?: Map<number, DetailCollectorInfo>,
  options?: { meterType?: string; remark?: string }
) {
  const resolvedMeterId =
    resolveDetailMeterId(meterStat as Record<string, any>) ??
    (archive?.id != null && Number.isFinite(Number(archive.id))
      ? Number(archive.id)
      : undefined);

  const rawMeterName = String(meterStat.meterName || "").trim();
  const isMidPlaceholder = /^mid:\d+$/i.test(rawMeterName);
  const meterNo =
    meterStat.meterNo ||
    archive?.meterNo ||
    (resolvedMeterId != null ? String(resolvedMeterId) : undefined);
  const meterName = isMidPlaceholder
    ? meterNo || archive?.meterName || rawMeterName
    : meterStat.meterName || archive?.meterName || rawMeterName || undefined;

  const collectorIdRaw =
    archive?.collectorId ?? (meterStat as Record<string, any>).collectorId;
  const collectorId =
    collectorIdRaw != null && Number.isFinite(Number(collectorIdRaw))
      ? Number(collectorIdRaw)
      : undefined;
  const collectorInfo =
    collectorId != null ? collectorById?.get(collectorId) : undefined;

  return {
    id: resolvedMeterId,
    meterNo,
    meterName,
    collectorId,
    collectorName: archive?.collectorName || collectorInfo?.label || undefined,
    collectorNo: archive?.collectorNo || archive?.code || undefined,
    // 勿用 lastStatus 冒充当前在线；在线态由 stampMetersWithCollectorOnline / 详情写入 onlineCode
    onlineStatus: archive?.onlineStatus,
    onlineCode: archive?.onlineCode,
    collectorOnline: archive?.collectorOnline,
    status: archive?.status,
    signalStrength: archive?.signalStrength,
    meterAddress: collectorInfo?.installAddress || undefined,
    userId: archive?.userId,
    userInfo: archive?.userInfo,
    userName: formatMeterEnergyUnit({
      collectorName: archive?.collectorName || collectorInfo?.label,
      userName: archive?.userName,
      userId: archive?.userId,
      remark: archive?.remark
    }),
    meterType: archive?.meterType || options?.meterType,
    remark: options?.remark,
    totalConsumption: meterStat.totalConsumption,
    voltage: archive?.voltage,
    current: archive?.current,
    temperature: archive?.temperature
  };
}

export function mergeDetailRowsByMeterId(rows: Record<string, any>[]) {
  const mergedMap = new Map<string | number, Record<string, any>>();

  rows.forEach((row, index) => {
    const key = row.id ?? row.meterNo ?? row.meterName ?? `row-${index}`;
    if (key === null || key === undefined || key === "") return;

    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...row });
      return;
    }

    const existing = mergedMap.get(key)!;
    existing.totalConsumption =
      Number(existing.totalConsumption || 0) +
      Number(row.totalConsumption || 0);

    if (!existing.meterNo && row.meterNo) existing.meterNo = row.meterNo;
    if (!existing.collectorId && row.collectorId)
      existing.collectorId = row.collectorId;
    if (!existing.collectorName && row.collectorName)
      existing.collectorName = row.collectorName;
    if (!existing.collectorNo && row.collectorNo)
      existing.collectorNo = row.collectorNo;
    if (!existing.onlineCode && row.onlineCode != null)
      existing.onlineCode = row.onlineCode;
    if (!existing.collectorOnline && row.collectorOnline != null)
      existing.collectorOnline = row.collectorOnline;
    if (existing.onlineStatus == null && row.onlineStatus != null)
      existing.onlineStatus = row.onlineStatus;
    if (!existing.status && row.status != null) existing.status = row.status;
    if (!existing.signalStrength && row.signalStrength)
      existing.signalStrength = row.signalStrength;
    if (!existing.meterAddress && row.meterAddress)
      existing.meterAddress = row.meterAddress;
    if (!existing.userId && row.userId) existing.userId = row.userId;
    if (!existing.userInfo && row.userInfo) existing.userInfo = row.userInfo;
    if (!existing.meterType && row.meterType)
      existing.meterType = row.meterType;
    if (!existing.remainingAmount && row.remainingAmount)
      existing.remainingAmount = row.remainingAmount;
    if (!existing.voltage && row.voltage) existing.voltage = row.voltage;
    if (!existing.current && row.current) existing.current = row.current;
    if (!existing.temperature && row.temperature)
      existing.temperature = row.temperature;
  });

  return Array.from(mergedMap.values()).map(item => ({
    ...item,
    totalConsumption: Number(Number(item.totalConsumption || 0).toFixed(2))
  }));
}
