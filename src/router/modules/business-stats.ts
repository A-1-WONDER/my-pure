import { businessStats } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/business-stats",
  name: "BusinessStats",
  component: Layout,
  redirect: "/business-stats/hourly-electric",
  meta: {
    title: "用量统计",
    icon: "ep:data-analysis",
    rank: businessStats
  },
  children: [
    {
      path: "/business-stats/hourly-electric",
      component: () =>
        import("@/views/business-stats/hourly-electric/index.vue"),
      name: "BusinessStatsHourlyElectric",
      meta: {
        title: "电用量小时统计",
        icon: "ri:time-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    {
      path: "/business-stats/daily-electric",
      component: () =>
        import("@/views/business-stats/daily-electric/index.vue"),
      name: "BusinessStatsDailyElectric",
      meta: {
        title: "电用量日统计",
        icon: "ri:calendar-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    {
      path: "/business-stats/monthly-electric",
      component: () =>
        import("@/views/business-stats/monthly-electric/index.vue"),
      name: "BusinessStatsMonthlyElectric",
      meta: {
        title: "电用量月统计",
        icon: "ri:calendar-2-line",
        keepAlive: true,
        roles: ["admin"]
      }
    },
    {
      path: "/business-stats/yearly-electric",
      component: () =>
        import("@/views/business-stats/yearly-electric/index.vue"),
      name: "BusinessStatsYearlyElectric",
      meta: {
        title: "电用量年统计",
        icon: "ri:calendar-event-line",
        keepAlive: true,
        roles: ["admin"]
      }
    }
  ]
} satisfies RouteConfigsTable;
