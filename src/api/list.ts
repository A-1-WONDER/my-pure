import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 卡片列表 */
export const getCardList = (data?: object) => {
  return http.request<Result>("post", "/get-card-list", { data });
};
