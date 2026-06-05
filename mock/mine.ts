import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { faker } from "@faker-js/faker/locale/zh_CN";

/** 开发环境可回写的个人信息（与 GET /mine 共用） */
let mineProfile = {
  avatar: "https://avatars.githubusercontent.com/u/44761321",
  username: "admin",
  nickname: "小铭",
  email: "pureadmin@163.com",
  phone: "15888886789",
  description: "一个热爱开源的前端工程师"
};

export default defineFakeRoute([
  // 账户设置-个人信息
  {
    url: "/mine",
    method: "get",
    response: () => {
      return {
        code: 0,
        message: "操作成功",
        data: { ...mineProfile }
      };
    }
  },
  {
    url: "/mine",
    method: "put",
    response: ({ body }) => {
      const patch =
        body && typeof body === "object"
          ? (body as Record<string, string>)
          : {};
      mineProfile = {
        ...mineProfile,
        ...patch
      };
      return {
        code: 0,
        message: "操作成功",
        data: { ...mineProfile }
      };
    }
  },
  // 账户设置-个人安全日志
  {
    url: "/mine-logs",
    method: "get",
    response: () => {
      const list = [
        {
          id: 1,
          ip: faker.internet.ipv4(),
          address: "中国河南省信阳市",
          system: "macOS",
          browser: "Chrome",
          summary: "账户登录", // 详情
          operatingTime: new Date() // 时间
        },
        {
          id: 2,
          ip: faker.internet.ipv4(),
          address: "中国广东省深圳市",
          system: "Windows",
          browser: "Firefox",
          summary: "绑定了手机号码",
          operatingTime: new Date().setDate(new Date().getDate() - 1)
        }
      ];
      return {
        code: 0,
        message: "操作成功",
        data: {
          list,
          total: list.length, // 总条目数
          pageSize: 10, // 每页显示条目个数
          currentPage: 1 // 当前页数
        }
      };
    }
  }
]);
