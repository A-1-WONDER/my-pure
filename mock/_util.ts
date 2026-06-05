/**
 * 成功响应工具函数
 * @param data 响应数据
 * @returns 标准响应格式
 */
export const resultSuccess = <T = any>(
  data: T,
  message = "操作成功",
  success = true
) => {
  return {
    success,
    message,
    data
  };
};

/**
 * 失败响应工具函数
 * @param message 错误信息
 * @param success 成功标志
 * @returns 标准错误响应格式
 */
export const resultError = (message = "操作失败", success = false) => {
  return {
    success,
    message,
    data: null
  };
};

/**
 * 分页响应工具函数
 * @param list 列表数据
 * @param total 总条数
 * @param pageSize 每页条数
 * @param currentPage 当前页码
 * @returns 分页响应格式
 */
export const resultPageSuccess = <T = any>(
  list: T[],
  total: number,
  pageSize: number,
  currentPage: number
) => {
  return resultSuccess({
    list,
    total,
    pageSize,
    currentPage
  });
};
