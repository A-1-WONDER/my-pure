import { http } from "@/utils/http";
import type { ResultTable } from "@/api/types";

/** 获取添加表管理列表 */
export const getMeterAddList = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-add", { data });
};

/** 获取添加表管理-根据 id 查详情 */
export const getMeterAddDetail = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-add-detail", { data });
};

/** 新增表具 */
export const addMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-add-new", { data });
};

/** 编辑表具 */
export const editMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-add-edit", { data });
};

/** 删除表具 */
export const deleteMeter = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-add-delete", { data });
};
