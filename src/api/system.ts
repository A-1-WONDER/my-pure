import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";
import {
  mapEladminDept,
  mapEladminMenu,
  mapEladminRole,
  mapEladminUser,
  okResult,
  okTable,
  type EladminPageResult
} from "@/api/eladmin-system-adapter";

type ListQuery = Record<string, unknown>;

function buildBlurry(...parts: unknown[]) {
  return parts.filter(Boolean).join(" ").trim();
}

/** 获取系统管理-用户管理列表（eladmin GET /api/users） */
export const getUserList = async (data?: ListQuery): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params: Record<string, unknown> = { page, size };

  if (data?.deptId) params.deptId = data.deptId;

  const blurry = buildBlurry(data?.username, data?.phone);
  if (blurry) params.blurry = blurry;

  if (data?.status !== "" && data?.status != null) {
    params.enabled = Number(data.status) === 1;
  }

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/users",
    { params }
  );
  const list = (res?.content ?? []).map(mapEladminUser);
  return okTable(list, res?.totalElements, size, page);
};

/** eladmin 用户分页（GET /api/users），大屏/统计等对接真实后端时使用 */
export const getEladminUserPage = (params?: {
  page?: number;
  size?: number;
  [key: string]: unknown;
}) => {
  return http.request<{ content?: unknown[]; totalElements?: number }>(
    "get",
    "/api/users",
    {
      params: {
        page: params?.page ?? 1,
        size: params?.size ?? 10,
        ...params
      }
    }
  );
};

/** 系统管理-用户管理-获取所有角色列表（eladmin GET /api/roles/all） */
export const getAllRoleList = async (): Promise<Result> => {
  const res = await http.request<Array<{ id: number; name: string }>>(
    "get",
    "/api/roles/all"
  );
  return okResult(res ?? []);
};

/** 系统管理-用户管理-根据 userId 获取对应角色 id 列表 */
export const getRoleIds = async (data?: {
  userId?: number;
}): Promise<Result<number[]>> => {
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/users",
    {
      params: { id: data?.userId, page: 1, size: 1 }
    }
  );
  const user = res?.content?.[0];
  const roles = (user?.roles as Array<{ id: number }>) ?? [];
  return okResult(roles.map(r => r.id));
};

/** 获取系统管理-角色管理列表（eladmin GET /api/roles） */
export const getRoleList = async (data?: ListQuery): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params: Record<string, unknown> = { page, size };

  if (data?.name) params.blurry = data.name;

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/roles",
    { params }
  );

  let list = (res?.content ?? []).map(mapEladminRole);

  if (data?.code) {
    list = list.filter(item => String(item.code).includes(String(data.code)));
  }
  if (data?.status !== "" && data?.status != null) {
    list = list.filter(item => item.status === Number(data.status));
  }

  return okTable(list, res?.totalElements, size, page);
};

/** 获取系统管理-菜单管理列表（eladmin GET /api/menus） */
export const getMenuList = async (): Promise<Result> => {
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/menus"
  );
  const list = (res?.content ?? []).map(mapEladminMenu);
  return okResult(list);
};

/** 获取系统管理-部门管理列表（eladmin GET /api/dept） */
export const getDeptList = async (): Promise<Result> => {
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/dept"
  );
  const list = (res?.content ?? []).map(mapEladminDept);
  return okResult(list);
};

/** 获取系统监控-在线用户列表 */
export const getOnlineLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/online-logs", { data });
};

/** 获取系统监控-登录日志列表 */
export const getLoginLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/login-logs", { data });
};

/** 获取系统监控-操作日志列表 */
export const getOperationLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/operation-logs", { data });
};

/** 获取系统监控-系统日志列表 */
export const getSystemLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/system-logs", { data });
};

/** 获取系统监控-系统日志-根据 id 查日志详情 */
export const getSystemLogsDetail = (data?: object) => {
  return http.request<Result>("post", "/system-logs-detail", { data });
};

/** 获取角色管理-权限-菜单权限（eladmin GET /api/menus） */
export const getRoleMenu = async (): Promise<Result> => {
  return getMenuList();
};

/** 获取角色管理-权限-菜单权限-根据角色 id 查对应菜单（eladmin GET /api/roles/{id}） */
export const getRoleMenuIds = async (data?: {
  id?: number;
}): Promise<Result<number[]>> => {
  const role = await http.request<Record<string, unknown>>(
    "get",
    `/api/roles/${data?.id}`
  );
  const menus = (role?.menus as Array<{ id: number }>) ?? [];
  return okResult(menus.map(m => m.id));
};

/** 新增用户 */
export const createUser = (data: Record<string, unknown>) =>
  http.request<void>("post", "/api/users", { data });

/** 修改用户 */
export const updateUser = (data: Record<string, unknown>) =>
  http.request<void>("put", "/api/users", { data });

/** 删除用户 */
export const deleteUsers = (ids: number[]) =>
  http.request<void>("delete", "/api/users", { data: ids });

/** 重置用户密码（eladmin 默认重置为 123456） */
export const resetUserPassword = (ids: number[]) =>
  http.request<void>("put", "/api/users/resetPwd", { data: ids });

/** 上传用户头像 */
export const uploadUserAvatar = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return http.request<{ avatar?: string }>("post", "/api/users/updateAvatar", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/** 新增角色 */
export const createRole = (data: Record<string, unknown>) =>
  http.request<void>("post", "/api/roles", { data });

/** 修改角色 */
export const updateRole = (data: Record<string, unknown>) =>
  http.request<void>("put", "/api/roles", { data });

/** 删除角色 */
export const deleteRoles = (ids: number[]) =>
  http.request<void>("delete", "/api/roles", { data: ids });

/** 保存角色菜单权限 */
export const updateRoleMenus = (roleId: number, menuIds: number[]) =>
  http.request<void>("put", "/api/roles/menu", {
    data: {
      id: roleId,
      menus: menuIds.map(id => ({ id }))
    }
  });

/** 新增菜单 */
export const createMenu = (data: Record<string, unknown>) =>
  http.request<void>("post", "/api/menus", { data });

/** 修改菜单 */
export const updateMenu = (data: Record<string, unknown>) =>
  http.request<void>("put", "/api/menus", { data });

/** 删除菜单 */
export const deleteMenus = (ids: number[]) =>
  http.request<void>("delete", "/api/menus", { data: ids });

/** 新增部门 */
export const createDept = (data: Record<string, unknown>) =>
  http.request<void>("post", "/api/dept", { data });

/** 修改部门 */
export const updateDept = (data: Record<string, unknown>) =>
  http.request<void>("put", "/api/dept", { data });

/** 删除部门 */
export const deleteDepts = (ids: number[]) =>
  http.request<void>("delete", "/api/dept", { data: ids });

export type ExternalApiAuthSettings = {
  projectName?: string;
  authCode?: string;
  status?: string;
  requestCount?: number;
  apiMode?: "dev" | "prod" | string;
  syncMode?: "on" | "off" | string;
  randomString?: string;
  defaultMeterType?: string;
  apiDocUrl?: string;
  baseUrl?: string;
  configEnabled?: boolean;
};

/** 获取接口授权配置 */
export const getExternalApiAuthSettings = (params?: {
  projectName?: string;
  apiDocUrl?: string;
}) =>
  http.request<ExternalApiAuthSettings>("get", "/api/external/auth-settings", {
    params
  });

/** 保存接口授权配置 */
export const saveExternalApiAuthSettings = (data: ExternalApiAuthSettings) =>
  http.request<ExternalApiAuthSettings>("put", "/api/external/auth-settings", {
    data
  });

/** 测试第三方 API 连接 */
export const testExternalApiConnection = () =>
  http.request<Record<string, unknown>>("get", "/api/external/test-connection");

/** 获取监控系统-电表标签列表 */
export const getMeterTagsList = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-tags", { data });
};

/** 获取监控系统-电表标签详情 */
export const getMeterTagDetail = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-detail", { data });
};

/** 添加监控系统-电表标签 */
export const addMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-add", { data });
};

/** 更新监控系统-电表标签 */
export const updateMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-update", { data });
};

/** 删除监控系统-电表标签 */
export const deleteMeterTag = (data?: object) => {
  return http.request<Result>("post", "/meter-tag-delete", { data });
};

/** 获取监控系统-电表数据列表 */
export const getMeterDataList = (data?: object) => {
  return http.request<ResultTable>("post", "/meter-data", { data });
};

/** 获取监控系统-采集器列表 */
export const getCollectorList = (data?: object) => {
  return http.request<ResultTable>("post", "/collector-list", { data });
};

/** 获取监控系统-电表类型列表 */
export const getMeterTypeList = (data?: object) => {
  return http.request<Result>("post", "/meter-type-list", { data });
};
