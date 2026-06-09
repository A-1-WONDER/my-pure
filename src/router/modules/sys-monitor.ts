import { $t } from "@/plugins/i18n";
import { sysMonitor } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

export default {
  path: "/monitor",
  name: "SysMonitor",
  component: Layout,
  redirect: "/monitor/operation-logs",
  meta: {
    title: $t("menus.pureSysMonitor"),
    icon: "ri:pulse-line",
    rank: sysMonitor,
    roles: ["admin"]
  },
  children: [
    {
      path: "/monitor/operation-logs",
      name: "OperationLog",
      component: () => import("@/views/monitor/logs/operation/index.vue"),
      meta: {
        title: $t("menus.pureOperationLog"),
        icon: "ri:file-list-3-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/login-logs",
      name: "LoginLog",
      component: () => import("@/views/monitor/logs/login/index.vue"),
      meta: {
        title: $t("menus.pureLoginLog"),
        icon: "ri:login-box-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/system-logs",
      name: "ErrorLog",
      component: () => import("@/views/monitor/logs/system/index.vue"),
      meta: {
        title: $t("menus.pureErrorLog"),
        icon: "ri:bug-line",
        keepAlive: true,
        roles: ["admin"]
      }
    }
  ]
} satisfies RouteConfigsTable;
