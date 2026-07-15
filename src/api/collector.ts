import { http } from "@/utils/http";
import type { Result } from "@/api/types";

// Spring Data分页响应格式
type SpringDataPage<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
};

/**
 * 采集器管理接口
 * 基础路径：/api/collector
 */

/**
 * 查询采集器列表
 * GET /api/collector
 * 权限：collector:list
 */
export const getCollectorList = (params?: object) => {
  console.log("【collector.ts】getCollectorList被调用");
  console.log("【collector.ts】原始参数params:", params);

  // 转换参数格式以匹配后端期望
  const raw = (params ?? {}) as Record<string, unknown>;
  const transformedParams: Record<string, unknown> = {
    ...raw,
    page: raw.page || 1,
    size: raw.pageSize ?? raw.size ?? 10
  };

  // 移除前端使用的参数名
  delete transformedParams.pageSize;

  console.log("【collector.ts】转换后参数:", transformedParams);
  console.log("【collector.ts】请求URL: /api/collectors");
  console.log("【collector.ts】请求方法: GET");

  const result = http.request<SpringDataPage<any>>("get", "/api/collectors", {
    params: transformedParams
  });

  // 添加then/catch来捕获Promise的结果
  result
    .then(res => {
      console.log("【collector.ts】API响应成功:", res);
    })
    .catch(err => {
      console.error("【collector.ts】API响应错误:", err);
      console.error("【collector.ts】错误详情:", {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method,
        requestData: err.config?.data,
        requestParams: err.config?.params,
        responseData: err.response?.data,
        responseHeaders: err.response?.headers
      });
      // 尝试解析响应数据
      if (err.response?.data) {
        try {
          const errorData =
            typeof err.response.data === "string"
              ? JSON.parse(err.response.data)
              : err.response.data;
          console.error("【collector.ts】响应数据解析:", errorData);
        } catch (parseError) {
          console.error("【collector.ts】响应数据解析失败:", parseError);
          console.error("【collector.ts】原始响应数据:", err.response.data);
        }
      }
    });

  return result;
};

/**
 * 导出采集器数据
 * GET /api/collector/download
 * 权限：collector:list
 */
export const exportCollectorData = (params?: object) => {
  return http.request<Result>("get", "/api/collectors/download", { params });
};

/**
 * 新增采集器
 * POST /api/collector
 * 权限：collector:add
 */
export const addCollector = (data?: object) => {
  return http.request<Result>("post", "/api/collectors", { data });
};

/**
 * 修改采集器
 * PUT /api/collectors
 * 权限：collector:edit
 */
export const editCollector = (data: object) => {
  return http.request<Result>("put", "/api/collectors", { data });
};

/**
 * 删除采集器（支持批量）
 * DELETE /api/collectors
 * 权限：collector:del
 */
export const deleteCollectors = (ids: number[]) => {
  return http.request<Result>("delete", "/api/collectors", { data: ids });
};

/** @deprecated 请使用 deleteCollectors */
export const deleteCollector = (id: number) => {
  return deleteCollectors([id]);
};

/**
 * 获取采集器状态
 * GET /api/collector/{id}/status
 * 权限：collector:list
 */
export const getCollectorStatus = (id: number) => {
  return http.request<Result>("get", `/api/collectors/${id}/status`);
};

/**
 * 重启采集器
 * POST /api/collector/{id}/restart
 * 权限：collector:edit
 */
export const restartCollector = (id: number) => {
  return http.request<Result>("post", `/api/collectors/${id}/restart`);
};

/**
 * 获取采集器数据
 * GET /api/collector/{id}/data
 * 权限：collector:list
 */
export const getCollectorData = (id: number, params?: object) => {
  return http.request<Result>("get", `/api/collectors/${id}/data`, { params });
};

/**
 * 获取采集历史
 * GET /api/collector/{id}/history
 * 权限：collector:list
 */
export const getCollectorHistory = (id: number, params?: object) => {
  return http.request<Result>("get", `/api/collectors/${id}/history`, {
    params
  });
};

/**
 * 导入采集器数据
 * POST /api/collector/import
 * 权限：collector:add
 */
export const importCollectorData = (data?: object) => {
  return http.request<Result>("post", "/api/collectors/import", { data });
};

/**
 * 根据编号查询采集器
 * GET /api/collector/no/{collectorNo}
 * 权限：collector:list
 */
export const getCollectorByNo = (collectorNo: string) => {
  return http.request<Result>("get", `/api/collectors/no/${collectorNo}`);
};

/**
 * 获取采集器详情（兼容旧接口）
 * 注意：后端文档中未明确此接口，但前端可能需要
 */
export const getCollectorDetail = (id: number) => {
  return http.request<Result>("get", `/api/collectors/${id}`);
};
