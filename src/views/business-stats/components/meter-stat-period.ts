import type { MeterStatItem } from "@/api/business-stats";

export type MeterStatDetailPeriod = "hour" | "day" | "month" | "year";

/** 明细表与导出共用的固定列（不含用电量列） */
export const METER_STAT_DETAIL_FIXED_HEADERS = [
  "序号",
  "标签",
  "采集器",
  "在线状态",
  "通讯地址",
  "用能单位",
  "电表类型",
  "备注"
] as const;

/** 各统计维度仅文案不同，列表结构复用同一套 */
export const METER_STAT_PERIOD_META: Record<
  MeterStatDetailPeriod,
  {
    consumptionLabel: string;
    exportConsumptionLabel: string;
    sheetName: string;
    filePrefix: string;
    buildRemark: (date: string, hour?: number) => string;
    buildTitle: (date: string, hour?: number) => string;
  }
> = {
  hour: {
    consumptionLabel: "本小时用电量",
    exportConsumptionLabel: "本小时用电量(kWh)",
    sheetName: "小时用电明细",
    filePrefix: "小时用电明细",
    // date 可能已是 formatTimeKey 的「yyyy-MM-dd HH:00」，避免再拼一次小时
    buildRemark: (date, hour) =>
      /\d{1,2}:\d{2}/.test(String(date || ""))
        ? `${date} 时段统计`
        : `${date} ${String(hour ?? 0).padStart(2, "0")}:00 时段统计`,
    buildTitle: (date, hour) =>
      /\d{1,2}:\d{2}/.test(String(date || ""))
        ? `电表明细 - ${date}`
        : `电表明细 - ${date} ${String(hour ?? 0).padStart(2, "0")}:00`
  },
  day: {
    consumptionLabel: "本日用电量",
    exportConsumptionLabel: "本日用电量(kWh)",
    sheetName: "日用电明细",
    filePrefix: "日用电明细",
    buildRemark: date => `${date} 日统计`,
    buildTitle: date => `电表明细 - ${date}`
  },
  month: {
    consumptionLabel: "本月用电量",
    exportConsumptionLabel: "本月用电量(kWh)",
    sheetName: "月用电明细",
    filePrefix: "月用电明细",
    buildRemark: date => `${date} 月统计`,
    buildTitle: date => `电表明细 - ${date}`
  },
  year: {
    consumptionLabel: "本年用电量",
    exportConsumptionLabel: "本年用电量(kWh)",
    sheetName: "年用电明细",
    filePrefix: "年用电明细",
    buildRemark: date => `${date} 年统计`,
    buildTitle: date => `电表明细 - ${date}`
  }
};

/** 页面表头：固定列 + 用电量 + 其他 */
export function getDetailTableHeaders(period: MeterStatDetailPeriod): string[] {
  const meta = METER_STAT_PERIOD_META[period] ?? METER_STAT_PERIOD_META.hour;
  return [...METER_STAT_DETAIL_FIXED_HEADERS, meta.consumptionLabel, "其他"];
}

/** 导出表头：与页面一致，用电量列带 (kWh) 单位后缀 */
export function getDetailExportHeaders(
  period: MeterStatDetailPeriod
): string[] {
  const meta = METER_STAT_PERIOD_META[period] ?? METER_STAT_PERIOD_META.hour;
  return [
    ...METER_STAT_DETAIL_FIXED_HEADERS,
    meta.exportConsumptionLabel,
    "其他"
  ];
}

export type OpenMeterStatDetailOptions = {
  period: MeterStatDetailPeriod;
  date: string;
  hour?: number;
  totalConsumption: number;
  meterStats: MeterStatItem[];
  meterType?: string;
};
