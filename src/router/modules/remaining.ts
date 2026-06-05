import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      title: $t("menus.pureLogin"),
      showLink: false
    }
  },
  // 全屏403（无权访问）页面
  {
    path: "/access-denied",
    name: "AccessDenied",
    component: () => import("@/views/error/403.vue"),
    meta: {
      title: $t("menus.pureAccessDenied"),
      showLink: false
    }
  },
  // 全屏500（服务器出错）页面
  {
    path: "/server-error",
    name: "ServerError",
    component: () => import("@/views/error/500.vue"),
    meta: {
      title: $t("menus.pureServerError"),
      showLink: false
    }
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      title: $t("status.pureLoad"),
      showLink: false
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue")
      }
    ]
  },
  {
    path: "/account-settings",
    name: "AccountSettings",
    component: () => import("@/views/account-settings/index.vue"),
    meta: {
      title: $t("buttons.pureAccountSettings"),
      showLink: false
    }
  },
  // 下面是一个无layout菜单的例子（一个全屏空白页面），因为这种情况极少发生，所以只需要在前端配置即可（配置路径：src/router/modules/remaining.ts）
  {
    path: "/empty",
    name: "Empty",
    component: () => import("@/views/empty/index.vue"),
    meta: {
      title: $t("menus.pureEmpty"),
      showLink: false
    }
  },
  {
    path: "/data-screen",
    name: "DataScreen",
    component: () => import("@/views/data-screen/index.vue"),
    meta: {
      title: "数据可视化大屏",
      showLink: false
    }
  },
  // 报警管理路由重定向（从旧路径 /nested/alarm/* 重定向到新路径 /alarm/*）
  {
    path: "/nested/alarm",
    redirect: "/alarm",
    meta: {
      title: "报警管理重定向",
      showLink: false,
      rank: 9999
    }
  },
  {
    path: "/nested/alarm/:path(.*)",
    redirect: "/alarm/:path",
    meta: {
      title: "报警管理重定向",
      showLink: false,
      rank: 9999
    }
  }
] satisfies Array<RouteConfigsTable>;
