import { http } from "@/utils/http";
import type { Result } from "@/api/types";

export const getAsyncRoutes = () => {
  return http.request<Result>("get", "/api/menus/build");
};
