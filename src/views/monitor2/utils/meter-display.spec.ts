import { describe, expect, it } from "vitest";
import {
  formatMeterEnergyUnit,
  formatMeterInstallAddress,
  isBlankAddress
} from "./meter-display";

describe("isBlankAddress", () => {
  it("treats empty and placeholders as blank", () => {
    expect(isBlankAddress(null)).toBe(true);
    expect(isBlankAddress("")).toBe(true);
    expect(isBlankAddress("  ")).toBe(true);
    expect(isBlankAddress("-")).toBe(true);
    expect(isBlankAddress("—")).toBe(true);
    expect(isBlankAddress("无")).toBe(true);
    expect(isBlankAddress("null")).toBe(true);
  });

  it("keeps real addresses", () => {
    expect(isBlankAddress("生产2楼·SMT1")).toBe(false);
  });
});

describe("formatMeterEnergyUnit", () => {
  it("prefers collector name", () => {
    expect(
      formatMeterEnergyUnit({
        collectorName: "采集器-866",
        userName: "张三",
        userId: 1
      })
    ).toBe("采集器-866");
  });

  it("does not treat raw userId as name", () => {
    expect(formatMeterEnergyUnit({ userId: 302, userName: "302" })).toBe("-");
    expect(formatMeterEnergyUnit({ userId: 302 })).toBe("-");
  });

  it("accepts real userName when not numeric-only", () => {
    expect(formatMeterEnergyUnit({ userName: "注塑车间", userId: 9 })).toBe(
      "注塑车间"
    );
  });

  it("falls back to remark", () => {
    expect(formatMeterEnergyUnit({ remark: "备用备注" })).toBe("备用备注");
  });
});

describe("formatMeterInstallAddress", () => {
  it("skips placeholder meter address and uses collector location", () => {
    expect(
      formatMeterInstallAddress({
        installAddress: "-",
        collectorInstallAddress: "生产1楼 · 注塑车间"
      })
    ).toBe("生产1楼 · 注塑车间");
  });

  it("prefers real meter installAddress", () => {
    expect(
      formatMeterInstallAddress({
        installAddress: "电表侧地址",
        collectorInstallAddress: "采集器侧地址"
      })
    ).toBe("电表侧地址");
  });

  it("returns dash when nothing valid", () => {
    expect(formatMeterInstallAddress({ installAddress: "-" })).toBe("-");
    expect(formatMeterInstallAddress(null)).toBe("-");
  });
});
