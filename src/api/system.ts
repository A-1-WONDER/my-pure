import { http } from "@/utils/http";
import type { Result, ResultTable } from "@/api/types";
import {
  buildEladminLogQueryParams,
  buildEladminRolePayloadFromForm,
  buildEladminUserPayloadFromForm,
  buildEladminUserPayloadFromRecord,
  mapEladminDept,
  mapEladminErrorLog,
  mapEladminMenu,
  mapEladminOperationLog,
  mapEladminRole,
  mapEladminUser,
  okResult,
  okTable,
  type EladminPageResult
} from "@/api/eladmin-system-adapter";
import {
  backendMenuIdsToCheckedKeys,
  buildRolePermissionTree,
  type RolePermissionTreeNode
} from "@/utils/frontend-menu-tree";

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

/** 新增用户（eladmin POST /api/users，默认密码 123456） */
export const createUser = (form: Record<string, unknown>) => {
  return http.request<void>("post", "/api/users", {
    data: buildEladminUserPayloadFromForm(form as any)
  });
};

/** 修改用户（eladmin PUT /api/users） */
export const updateUser = (payload: Record<string, unknown>) => {
  return http.request<void>("put", "/api/users", { data: payload });
};

/** 修改用户（基于列表行 + 局部字段） */
export const updateUserRecord = (
  source: Record<string, unknown>,
  patch?: Record<string, unknown>
) => {
  return updateUser(buildEladminUserPayloadFromRecord(source, patch as any));
};

/** 删除用户（eladmin DELETE /api/users，body 为 id 数组） */
export const deleteUsers = (ids: number[]) => {
  return http.request<void>("delete", "/api/users", { data: ids });
};

/** 重置密码为 123456（eladmin PUT /api/users/resetPwd） */
export const resetUserPassword = (ids: number[]) => {
  return http.request<void>("put", "/api/users/resetPwd", { data: ids });
};

/** 分配角色（更新用户 roles） */
export const assignUserRoles = async (
  source: Record<string, unknown>,
  roleIds: number[]
) => {
  return updateUser(buildEladminUserPayloadFromRecord(source, { roleIds }));
};

/** 上传用户头像（eladmin POST /api/users/updateAvatar） */
export const uploadUserAvatar = (file: Blob, filename = "avatar.png") => {
  const formData = new FormData();
  formData.append("avatar", file, filename);
  return http.request<Record<string, unknown>>(
    "post",
    "/api/users/updateAvatar",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

/** 岗位列表（eladmin GET /api/job） */
export const getAllJobList = async (): Promise<Result> => {
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/job",
    { params: { page: 1, size: 999, enabled: true } }
  );
  return okResult(res?.content ?? []);
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

  return okTable(list, res?.totalElements, size, page);
};

/** 新增角色（eladmin POST /api/roles） */
export const createRole = (form: {
  name: string;
  remark?: string;
  level?: number;
  dataScope?: string;
}) => {
  return http.request<void>("post", "/api/roles", {
    data: buildEladminRolePayloadFromForm(form)
  });
};

/** 修改角色（eladmin PUT /api/roles） */
export const updateRole = (form: {
  id?: number;
  name: string;
  remark?: string;
  level?: number;
  dataScope?: string;
}) => {
  return http.request<void>("put", "/api/roles", {
    data: buildEladminRolePayloadFromForm(form)
  });
};

/** 删除角色（eladmin DELETE /api/roles） */
export const deleteRoles = (ids: number[]) => {
  return http.request<void>("delete", "/api/roles", { data: ids });
};

/** 修改角色菜单（eladmin PUT /api/roles/menu） */
export const updateRoleMenus = (roleId: number, menuIds: number[]) => {
  return http.request<void>("put", "/api/roles/menu", {
    data: {
      id: roleId,
      menus: menuIds.map(id => ({ id }))
    }
  });
};

/** 当前用户可操作的最低角色级别（eladmin GET /api/roles/level） */
export const getRoleLevel = async (): Promise<Result<number>> => {
  const res = await http.request<{ level?: number }>("get", "/api/roles/level");
  return okResult(res?.level ?? 3);
};

let rolePermissionTreeCache: {
  tree: RolePermissionTreeNode[];
  menuIndex: ReturnType<typeof buildRolePermissionTree>["menuIndex"];
} | null = null;

async function loadRolePermissionTreeContext() {
  if (rolePermissionTreeCache) return rolePermissionTreeCache;

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/menus"
  );
  const eladminMenus = (res?.content ?? []).map(item => ({
    id: Number(item.id),
    pid: item.pid as number | null | undefined,
    type: item.type as number | undefined,
    title: item.title as string | undefined,
    path: item.path as string | undefined,
    component: item.component as string | undefined
  }));
  const { tree, menuIndex } = buildRolePermissionTree(eladminMenus);
  rolePermissionTreeCache = { tree, menuIndex };
  return rolePermissionTreeCache;
}

/** 获取角色权限树上下文（树结构 + eladmin 菜单索引） */
export const getRolePermissionContext = () => loadRolePermissionTreeContext();

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

/** 获取系统监控-登录日志列表（eladmin GET /api/logs，筛选登录相关） */
export const getLoginLogsList = async (
  data?: ListQuery
): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params = buildEladminLogQueryParams({
    ...data,
    page,
    pageSize: size,
    blurry: data?.username ? undefined : "登录",
    username: data?.username
  });

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs",
    { params }
  );

  let list = (res?.content ?? []).map(mapEladminOperationLog);
  list = list.filter(item => String(item.summary).includes("登录"));

  return okTable(list, res?.totalElements, size, page);
};

/** 获取系统监控-操作日志列表（eladmin GET /api/logs） */
export const getOperationLogsList = async (
  data?: ListQuery
): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params = buildEladminLogQueryParams({ ...data, page, pageSize: size });

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs",
    { params }
  );
  const list = (res?.content ?? []).map(mapEladminOperationLog);
  return okTable(list, res?.totalElements, size, page);
};

/** 获取系统监控-异常日志列表（eladmin GET /api/logs/error） */
export const getSystemLogsList = async (
  data?: ListQuery
): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params = buildEladminLogQueryParams({ ...data, page, pageSize: size });

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs/error",
    { params }
  );
  const list = (res?.content ?? []).map(mapEladminErrorLog);
  return okTable(list, res?.totalElements, size, page);
};

/** 获取系统监控-异常日志详情（eladmin GET /api/logs/error/{id}） */
export const getSystemLogsDetail = async (data?: { id?: number }) => {
  const res = await http.request<{ exception?: string }>(
    "get",
    `/api/logs/error/${data?.id}`
  );
  return okResult(res ?? {});
};

/** 清空操作日志（eladmin DELETE /api/logs/del/info） */
export const clearOperationLogs = () => {
  return http.request<void>("delete", "/api/logs/del/info");
};

/** 清空异常日志（eladmin DELETE /api/logs/del/error） */
export const clearErrorLogs = () => {
  return http.request<void>("delete", "/api/logs/del/error");
};

export type MeterReadingRecord = {
  id: number;
  meterId: number;
  meterType?: string;
  readingTime?: string;
  readingValue?: number;
  readingType?: string;
  collectorId?: number;
  operatorId?: number;
  remark?: string;
  createdAt?: string;
};

/** 获取系统监控-抄表数据列表（eladmin GET /api/meter-readings） */
export const getMeterReadingRecords = async (
  data?: ListQuery
): Promise<ResultTable> => {
  const page = Number(data?.page ?? data?.currentPage ?? 1);
  const size = Number(data?.pageSize ?? 10);
  const params: Record<string, unknown> = {
    page,
    size,
    meterType: "electric"
  };

  if (data?.meterId) params.meterId = Number(data.meterId);
  if (data?.readingType) params.readingType = data.readingType;
  if (Array.isArray(data?.readingTime) && data.readingTime.length === 2) {
    params.readingTime = data.readingTime;
  }

  const res = await http.request<EladminPageResult<MeterReadingRecord>>(
    "get",
    "/api/meter-readings",
    { params }
  );
  const list = res?.content ?? [];
  return okTable(list, res?.totalElements, size, page);
};

/** 删除抄表数据（eladmin DELETE /api/meter-readings） */
export const deleteMeterReadingRecords = (ids: number[]) => {
  return http.request<void>("delete", "/api/meter-readings", { data: ids });
};

/** 获取角色管理-权限树（与前端侧栏菜单一致） */
export const getRoleMenu = async (): Promise<
  Result<RolePermissionTreeNode[]>
> => {
  const { tree } = await loadRolePermissionTreeContext();
  return okResult(tree);
};

/** 获取角色已分配的菜单 checkedKeys */
export const getRoleMenuIds = async (data?: {
  id?: number;
}): Promise<Result<Array<number | string>>> => {
  const role = await http.request<Record<string, unknown>>(
    "get",
    `/api/roles/${data?.id}`
  );
  const menus = (role?.menus as Array<{ id: number }>) ?? [];
  const backendMenuIds = menus.map(m => m.id);
  const { tree, menuIndex } = await loadRolePermissionTreeContext();
  return okResult(backendMenuIdsToCheckedKeys(backendMenuIds, tree, menuIndex));
};

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
