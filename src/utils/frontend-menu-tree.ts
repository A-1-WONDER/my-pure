import { cloneDeep } from "@pureadmin/utils";
import type { RouteRecordRaw } from "vue-router";
import { constantMenus } from "@/router/index";
import { ascending, filterTree } from "@/router/utils";

export type RolePermissionTreeNode = {
  id: number | string;
  title: string;
  path: string;
  /** 对应 eladmin sys_menu.menu_id，无映射时为 undefined */
  menuId?: number;
  children?: RolePermissionTreeNode[];
};

type EladminMenu = {
  id: number;
  pid?: number | null;
  type?: number;
  title?: string;
  path?: string;
  component?: string;
};

type EladminMenuIndex = {
  getDescendantIds: (id: number) => number[];
};

function filterEmptyDirectories(data: RouteRecordRaw[]) {
  const newTree = cloneDeep(data).filter(
    (v: RouteRecordRaw) => (v?.children?.length ?? 0) > 0
  );
  newTree.forEach((v: RouteRecordRaw) => {
    if (v.children) {
      v.children = filterEmptyDirectories(v.children);
    }
  });
  return newTree;
}

/** 与侧栏一致：过滤 showLink:false，并去掉无子节点的目录 */
export function getVisibleFrontendRoutes() {
  return filterEmptyDirectories(
    filterTree(ascending(cloneDeep(constantMenus)))
  );
}

function normalizeComponentPath(component?: string) {
  if (!component) return "";
  return component.replace(/\/index$/, "").replace(/^\/+/, "");
}

/** 根据 eladmin 菜单列表建立前端路由 path → menuId 映射 */
export function buildEladminPathToMenuIdMap(menus: EladminMenu[]) {
  const map = new Map<string, number>();
  const byId = new Map<number, EladminMenu>();

  menus.forEach(menu => {
    byId.set(menu.id, menu);
  });

  function buildRoutePath(menu: EladminMenu): string {
    const segments: string[] = [];
    let current: EladminMenu | undefined = menu;
    while (current) {
      if (current.path) {
        segments.unshift(current.path);
      }
      current = current.pid == null ? undefined : byId.get(Number(current.pid));
    }
    return `/${segments.join("/")}`.replace(/\/+/g, "/");
  }

  menus.forEach(menu => {
    if (menu.type === 2) return;

    const componentPath = normalizeComponentPath(menu.component);
    if (componentPath) {
      map.set(`/${componentPath}`, menu.id);
    }

    const routePath = buildRoutePath(menu);
    if (routePath !== "/") {
      map.set(routePath, menu.id);
    }
  });

  return map;
}

export function buildEladminMenuIndex(menus: EladminMenu[]): EladminMenuIndex {
  const childrenOf = new Map<number, number[]>();

  menus.forEach(menu => {
    const pid = menu.pid == null ? 0 : Number(menu.pid);
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid)!.push(menu.id);
  });

  function getDescendantIds(id: number): number[] {
    const result: number[] = [id];
    for (const childId of childrenOf.get(id) ?? []) {
      result.push(...getDescendantIds(childId));
    }
    return result;
  }

  return { getDescendantIds };
}

function routesToPermissionTree(
  routes: RouteRecordRaw[],
  pathToMenuId: Map<string, number>
): RolePermissionTreeNode[] {
  return routes.map(route => {
    const path = route.path ?? "";
    const menuId = pathToMenuId.get(path);
    const meta = route.meta as { title?: string } | undefined;
    const node: RolePermissionTreeNode = {
      id: menuId ?? `path:${path}`,
      title: meta?.title ?? String(route.name ?? path),
      path,
      ...(menuId ? { menuId } : {})
    };

    if (route.children?.length) {
      node.children = routesToPermissionTree(route.children, pathToMenuId);
    }

    return node;
  });
}

/** 构建与前端侧栏一致的权限分配树，并关联 eladmin 菜单 ID */
export function buildRolePermissionTree(eladminMenus: EladminMenu[]) {
  const pathToMenuId = buildEladminPathToMenuIdMap(eladminMenus);
  const routes = getVisibleFrontendRoutes();
  return {
    tree: routesToPermissionTree(routes, pathToMenuId),
    pathToMenuId,
    menuIndex: buildEladminMenuIndex(eladminMenus)
  };
}

export function collectRolePermissionTreeIds(
  nodes: RolePermissionTreeNode[]
): Array<number | string> {
  const ids: Array<number | string> = [];
  const walk = (list: RolePermissionTreeNode[]) => {
    list.forEach(node => {
      ids.push(node.id);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

function findNodeById(
  nodes: RolePermissionTreeNode[],
  id: number | string
): RolePermissionTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** 将后端已分配的菜单 ID 转为树组件 checkedKeys */
export function backendMenuIdsToCheckedKeys(
  backendMenuIds: number[],
  tree: RolePermissionTreeNode[],
  menuIndex: EladminMenuIndex
): Array<number | string> {
  const backendIdSet = new Set(backendMenuIds);
  const keys: Array<number | string> = [];

  const isNodeChecked = (node: RolePermissionTreeNode): boolean => {
    if (node.menuId) {
      return menuIndex
        .getDescendantIds(node.menuId)
        .some(id => backendIdSet.has(id));
    }
    return node.children?.some(child => isNodeChecked(child)) ?? false;
  };

  const walk = (nodes: RolePermissionTreeNode[]) => {
    nodes.forEach(node => {
      if (isNodeChecked(node)) {
        keys.push(node.id);
      }
      if (node.children?.length) walk(node.children);
    });
  };

  walk(tree);
  return keys;
}

/** 将树组件选中项转为 eladmin 角色菜单写入体 */
export function checkedKeysToBackendMenuIds(
  checkedKeys: Array<number | string>,
  halfCheckedKeys: Array<number | string>,
  tree: RolePermissionTreeNode[],
  menuIndex: EladminMenuIndex
): number[] {
  const ids = new Set<number>();
  const allKeys = [...checkedKeys, ...halfCheckedKeys];

  allKeys.forEach(key => {
    const node = findNodeById(tree, key);
    if (!node?.menuId) return;
    menuIndex.getDescendantIds(node.menuId).forEach(id => ids.add(id));
  });

  return [...ids];
}
