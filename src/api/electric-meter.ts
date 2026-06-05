import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/**
 * 电表管理接口
 * 基础路径：/api/electric-meter
 */

/**
 * 查询电表列表
 * GET /api/electric-meter
 * 权限：electric-meter:list
 */
export const getElectricMeterList = (params?: object) => {
  console.log("【electric-meter.ts】getElectricMeterList被调用");
  console.log("【electric-meter.ts】请求参数params:", params);
  console.log("【electric-meter.ts】请求URL: /api/electric-meter");
  console.log("【electric-meter.ts】请求方法: GET");

  const result = http.request<ResultTable>("get", "/api/electric-meter", {
    params
  });

  // 添加then/catch来捕获Promise的结果
  result
    .then(res => {
      console.log("【electric-meter.ts】API响应成功:", res);
    })
    .catch(err => {
      console.error("【electric-meter.ts】API响应错误:", err);
      console.error("【electric-meter.ts】错误详情:", {
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
          console.error("【electric-meter.ts】响应数据解析:", errorData);
        } catch (parseError) {
          console.error("【electric-meter.ts】响应数据解析失败:", parseError);
          console.error(
            "【electric-meter.ts】原始响应数据:",
            err.response.data
          );
        }
      }
    });

  return result;
};

/**
 * 导出电表数据
 * GET /api/electric-meter/download
 * 权限：electric-meter:list
 */
export const exportElectricMeterData = (params?: object) => {
  return http.request<Result>("get", "/api/electric-meter/download", {
    params
  });
};

/**
 * 新增电表
 * POST /api/electric-meter
 * 权限：electric-meter:add
 */
export const addElectricMeter = (data?: object) => {
  return http.request<Result>("post", "/api/electric-meter", { data });
};

/**
 * 修改电表
 * PUT /api/electric-meter/{id}
 * 权限：electric-meter:edit
 */
export const editElectricMeter = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/electric-meter/${id}`, { data });
};

/**
 * 删除电表
 * DELETE /api/electric-meter/{id}
 * 权限：electric-meter:del
 */
export const deleteElectricMeter = (id: number) => {
  return http.request<Result>("delete", `/api/electric-meter/${id}`);
};

/**
 * 获取电表状态
 * GET /api/electric-meter/{id}/status
 * 权限：electric-meter:list
 */
export const getElectricMeterStatus = (id: number) => {
  return http.request<Result>("get", `/api/electric-meter/${id}/status`);
};

/**
 * 获取电表详情
 * GET /api/electric-meter/{id}
 * 权限：electric-meter:list
 */
export const getElectricMeterDetail = (id: number) => {
  return http.request<Result>("get", `/api/electric-meter/${id}`);
};

/**
 * 获取电表用电统计
 * GET /api/electric-meter/{id}/statistics
 * 权限：electric-meter:list
 */
export const getElectricMeterStatistics = (id: number, params?: object) => {
  return http.request<Result>("get", `/api/electric-meter/${id}/statistics`, {
    params
  });
};

/**
 * 获取电表告警记录
 * GET /api/electric-meter/{id}/alarms
 * 权限：electric-meter:list
 */
export const getElectricMeterAlarms = (id: number, params?: object) => {
  return http.request<Result>("get", `/api/electric-meter/${id}/alarms`, {
    params
  });
};

/**
 * 导入电表数据
 * POST /api/electric-meter/import
 * 权限：electric-meter:add
 */
export const importElectricMeterData = (data?: object) => {
  return http.request<Result>("post", "/api/electric-meter/import", { data });
};

/**
 * 根据编号查询电表
 * GET /api/electric-meter/no/{meterNo}
 * 权限：electric-meter:list
 */
export const getElectricMeterByNo = (meterNo: string) => {
  return http.request<Result>("get", `/api/electric-meter/no/${meterNo}`);
};
