import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 对外可调用接口项 */
export interface PartnerApiItem {
  method: string;
  path: string;
  description: string;
}

/** 对外对接信息（不含 3.2 密钥） */
export interface PartnerIntegrationInfo {
  baseUrl: string;
  apiDocUrl: string;
  partnerUsername: string;
  authHeader: string;
  tokenPrefix: string;
  loginHint: string;
  apis: PartnerApiItem[];
}

/** 查询对外对接信息 */
export const getPartnerIntegration = () => {
  return http.request<Result<PartnerIntegrationInfo>>(
    "post",
    "/api/external-auth-settings-get"
  );
};

/** 仅保存对接账号用户名 */
export const savePartnerUsername = (partnerUsername: string) => {
  return http.request<Result<PartnerIntegrationInfo>>(
    "post",
    "/api/external-auth-settings-save",
    { data: { partnerUsername } }
  );
};
