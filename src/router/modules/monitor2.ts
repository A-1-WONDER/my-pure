import { $t } from "@/plugins/i18n";
import { monitor } from "@/router/enums";
import { generateRouteConfig } from "@/config/meter-types";
const Layout = () => import("@/layout/index.vue");

// 仅保留电表管理（不展示水表、气表等其它表类型菜单）
const updatedMeterRoutes = [generateRouteConfig("electric")].map(route => ({
  ...route,
  component: () => import("@/views/monitor2/meter-dynamic/index.vue")
}));

export default {
  path: "/monitor2",
  name: "Monitor2",
  component: Layout,
  redirect: "/monitor2/electric-meter",
  meta: {
    title: $t("menus.pureSysMonitor2"),
    icon: "ep:monitor",
    rank: monitor
  },
  children: [
    {
      path: "/monitor2/collector",
      component: () => import("@/views/monitor2/collector/index.vue"),
      name: "Monitor2Collector",
      meta: {
        title: "采集器管理",
        icon: "ri:server-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    // 电表管理
    ...updatedMeterRoutes
  ]
} satisfies RouteConfigsTable;
