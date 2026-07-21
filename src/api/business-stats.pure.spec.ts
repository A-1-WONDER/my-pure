import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/http", () => ({
  http: { request: vi.fn() }
}));

vi.mock("@/api/types", () => ({}));

import {
  extractMeterRowsFromApiResponse,
  formatTimeKey,
  countStatsDevices,
  resolveMeterRowDeviceId,
  unwrapEnergyStatisticsSummaryResponse
} from "@/api/business-stats";

describe("extractMeterRowsFromApiResponse", () => {
  it("reads content from common wrappers", () => {
    expect(extractMeterRowsFromApiResponse({ content: [{ id: 1 }] })).toEqual([
      { id: 1 }
    ]);
    expect(
      extractMeterRowsFromApiResponse({ data: { content: [{ id: 2 }] } })
    ).toEqual([{ id: 2 }]);
    expect(extractMeterRowsFromApiResponse([{ id: 3 }])).toEqual([{ id: 3 }]);
    expect(extractMeterRowsFromApiResponse(null as any)).toEqual([]);
  });
});

describe("resolveMeterRowDeviceId", () => {
  it("parses valid id only", () => {
    expect(resolveMeterRowDeviceId({ id: 12 })).toBe(12);
    expect(resolveMeterRowDeviceId({ id: "15" })).toBe(15);
    expect(resolveMeterRowDeviceId({ id: null })).toBeNull();
    expect(resolveMeterRowDeviceId({ id: "x" })).toBeNull();
  });
});

describe("formatTimeKey", () => {
  it("formats hour/day/month/year keys", () => {
    expect(formatTimeKey("2026071710", "hour")).toBe("2026-07-17 10:00");
    expect(formatTimeKey("20260717", "day")).toBe("2026-07-17");
    expect(formatTimeKey("202607", "month")).toBe("2026-07");
    expect(formatTimeKey("2026", "year")).toBe("2026年");
  });
});

describe("countStatsDevices", () => {
  it("counts unique devices including zero consumption", () => {
    expect(
      countStatsDevices([
        { meterId: 1, totalConsumption: 0 } as any,
        { meterId: 2, totalConsumption: 1.2 } as any,
        { meterId: 1, totalConsumption: 0.5 } as any
      ])
    ).toBe(2);
  });

  it("falls back to meterNo when meterId missing", () => {
    expect(
      countStatsDevices([
        { meterNo: "A", totalConsumption: 0 } as any,
        { meterNo: "B", totalConsumption: 0 } as any,
        { meterNo: "A", totalConsumption: 3 } as any
      ])
    ).toBe(2);
  });
});

describe("unwrapEnergyStatisticsSummaryResponse", () => {
  it("unwraps nested dto", () => {
    const dto = { dimension: "hour", data: {} };
    expect(unwrapEnergyStatisticsSummaryResponse(dto as any)).toEqual(dto);
    expect(
      unwrapEnergyStatisticsSummaryResponse({ success: true, data: dto } as any)
    ).toEqual(dto);
  });
});
