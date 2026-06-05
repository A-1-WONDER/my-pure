import { http } from "@/utils/http";

/**
 * 采集器档案列表（与报警规则 targetIds 对齐，非 collector-data 时序数据）
 * GET /api/collectors
 */
export const getCollectorArchiveList = (params?: {
  page?: number;
  size?: number;
}) => {
  return http.request("get", "/api/collectors", { params });
};
