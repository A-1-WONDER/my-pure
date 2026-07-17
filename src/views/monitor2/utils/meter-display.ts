/**
 * 电表「用能单位」展示：厂区场景优先采集器名称（产线/电柜），
 * 不用 userId / 电表 id 冒充名称。
 */
export function formatMeterEnergyUnit(
  row?: Record<string, any> | null
): string {
  if (!row) return "-";
  const collectorName = String(row.collectorName ?? "").trim();
  if (collectorName) return collectorName;

  const rawName = String(
    row.userInfo?.userName ?? row.userName ?? row.username ?? ""
  ).trim();
  const userId = row.userId != null ? String(row.userId) : "";
  // 排除把 userId 或纯数字当成名称的历史兜底
  if (rawName && rawName !== userId && !/^\d+$/.test(rawName)) {
    return rawName;
  }

  const remark = String(row.remark ?? "").trim();
  if (remark) return remark;

  return "-";
}

/** 无效占位地址（库里常见 "-" / 空串），应继续回退到采集器安装位置 */
export function isBlankAddress(value: unknown): boolean {
  const s = String(value ?? "").trim();
  return !s || s === "-" || s === "—" || s === "无" || s === "null";
}

/** 安装地址：有效电表地址优先，否则用采集器安装位置 */
export function formatMeterInstallAddress(
  row?: Record<string, any> | null
): string {
  if (!row) return "-";
  const candidates = [
    row.installAddress,
    row.address,
    row.collectorInstallAddress,
    row.collectorLocation,
    row.location
  ];
  for (const candidate of candidates) {
    if (!isBlankAddress(candidate)) {
      return String(candidate).trim();
    }
  }
  return "-";
}

/**
 * 列表行补全采集器安装位置。
 * 注意：电表 installAddress 若为 "-" 占位，不算有效地址，会继续回退。
 */
export async function enrichMetersWithCollectorLocation(
  meters: Record<string, any>[]
): Promise<Record<string, any>[]> {
  if (!Array.isArray(meters) || meters.length === 0) return meters;

  const needEnrich = meters.some(
    m =>
      formatMeterInstallAddress(m) === "-" &&
      m?.collectorId != null &&
      m?.collectorId !== ""
  );
  if (!needEnrich) return meters;

  try {
    const { getCollectorList } = await import("@/api/collector");
    const res = (await getCollectorList({
      page: 1,
      size: 200
    })) as Record<string, any>;
    const list =
      res?.content ?? res?.data?.content ?? res?.data?.list ?? res?.list ?? [];
    if (!Array.isArray(list) || !list.length) return meters;

    const locById = new Map<number, string>();
    for (const item of list) {
      const id = Number(item?.id);
      if (!Number.isFinite(id)) continue;
      const loc = String(
        item.installAddress ?? item.location ?? item.address ?? ""
      ).trim();
      if (!isBlankAddress(loc)) locById.set(id, loc);
    }

    for (const meter of meters) {
      if (formatMeterInstallAddress(meter) !== "-") continue;
      const cid = Number(meter.collectorId);
      const loc = locById.get(cid);
      if (loc) meter.collectorInstallAddress = loc;
    }
  } catch (error) {
    console.warn("补全采集器安装位置失败:", error);
  }

  return meters;
}
