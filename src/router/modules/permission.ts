import { $t } from "@/plugins/i18n";
import { permission } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

export default {
  path: "/permission",
  name: "Permission",
  component: Layout,
  redirect: "/permission/page",
  meta: {
    icon: "ep:lollipop",
    title: $t("menus.purePermission"),
    rank: permission
  },
  children: [
    {
      path: "/permission/page",
      name: "PermissionPage",
      component: () => import("@/views/permission/page/index.vue"),
      meta: {
        title: $t("menus.purePermissionPage"),
        showParent: true,
        roles: ["admin", "common"]
      }
    }
  ]
} satisfies RouteConfigsTable;
