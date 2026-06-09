import { $t } from "@/plugins/i18n";
import { system } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

export default {
  path: "/system",
  name: "System",
  component: Layout,
  redirect: "/system/user",
  meta: {
    icon: "ri:settings-3-line",
    title: $t("menus.pureSysManagement"),
    rank: system
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: () => import("@/views/system/user/index.vue"),
      meta: {
        icon: "ri:admin-line",
        title: $t("menus.pureUser"),
        roles: ["admin"]
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      component: () => import("@/views/system/role/index.vue"),
      meta: {
        icon: "ri:admin-fill",
        title: $t("menus.pureRole"),
        roles: ["admin"]
      }
    },
    {
      path: "/system/menu",
      name: "SystemMenu",
      component: () => import("@/views/system/menu/index.vue"),
      meta: {
        icon: "ep:menu",
        title: $t("menus.pureSystemMenu"),
        roles: ["admin"]
      }
    },
    {
      path: "/system/dept",
      name: "SystemDept",
      component: () => import("@/views/system/dept/index.vue"),
      meta: {
        icon: "ri:git-branch-line",
        title: $t("menus.pureDept"),
        roles: ["admin"]
      }
    },
    {
      path: "/system/data-screen",
      name: "SystemDataScreen",
      redirect: "/data-screen",
      meta: {
        icon: "ri:presentation-line",
        title: $t("menus.pureDataScreen"),
        roles: ["admin"],
        activePath: "/data-screen"
      }
    }
  ]
} satisfies RouteConfigsTable;
