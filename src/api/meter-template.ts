import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/**
 * 通用表管理接口工厂
 * 根据表类型生成对应的API接口
 */
export function createMeterApi(meterType: string) {
  const basePath = `/api/${meterType}-meter`;

  return {
    /**
     * 查询表列表
     * GET /api/{type}-meter
     * 权限：{type}-meter:list
     */
    getMeterList: (params?: object) => {
      console.log(`【${meterType}-meter.ts】getMeterList被调用`);
      console.log(`【${meterType}-meter.ts】请求参数params:`, params);
      console.log(`【${meterType}-meter.ts】请求URL: ${basePath}`);
      console.log(`【${meterType}-meter.ts】请求方法: GET`);

      const result = http.request<ResultTable>("get", basePath, {
        params
      });

      // 添加then/catch来捕获Promise的结果
      result
        .then(res => {
          console.log(`【${meterType}-meter.ts】API响应成功:`, res);
        })
        .catch(err => {
          console.error(`【${meterType}-meter.ts】API响应错误:`, err);
          console.error(`【${meterType}-meter.ts】错误详情:`, {
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
              console.error(
                `【${meterType}-meter.ts】响应数据解析:`,
                errorData
              );
            } catch (parseError) {
              console.error(
                `【${meterType}-meter.ts】响应数据解析失败:`,
                parseError
              );
              console.error(
                `【${meterType}-meter.ts】原始响应数据:`,
                err.response.data
              );
            }
          }
        });

      return result;
    },

    /**
     * 导出表数据
     * GET /api/{type}-meter/download
     * 权限：{type}-meter:list
     */
    exportMeterData: (params?: object) => {
      return http.request<Result>("get", `${basePath}/download`, { params });
    },

    /**
     * 新增表
     * POST /api/{type}-meter
     * 权限：{type}-meter:add
     */
    addMeter: (data?: object) => {
      return http.request<Result>("post", basePath, { data });
    },

    /**
     * 修改表
     * PUT /api/{type}-meter/{id}
     * 权限：{type}-meter:edit
     */
    editMeter: (id: number, data?: object) => {
      return http.request<Result>("put", `${basePath}/${id}`, { data });
    },

    /**
     * 删除表
     * DELETE /api/{type}-meter/{id}
     * 权限：{type}-meter:del
     */
    deleteMeter: (id: number) => {
      return http.request<Result>("delete", `${basePath}/${id}`);
    },

    /**
     * 获取表状态
     * GET /api/{type}-meter/{id}/status
     * 权限：{type}-meter:list
     */
    getMeterStatus: (id: number) => {
      return http.request<Result>("get", `${basePath}/${id}/status`);
    },

    /**
     * 获取表详情
     * GET /api/{type}-meter/{id}
     * 权限：{type}-meter:list
     */
    getMeterDetail: (id: number) => {
      return http.request<Result>("get", `${basePath}/${id}`);
    },

    /**
     * 获取表用量统计
     * GET /api/{type}-meter/{id}/statistics
     * 权限：{type}-meter:list
     */
    getMeterStatistics: (id: number, params?: object) => {
      return http.request<Result>("get", `${basePath}/${id}/statistics`, {
        params
      });
    },

    /**
     * 获取表告警记录
     * GET /api/{type}-meter/{id}/alarms
     * 权限：{type}-meter:list
     */
    getMeterAlarms: (id: number, params?: object) => {
      return http.request<Result>("get", `${basePath}/${id}/alarms`, {
        params
      });
    },

    /**
     * 导入表数据
     * POST /api/{type}-meter/import
     * 权限：{type}-meter:add
     */
    importMeterData: (data?: object) => {
      return http.request<Result>("post", `${basePath}/import`, { data });
    },

    /**
     * 根据编号查询表
     * GET /api/{type}-meter/no/{meterNo}
     * 权限：{type}-meter:list
     */
    getMeterByNo: (meterNo: string) => {
      return http.request<Result>("get", `${basePath}/no/${meterNo}`);
    }
  };
}

// 预定义的表类型API
const meterApis = {
  water: createMeterApi("water"),
  electric: createMeterApi("electric"),
  gas: createMeterApi("gas")
};

// 导出预定义的API
const { water, electric, gas } = meterApis;

export { water, electric, gas };

// 也可以直接导出工厂函数，用于创建其他类型的表API
export { createMeterApi };
