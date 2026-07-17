import type { MeterStatItem } from "@/api/business-stats";

export type MeterStatDetailPeriod = "hour" | "day" | "month" | "year";

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

export type OpenMeterStatDetailOptions = {
  period: MeterStatDetailPeriod;
  date: string;
  hour?: number;
  totalConsumption: number;
  meterStats: MeterStatItem[];
  meterType?: string;
};
