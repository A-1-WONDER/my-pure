import { http } from "@/utils/http";
import type { Result } from "@/api/types";

export type ApiMode = "dev" | "prod";
export type SyncMode = "on" | "off";

export interface ExternalApiAuthSettings {
  authCode: string;
  requestCount: number;
  apiMode: ApiMode;
  syncMode: SyncMode;
  randomString: string;
  apiKey?: string;
  defaultMeterType: string;
  apiDocUrl: string;
  statusText?: string;
}

/** 查询接口授权配置 */
export const getExternalApiAuthSettings = () => {
  return http.request<Result<ExternalApiAuthSettings>>(
    "post",
    "/api/external-auth-settings-get"
  );
};

/** 保存接口授权配置 */
export const saveExternalApiAuthSettings = (data: ExternalApiAuthSettings) => {
  return http.request<Result<ExternalApiAuthSettings>>(
    "post",
    "/api/external-auth-settings-save",
    { data }
  );
};
