const Layout = () => import("@/layout/index.vue");

export default {
  path: "/test",
  name: "Test",
  component: Layout,
  redirect: "/test/simple",
  meta: {
    title: "测试",
    icon: "ep:setting",
    showLink: false
  },
  children: [
    {
      path: "/test/simple",
      component: () =>
        import("@/views/business-stats/hourly-electric/index.vue"),
      name: "TestSimple",
      meta: {
        title: "简化测试",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
