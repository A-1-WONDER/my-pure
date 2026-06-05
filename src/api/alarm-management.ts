import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/** 获取告警规则列表 */
export const getAlarmRuleList = (data?: object) => {
  return http.request<ResultTable>("post", "/alarm-rule", { data });
};

/** 获取告警规则详情 */
export const getAlarmRuleDetail = (data?: object) => {
  return http.request<Result>("post", "/alarm-rule-detail", { data });
};

/** 新增告警规则 */
export const addAlarmRule = (data?: object) => {
  return http.request<Result>("post", "/alarm-rule-add", { data });
};

/** 编辑告警规则 */
export const editAlarmRule = (data?: object) => {
  return http.request<Result>("post", "/alarm-rule-edit", { data });
};

/** 删除告警规则 */
export const deleteAlarmRule = (data?: object) => {
  return http.request<Result>("post", "/alarm-rule-delete", { data });
};

/** 启用/禁用告警规则 */
export const toggleAlarmRuleStatus = (data?: object) => {
  return http.request<Result>("post", "/alarm-rule-toggle", { data });
};

/** 获取告警记录列表 */
export const getAlarmRecordList = (data?: object) => {
  return http.request<ResultTable>("post", "/alarm-record", { data });
};

/** 获取告警记录详情 */
export const getAlarmRecordDetail = (data?: object) => {
  return http.request<Result>("post", "/alarm-record-detail", { data });
};

/** 处理告警记录 */
export const handleAlarmRecord = (data?: object) => {
  return http.request<Result>("post", "/alarm-record-handle", { data });
};

/** 批量处理告警记录 */
export const batchHandleAlarmRecord = (data?: object) => {
  return http.request<Result>("post", "/alarm-record-batch-handle", { data });
};

/** 获取告警统计 */
export const getAlarmStatistics = (data?: object) => {
  return http.request<Result>("post", "/alarm-statistics", { data });
};

/** 获取实时告警数量 */
export const getRealTimeAlarmCount = () => {
  return http.request<Result>("get", "/alarm-realtime-count");
};

/** 获取告警类型统计 */
export const getAlarmTypeStatistics = (data?: object) => {
  return http.request<Result>("post", "/alarm-type-statistics", { data });
};

/** 获取告警趋势分析 */
export const getAlarmTrendAnalysis = (data?: object) => {
  return http.request<Result>("post", "/alarm-trend-analysis", { data });
};

/** 获取设备告警排名 */
export const getDeviceAlarmRanking = (data?: object) => {
  return http.request<Result>("post", "/device-alarm-ranking", { data });
};

/** 导出告警记录 */
export const exportAlarmRecords = (data?: object) => {
  return http.request<Result>("post", "/alarm-export", { data });
};

/** 清空历史告警记录 */
export const clearHistoryAlarms = (data?: object) => {
  return http.request<Result>("post", "/alarm-clear-history", { data });
};
