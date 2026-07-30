import { describe, expect, it } from "vitest";
import {
  buildCollectorOnlineMap,
  coerceOnlineCode,
  extractCurrentOnlineStatus,
  getOnlineStatusDisplay,
  meterRowMatchesOnlineFilter,
  pickCurrentOnlineStatus,
  resolveMeterListOnlineDisplay,
  stampMetersWithCollectorOnline
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

  it("list display prefers onlineCode / realtime and never shows 未知", () => {
    expect(
      resolveMeterListOnlineDisplay({ onlineCode: 1, status: 0 }).text
    ).toBe("在线");
    expect(
      resolveMeterListOnlineDisplay({ collectorOnline: 0, status: 1 }).text
    ).toBe("离线");
    expect(resolveMeterListOnlineDisplay({}).text).toBe("离线");
    // 信号强度不得冒充在线（库默认常为 25）
    expect(resolveMeterListOnlineDisplay({ signalStrength: 25 }).text).toBe(
      "离线"
    );
    // meters.status 是启用位，不作在线依据
    expect(resolveMeterListOnlineDisplay({ status: 1 }).text).toBe("离线");
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

  it("ignores lastStatus for list display", () => {
    expect(
      resolveMeterListOnlineDisplay({
        lastStatus: 0,
        laststatus: 0,
        onlineCode: 1
      }).text
    ).toBe("在线");
    expect(
      resolveMeterListOnlineDisplay({
        lastStatus: 0,
        collectorOnline: 1
      }).text
    ).toBe("在线");
  });

  it("stamps meters from collector online map without signal fallback", () => {
    const map = buildCollectorOnlineMap([
      { id: 10, status: 1 },
      { id: 11, status: 0 }
    ]);
    const rows = stampMetersWithCollectorOnline(
      [
        { id: 1, collectorId: 10 },
        { id: 2, collectorId: 11 },
        { id: 3, collectorId: 99, signalStrength: 20 }
      ],
      map
    );
    expect(resolveMeterListOnlineDisplay(rows[0]).text).toBe("在线");
    expect(resolveMeterListOnlineDisplay(rows[1]).text).toBe("离线");
    expect(resolveMeterListOnlineDisplay(rows[2]).text).toBe("离线");
  });

  it("prefers meter realtime onlineStatus over offline collector", () => {
    const map = buildCollectorOnlineMap([{ id: 10, status: 0 }]);
    const rows = stampMetersWithCollectorOnline(
      [
        { id: 1, collectorId: 10, onlineStatus: true },
        { id: 2, collectorId: 10, onlineStatus: false },
        { id: 3, collectorId: 10 }
      ],
      map
    );
    expect(resolveMeterListOnlineDisplay(rows[0]).text).toBe("在线");
    expect(resolveMeterListOnlineDisplay(rows[1]).text).toBe("离线");
    expect(resolveMeterListOnlineDisplay(rows[2]).text).toBe("离线");
  });

  it("preferCollector follows collector status over stale meter onlineCode", () => {
    const map = buildCollectorOnlineMap([
      { id: 10, status: 1 },
      { id: 11, status: 0 }
    ]);
    const rows = stampMetersWithCollectorOnline(
      [
        { id: 1, collectorId: 10, onlineCode: 0, onlineStatus: false },
        { id: 2, collectorId: 11, onlineCode: 1, onlineStatus: true },
        { id: 3, collectorId: 99, onlineCode: 1 }
      ],
      map,
      { preferCollector: true }
    );
    expect(resolveMeterListOnlineDisplay(rows[0]).text).toBe("在线");
    expect(resolveMeterListOnlineDisplay(rows[1]).text).toBe("离线");
    expect(resolveMeterListOnlineDisplay(rows[2]).text).toBe("在线");
  });

  it("matches filter NORMAL/OFFLINE against display text", () => {
    expect(meterRowMatchesOnlineFilter({ onlineCode: 1 }, "NORMAL")).toBe(true);
    expect(meterRowMatchesOnlineFilter({ onlineCode: 0 }, "OFFLINE")).toBe(
      true
    );
    expect(meterRowMatchesOnlineFilter({ onlineCode: 1 }, "OFFLINE")).toBe(
      false
    );
  });
});
