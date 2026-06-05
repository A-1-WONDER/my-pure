import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 监控统计相关接口 */

/** 获取监控概览统计 */
export const getMonitorOverview = () => {
  return http.request<Result>("get", "/monitor/overview");
};

/** 获取实时监控数据 */
export const getRealtimeMonitorData = (data?: object) => {
  return http.request<Result>("post", "/monitor/realtime-data", { data });
};

/** 获取设备运行状态统计 */
export const getDeviceStatusStats = () => {
  return http.request<Result>("get", "/monitor/device-status");
};

/** 获取采集器运行状态 */
export const getCollectorStatus = (data?: object) => {
  return http.request<Result>("post", "/monitor/collector-status", { data });
};

/** 获取表具运行状态 */
export const getMeterStatus = (data?: object) => {
  return http.request<Result>("post", "/monitor/meter-status", { data });
};

/** 获取报警统计概览 */
export const getAlarmStatsOverview = () => {
  return http.request<Result>("get", "/monitor/alarm-overview");
};

/** 获取数据采集统计 */
export const getDataCollectionStats = (data?: object) => {
  return http.request<Result>("post", "/monitor/data-collection-stats", {
    data
  });
};

/** 获取能耗统计 */
export const getEnergyConsumptionStats = (data?: object) => {
  return http.request<Result>("post", "/monitor/energy-consumption", { data });
};

/** 获取用水量统计 */
export const getWaterUsageStats = (data?: object) => {
  return http.request<Result>("post", "/monitor/water-usage", { data });
};

/** 获取用电量统计 */
export const getElectricityUsageStats = (data?: object) => {
  return http.request<Result>("post", "/monitor/electricity-usage", { data });
};

/** 获取用气量统计 */
export const getGasUsageStats = (data?: object) => {
  return http.request<Result>("post", "/monitor/gas-usage", { data });
};

/** 获取设备在线率统计 */
export const getDeviceOnlineRate = (data?: object) => {
  return http.request<Result>("post", "/monitor/device-online-rate", { data });
};

/** 获取数据采集成功率 */
export const getDataCollectionSuccessRate = (data?: object) => {
  return http.request<Result>("post", "/monitor/collection-success-rate", {
    data
  });
};

/** 获取报警处理及时率 */
export const getAlarmHandleTimelyRate = (data?: object) => {
  return http.request<Result>("post", "/monitor/alarm-handle-rate", { data });
};

/** 获取监控趋势分析 */
export const getMonitorTrendAnalysis = (data?: object) => {
  return http.request<Result>("post", "/monitor/trend-analysis", { data });
};

/** 获取设备健康度评估 */
export const getDeviceHealthAssessment = (data?: object) => {
  return http.request<Result>("post", "/monitor/device-health", { data });
};

/** 获取系统性能监控 */
export const getSystemPerformance = () => {
  return http.request<Result>("get", "/monitor/system-performance");
};

/** 获取网络状态监控 */
export const getNetworkStatus = () => {
  return http.request<Result>("get", "/monitor/network-status");
};

/** 获取存储空间监控 */
export const getStorageStatus = () => {
  return http.request<Result>("get", "/monitor/storage-status");
};

/** 获取数据库性能监控 */
export const getDatabasePerformance = () => {
  return http.request<Result>("get", "/monitor/database-performance");
};

/** 获取服务运行状态 */
export const getServiceStatus = () => {
  return http.request<Result>("get", "/monitor/service-status");
};

/** 获取监控告警配置 */
export const getMonitorAlarmConfig = () => {
  return http.request<Result>("get", "/monitor/alarm-config");
};

/** 保存监控告警配置 */
export const saveMonitorAlarmConfig = (data?: object) => {
  return http.request<Result>("post", "/monitor/alarm-config-save", { data });
};

/** 获取监控报表 */
export const getMonitorReport = (data?: object) => {
  return http.request<Result>("post", "/monitor/report", { data });
};

/** 导出监控数据 */
export const exportMonitorData = (data?: object) => {
  return http.request<Result>("post", "/monitor/export-data", { data });
};

/** 获取监控大屏数据 */
export const getMonitorDashboardData = () => {
  return http.request<Result>("get", "/monitor/dashboard");
};

/** 获取实时报警推送 */
export const getRealtimeAlarmPush = () => {
  return http.request<Result>("get", "/monitor/realtime-alarm-push");
};
