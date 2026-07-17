import { afterEach, describe, expect, it, vi } from "vitest";

const { getMeterList, getCollectorList } = vi.hoisted(() => ({
  getMeterList: vi.fn(),
  getCollectorList: vi.fn()
}));

vi.mock("@/api/meters", () => ({ getMeterList }));
vi.mock("@/api/collector", () => ({ getCollectorList }));
vi.mock("@/api/business-stats", () => ({
  DAY_POWER_BATCH_SIZE: 100,
  STATS_METER_PAGE_SIZE: 100,
  extractDayPowerValueFromResponse: () => 0,
  extractMeterRowsFromApiResponse: (r: any) => r?.content ?? [],
  getDeviceDayPowerBatch: vi.fn(),
  resolveMeterRowDeviceId: (row: any) => {
    const n = Number(row?.id);
    return Number.isFinite(n) ? n : null;
  }
}));

import {
  buildMeterArchiveByNoMap,
  buildMeterArchiveMap,
  formatCollectorDisplay,
  loadScopedStatsMeters
} from "./stats-meter-utils";
import {
  buildDetailRowFromMeterStat,
  mergeDetailRowsByMeterId,
  resolveDetailArchive,
  resolveDetailMeterId
} from "./meter-stat-detail-enrich";

describe("stats + detail enrich integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("scopes meters by collector then enriches detail row with name and address", async () => {
    getMeterList.mockResolvedValue({
      content: [
        {
          id: 10,
          meterNo: "A10",
          collectorId: 100,
          collectorName: "采集器-100",
          collectorNo: "NO-100"
        },
        {
          id: 20,
          meterNo: "B20",
          collectorId: 200,
          collectorName: "采集器-200"
        },
        {
          id: 30,
          meterNo: "C30",
          collectorId: 100,
          collectorNo: "NO-100"
        }
      ]
    });
    getCollectorList.mockResolvedValue({
      content: [
        {
          id: 100,
          collectorName: "采集器-100",
          installAddress: "生产1楼·注塑"
        },
        {
          id: 200,
          collectorName: "采集器-200",
          installAddress: "生产2楼"
        }
      ]
    });

    const { meterRows, allowedIds } = await loadScopedStatsMeters({
      collectorIds: [100]
    });
    expect(meterRows).toHaveLength(2);
    expect(allowedIds).toEqual(new Set([10, 30]));

    const byId = buildMeterArchiveMap(meterRows);
    const byNo = buildMeterArchiveByNoMap(meterRows);
    const collectorById = new Map([
      [100, { label: "采集器-100", installAddress: "生产1楼·注塑" }]
    ]);

    const midStat = {
      meterName: "mid:10",
      totalConsumption: 1.5
    };
    expect(resolveDetailMeterId(midStat)).toBe(10);
    const archive = resolveDetailArchive(midStat, byId, byNo);
    const row = buildDetailRowFromMeterStat(midStat, archive, collectorById, {
      remark: "2026-07-17 10:00"
    });

    expect(row.id).toBe(10);
    expect(row.meterNo).toBe("A10");
    expect(formatCollectorDisplay(row)).toBe("采集器-100");
    expect(row.meterAddress).toBe("生产1楼·注塑");
    expect(row.userName).toBe("采集器-100");
    expect(row.remark).toBe("2026-07-17 10:00");

    const merged = mergeDetailRowsByMeterId([
      { ...row, totalConsumption: 1.5 },
      { ...row, totalConsumption: 2.5 }
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalConsumption).toBe(4);
  });

  it("falls back to meterNo archive when meterId missing", () => {
    const byId = new Map<number, Record<string, any>>();
    const byNo = new Map([
      [
        "X99",
        {
          id: 99,
          meterNo: "X99",
          collectorId: 7,
          collectorName: "采集器-7"
        }
      ]
    ]);
    const archive = resolveDetailArchive(
      { meterNo: "X99", totalConsumption: 3 },
      byId,
      byNo
    );
    const row = buildDetailRowFromMeterStat(
      { meterNo: "X99", totalConsumption: 3 },
      archive,
      new Map([[7, { label: "采集器-7", installAddress: "电梯强电间" }]])
    );
    expect(row.id).toBe(99);
    expect(row.collectorName).toBe("采集器-7");
    expect(row.meterAddress).toBe("电梯强电间");
  });
});
