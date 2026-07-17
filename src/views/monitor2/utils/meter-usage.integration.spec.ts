import { afterEach, describe, expect, it, vi } from "vitest";

const {
  getCollectorList,
  getDeviceHourPower,
  getDeviceDayPower,
  getDeviceMonthPower,
  getDeviceYearPower
} = vi.hoisted(() => ({
  getCollectorList: vi.fn(),
  getDeviceHourPower: vi.fn(),
  getDeviceDayPower: vi.fn(),
  getDeviceMonthPower: vi.fn(),
  getDeviceYearPower: vi.fn()
}));

vi.mock("@/api/collector", () => ({ getCollectorList }));
vi.mock("@/api/business-stats", () => ({
  extractDayPowerValueFromResponse: (r: any) => Number(r?.dayPower ?? 0),
  extractMonthPowerValueFromResponse: (r: any) => Number(r?.monthPower ?? 0),
  extractYearPowerValue: (r: any) => Number(r?.yearPower ?? 0),
  getDeviceDayPower,
  getDeviceHourPower,
  getDeviceMonthPower,
  getDeviceYearPower
}));

import { enrichMetersWithCollectorLocation } from "./meter-display";
import {
  getMeterUsageCache,
  invalidateMeterUsageCache,
  prefetchMeterUsageSummary
} from "./meter-usage-stats";

describe("meter display + usage stats integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
    invalidateMeterUsageCache();
  });

  it("enriches blank meter address from collector list", async () => {
    getCollectorList.mockResolvedValue({
      content: [
        { id: 5, installAddress: "生产1楼·货运电梯强电间" },
        { id: 6, location: "-" }
      ]
    });

    const meters = [
      { id: 1, collectorId: 5, installAddress: "-" },
      { id: 2, collectorId: 5, installAddress: "已有地址" }
    ];
    const enriched = await enrichMetersWithCollectorLocation(meters);
    expect(enriched[0].collectorInstallAddress).toBe("生产1楼·货运电梯强电间");
    expect(enriched[1].collectorInstallAddress).toBeUndefined();
  });

  it("prefetches usage summary into session cache", async () => {
    getDeviceHourPower.mockResolvedValue({
      hours: [
        { hour: 0, hourPower: 1 },
        { hour: 1, hourPower: 2 }
      ]
    });
    getDeviceDayPower.mockResolvedValue({ dayPower: 12.5 });
    getDeviceMonthPower.mockResolvedValue({ monthPower: 100 });
    getDeviceYearPower.mockResolvedValue({ yearPower: 1000 });

    const entry = await prefetchMeterUsageSummary(88, "2026-07-17");
    expect(entry.summary?.todayPower).toBe(12.5);
    expect(entry.summary?.currentMonthPower).toBe(100);
    expect(entry.summary?.currentYearPower).toBe(1000);
    expect(entry.hourSeries?.length).toBe(24);

    const cached = getMeterUsageCache(88, "2026-07-17");
    expect(cached.summary?.todayPower).toBe(12.5);

    getDeviceHourPower.mockClear();
    await prefetchMeterUsageSummary(88, "2026-07-17");
    expect(getDeviceHourPower).not.toHaveBeenCalled();
  });
});
