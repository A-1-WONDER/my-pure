import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/** 设备管理相关接口 */

/** 获取设备列表 */
export const getDeviceList = (data?: object) => {
  return http.request<ResultTable>("post", "/device/list", { data });
};

/** 获取设备详情 */
export const getDeviceDetail = (data?: object) => {
  return http.request<Result>("post", "/device/detail", { data });
};

/** 新增设备 */
export const addDevice = (data?: object) => {
  return http.request<Result>("post", "/device/add", { data });
};

/** 编辑设备 */
export const editDevice = (data?: object) => {
  return http.request<Result>("post", "/device/edit", { data });
};

/** 删除设备 */
export const deleteDevice = (data?: object) => {
  return http.request<Result>("post", "/device/delete", { data });
};

/** 批量导入设备 */
export const batchImportDevices = (data?: object) => {
  return http.request<Result>("post", "/device/batch-import", { data });
};

/** 批量导出设备 */
export const batchExportDevices = (data?: object) => {
  return http.request<Result>("post", "/device/batch-export", { data });
};

/** 获取设备类型列表 */
export const getDeviceTypeList = () => {
  return http.request<Result>("get", "/device/types");
};

/** 获取设备型号列表 */
export const getDeviceModelList = (data?: object) => {
  return http.request<Result>("post", "/device/models", { data });
};

/** 获取设备厂商列表 */
export const getDeviceManufacturerList = () => {
  return http.request<Result>("get", "/device/manufacturers");
};

/** 获取设备安装位置列表 */
export const getDeviceLocationList = (data?: object) => {
  return http.request<Result>("post", "/device/locations", { data });
};

/** 获取设备状态统计 */
export const getDeviceStatusStatistics = () => {
  return http.request<Result>("get", "/device/status-statistics");
};

/** 获取设备运行数据 */
export const getDeviceOperationData = (data?: object) => {
  return http.request<Result>("post", "/device/operation-data", { data });
};

/** 获取设备维护记录 */
export const getDeviceMaintenanceRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/maintenance-records", {
    data
  });
};

/** 新增设备维护记录 */
export const addDeviceMaintenanceRecord = (data?: object) => {
  return http.request<Result>("post", "/device/maintenance-add", { data });
};

/** 获取设备校准记录 */
export const getDeviceCalibrationRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/calibration-records", {
    data
  });
};

/** 新增设备校准记录 */
export const addDeviceCalibrationRecord = (data?: object) => {
  return http.request<Result>("post", "/device/calibration-add", { data });
};

/** 获取设备巡检记录 */
export const getDeviceInspectionRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/inspection-records", {
    data
  });
};

/** 新增设备巡检记录 */
export const addDeviceInspectionRecord = (data?: object) => {
  return http.request<Result>("post", "/device/inspection-add", { data });
};

/** 获取设备维修记录 */
export const getDeviceRepairRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/repair-records", { data });
};

/** 新增设备维修记录 */
export const addDeviceRepairRecord = (data?: object) => {
  return http.request<Result>("post", "/device/repair-add", { data });
};

/** 获取设备更换记录 */
export const getDeviceReplacementRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/replacement-records", {
    data
  });
};

/** 新增设备更换记录 */
export const addDeviceReplacementRecord = (data?: object) => {
  return http.request<Result>("post", "/device/replacement-add", { data });
};

/** 获取设备报废记录 */
export const getDeviceScrapRecords = (data?: object) => {
  return http.request<ResultTable>("post", "/device/scrap-records", { data });
};

/** 新增设备报废记录 */
export const addDeviceScrapRecord = (data?: object) => {
  return http.request<Result>("post", "/device/scrap-add", { data });
};

/** 获取设备生命周期 */
export const getDeviceLifecycle = (data?: object) => {
  return http.request<Result>("post", "/device/lifecycle", { data });
};

/** 获取设备预警信息 */
export const getDeviceWarningInfo = (data?: object) => {
  return http.request<Result>("post", "/device/warning-info", { data });
};

/** 获取设备关联的采集器 */
export const getDeviceCollectors = (data?: object) => {
  return http.request<Result>("post", "/device/collectors", { data });
};

/** 关联设备与采集器 */
export const relateDeviceCollector = (data?: object) => {
  return http.request<Result>("post", "/device/relate-collector", { data });
};

/** 取消设备与采集器关联 */
export const unrelateDeviceCollector = (data?: object) => {
  return http.request<Result>("post", "/device/unrelate-collector", { data });
};

/** 获取设备二维码 */
export const getDeviceQRCode = (data?: object) => {
  return http.request<Result>("post", "/device/qrcode", { data });
};

/** 扫描设备二维码 */
export const scanDeviceQRCode = (data?: object) => {
  return http.request<Result>("post", "/device/scan-qrcode", { data });
};

/** 获取设备地图分布 */
export const getDeviceMapDistribution = (data?: object) => {
  return http.request<Result>("post", "/device/map-distribution", { data });
};

/** 获取设备拓扑图 */
export const getDeviceTopology = (data?: object) => {
  return http.request<Result>("post", "/device/topology", { data });
};

/** 同步设备数据 */
export const syncDeviceData = (data?: object) => {
  return http.request<Result>("post", "/device/sync-data", { data });
};

/** 批量更新设备状态 */
export const batchUpdateDeviceStatus = (data?: object) => {
  return http.request<Result>("post", "/device/batch-update-status", { data });
};

/** 获取设备操作日志 */
export const getDeviceOperationLogs = (data?: object) => {
  return http.request<ResultTable>("post", "/device/operation-logs", { data });
};

/** 清理设备历史数据 */
export const cleanDeviceHistoryData = (data?: object) => {
  return http.request<Result>("post", "/device/clean-history", { data });
};
