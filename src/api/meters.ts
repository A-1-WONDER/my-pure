import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/**
 * 电表管理接口（新版）
 * 基础路径：/api/meters
 * 权限前缀：meter:
 */

// 电表列表查询参数类型
export interface MeterListParams {
  page?: number;
  size?: number;
  meterNo?: string;
  meterName?: string;
  meterType?: string;
  status?: string;
  enabled?: boolean;
  collectorId?: number;
  userId?: number;
  blurry?: string;
}

// 电表数据类型
export interface MeterData {
  id?: number;
  meterNo: string;
  meterName?: string;
  meterType: string;
  collectorId?: number;
  meterAddress?: string;
  installAddress?: string;
  userId?: number;
  enabled?: boolean;
  remark?: string;
  manufacturer?: string;
  model?: string;
  accuracy?: number;
  communication?: string;
  installTime?: string;
  relayState?: number;
  batteryState?: number;
  signalStrength?: number;
  paramId?: string;
  priceId?: string;
  purchaseCount?: number;
  datetimeId?: string;
  rate?: number;
  deviceModel?: string;
}

// 批量更新状态参数类型
export interface BatchStatusParams {
  meterIds: number[];
  status: string;
  reason?: string;
}

// 电表读数参数类型
export interface ReadingData {
  readingValue: number;
  readingTime: string;
  readingType?: string;
  readingSource?: string;
  operator?: string;
}

// 电表读数查询参数类型
export interface ReadingListParams {
  limit?: number;
  startTime?: string;
  endTime?: string;
}

// 主动抄表参数类型
export interface ActiveReadingParams {
  meterId: number;
  readingType?: number;
}

export interface BatchActiveReadingParams {
  meterIds: number[];
  readingType?: number;
}

// 统计数据类型
export interface StatisticsData {
  totalCount: number;
  normalCount: number;
  faultCount: number;
  offlineCount: number;
  enabledCount: number;
  disabledCount: number;
  todayReadingCount: number;
  todayTotalPower: number;
  monthTotalPower: number;
}

export interface TypeStatisticsData {
  singlePhase: number;
  threePhase: number;
  prepaid: number;
  multiRate: number;
}

export interface StatusStatisticsData {
  [key: string]: number;
}

// 用户信息类型
export interface UserInfo {
  userId: number;
  userName: string;
  phone: string;
}

// 电表详情类型
export interface MeterDetailData {
  id: number;
  meterNo: string;
  meterName: string;
  meterType: string;
  collectorId: number;
  collectorNo: string;
  collectorName: string;
  meterAddress: string;
  installAddress: string;
  status: string;
  enabled: boolean;
  totalPower: number;
  remainingAmount: number;
  relayStatus: string;
  voltage: number;
  current: number;
  powerFactor: number;
  temperature: number;
  lastReadingTime: string;
  createdAt: string;
  updatedAt: string;
  userInfo: UserInfo;
}

export interface ElectricMeterDetailsData extends MeterDetailData {
  laststatus?: string;
}

// 抄表记录类型
export interface MeterReadingData {
  id: number;
  meterId: number;
  readingValue: number;
  readingType: string;
  readingTypeId: number;
  readingTypeName: string;
  readingTime: string;
  readingSource: string;
  remark: string;
}

// 用量趋势类型
export interface UsageTrendData {
  date: string;
  powerUsage: number;
  avgVoltage: number;
  avgCurrent: number;
}

// 主动抄表响应类型
export interface ActiveReadingResponse {
  success: boolean;
  status: string;
  meterId: number;
  collectorNo: string;
  meterAddress: string;
  readingType: number;
  message: string;
  response: {
    status: string;
    timestamp: string;
  };
}

export interface BatchActiveReadingResponse {
  success: boolean;
  total: number;
  successCount: number;
  failCount: number;
  message: string;
  details: Array<{
    meterId: number;
    success: boolean;
    status?: string;
    error?: string;
  }>;
}

// 支持的抄表类型
export interface SupportedReadingTypes {
  success: boolean;
  meterId: number;
  meterType: string;
  supportedTypes: Record<string, number>;
  count: number;
}

/**
 * 1. 电表列表接口
 * GET /api/meters
 * 权限：meter:list
 */
export const getMeterList = (params?: MeterListParams, timeoutMs = 10000) => {
  return http.request<ResultTable>("get", "/api/meters", {
    params,
    timeout: timeoutMs
  });
};

/**
 * 2. 电表详情接口
 * GET /api/meters/{id}
 * 权限：meter:list
 */
export const getMeterDetail = (id: number) => {
  return http.request<Result<MeterDetailData>>("get", `/api/meters/${id}`);
};

/**
 * 获取电表详情（包含扩展信息）
 * GET /api/meters/{id}/details
 * 权限：meter:list
 */
export const getMeterDetailWithExt = (id: number) => {
  return http.request<Result<MeterDetailData>>(
    "get",
    `/api/meters/${id}/details`
  );
};

/**
 * 获取电表详情状态
 * GET /api/electric-meters/{id}/details
 */
export const getElectricMeterDetails = (id: number) => {
  return http.request<Result<ElectricMeterDetailsData>>(
    "get",
    `/api/electric-meters/${id}/details`
  );
};

/**
 * 3. 电表统计接口
 * GET /api/meters/statistics
 * 权限：meter:list
 */
export const getMeterStatistics = () => {
  return http.request<Result<StatisticsData>>("get", "/api/meters/statistics");
};

/**
 * 获取电表类型统计
 * GET /api/meters/statistics/type
 * 权限：meter:list
 */
export const getMeterTypeStatistics = () => {
  return http.request<Result<TypeStatisticsData>>(
    "get",
    "/api/meters/statistics/type"
  );
};

/**
 * 获取电表状态统计
 * GET /api/meters/statistics/status
 * 权限：meter:list
 */
export const getMeterStatusStatistics = () => {
  return http.request<Result<StatusStatisticsData>>(
    "get",
    "/api/meters/statistics/status"
  );
};

/**
 * 4. 主动抄表接口
 * 单个电表主动抄表
 * POST /api/meters/{meterId}/active-reading
 * 权限：meter:reading
 */
export const activeReading = (meterId: number, readingType?: number) => {
  return http.request<Result<ActiveReadingResponse>>(
    "post",
    `/api/meters/${meterId}/active-reading`,
    { data: { readingType } }
  );
};

/**
 * 批量主动抄表
 * POST /api/meters/batch-active-reading
 * 权限：meter:reading
 */
export const batchActiveReading = (params: BatchActiveReadingParams) => {
  return http.request<Result<BatchActiveReadingResponse>>(
    "post",
    "/api/meters/batch-active-reading",
    { data: params }
  );
};

/**
 * 获取电表支持的抄表类型
 * GET /api/meters/{meterId}/supported-reading-types
 * 权限：meter:list
 */
export const getSupportedReadingTypes = (meterId: number) => {
  return http.request<Result<SupportedReadingTypes>>(
    "get",
    `/api/meters/${meterId}/supported-reading-types`
  );
};

/**
 * 5. 抄表记录接口
 * 获取电表最新读数
 * GET /api/meter-readings/meter/{meterId}/latest
 * 权限：meter:list
 */
export const getLatestMeterReading = (meterId: number) => {
  return http.request<Result<MeterReadingData>>(
    "get",
    `/api/meter-readings/meter/${meterId}/latest`
  );
};

/**
 * 获取电表历史读数
 * GET /api/meter-readings/meter/{meterId}/history
 * 权限：meter:list
 */
export const getMeterReadingHistory = (
  meterId: number,
  params?: ReadingListParams
) => {
  return http.request<Result<MeterReadingData[]>>(
    "get",
    `/api/meter-readings/meter/${meterId}/history`,
    { params }
  );
};

/**
 * 获取电表用量趋势
 * GET /api/meter-readings/meter/{meterId}/usage-trend
 * 权限：meter:list
 */
export const getMeterUsageTrend = (
  meterId: number,
  params: {
    startTime: string;
    endTime: string;
    interval?: string;
  }
) => {
  return http.request<Result<UsageTrendData[]>>(
    "get",
    `/api/meter-readings/meter/${meterId}/usage-trend`,
    { params }
  );
};

/**
 * 6. 电表操作接口
 * 新增电表
 * POST /api/meters
 * 权限：meter:add
 */
export const createMeter = (data: MeterData) => {
  return http.request<Result>("post", "/api/meters", { data });
};

/**
 * 修改电表
 * PUT /api/meters
 * 权限：meter:edit
 */
export const updateMeter = (data: MeterData) => {
  return http.request<Result>("put", "/api/meters", { data });
};

/**
 * 删除电表
 * DELETE /api/meters
 * 权限：meter:del
 */
export const deleteMeters = (ids: number[]) => {
  return http.request<Result>("delete", "/api/meters", {
    data: ids
  });
};

/**
 * 更新电表读数（手动录入）
 * POST /api/meters/{id}/update-reading
 * 权限：meter:edit
 */
export const updateMeterReading = (id: number, data: ReadingData) => {
  return http.request<Result>("post", `/api/meters/${id}/update-reading`, {
    data
  });
};

/**
 * 批量更新电表状态
 * POST /api/meters/batch-update-status
 * 权限：meter:edit
 */
export const batchUpdateMeterStatus = (data: BatchStatusParams) => {
  return http.request<Result>("post", "/api/meters/batch-update-status", {
    data
  });
};

/**
 * 7. 导入导出接口
 * 导出电表数据
 * GET /api/meters/download
 * 权限：meter:list
 */
export const exportMeterData = (params?: MeterListParams) => {
  return http.request<Blob>("get", "/api/meters/download", {
    params,
    responseType: "blob"
  });
};

/**
 * 导入电表数据
 * POST /api/meters/import
 * 权限：meter:add
 */
export const importMeterData = (data: FormData) => {
  return http.request<Result>("post", "/api/meters/import", {
    data,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

/**
 * 8. 关联查询接口
 * 根据采集器查询电表
 * GET /api/meters/collector/{collectorId}
 * 权限：meter:list
 */
export const getMetersByCollector = (collectorId: number) => {
  return http.request<Result>("get", `/api/meters/collector/${collectorId}`);
};

/**
 * 根据用户查询电表
 * GET /api/meters/user/{userId}
 * 权限：meter:list
 */
export const getMetersByUser = (userId: number) => {
  return http.request<Result>("get", `/api/meters/user/${userId}`);
};

/**
 * 根据编号查询电表
 * GET /api/meters/no/{meterNo}
 * 权限：meter:list
 */
export const getMeterByNo = (meterNo: string) => {
  return http.request<Result>("get", `/api/meters/no/${meterNo}`);
};

/**
 * 获取电表读数列表（旧版兼容）
 * GET /api/meters/{meterId}/readings
 * 权限：meter:list
 */
export const getMeterReadings = (
  meterId: number,
  params?: ReadingListParams
) => {
  return http.request<Result>("get", `/api/meters/${meterId}/readings`, {
    params
  });
};

/**
 * 简化版电表接口集合
 * 这些接口使用 /api/simple-electric-meters 路径，返回模拟数据
 * 用于在正式接口不可用时提供演示数据
 */

export const simpleMeterApi = {
  /**
   * 获取电表列表（简化版）
   */
  getMeterList: (params?: MeterListParams) => {
    return http.request<ResultTable>("get", "/api/simple-electric-meters", {
      params
    });
  },

  /**
   * 获取电表详情（简化版）
   */
  getMeterDetail: (id: number) => {
    return http.request<Result<MeterDetailData>>(
      "get",
      `/api/simple-electric-meters/${id}`
    );
  },

  /**
   * 获取电表统计（简化版）
   */
  getMeterStatistics: () => {
    return http.request<Result<StatisticsData>>(
      "get",
      "/api/simple-electric-meters/statistics"
    );
  },

  /**
   * 获取电表类型统计（简化版）
   * 注意：简化版可能不支持此接口，返回空数据
   */
  getMeterTypeStatistics: () => {
    return http.request<Result<TypeStatisticsData>>(
      "get",
      "/api/simple-electric-meters/statistics/type"
    );
  },

  /**
   * 获取电表状态统计（简化版）
   * 注意：简化版可能不支持此接口，返回空数据
   */
  getMeterStatusStatistics: () => {
    return http.request<Result<StatusStatisticsData>>(
      "get",
      "/api/simple-electric-meters/statistics/status"
    );
  }
};
