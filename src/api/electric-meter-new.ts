import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/**
 * 电表管理接口
 * 基础路径：/api/meters
 * 注意：后端使用统一接口，通过meterType参数区分表类型
 */

// 定义后端响应数据类型
interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// 电表数据类型
interface ElectricMeterData {
  id: number;
  meterNo: string;
  meterType: string; // electric/water/gas/heat
  manufacturer: string;
  model: string;
  accuracy: number;
  communication: string;
  installAddress: string;
  userId: number;
  collectorId: number;
  status: number; // 0:未启用,1:已启用,2:停用
  installTime: string;
  addUserId: number;
  remark: string;
  relayState: number;
  batteryState: number;
  signalStrength: number;
  paramId: string;
  priceId: string;
  purchaseCount: number;
  datetimeId: string;
  rate: number;
  deviceModel: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  collectorName?: string;
  readings?: Array<{
    id: number;
    readingTime: string;
    readingValue: number;
    readingType: string;
    readingSource: string;
  }>;
}

// 电表读数数据类型
interface MeterReadingData {
  id: number;
  meterId: number;
  meterType: string;
  readingTime: string;
  readingValue: number;
  readingType: string;
  readingTypeId: number;
  readingTypeName: string;
  readingSource: string;
  dataQuality: string;
  previousReadingValue: number;
  previousReadingTime: string;
  calculatedUsage: number;
  collectorId: number;
  operator: number;
  remark: string;
  createdAt: string;
}

// 统计数据类型
interface StatisticsData {
  totalCount: number;
  onlineCount: number;
  offlineCount: number;
  electricCount: number;
  waterCount: number;
  gasCount: number;
  heatCount: number;
  todayReadings: number;
  monthReadings: number;
  yearReadings: number;
}

/**
 * 2.1 电表列表查询
 * GET /api/meters
 * 权限：meter:list
 */
export const getElectricMeterList = (params?: {
  page?: number;
  size?: number;
  meterNo?: string;
  meterType?: string; // 固定为'electric'
  status?: number;
  collectorId?: number;
  userId?: number;
}) => {
  console.log("【electric-meter.ts】getElectricMeterList被调用");
  console.log("【electric-meter.ts】请求参数params:", params);

  // 固定查询电表类型
  const queryParams = {
    ...params,
    meterType: "electric" // 固定查询电表
  };

  console.log("【electric-meter.ts】请求URL: /api/meters");
  console.log("【electric-meter.ts】请求方法: GET");
  console.log("【electric-meter.ts】最终查询参数:", queryParams);

  return http.request<BackendResponse<PageData<ElectricMeterData>>>(
    "get",
    "/api/meters",
    {
      params: queryParams
    }
  );
};

/**
 * 2.2 创建电表
 * POST /api/meters
 * 权限：meter:add
 */
export const addElectricMeter = (data: {
  meterNo: string;
  meterType: string; // 固定为'electric'
  manufacturer: string;
  model: string;
  accuracy: number;
  communication: string;
  installAddress: string;
  userId?: number;
  collectorId?: number;
  status?: number; // 0:未启用,1:已启用,2:停用
  installTime?: string;
  remark?: string;
  relayState?: number;
  batteryState?: number;
  signalStrength?: number;
  paramId?: string;
  priceId?: string;
  purchaseCount?: number;
  datetimeId?: string;
  rate?: number;
  deviceModel?: string;
}) => {
  // 确保表类型为电表
  const requestData = {
    ...data,
    meterType: "electric"
  };

  return http.request<BackendResponse<{ id: number }>>("post", "/api/meters", {
    data: requestData
  });
};

/**
 * 2.3 更新电表
 * PUT /api/meters/{id}
 * 权限：meter:edit
 */
export const editElectricMeter = (
  id: number,
  data: {
    meterNo?: string;
    manufacturer?: string;
    model?: string;
    accuracy?: number;
    communication?: string;
    installAddress?: string;
    userId?: number;
    collectorId?: number;
    status?: number;
    installTime?: string;
    remark?: string;
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
) => {
  return http.request<BackendResponse<null>>("put", `/api/meters/${id}`, {
    data
  });
};

/**
 * 2.4 删除电表
 * DELETE /api/meters
 * 权限：meter:del
 */
export const deleteElectricMeter = (ids: number[]) => {
  return http.request<BackendResponse<null>>("delete", "/api/meters", {
    data: { ids }
  });
};

/**
 * 2.5 获取电表详情
 * GET /api/meters/{id}
 * 权限：meter:list
 */
export const getElectricMeterDetail = (id: number) => {
  return http.request<BackendResponse<ElectricMeterData>>(
    "get",
    `/api/meters/${id}`
  );
};

/**
 * 2.6 批量更新电表状态
 * PUT /api/meters/batch-status
 * 权限：meter:edit
 */
export const batchUpdateElectricMeterStatus = (
  ids: number[],
  status: number,
  reason?: string
) => {
  return http.request<BackendResponse<{ updatedCount: number }>>(
    "put",
    "/api/meters/batch-status",
    {
      data: { ids, status, reason }
    }
  );
};

/**
 * 3.1 获取电表读数列表
 * GET /api/meters/{meterId}/readings
 * 权限：meter:list
 */
export const getElectricMeterReadings = (
  meterId: number,
  params?: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  }
) => {
  return http.request<BackendResponse<MeterReadingData[]>>(
    "get",
    `/api/meters/${meterId}/readings`,
    {
      params
    }
  );
};

/**
 * 3.2 更新电表读数
 * POST /api/meters/{meterId}/readings
 * 权限：meter:edit
 */
export const updateElectricMeterReading = (
  meterId: number,
  data: {
    readingValue: number;
    readingTime: string;
    readingType?: string;
    readingSource?: string;
    operator?: string;
  }
) => {
  return http.request<
    BackendResponse<{ readingId: number; calculatedUsage: number }>
  >("post", `/api/meters/${meterId}/readings`, { data });
};

/**
 * 4.1 电表统计信息
 * GET /api/meters/statistics
 * 权限：meter:list
 */
export const getElectricMeterStatistics = () => {
  return http.request<BackendResponse<StatisticsData>>(
    "get",
    "/api/meters/statistics"
  );
};

/**
 * 4.2 电表类型统计
 * GET /api/meters/statistics/type
 * 权限：meter:list
 */
export const getMeterTypeStatistics = () => {
  return http.request<BackendResponse<Record<string, number>>>(
    "get",
    "/api/meters/statistics/type"
  );
};

/**
 * 4.3 电表状态统计
 * GET /api/meters/statistics/status
 * 权限：meter:list
 */
export const getMeterStatusStatistics = () => {
  return http.request<BackendResponse<Record<string, number>>>(
    "get",
    "/api/meters/statistics/status"
  );
};

/**
 * 导出电表数据（根据后端实际接口调整）
 * GET /api/meters/export
 * 权限：meter:list
 */
export const exportElectricMeterData = (params?: object) => {
  return http.request<Result>("get", "/api/meters/export", { params });
};

/**
 * 根据编号查询电表
 * GET /api/meters/no/{meterNo}
 * 权限：meter:list
 */
export const getElectricMeterByNo = (meterNo: string) => {
  return http.request<BackendResponse<ElectricMeterData>>(
    "get",
    `/api/meters/no/${meterNo}`
  );
};
