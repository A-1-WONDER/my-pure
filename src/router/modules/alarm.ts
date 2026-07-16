import { $t } from "@/plugins/i18n";
import { alarm } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/alarm",
  name: "Alarm",
  component: Layout,
  redirect: "/alarm/event-query",
  meta: {
    title: $t("menus.pureAlarmManagement"),
    icon: "ri:alarm-warning-line",
    rank: alarm
  },
  children: [
    {
      path: "/alarm/event-query",
      component: () => import("@/views/nested/alarm/event-query/index.vue"),
      name: "AlarmEventQuery",
      meta: {
        title: $t("menus.pureAlarmEventQuery"),
        icon: "ri:file-list-3-line",
        keepAlive: true
      }
    },
    {
      path: "/alarm/rule-config",
      component: () => import("@/views/nested/alarm/rule-config/index.vue"),
      name: "AlarmRuleConfig",
      meta: {
        title: $t("menus.pureAlarmRuleConfig"),
        icon: "ri:settings-3-line",
        keepAlive: true,
        // 暂时不在侧栏展示；路由仍保留，直链可访问
        showLink: false
      }
    },
    {
      path: "/alarm/system-setting",
      component: () => import("@/views/nested/alarm/system-setting/index.vue"),
      name: "AlarmSystemSetting",
      meta: {
        title: $t("menus.pureAlarmSystemSetting"),
        icon: "ep:setting",
        keepAlive: true,
        showLink: true
      }
    },
    {
      path: "/alarm/usage-setting",
      component: () => import("@/views/nested/alarm/usage-setting/index.vue"),
      name: "AlarmUsageSetting",
      meta: {
        title: $t("menus.pureAlarmUsageSetting"),
        icon: "ri:pie-chart-2-line",
        keepAlive: true
      }
    }
  ]
} satisfies RouteConfigsTable;
