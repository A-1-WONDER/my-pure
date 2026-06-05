import type { AxiosRequestConfig } from "axios";
import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 单设备用电量接口：404 视为「无数据」而非抛错，避免控制台与 Promise 异常 */
const devicePowerHttpConfig: AxiosRequestConfig = {
  validateStatus: status => (status >= 200 && status < 300) || status === 404
};

/**
 * 用电量统计接口
 * 基础路径：/api/external/energy-statistics/summary
 * 注意：此接口已加 @AnonymousAccess，不需要登录 token
 */

// 统计维度类型
export type StatsDimension = "hour" | "day" | "month" | "year";

// 统计查询参数类型
export interface EnergyStatsQueryParams {
  dimension: StatsDimension;
  startTime: string;
  endTime: string;
  ignoreRadio?: 0 | 1; // 0：不忽略互感器变比，1：忽略互感器变比
}

// 电表统计项类型
export interface MeterStatItem {
  meterId: number;
  meterNo: string;
  meterName: string;
  totalConsumption: number; // 总用电量（kWh）
  peakConsumption?: number; // 尖时用电量
  highConsumption?: number; // 峰时用电量
  normalConsumption?: number; // 平时用电量
  valleyConsumption?: number; // 谷时用电量
  deepValleyConsumption?: number; // 深谷用电量
  startTime: string;
  endTime: string;
  transformerRatio?: number; // 变比 r
}

// 统计响应数据类型
export interface EnergyStatisticsSummaryDto {
  status: number; // 1 成功，0 失败
  msg?: string; // 失败原因
  dimension: StatsDimension;
  startTime: string;
  endTime: string;
  data: {
    [timeKey: string]: MeterStatItem[];
  };
}

// 前端展示用的统计数据格式
export interface StatsDisplayData {
  timeKey: string;
  date: string; // 格式化后的日期
  hour?: number; // 小时统计特有
  totalConsumption: number; // 总用电量
  deviceCount: number; // 设备数量
  meterStats: MeterStatItem[]; // 详细的电表统计数据
}

export interface DeviceDayPowerResponse {
  deviceId: number;
  meterNo: string;
  date: string;
  dayPower?: number;
  power?: number;
  source?: string;
  raw?: {
    boxNo?: string;
    power?: number;
    onlineTime?: number;
    runTime?: number;
    waitTime?: number;
    faultTime?: number;
  };
}

export interface DeviceHourPowerItem {
  hour?: number;
  hourKey?: string;
  hourPower?: number;
  power?: number;
  detail?: any;
}

export interface DeviceHourPowerResponse {
  deviceId: number;
  meterNo: string;
  date: string;
  hours?: DeviceHourPowerItem[];
}

/** 单设备月用电量（GET .../device/{id}/month-power） */
export interface DeviceMonthPowerResponse {
  deviceId: number;
  meterNo?: string;
  yearMonth?: string;
  monthPower?: number;
  power?: number;
  daysInMonth?: number;
  daysWithDayCount?: number;
  source?: string;
  aggregation?: string;
}

/** 月统计单设备接口通常较慢，单独放宽超时 */
const DEVICE_MONTH_POWER_TIMEOUT_MS = 30000;

/** 单设备年用电量（GET .../device/{id}/year-power） */
export interface DeviceYearPowerResponse {
  deviceId: number;
  meterNo?: string;
  year?: string;
  yearPower?: number;
  power?: number;
  daysInYear?: number;
  daysWithDayCount?: number;
  source?: string;
  aggregation?: string;
}

/** 年统计单设备接口通常较慢，单独放宽超时 */
const DEVICE_YEAR_POWER_TIMEOUT_MS = 30000;

/**
 * 从电表分页接口响应中取行列表（axios 已解包一层，故常见顶层 content / list）
 */
export const extractMeterRowsFromApiResponse = (
  response: Record<string, any>
): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(response.content)) return response.content;
  if (Array.isArray(response.list)) return response.list;
  if (Array.isArray(response.records)) return response.records;
  return [];
};

/**
 * 能耗接口路径 device/{deviceId}/… 中的 deviceId，必须与电表列表单条记录的 id 一致。
 */
export const resolveMeterRowDeviceId = (
  row: Record<string, any>
): number | null => {
  const raw = row?.id;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
};

/** 从单层对象中读取第一个存在的数值字段（含 0）；均无则 undefined */
const readFirstNumericField = (
  obj: Record<string, any>,
  keys: string[]
): number | undefined => {
  for (const key of keys) {
    const v = obj[key];
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/**
 * 单设备用电量接口响应常为 Result 包装，电量在 data / data.data / result 等层；
 * 按层依次尝试，避免整包 { code, message } 被当成 payload 导致永远解析为 0。
 */
const extractPowerFromDeviceResponse = (
  response: Record<string, any>,
  keys: string[]
): number => {
  const r = response ?? {};
  const layers: unknown[] = [r.data?.data, r.data?.result, r.data, r.result, r];
  for (const layer of layers) {
    if (
      !layer ||
      typeof layer !== "object" ||
      Array.isArray(layer) ||
      layer instanceof Date
    ) {
      continue;
    }
    const layerObj = layer as Record<string, any>;
    const v = readFirstNumericField(layerObj, keys);
    if (v !== undefined) return v;
    const nested = layerObj.raw;
    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      !(nested instanceof Date)
    ) {
      const vr = readFirstNumericField(nested as Record<string, any>, keys);
      if (vr !== undefined) return vr;
    }
  }
  return 0;
};

/** 单设备年用电量响应中解析 kWh（兼容多种后端字段名与包装层） */
export const extractYearPowerValue = (response: Record<string, any>) =>
  extractPowerFromDeviceResponse(response, [
    "yearPower",
    "annualPower",
    "yearTotalPower",
    "power",
    "totalPower",
    "totalConsumption",
    "totalKwh",
    "kwh",
    "value",
    "energy",
    "sumPower",
    "totalEnergy"
  ]);

/** 单设备月用电量响应中解析 kWh */
export const extractMonthPowerValueFromResponse = (
  response: Record<string, any>
) =>
  extractPowerFromDeviceResponse(response, [
    "monthPower",
    "power",
    "totalPower",
    "totalConsumption",
    "totalKwh",
    "kwh",
    "value",
    "energy",
    "sumPower",
    "totalEnergy"
  ]);

/** 单设备日用电量响应中解析 kWh */
export const extractDayPowerValueFromResponse = (
  response: Record<string, any>
) =>
  extractPowerFromDeviceResponse(response, [
    "dayPower",
    "power",
    "totalPower",
    "totalConsumption",
    "totalKwh",
    "kwh",
    "value",
    "energy",
    "sumPower",
    "totalEnergy"
  ]);

const isEnergySummaryDto = (v: unknown): v is EnergyStatisticsSummaryDto => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  // 兼容后端返回数字 1 或字符串 "1"
  const ok = Number(o.status) === 1;
  return (
    ok &&
    typeof o.dimension === "string" &&
    o.data !== undefined &&
    typeof o.data === "object"
  );
};

/**
 * 解析 /summary 接口响应体（兼容多种后端包装）
 * - 直接返回 EnergyStatisticsSummaryDto
 * - { success, data: DTO }（如 mock 的 resultSuccess）
 * - { code, data: DTO }（Spring Result 等）
 */
export const unwrapEnergyStatisticsSummaryResponse = (
  response: Record<string, any> | null | undefined
): EnergyStatisticsSummaryDto | null => {
  if (!response || typeof response !== "object") return null;
  if (isEnergySummaryDto(response)) return response;
  const inner = response.data;
  if (isEnergySummaryDto(inner)) return inner;
  if (inner?.data && isEnergySummaryDto(inner.data)) return inner.data;
  return null;
};

/** 业务失败或 HTTP 包装时的错误文案 */
export const getEnergyStatisticsSummaryErrorMessage = (
  response: Record<string, any> | null | undefined
): string => {
  if (!response) return "查询失败";
  const inner = response.data;
  if (inner && typeof inner === "object" && inner.status === 0 && inner.msg) {
    return String(inner.msg);
  }
  return (
    inner?.msg ||
    response.msg ||
    inner?.message ||
    response.message ||
    "查询失败"
  );
};

/**
 * 获取用电量统计汇总数据
 * GET /api/external/energy-statistics/summary
 * 参数：dimension(维度), startTime(开始时间), endTime(结束时间), ignoreRadio(可选)
 * 注意：此接口不需要登录token
 */
/** 汇总接口常涉及大范围聚合，后端可能较慢，单独放宽超时（默认 axios 为 10s） */
const ENERGY_SUMMARY_TIMEOUT_MS = 120000;

export const getEnergyStatisticsSummary = (
  params: EnergyStatsQueryParams,
  timeoutMs = ENERGY_SUMMARY_TIMEOUT_MS
) => {
  // console.log("【business-stats.ts】获取用电量统计汇总数据");
  // console.log("【business-stats.ts】请求参数:", params);
  // console.log(
  //   "【business-stats.ts】请求URL: /api/external/energy-statistics/summary"
  // );

  return http.request<Result<EnergyStatisticsSummaryDto>>(
    "get",
    "/api/external/energy-statistics/summary",
    {
      params,
      timeout: timeoutMs
    }
  );
};

/**
 * 获取单个设备日用电量
 * GET /api/external/energy-statistics/device/{deviceId}/day-power
 */
export const getDeviceDayPower = (deviceId: number, date: string) => {
  return http.request<DeviceDayPowerResponse>(
    "get",
    `/api/external/energy-statistics/device/${deviceId}/day-power`,
    {
      params: { date },
      ...devicePowerHttpConfig
    }
  );
};

/**
 * 获取单个设备小时用电量
 * GET /api/external/energy-statistics/device/{deviceId}/hour-power
 */
export const getDeviceHourPower = (deviceId: number, date: string) => {
  return http.request<DeviceHourPowerResponse>(
    "get",
    `/api/external/energy-statistics/device/${deviceId}/hour-power`,
    {
      params: { date },
      ...devicePowerHttpConfig
    }
  );
};

/**
 * 获取单个设备月用电量
 * GET /api/external/energy-statistics/device/{deviceId}/month-power
 * @param yearMonth 自然月，支持 yyyyMM 或 yyyy-MM
 */
export const getDeviceMonthPower = (deviceId: number, yearMonth: string) => {
  return http.request<DeviceMonthPowerResponse>(
    "get",
    `/api/external/energy-statistics/device/${deviceId}/month-power`,
    {
      params: { yearMonth },
      timeout: DEVICE_MONTH_POWER_TIMEOUT_MS,
      ...devicePowerHttpConfig
    }
  );
};

/**
 * 获取单个设备年用电量
 * GET /api/external/energy-statistics/device/{deviceId}/year-power
 * @param year 四位年份 yyyy
 */
export const getDeviceYearPower = (deviceId: number, year: string) => {
  return http.request<DeviceYearPowerResponse>(
    "get",
    `/api/external/energy-statistics/device/${deviceId}/year-power`,
    {
      params: { year },
      timeout: DEVICE_YEAR_POWER_TIMEOUT_MS,
      ...devicePowerHttpConfig
    }
  );
};

/**
 * 工具函数：格式化时间字符串
 * 根据维度将时间格式化为前端展示格式
 */
export const formatTimeKey = (
  timeKey: string,
  dimension: StatsDimension
): string => {
  switch (dimension) {
    case "hour":
      // yyyyMMddHH -> yyyy-MM-dd HH:00
      const year = timeKey.substring(0, 4);
      const month = timeKey.substring(4, 6);
      const day = timeKey.substring(6, 8);
      const hour = timeKey.substring(8, 10);
      return `${year}-${month}-${day} ${hour}:00`;
    case "day":
      // yyyyMMdd -> yyyy-MM-dd
      return `${timeKey.substring(0, 4)}-${timeKey.substring(4, 6)}-${timeKey.substring(6, 8)}`;
    case "month":
      // yyyyMM -> yyyy-MM
      return `${timeKey.substring(0, 4)}-${timeKey.substring(4, 6)}`;
    case "year":
      // yyyy -> yyyy年
      return `${timeKey}年`;
    default:
      return timeKey;
  }
};

/**
 * 工具函数：将API数据转换为前端展示格式
 */
export const transformStatsData = (
  apiData: EnergyStatisticsSummaryDto
): StatsDisplayData[] => {
  // console.log("【business-stats.ts】开始转换API数据");
  // console.log("API数据维度:", apiData.dimension);
  // console.log("API数据条数:", Object.keys(apiData.data).length);

  const result: StatsDisplayData[] = [];
  const { data, dimension } = apiData;

  // 设备数按 meterId 去重；若缺失则回退到 meterNo，避免同设备重复记录被重复计数
  const getUniqueDeviceCount = (meterStats: MeterStatItem[]) => {
    const normalizedKeys = meterStats
      .map(item => {
        // 与小时明细 mergeRowsByMeterId 的 key 口径保持一致
        const rawKey = item?.meterId ?? item?.meterNo ?? item?.meterName;
        if (rawKey === null || rawKey === undefined) return "";
        const key = String(rawKey).trim();
        return key ? `k:${key}` : "";
      })
      .filter(Boolean);

    // 若接口未返回可用于去重的键，则回退为原始条数，避免显示 0
    if (normalizedKeys.length === 0) return meterStats.length;
    return new Set(normalizedKeys).size;
  };

  Object.entries(data).forEach(([timeKey, meterStats]) => {
    // 计算总用电量
    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + item.totalConsumption,
      0
    );

    // console.log(
    //   `时间键 ${timeKey}: 电表数 ${meterStats.length}, 总用电量 ${totalConsumption}`
    // );

    // 格式化日期
    const date = formatTimeKey(timeKey, dimension);

    const displayData: StatsDisplayData = {
      timeKey,
      date,
      totalConsumption: parseFloat(totalConsumption.toFixed(2)),
      deviceCount: getUniqueDeviceCount(meterStats),
      meterStats
    };

    // 如果是小时统计，提取小时数
    if (dimension === "hour") {
      displayData.hour = parseInt(timeKey.substring(8, 10));
    }

    result.push(displayData);
  });

  // console.log("转换完成，结果条数:", result.length);

  // 按时间排序
  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
};

/**
 * 获取单个电表的统计数据（用于图表展示）
 */
export const getSingleMeterStats = (
  apiData: EnergyStatisticsSummaryDto,
  meterId: number
): StatsDisplayData[] => {
  const result: StatsDisplayData[] = [];
  const { data, dimension } = apiData;

  Object.entries(data).forEach(([timeKey, meterStats]) => {
    // 查找指定电表
    const meterStat = meterStats.find(item => item.meterId === meterId);
    if (meterStat) {
      const date = formatTimeKey(timeKey, dimension);

      const displayData: StatsDisplayData = {
        timeKey,
        date,
        totalConsumption: meterStat.totalConsumption,
        deviceCount: 1,
        meterStats: [meterStat]
      };

      if (dimension === "hour") {
        displayData.hour = parseInt(timeKey.substring(8, 10));
      }

      result.push(displayData);
    }
  });

  // 按时间排序
  return result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
};

/**
 * 生成时间参数
 * 根据维度和日期生成API需要的时间格式
 */
export const generateTimeParams = (
  dimension: StatsDimension,
  date: string | Date
): { startTime: string; endTime: string } => {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");

  switch (dimension) {
    case "hour":
      // 获取当天的所有小时数据
      const startHour = `${year}${month}${day}00`;
      const endHour = `${year}${month}${day}23`;
      return { startTime: startHour, endTime: endHour };
    case "day":
      // 获取当月的所有天数据
      const daysInMonth = new Date(year, parseInt(month), 0).getDate();
      const startDay = `${year}${month}01`;
      const endDay = `${year}${month}${daysInMonth.toString().padStart(2, "0")}`;
      return { startTime: startDay, endTime: endDay };
    case "month":
      // 获取当年的所有月数据
      const startMonth = `${year}01`;
      const endMonth = `${year}12`;
      return { startTime: startMonth, endTime: endMonth };
    case "year":
      // 获取近3年数据
      const startYear = (year - 2).toString();
      const endYear = year.toString();
      return { startTime: startYear, endTime: endYear };
    default:
      throw new Error(`不支持的维度: ${dimension}`);
  }
};

/**
 * 简化版接口（用于演示或接口不可用时）
 * 注意：这里使用mock数据，实际项目中应该删除或替换为真实的简化版接口
 */
export const simpleStatsApi = {
  /**
   * 获取用电量统计汇总数据（简化版）
   */
  getEnergyStatisticsSummary: (params: EnergyStatsQueryParams) => {
    // console.log("【business-stats.ts】使用简化版接口获取数据");
    // 直接调用http请求，使用简化版接口路径
    return http.request<Result<EnergyStatisticsSummaryDto>>(
      "get",
      "/api/simple-electric-usage/summary",
      {
        params
      }
    );
  }
};
