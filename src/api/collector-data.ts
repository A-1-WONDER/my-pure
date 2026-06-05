import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/**
 * 采集数据管理接口
 * 基础路径：/api/collector-data
 */

/**
 * 查询采集数据
 * GET /api/collector-data
 * 权限：collector:list
 */
export const getCollectorDataList = (params?: object) => {
  return http.request<ResultTable>("get", "/api/collector-data", { params });
};

/**
 * 新增采集数据
 * POST /api/collector-data
 * 权限：collector:add
 */
export const addCollectorData = (data?: object) => {
  return http.request<Result>("post", "/api/collector-data", { data });
};

/**
 * 批量新增采集数据
 * POST /api/collector-data/batch
 * 权限：collector:add
 */
export const batchAddCollectorData = (data?: object) => {
  return http.request<Result>("post", "/api/collector-data/batch", { data });
};

/**
 * 修改采集数据
 * PUT /api/collector-data/{id}
 * 权限：collector:edit
 */
export const editCollectorData = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/collector-data/${id}`, { data });
};

/**
 * 删除采集数据
 * DELETE /api/collector-data/{id}
 * 权限：collector:del
 */
export const deleteCollectorData = (id: number) => {
  return http.request<Result>("delete", `/api/collector-data/${id}`);
};

/**
 * 获取采集器最新数据
 * GET /api/collector-data/collector/{collectorId}/latest
 * 权限：collector:list
 */
export const getLatestCollectorData = (collectorId: number) => {
  return http.request<Result>(
    "get",
    `/api/collector-data/collector/${collectorId}/latest`
  );
};

/**
 * 获取数据统计信息
 * GET /api/collector-data/collector/{collectorId}/statistics
 * 权限：collector:list
 */
export const getCollectorDataStatistics = (
  collectorId: number,
  params?: object
) => {
  return http.request<Result>(
    "get",
    `/api/collector-data/collector/${collectorId}/statistics`,
    { params }
  );
};

/**
 * 清理过期数据
 * POST /api/collector-data/clean
 * 权限：collector:del
 */
export const cleanExpiredData = (data?: object) => {
  return http.request<Result>("post", "/api/collector-data/clean", { data });
};

/**
 * 检查数据质量
 * POST /api/collector-data/check-quality
 * 权限：collector:list
 */
export const checkDataQuality = (data?: object) => {
  return http.request<Result>("post", "/api/collector-data/check-quality", {
    data
  });
};

/**
 * 获取采集器数据详情（兼容旧接口）
 */
export const getCollectorDataDetail = (id: number) => {
  return http.request<Result>("get", `/api/collector-data/${id}`);
};
