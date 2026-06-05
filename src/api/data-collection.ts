import { http } from "@/utils/http";
import type { Result, ResultTable, RealTimeDataResult } from "@/api/types";

/** 获取实时数据列表 */
export const getRealTimeDataList = (data?: object) => {
  return http.request<RealTimeDataResult>("post", "/real-time-data", { data });
};

/** 获取历史数据列表 */
export const getHistoryDataList = (data?: object) => {
  return http.request<ResultTable>("post", "/history-data", { data });
};

/** 获取数据采集配置列表 */
export const getDataCollectionConfigList = (data?: object) => {
  return http.request<ResultTable>("post", "/data-collection-config", { data });
};

/** 获取数据采集配置详情 */
export const getDataCollectionConfigDetail = (data?: object) => {
  return http.request<Result>("post", "/data-collection-config-detail", {
    data
  });
};

/** 新增数据采集配置 */
export const addDataCollectionConfig = (data?: object) => {
  return http.request<Result>("post", "/data-collection-config-add", { data });
};

/** 编辑数据采集配置 */
export const editDataCollectionConfig = (data?: object) => {
  return http.request<Result>("post", "/data-collection-config-edit", { data });
};

/** 删除数据采集配置 */
export const deleteDataCollectionConfig = (data?: object) => {
  return http.request<Result>("post", "/data-collection-config-delete", {
    data
  });
};

/** 获取采集任务列表 */
export const getCollectionTaskList = (data?: object) => {
  return http.request<ResultTable>("post", "/collection-task", { data });
};

/** 获取采集任务详情 */
export const getCollectionTaskDetail = (data?: object) => {
  return http.request<Result>("post", "/collection-task-detail", { data });
};

/** 新增采集任务 */
export const addCollectionTask = (data?: object) => {
  return http.request<Result>("post", "/collection-task-add", { data });
};

/** 编辑采集任务 */
export const editCollectionTask = (data?: object) => {
  return http.request<Result>("post", "/collection-task-edit", { data });
};

/** 删除采集任务 */
export const deleteCollectionTask = (data?: object) => {
  return http.request<Result>("post", "/collection-task-delete", { data });
};

/** 启动/停止采集任务 */
export const toggleCollectionTaskStatus = (data?: object) => {
  return http.request<Result>("post", "/collection-task-toggle", { data });
};

/** 立即执行采集任务 */
export const executeCollectionTaskNow = (data?: object) => {
  return http.request<Result>("post", "/collection-task-execute-now", { data });
};

/** 获取采集器状态监控 */
export const getCollectorStatusMonitor = (data?: object) => {
  return http.request<Result>("post", "/collector-status-monitor", { data });
};

/** 获取数据质量统计 */
export const getDataQualityStatistics = (data?: object) => {
  return http.request<Result>("post", "/data-quality-statistics", { data });
};

/** 获取采集性能分析 */
export const getCollectionPerformanceAnalysis = (data?: object) => {
  return http.request<Result>("post", "/collection-performance-analysis", {
    data
  });
};

/** 导出采集数据 */
export const exportCollectionData = (data?: object) => {
  return http.request<Result>("post", "/collection-data-export", { data });
};

/** 清空历史采集数据 */
export const clearHistoryCollectionData = (data?: object) => {
  return http.request<Result>("post", "/collection-data-clear-history", {
    data
  });
};

/** 获取通信协议列表 */
export const getProtocolList = (data?: object) => {
  return http.request<Result>("post", "/protocol-list", { data });
};

/** 测试通信连接 */
export const testCommunicationConnection = (data?: object) => {
  return http.request<Result>("post", "/communication-test", { data });
};

/** 获取数据采集报表 */
export const getDataCollectionReport = (data?: object) => {
  return http.request<Result>("post", "/data-collection-report", { data });
};
