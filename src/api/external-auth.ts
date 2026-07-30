import { http } from "@/utils/http";
import type { Result } from "@/api/types";

/** 开放接口可调用项 */
export interface PartnerApiItem {
  method: string;
  path: string;
  description: string;
}

/** 错误码摘要项 */
export interface PartnerErrorCodeItem {
  code: string;
  http: string;
  meaning: string;
}

/** 开放接口对接摘要（不含 appSecret） */
export interface PartnerIntegrationInfo {
  baseUrl: string;
  apiPrefix: string;
  docVersion: string;
  apiDocUrl: string;
  enabled: boolean | null;
  appId: string;
  tokenTtlSeconds: number | null;
  authHeader: string;
  tokenPrefix: string;
  loginHint: string;
  noticeHint: string;
  errorCodes: PartnerErrorCodeItem[];
  apis: PartnerApiItem[];
}

/** 查询开放接口对接信息 */
export const getPartnerIntegration = () => {
  return http.request<Result<PartnerIntegrationInfo>>(
    "post",
    "/api/external-auth-settings-get"
  );
};
