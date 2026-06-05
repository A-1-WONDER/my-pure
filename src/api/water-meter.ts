import { http } from "@/utils/http";
import type { ResultTable } from "@/api/types";

/** 获取水表管理列表 */
export const getWaterMeterList = (data?: object) => {
  return http.request<ResultTable>("post", "/water-meter", { data });
};

/** 获取水表管理-根据 id 查详情 */
export const getWaterMeterDetail = (data?: object) => {
  return http.request<ResultTable>("post", "/water-meter-detail", { data });
};

/** 新增水表 */
export const addWaterMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/water-meter-add", { data });
};

/** 编辑水表 */
export const editWaterMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/water-meter-edit", { data });
};

/** 删除水表 */
export const deleteWaterMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/water-meter-delete", { data });
};
