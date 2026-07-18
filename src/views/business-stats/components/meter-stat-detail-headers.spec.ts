import { describe, expect, it } from "vitest";
import {
  getDetailExportHeaders,
  getDetailTableHeaders,
  METER_STAT_DETAIL_FIXED_HEADERS,
  METER_STAT_PERIOD_META,
  type MeterStatDetailPeriod
} from "./meter-stat-period";
import {
  buildDetailRowFromMeterStat,
  mergeDetailRowsByMeterId
} from "./meter-stat-detail-enrich";

describe("detail export vs table headers", () => {
  const periods: MeterStatDetailPeriod[] = ["hour", "day", "month", "year"];

  it("keeps fixed headers identical between table and export", () => {
    for (const period of periods) {
      const table = getDetailTableHeaders(period);
      const exp = getDetailExportHeaders(period);
      expect(table.slice(0, 8)).toEqual([...METER_STAT_DETAIL_FIXED_HEADERS]);
      expect(exp.slice(0, 8)).toEqual([...METER_STAT_DETAIL_FIXED_HEADERS]);
      expect(table[table.length - 1]).toBe("其他");
      expect(exp[exp.length - 1]).toBe("其他");
      expect(table).toContain("通讯地址");
      expect(table).toContain("用能单位");
      expect(exp).toContain("通讯地址");
      expect(exp).toContain("用能单位");
    }
  });

  it("export consumption label is table label plus kWh unit", () => {
    for (const period of periods) {
      const meta = METER_STAT_PERIOD_META[period];
      expect(meta.exportConsumptionLabel).toBe(`${meta.consumptionLabel}(kWh)`);
      expect(getDetailExportHeaders(period)).toContain(
        meta.exportConsumptionLabel
      );
      expect(getDetailTableHeaders(period)).toContain(meta.consumptionLabel);
    }
  });
});

describe("archive/collector degrade still yields rows", () => {
  it("keeps mid placeholder row when archive and collector maps are empty", () => {
    const row = buildDetailRowFromMeterStat(
      { meterName: "mid:302", totalConsumption: 12.5 },
      undefined,
      new Map(),
      { remark: "2026-07-17 10:00 时段统计" }
    );
    expect(row.id).toBe(302);
    expect(row.totalConsumption).toBe(12.5);
    expect(row.meterNo).toBe("302");
    expect(row.collectorName).toBeUndefined();
    expect(row.meterAddress).toBeUndefined();

    const merged = mergeDetailRowsByMeterId([row]);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalConsumption).toBe(12.5);
  });
});
