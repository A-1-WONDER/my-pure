import { describe, expect, it } from "vitest";
import {
  coerceOnlineCode,
  extractCurrentOnlineStatus,
  getOnlineStatusDisplay,
  pickCurrentOnlineStatus,
  resolveMeterListOnlineDisplay
} from "./device-online-status";

describe("device-online-status", () => {
  it("maps 3.2 device status correctly (0 offline, 1 online)", () => {
    expect(getOnlineStatusDisplay(0).text).toBe("离线");
    expect(getOnlineStatusDisplay(1).text).toBe("在线");
    expect(getOnlineStatusDisplay(3).text).toBe("故障");
  });

  it("maps boolean onlineStatus", () => {
    expect(getOnlineStatusDisplay(true).text).toBe("在线");
    expect(getOnlineStatusDisplay(false).text).toBe("离线");
    expect(coerceOnlineCode(true)).toBe(1);
    expect(coerceOnlineCode(false)).toBe(0);
    expect(coerceOnlineCode(0)).toBe(0);
  });

  it("list display prefers onlineCode / collectorOnline and never shows 未知", () => {
    expect(
      resolveMeterListOnlineDisplay({ onlineCode: 1, status: 0 }).text
    ).toBe("在线");
    expect(
      resolveMeterListOnlineDisplay({ collectorOnline: 0, status: 1 }).text
    ).toBe("离线");
    expect(resolveMeterListOnlineDisplay({}).text).toBe("离线");
    expect(resolveMeterListOnlineDisplay({ signalStrength: 25 }).text).toBe(
      "在线"
    );
  });

  it("extracts status from detail response", () => {
    expect(
      extractCurrentOnlineStatus({
        status: 1,
        onlineStatus: true,
        lastStatus: 0
      })
    ).toBe(1);
    expect(pickCurrentOnlineStatus({ onlineCode: 0, status: 1 })).toBe(0);
  });
});
