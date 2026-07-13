import type { Result, ResultTable } from "@/api/types";

type EladminPage<T> = {
  content?: T[];
  totalElements?: number;
};

export function okResult<T>(data: T): Result<T> {
  return { code: 0, message: "success", data };
}

export function okTable<T>(
  list: T[],
  total?: number,
  pageSize = 10,
  currentPage = 1
): ResultTable<T> {
  return {
    code: 0,
    message: "success",
    data: {
      list,
      total: total ?? list.length,
      pageSize,
      currentPage
    }
  };
}

export function normalizeAvatarUrl(avatarPath?: string): string {
  if (!avatarPath) return "";
  if (/^https?:\/\//.test(avatarPath)) return avatarPath;
  if (avatarPath.startsWith("/api/avatar/")) {
    return avatarPath.replace(/^\/api\/avatar\//, "/avatar/");
  }
  if (avatarPath.startsWith("/avatar/")) return avatarPath;
  const fileName = avatarPath.split(/[\\/]/).pop();
  return fileName && fileName.includes("avatar-") ? `/avatar/${fileName}` : "";
}

function toAvatarUrl(avatarPath?: string): string {
  return normalizeAvatarUrl(avatarPath) || "";
}

function toParentId(pid?: number | null): number {
  return pid == null ? 0 : pid;
}

function toSex(gender?: string): number {
  if (!gender) return 0;
  return gender === "女" || gender === "1" ? 1 : 0;
}

/** eladmin User → pure-admin 用户行 */
export function mapEladminUser(user: Record<string, any>) {
  return {
    ...user,
    nickname: user.nickName ?? user.nickname ?? "",
    sex: toSex(user.gender),
    status: user.enabled === false ? 0 : 1,
    avatar: toAvatarUrl(user.avatarPath) || user.avatar || "",
    createTime: user.createTime ?? "",
    roleIds: ((user.roles as Array<{ id: number }>) ?? []).map(role => role.id),
    jobIds: ((user.jobs as Array<{ id: number }>) ?? []).map(job => job.id)
  };
}

function toGender(sex?: string | number, gender?: string) {
  if (gender) return gender;
  return Number(sex) === 1 ? "女" : "男";
}

/** pure-admin 表单 → eladmin 用户写入体 */
export function buildEladminUserPayloadFromForm(form: {
  id?: number;
  parentId?: number;
  nickname: string;
  username: string;
  phone: string | number;
  email: string;
  sex?: string | number;
  status: number;
  roleIds?: number[];
  jobIds?: number[];
}) {
  const deptId = form.parentId ? Number(form.parentId) : null;
  return {
    ...(form.id ? { id: form.id } : {}),
    username: form.username,
    nickName: form.nickname,
    phone: String(form.phone ?? ""),
    email: form.email ?? "",
    gender: toGender(form.sex),
    enabled: Number(form.status) === 1,
    dept: deptId ? { id: deptId } : undefined,
    roles: (form.roleIds ?? []).map(id => ({ id })),
    jobs: (form.jobIds ?? []).map(id => ({ id }))
  };
}

/** 列表行 / 详情 → eladmin 用户更新体（可局部覆盖） */
export function buildEladminUserPayloadFromRecord(
  source: Record<string, any>,
  patch?: Partial<{
    roleIds: number[];
    jobIds: number[];
    enabled: boolean;
    deptId: number;
    nickname: string;
    username: string;
    phone: string;
    email: string;
    sex: number | string;
  }>
) {
  const roleIds =
    patch?.roleIds ??
    source.roleIds ??
    (source.roles as Array<{ id: number }> | undefined)?.map(role => role.id) ??
    [];
  const jobIds =
    patch?.jobIds ??
    source.jobIds ??
    (source.jobs as Array<{ id: number }> | undefined)?.map(job => job.id) ??
    [];

  const deptId = patch?.deptId ?? source.dept?.id ?? source.deptId ?? null;

  return {
    id: source.id,
    username: patch?.username ?? source.username,
    nickName: patch?.nickname ?? source.nickName ?? source.nickname,
    email: patch?.email ?? source.email ?? "",
    phone: String(patch?.phone ?? source.phone ?? ""),
    gender: toGender(patch?.sex ?? source.sex, source.gender),
    enabled:
      patch?.enabled !== undefined
        ? patch.enabled
        : source.enabled !== undefined
          ? source.enabled !== false
          : Number(source.status) === 1,
    dept: deptId ? { id: Number(deptId) } : undefined,
    roles: roleIds.map((id: number) => ({ id })),
    jobs: jobIds.map((id: number) => ({ id }))
  };
}

/** eladmin Dept → pure-admin 部门节点 */
export function mapEladminDept(dept: Record<string, any>) {
  return {
    ...dept,
    parentId: toParentId(dept.pid),
    sort: dept.deptSort ?? dept.sort ?? 0,
    status: dept.enabled === false ? 0 : 1,
    remark: dept.remark ?? ""
  };
}

/** eladmin Menu → pure-admin 菜单节点 */
export function mapEladminMenu(menu: Record<string, any>) {
  let menuType = 0;
  if (menu.type === 2) {
    menuType = 3;
  } else if (menu.iFrame === true) {
    menuType = 1;
  }

  return {
    ...menu,
    parentId: toParentId(menu.pid),
    menuType,
    name: menu.componentName ?? menu.name ?? "",
    rank: menu.menuSort ?? menu.rank ?? 999,
    auths: menu.permission ?? menu.auths ?? "",
    showLink: menu.hidden !== true,
    keepAlive: menu.cache === true
  };
}

/** pure-admin 菜单表单 → eladmin 写入体 */
export function buildEladminMenuPayloadFromForm(form: {
  id?: number;
  menuType: number;
  parentId: number;
  title: string;
  name?: string;
  path?: string;
  component?: string;
  rank?: number;
  auths?: string;
  icon?: string;
  keepAlive?: boolean;
  showLink?: boolean;
}) {
  let type = 1;
  let iFrame = false;
  if (form.menuType === 3) {
    type = 2;
  } else if (form.menuType === 1 || form.menuType === 2) {
    type = 1;
    iFrame = true;
  } else {
    type = form.component ? 1 : 0;
  }

  const pid = form.parentId && form.parentId > 0 ? form.parentId : null;

  return {
    ...(form.id ? { id: form.id } : {}),
    pid,
    title: form.title,
    componentName: form.name || null,
    component: form.component || null,
    path: form.path || "",
    menuSort: form.rank ?? 999,
    permission: form.auths || null,
    icon: form.icon || null,
    cache: form.keepAlive === true,
    hidden: form.showLink === false,
    type,
    iFrame
  };
}

/** pure-admin 部门表单 → eladmin 写入体 */
export function buildEladminDeptPayloadFromForm(form: {
  id?: number;
  parentId: number;
  name: string;
  sort?: number;
  status?: number;
}) {
  const pid = form.parentId && form.parentId > 0 ? form.parentId : null;
  return {
    ...(form.id ? { id: form.id } : {}),
    pid,
    name: form.name,
    deptSort: form.sort ?? 0,
    enabled: form.status !== 0
  };
}

/** eladmin Role → pure-admin 角色行 */
export function mapEladminRole(role: Record<string, any>) {
  return {
    ...role,
    code: role.name ?? role.code ?? "",
    remark: role.description ?? role.remark ?? "",
    createTime: role.createTime ?? ""
  };
}

/** pure-admin 角色表单 → eladmin 写入体 */
export function buildEladminRolePayloadFromForm(form: {
  id?: number;
  name: string;
  remark?: string;
  level?: number;
  dataScope?: string;
}) {
  return {
    ...(form.id ? { id: form.id } : {}),
    name: form.name,
    description: form.remark ?? "",
    level: form.level ?? 3,
    dataScope: form.dataScope ?? "全部"
  };
}

function formatLogDateTime(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 日志查询表单 → eladmin GET /api/logs 参数 */
export function buildEladminLogQueryParams(form?: Record<string, unknown>) {
  const params: Record<string, unknown> = {
    page: Number(form?.page ?? form?.currentPage ?? 1),
    size: Number(form?.pageSize ?? 10)
  };

  if (form?.username) params.username = form.username;

  const blurry = form?.module ?? form?.blurry;
  if (blurry) params.blurry = blurry;

  const timeRange =
    (form?.operatingTime as unknown[]) ??
    (form?.loginTime as unknown[]) ??
    (form?.requestTime as unknown[]) ??
    (form?.createTime as unknown[]);

  if (Array.isArray(timeRange) && timeRange.length >= 2) {
    params["createTime[0]"] = formatLogDateTime(timeRange[0]);
    params["createTime[1]"] = formatLogDateTime(timeRange[1]);
  }

  return params;
}

/** eladmin SysLog → pure-admin 操作/登录日志行 */
export function mapEladminOperationLog(log: Record<string, any>) {
  return {
    id: log.id,
    username: log.username ?? "",
    module: log.method ?? "",
    summary: log.description ?? "",
    ip: log.requestIp ?? "",
    address: log.address ?? "",
    browser: log.browser ?? "",
    status: 1,
    operatingTime: log.createTime ?? "",
    behavior: log.description ?? "",
    loginTime: log.createTime ?? ""
  };
}

/** eladmin SysLog → pure-admin 异常日志行 */
export function mapEladminErrorLog(log: Record<string, any>) {
  return {
    id: log.id,
    username: log.username ?? "",
    module: log.method ?? "",
    summary: log.description ?? "",
    ip: log.requestIp ?? "",
    address: log.address ?? "",
    browser: log.browser ?? "",
    method: log.method ?? "",
    url: log.params ?? "",
    takesTime: log.time ?? 0,
    requestTime: log.createTime ?? ""
  };
}

export type EladminPageResult<T> = EladminPage<T>;
