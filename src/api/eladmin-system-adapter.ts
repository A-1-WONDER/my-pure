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

export type EladminPageResult<T> = EladminPage<T>;
