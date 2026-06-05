import { http } from "@/utils/http";
import type { Result } from "@/api/types";

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

/**
 * 获取用电量统计汇总数据
 * GET /api/external/energy-statistics/summary
 * 参数：dimension(维度), startTime(开始时间), endTime(结束时间), ignoreRadio(可选)
 * 注意：此接口不需要登录token
 */
export const getEnergyStatisticsSummary = (params: EnergyStatsQueryParams) => {
  console.log("【business-stats.ts】获取用电量统计汇总数据");
  console.log("【business-stats.ts】请求参数:", params);
  console.log(
    "【business-stats.ts】请求URL: /api/external/energy-statistics/summary"
  );

  return http.request<Result<EnergyStatisticsSummaryDto>>(
    "get",
    "/api/external/energy-statistics/summary",
    {
      params
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
  const result: StatsDisplayData[] = [];
  const { data, dimension } = apiData;

  Object.entries(data).forEach(([timeKey, meterStats]) => {
    // 计算总用电量
    const totalConsumption = meterStats.reduce(
      (sum, item) => sum + item.totalConsumption,
      0
    );

    // 格式化日期
    const date = formatTimeKey(timeKey, dimension);

    const displayData: StatsDisplayData = {
      timeKey,
      date,
      totalConsumption: parseFloat(totalConsumption.toFixed(2)),
      deviceCount: meterStats.length,
      meterStats
    };

    // 如果是小时统计，提取小时数
    if (dimension === "hour") {
      displayData.hour = parseInt(timeKey.substring(8, 10));
    }

    result.push(displayData);
  });

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
    console.log("【business-stats.ts】使用简化版接口获取数据");
    // 这里返回一个Promise，实际项目中应该调用真实的简化版接口
    return Promise.resolve({
      success: true,
      data: {
        status: 1,
        dimension: params.dimension,
        startTime: params.startTime,
        endTime: params.endTime,
        data: {}
      },
      message: "使用演示数据"
    });
  }
};
