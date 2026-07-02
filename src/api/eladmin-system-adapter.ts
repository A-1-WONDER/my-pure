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

function toAvatarUrl(avatarPath?: string): string {
  if (!avatarPath) return "";
  if (/^https?:\/\//.test(avatarPath)) return avatarPath;
  const fileName = avatarPath.split(/[\\/]/).pop();
  return fileName ? `/api/avatar/${fileName}` : "";
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
    createTime: user.createTime ?? ""
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

/** eladmin Role → pure-admin 角色行 */
export function mapEladminRole(role: Record<string, any>) {
  return {
    ...role,
    code: role.name ?? role.code ?? "",
    status: 1,
    remark: role.description ?? role.remark ?? "",
    createTime: role.createTime ?? ""
  };
}

function toGender(sex: string | number | undefined) {
  if (sex === 1 || sex === "1" || sex === "女") return "女";
  return "男";
}

/** pure-admin 用户表单 → eladmin User */
export function toEladminUserPayload(
  form: Record<string, any>,
  options?: { id?: number; roleIds?: number[] }
) {
  const payload: Record<string, unknown> = {
    id: options?.id ?? form.id,
    deptId: form.parentId ?? form.deptId ?? form.dept?.id ?? null,
    username: form.username,
    nickName: form.nickname ?? form.nickName,
    email: form.email,
    phone: String(form.phone ?? ""),
    gender: toGender(form.sex),
    enabled: form.status !== 0
  };
  if (options?.roleIds?.length) {
    payload.roles = options.roleIds.map(id => ({ id }));
  }
  return payload;
}

/** pure-admin 角色表单 → eladmin Role */
export function toEladminRolePayload(form: Record<string, any>, id?: number) {
  return {
    id: id ?? form.id,
    name: form.name || form.code,
    description: form.remark ?? "",
    level: form.level ?? 3,
    dataScope: form.dataScope ?? "本级"
  };
}

/** pure-admin 菜单表单 → eladmin Menu */
export function toEladminMenuPayload(form: Record<string, any>, id?: number) {
  let type = 1;
  let iFrame = false;
  if (form.menuType === 3) {
    type = 2;
  } else if (form.menuType === 1 || form.menuType === 2) {
    type = 1;
    iFrame = true;
  } else if (form.menuType === 0) {
    type = form.component ? 1 : 0;
  }

  return {
    id: id ?? form.id,
    pid: form.parentId || null,
    title: form.title,
    componentName: form.name,
    component: form.component,
    path: form.path,
    menuSort: form.rank ?? 999,
    type,
    permission: form.auths ?? form.permission ?? "",
    icon: form.icon ?? "",
    cache: form.keepAlive === true,
    hidden: form.showLink === false,
    iFrame
  };
}

/** pure-admin 部门表单 → eladmin Dept */
export function toEladminDeptPayload(form: Record<string, any>, id?: number) {
  return {
    id: id ?? form.id,
    pid: form.parentId || null,
    name: form.name,
    deptSort: form.sort ?? 0,
    enabled: form.status !== 0
  };
}

export type EladminPageResult<T> = EladminPage<T>;
