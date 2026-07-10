import { http } from "@/utils/http";
import {
  buildEladminLogQueryParams,
  mapEladminOperationLog,
  normalizeAvatarUrl,
  okResult,
  okTable,
  type EladminPageResult
} from "@/api/eladmin-system-adapter";
import type { ResultTable } from "@/api/types";

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
  /** 用户 ID（eladmin 个人中心保存需要） */
  id?: number;
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
  /** 性别 */
  gender?: string;
};

export type UserInfoResult = {
  code: number;
  message: string;
  data: UserInfo;
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

type EladminAuthUser = {
  id?: number;
  username?: string;
  nickName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  avatarPath?: string;
  avatarName?: string;
};

type EladminJwtUserDto = {
  user?: EladminAuthUser;
};

function mapEladminUserToProfile(dto: EladminJwtUserDto): UserInfo {
  const user = dto?.user ?? {};
  return {
    id: user.id,
    avatar: normalizeAvatarUrl(user.avatarPath || user.avatarName) || "",
    username: user.username ?? "",
    nickname: user.nickName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    gender: user.gender ?? "男"
  };
}

/** 账户设置-个人信息（eladmin GET /auth/info） */
export const getMine = async (): Promise<UserInfoResult> => {
  const res = await http.request<EladminJwtUserDto>("get", "/auth/info");
  return okResult(mapEladminUserToProfile(res ?? {})) as UserInfoResult;
};

/** 账户设置-保存个人信息（eladmin PUT /api/users/center，手机号在此维护） */
export const updateMine = async (
  data: Partial<UserInfo>
): Promise<UserInfoResult> => {
  if (data.id == null) {
    throw new Error("缺少用户 ID，请刷新后重试");
  }
  await http.request<void>("put", "/api/users/center", {
    data: {
      id: data.id,
      nickName: (data.nickname ?? "").trim(),
      phone: (data.phone ?? "").trim(),
      gender: data.gender ?? "男"
    }
  });
  return getMine();
};

/** 账户设置-个人安全日志（eladmin GET /api/logs/user） */
export const getMineLogs = async (params?: {
  page?: number;
  pageSize?: number;
}): Promise<ResultTable> => {
  const page = Number(params?.page ?? 1);
  const pageSize = Number(params?.pageSize ?? 10);
  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs/user",
    {
      params: buildEladminLogQueryParams({ page, pageSize })
    }
  );
  const list = (res?.content ?? []).map(row => {
    const mapped = mapEladminOperationLog(row);
    return {
      ...mapped,
      system: "—"
    };
  });
  return okTable(list, res?.totalElements, pageSize, page);
};

/** eladmin 当前用户操作日志（GET /api/logs/user） */
export interface UserSysLogItem {
  id?: number;
  description?: string;
  requestIp?: string;
  address?: string;
  createTime?: string;
}

export interface WelcomeLoginRecord {
  time: string;
  ip: string;
  address: string;
  rawTime: string | null;
}

export interface WelcomeLoginInfo {
  recent: WelcomeLoginRecord;
  last: WelcomeLoginRecord;
}

const isLoginLogRow = (row: { summary?: string; behavior?: string }) => {
  const text = `${row.summary ?? ""}${row.behavior ?? ""}`;
  return text.includes("登录");
};

/** 首页登录信息：当前用户最近两次登录（GET /api/logs/user，服务端筛选「登录」） */
export const getWelcomeLoginInfo = async (): Promise<WelcomeLoginInfo> => {
  const params = buildEladminLogQueryParams({
    page: 1,
    pageSize: 20,
    blurry: "登录"
  });

  const res = await http.request<EladminPageResult<Record<string, unknown>>>(
    "get",
    "/api/logs/user",
    { params }
  );

  const rows = (res?.content ?? [])
    .map(mapEladminOperationLog)
    .filter(isLoginLogRow);

  const recentRow = rows[0];
  const lastRow = rows[1];

  return {
    recent: {
      rawTime: recentRow?.loginTime ? String(recentRow.loginTime) : null,
      time: recentRow?.loginTime ? String(recentRow.loginTime) : "—",
      ip: recentRow?.ip?.trim() || "—",
      address: recentRow?.address?.trim() || "—"
    },
    last: {
      rawTime: lastRow?.loginTime ? String(lastRow.loginTime) : null,
      time: lastRow?.loginTime ? String(lastRow.loginTime) : "—",
      ip: lastRow?.ip?.trim() || "—",
      address: lastRow?.address?.trim() || "—"
    }
  };
};

/** 当前用户日志分页，用于首页登录信息等 */
export const getUserLoginLogs = (params?: { page?: number; size?: number }) => {
  return http.request<{ content?: UserSysLogItem[]; totalElements?: number }>(
    "get",
    "/api/logs/user",
    {
      params: buildEladminLogQueryParams({
        page: params?.page ?? 1,
        pageSize: params?.size ?? 30,
        blurry: "登录"
      })
    }
  );
};
