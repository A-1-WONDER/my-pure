import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/** 获取报警事件查询列表 */
export const getAlarmEventQueryList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/alarm-event-query", { data });
};

/** 获取报警事件查询-根据 id 查详情 */
export const getAlarmEventQueryDetail = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-event-query-detail", {
    data
  });
};

/** 处理报警事件 */
export const processAlarmEvent = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-event-process", { data });
};

/** 关闭报警事件 */
export const closeAlarmEvent = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-event-close", { data });
};

/** 清空全部报警事件 */
export const clearAllAlarmEvents = (data?: object) => {
  return http.request<Result>("post", "/api/alarm-event-clear-all", { data });
};
