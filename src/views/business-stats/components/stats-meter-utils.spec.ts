import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/meters", () => ({ getMeterList: vi.fn() }));
vi.mock("@/api/collector", () => ({ getCollectorList: vi.fn() }));
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
  chunkArray,
  filterMetersByCollectorIds,
  formatCollectorDisplay,
  meterIdsFromRows
} from "./stats-meter-utils";

describe("chunkArray", () => {
  it("splits by fixed size", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("filterMetersByCollectorIds", () => {
  const rows = [
    { id: 1, collectorId: 10 },
    { id: 2, collectorId: 20 },
    { id: 3, collectorId: 10 }
  ];

  it("returns all when no collector selected", () => {
    expect(filterMetersByCollectorIds(rows, null)).toHaveLength(3);
    expect(filterMetersByCollectorIds(rows, [])).toHaveLength(3);
  });

  it("keeps only selected collectors", () => {
    expect(filterMetersByCollectorIds(rows, [10])).toEqual([
      { id: 1, collectorId: 10 },
      { id: 3, collectorId: 10 }
    ]);
  });
});

describe("formatCollectorDisplay", () => {
  it("prefers name over number", () => {
    expect(
      formatCollectorDisplay({
        collectorName: "采集器-866",
        collectorNo: "866042",
        collectorId: 1
      })
    ).toBe("采集器-866");
  });

  it("falls back to number then id", () => {
    expect(formatCollectorDisplay({ collectorNo: "NO-1" })).toBe("NO-1");
    expect(formatCollectorDisplay({ collectorId: 9 })).toBe("采集器9");
    expect(formatCollectorDisplay({})).toBe("-");
  });
});

describe("archive maps", () => {
  it("indexes by id and meterNo", () => {
    const rows = [
      { id: 1, meterNo: "A" },
      { id: 2, meterNo: "B" }
    ];
    expect(buildMeterArchiveMap(rows).get(1)?.meterNo).toBe("A");
    expect(buildMeterArchiveByNoMap(rows).get("B")?.id).toBe(2);
    expect(meterIdsFromRows(rows)).toEqual(new Set([1, 2]));
  });
});
