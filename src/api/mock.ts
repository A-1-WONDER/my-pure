import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 地图数据 */
export const mapJson = (params?: object) => {
  return http.request<Result>("get", "/get-map-info", { params });
};

/** 文件上传 */
export const formUpload = data => {
  return http.request<Result>(
    "post",
    "https://pureadmin.free.beeceptor.com/images",
    { data },
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );
};
