import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";

/** 获取标签分类列表 */
export const getTagCategoryList = (data?: object) => {
  return http.request<ResultTable>("post", "/tag-category", { data });
};

/** 获取标签分类详情 */
export const getTagCategoryDetail = (data?: object) => {
  return http.request<Result>("post", "/tag-category-detail", { data });
};

/** 新增标签分类 */
export const addTagCategory = (data?: object) => {
  return http.request<Result>("post", "/tag-category-add", { data });
};

/** 编辑标签分类 */
export const editTagCategory = (data?: object) => {
  return http.request<Result>("post", "/tag-category-edit", { data });
};

/** 删除标签分类 */
export const deleteTagCategory = (data?: object) => {
  return http.request<Result>("post", "/tag-category-delete", { data });
};

/** 获取标签列表 */
export const getTagList = (data?: object) => {
  return http.request<ResultTable>("post", "/tag", { data });
};

/** 获取标签详情 */
export const getTagDetail = (data?: object) => {
  return http.request<Result>("post", "/tag-detail", { data });
};

/** 新增标签 */
export const addTag = (data?: object) => {
  return http.request<Result>("post", "/tag-add", { data });
};

/** 编辑标签 */
export const editTag = (data?: object) => {
  return http.request<Result>("post", "/tag-edit", { data });
};

/** 删除标签 */
export const deleteTag = (data?: object) => {
  return http.request<Result>("post", "/tag-delete", { data });
};

/** 获取表具标签关联列表 */
export const getMeterTagRelationList = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-tag-relation", { data });
};

/** 获取表具标签关联详情 */
export const getMeterTagRelationDetail = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-relation-detail", { data });
};

/** 关联表具标签 */
export const relateMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-relate", { data });
};

/** 取消表具标签关联 */
export const unrelateMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-unrelate", { data });
};

/** 批量关联表具标签 */
export const batchRelateMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-batch-relate", { data });
};

/** 批量取消表具标签关联 */
export const batchUnrelateMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-batch-unrelate", { data });
};

/** 获取标签统计 */
export const getTagStatistics = (data?: object) => {
  return http.request<Result>("post", "/tag-statistics", { data });
};

/** 获取表具标签分布 */
export const getMeterTagDistribution = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-distribution", { data });
};

/** 根据标签查询表具 */
export const getMetersByTag = (data?: object) => {
  return http.request<ResultTable>("post", "/meters-by-tag", { data });
};

/** 根据表具查询标签 */
export const getTagsByMeter = (data?: object) => {
  return http.request<Result>("post", "/tags-by-meter", { data });
};

/** 导出标签数据 */
export const exportTagData = (data?: object) => {
  return http.request<Result>("post", "/tag-export", { data });
};

/** 导入标签数据 */
export const importTagData = (data?: object) => {
  return http.request<Result>("post", "/tag-import", { data });
};

/** 获取标签使用分析 */
export const getTagUsageAnalysis = (data?: object) => {
  return http.request<Result>("post", "/tag-usage-analysis", { data });
};

/** 获取热门标签排行 */
export const getHotTagRanking = (data?: object) => {
  return http.request<Result>("post", "/hot-tag-ranking", { data });
};

/** 清理未使用标签 */
export const cleanUnusedTags = (data?: object) => {
  return http.request<Result>("post", "/tag-clean-unused", { data });
};
