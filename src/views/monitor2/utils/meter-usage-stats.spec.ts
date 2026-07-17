import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/business-stats", () => ({
  extractDayPowerValueFromResponse: () => 0,
  extractMonthPowerValueFromResponse: () => 0,
  extractYearPowerValue: () => 0,
  getDeviceDayPower: vi.fn(),
  getDeviceHourPower: vi.fn(),
  getDeviceMonthPower: vi.fn(),
  getDeviceYearPower: vi.fn()
}));

import {
  getMeterUsageCache,
  invalidateMeterUsageCache,
  normalizeUsageAnchorDate,
  parseHourPowerSeries
} from "./meter-usage-stats";

describe("normalizeUsageAnchorDate", () => {
  it("formats valid date to YYYY-MM-DD", () => {
    expect(normalizeUsageAnchorDate("2026-07-17")).toBe("2026-07-17");
    expect(normalizeUsageAnchorDate(new Date("2026-07-17T12:00:00"))).toBe(
      "2026-07-17"
    );
  });

  it("falls back to today-like valid date when invalid", () => {
    const result = normalizeUsageAnchorDate("not-a-date");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseHourPowerSeries", () => {
  it("builds 24 points and sums day total", () => {
    const { series, todaySum } = parseHourPowerSeries({
      hours: [
        { hour: 0, hourPower: 1.5 },
        { hour: 1, power: 2.5 }
      ]
    });
    expect(series).toHaveLength(24);
    expect(series[0].power).toBe(1.5);
    expect(series[1].power).toBe(2.5);
    expect(series[2].power).toBe(0);
    expect(todaySum).toBe(4);
  });

  it("sets currentHourPower to 0 for historical date", () => {
    const { currentHourPower } = parseHourPowerSeries(
      {
        hours: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          hourPower: 10
        }))
      },
      "2020-01-01"
    );
    expect(currentHourPower).toBe(0);
  });
});

describe("usage cache key by date", () => {
  afterEach(() => {
    invalidateMeterUsageCache();
  });

  it("keeps different dates isolated for same meter", () => {
    const a = getMeterUsageCache(1, "2026-07-01");
    const b = getMeterUsageCache(1, "2026-07-02");
    a.summaryError = "a";
    expect(b.summaryError).toBe("");
    expect(a.anchorDate).toBe("2026-07-01");
    expect(b.anchorDate).toBe("2026-07-02");
  });
});
