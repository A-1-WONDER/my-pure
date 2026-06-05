import { http } from "@/utils/http";

export type UserResult = {
  code: number;
  message: string;
  data: {
    /** token */
    token: string;
    /** 用户信息 */
    user: {
      /** 头像 */
      avatar?: string;
      /** 用户名 */
      username: string;
      /** 昵称 */
      nickName?: string;
      /** 当前登录用户的角色 */
      roles?: Array<string>;
      /** 按钮级别权限 */
      permissions?: Array<string>;
      /** 其他用户信息字段... */
    };
    /** 以下字段为兼容前端原有结构，后端可能不返回 */
    refreshToken?: string;
    expires?: Date;
  };
};

export type RefreshTokenResult = {
  code: number;
  message: string;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type UserInfo = {
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 邮箱 */
  email: string;
  /** 联系电话 */
  phone: string;
  /** 简介 */
  description: string;
};

export type UserInfoResult = {
  code: number;
  message: string;
  data: UserInfo;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    /** 列表数据 */
    list: Array<any>;
    /** 总条目数 */
    total?: number;
    /** 每页显示条目个数 */
    pageSize?: number;
    /** 当前页数 */
    currentPage?: number;
  };
};

/** 获取RSA公钥 */
export const getRsaPublicKey = () => {
  return http.request<{
    publicKey: string;
  }>("get", "/auth/rsa/public-key");
};

/** 获取验证码 */
export const getAuthCode = () => {
  return http.request<{
    img: string; // base64图片
    uuid: string; // 验证码UUID
  }>("get", "/auth/code");
};

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/auth/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>("post", "/refresh-token", { data });
};

/** 账户设置-个人信息 */
export const getMine = (data?: object) => {
  return http.request<UserInfoResult>("get", "/mine", { data });
};

/** 账户设置-保存个人信息 */
export const updateMine = (data: Partial<UserInfo>) => {
  return http.request<UserInfoResult>("put", "/mine", { data });
};

/** 账户设置-个人安全日志 */
export const getMineLogs = (data?: object) => {
  return http.request<ResultTable>("get", "/mine-logs", { data });
};

/** eladmin 当前用户操作日志（GET /api/logs/user） */
export interface UserSysLogItem {
  id?: number;
  description?: string;
  requestIp?: string;
  address?: string;
  createTime?: string;
}

/** 当前用户日志分页，用于首页登录信息等 */
export const getUserLoginLogs = (params?: { page?: number; size?: number }) => {
  return http.request<{ content?: UserSysLogItem[]; totalElements?: number }>(
    "get",
    "/api/logs/user",
    {
      params: {
        page: params?.page ?? 1,
        size: params?.size ?? 30
      }
    }
  );
};
