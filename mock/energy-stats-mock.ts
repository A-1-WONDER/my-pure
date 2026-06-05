import { Random } from "mockjs";
import { resultSuccess } from "./_util";

// 生成模拟的电表统计数据
const generateMockMeterStats = (count: number = 5) => {
  const meterStats = [];

  for (let i = 1; i <= count; i++) {
    // 减少单个电表的用电量，避免总用电量过大
    const totalConsumption = Random.float(0.5, 5.0, 2, 2);

    meterStats.push({
      meterId: i,
      meterNo: `EL${String(i).padStart(8, "0")}`,
      meterName: Random.county(true), // 使用安装地址作为展示名
      totalConsumption,
      peakConsumption: Random.float(0.1, totalConsumption * 0.3, 2, 2),
      highConsumption: Random.float(0.1, totalConsumption * 0.4, 2, 2),
      normalConsumption: Random.float(0.1, totalConsumption * 0.2, 2, 2),
      valleyConsumption: Random.float(0.1, totalConsumption * 0.1, 2, 2),
      deepValleyConsumption: Random.float(0, totalConsumption * 0.05, 2, 2),
      startTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      endTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      transformerRatio: Random.integer(1, 10)
    });
  }

  return meterStats;
};

// 生成小时统计mock数据
export const generateHourlyMockData = (dateStr: string = "20240816") => {
  const data: { [timeKey: string]: any[] } = {};

  // 生成24小时的数据
  for (let hour = 0; hour < 24; hour++) {
    const timeKey = `${dateStr}${hour.toString().padStart(2, "0")}`;

    // 根据时间段生成不同的用电量
    let meterCount = 3;
    if (hour >= 8 && hour <= 18) {
      // 白天：设备数量多，用电量高
      meterCount = Random.integer(5, 8);
    } else if (hour >= 19 && hour <= 22) {
      // 晚上：设备数量中等，用电量中等
      meterCount = Random.integer(3, 6);
    } else {
      // 深夜：设备数量少，用电量低
      meterCount = Random.integer(1, 4);
    }

    data[timeKey] = generateMockMeterStats(meterCount);
  }

  return data;
};

// 生成日统计mock数据
export const generateDailyMockData = (monthStr: string = "202408") => {
  const data: { [timeKey: string]: any[] } = {};

  // 解析年月字符串，格式：yyyyMM
  const year = parseInt(monthStr.substring(0, 4));
  const month = parseInt(monthStr.substring(4, 6));

  // 获取该月的天数
  const daysInMonth = new Date(year, month, 0).getDate();

  // 生成该月所有天的数据
  for (let day = 1; day <= daysInMonth; day++) {
    const timeKey = `${monthStr}${day.toString().padStart(2, "0")}`;

    // 工作日和周末的设备数量不同
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const meterCount = isWeekend
      ? Random.integer(3, 6) // 周末设备少
      : Random.integer(5, 10); // 工作日设备多

    data[timeKey] = generateMockMeterStats(meterCount);
  }

  return data;
};

// 生成月统计mock数据
export const generateMonthlyMockData = (yearStr: string = "2024") => {
  const data: { [timeKey: string]: any[] } = {};

  // 生成12个月的数据
  for (let month = 1; month <= 12; month++) {
    const timeKey = `${yearStr}${month.toString().padStart(2, "0")}`;

    // 不同月份设备数量不同（夏季用电多）
    let meterCount = 8;
    if (month >= 6 && month <= 8) {
      // 夏季：设备数量多
      meterCount = Random.integer(10, 15);
    } else if (month >= 11 || month <= 2) {
      // 冬季：设备数量中等
      meterCount = Random.integer(8, 12);
    } else {
      // 春秋季：设备数量少
      meterCount = Random.integer(6, 10);
    }

    data[timeKey] = generateMockMeterStats(meterCount);
  }

  return data;
};

// 生成年统计mock数据
export const generateYearlyMockData = (
  startYear: number = 2022,
  endYear: number = 2024
) => {
  const data: { [timeKey: string]: any[] } = {};

  // 生成指定年份范围的数据
  for (let year = startYear; year <= endYear; year++) {
    const timeKey = year.toString();

    // 每年设备数量递增
    const baseCount = 8 + (year - startYear) * 2;
    const meterCount = Random.integer(baseCount, baseCount + 5);

    data[timeKey] = generateMockMeterStats(meterCount);
  }

  return data;
};

// 根据维度获取对应的mock数据
const getMockDataByDimension = (
  dimension: string,
  startTime: string,
  endTime: string
) => {
  switch (dimension) {
    case "hour":
      // 对于小时维度，使用开始时间的日期部分
      const dateStr = startTime.substring(0, 8);
      return generateHourlyMockData(dateStr);
    case "day":
      // 对于天维度，使用开始时间的年月部分
      const monthStr = startTime.substring(0, 6);
      return generateDailyMockData(monthStr);
    case "month":
      // 对于月维度，使用开始时间的年份部分
      const yearStr = startTime.substring(0, 4);
      return generateMonthlyMockData(yearStr);
    case "year":
      // 对于年维度，解析开始和结束年份
      const startYear = parseInt(startTime);
      const endYear = parseInt(endTime);
      return generateYearlyMockData(startYear, endYear);
    default:
      return {};
  }
};

export default [
  // 用电量统计汇总接口
  {
    url: "/api/external/energy-statistics/summary",
    method: "get",
    response: ({ query }) => {
      const { dimension, startTime, endTime, ignoreRadio = 0 } = query;

      console.log("【energy-stats-mock.ts】模拟用电量统计接口调用");
      console.log("【energy-stats-mock.ts】请求参数:", {
        dimension,
        startTime,
        endTime,
        ignoreRadio
      });

      // 获取对应维度的mock数据
      const data = getMockDataByDimension(dimension, startTime, endTime);

      // 根据时间范围过滤数据
      const filteredData: { [timeKey: string]: any[] } = {};

      Object.keys(data).forEach(timeKey => {
        if (timeKey >= startTime && timeKey <= endTime) {
          filteredData[timeKey] = data[timeKey];
        }
      });

      return resultSuccess({
        status: 1,
        dimension,
        startTime,
        endTime,
        data: filteredData
      });
    }
  },

  // 简化版接口（用于演示）
  {
    url: "/api/simple-electric-usage/summary",
    method: "get",
    response: ({ query }) => {
      const { dimension, startTime, endTime, ignoreRadio = 0 } = query;

      console.log("【energy-stats-mock.ts】模拟简化版接口调用");
      console.log("【energy-stats-mock.ts】简化版请求参数:", {
        dimension,
        startTime,
        endTime,
        ignoreRadio
      });

      // 获取对应维度的mock数据
      const data = getMockDataByDimension(dimension, startTime, endTime);

      // 根据时间范围过滤数据
      const filteredData: { [timeKey: string]: any[] } = {};

      Object.keys(data).forEach(timeKey => {
        if (timeKey >= startTime && timeKey <= endTime) {
          filteredData[timeKey] = data[timeKey];
        }
      });

      return resultSuccess({
        status: 1,
        dimension,
        startTime,
        endTime,
        data: filteredData
      });
    }
  }
];
