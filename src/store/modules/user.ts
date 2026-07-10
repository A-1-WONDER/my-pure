import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  type UserResult,
  type RefreshTokenResult,
  getLogin,
  refreshTokenApi
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import { type DataInfo, setToken, removeToken, userKey } from "@/utils/auth";
import { normalizeAvatarUrl } from "@/api/eladmin-system-adapter";

/**
 * 处理头像路径（兼容 eladmin 本地路径与历史 /api/avatar 缓存）
 */
function processAvatarPath(avatarPath: string | undefined): string {
  return normalizeAvatarUrl(avatarPath);
}

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: normalizeAvatarUrl(
      storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? ""
    ),
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? [],
    // 前端生成的验证码（按实际需求替换）
    verifyCode: "",
    // 判断登录页面显示哪个组件（0：登录（默认）、1：手机登录、2：二维码登录、3：注册、4：忘记密码）
    currentPage: 0,
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = normalizeAvatarUrl(avatar);
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储前端生成的验证码 */
    SET_VERIFYCODE(verifyCode: string) {
      this.verifyCode = verifyCode;
    },
    /** 存储登录页面显示哪个组件 */
    SET_CURRENTPAGE(value: number) {
      this.currentPage = value;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data) {
      console.log("[userStore] 登录请求数据:", {
        username: data.username,
        password: data.password ? "***加密长度:" + data.password.length : "空",
        code: data.code,
        uuid: data.uuid
      });

      return new Promise<UserResult>((resolve, reject) => {
        getLogin(data)
          .then(response => {
            console.log("[userStore] 登录响应:", response);

            // 检查响应结构
            if (response && typeof response === "object") {
              // 适配不同的后端响应格式
              // 情况1: 有code字段（标准格式）
              if (response.code !== undefined) {
                if (response.code === 0) {
                  // 标准格式处理
                  const backendData = {
                    accessToken: response.data.token.replace("Bearer ", ""), // 移除Bearer前缀
                    refreshToken:
                      response.data.refreshToken ||
                      response.data.token.replace("Bearer ", ""),
                    expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时过期
                    avatar: response.data.user?.avatar || "",
                    username: response.data.user?.username || "",
                    nickname: response.data.user?.nickName || "",
                    roles: response.data.user?.roles || [],
                    permissions: response.data.user?.permissions || []
                  };
                  setToken(backendData);
                  resolve(response);
                } else {
                  // 如果后端返回错误，但code不为0
                  console.error("[userStore] 登录失败，code不为0:", response);
                  const error = new Error(response.message || "登录失败");
                  // @ts-ignore
                  error.response = { data: response };
                  reject(error);
                }
              }
              // 情况2: 没有code字段，但有token（eladmin格式）
              else if (response.token) {
                console.log("[userStore] 检测到eladmin格式响应");

                // 将eladmin格式转换为前端期望的格式
                const formattedResponse = {
                  code: 0,
                  message: "登录成功",
                  data: {
                    token: response.token,
                    refreshToken: response.token, // eladmin可能没有refreshToken
                    user: {
                      // 处理头像路径：如果是本地文件路径，转换为URL或使用默认
                      avatar:
                        processAvatarPath(response.user?.user?.avatarPath) ||
                        "",
                      username: response.user?.user?.username || data.username,
                      nickName: response.user?.user?.nickName || "",
                      roles: response.user?.roles || [],
                      permissions: [] // eladmin可能没有permissions字段
                    }
                  }
                };

                console.log("[userStore] 转换后的响应:", formattedResponse);

                // 存储token
                const backendData = {
                  accessToken: formattedResponse.data.token.replace(
                    "Bearer ",
                    ""
                  ),
                  refreshToken: formattedResponse.data.refreshToken.replace(
                    "Bearer ",
                    ""
                  ),
                  expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
                  avatar: formattedResponse.data.user.avatar,
                  username: formattedResponse.data.user.username,
                  nickname: formattedResponse.data.user.nickName,
                  roles: formattedResponse.data.user.roles,
                  permissions: formattedResponse.data.user.permissions
                };

                setToken(backendData);
                resolve(formattedResponse);
              }
              // 情况3: 未知格式
              else {
                console.error("[userStore] 未知响应格式:", response);
                reject(new Error("未知的响应格式"));
              }
            } else {
              console.error("[userStore] 响应格式错误:", response);
              reject(new Error("响应格式错误"));
            }
          })
          .catch(error => {
            console.error("[userStore] 登录请求失败:", error);

            // 详细记录错误信息
            if (error.response) {
              console.error("[userStore] 错误响应状态:", error.response.status);
              console.error("[userStore] 错误响应数据:", error.response.data);

              // 创建包含完整错误信息的错误对象
              const errorMessage =
                error.response.data?.message || error.message || "登录失败";
              const detailedError = new Error(errorMessage);
              // @ts-ignore
              detailedError.response = error.response;
              reject(detailedError);
            } else if (error.request) {
              console.error("[userStore] 错误请求:", error.request);
              reject(new Error("网络请求失败"));
            } else {
              // 其他错误
              reject(error);
            }
          });
      });
    },
    /** 前端登出（不调用接口） */
    logOut() {
      this.username = "";
      this.roles = [];
      this.permissions = [];
      removeToken();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    },
    /** 刷新`token` */
    async handRefreshToken(data) {
      return new Promise<RefreshTokenResult>((resolve, reject) => {
        refreshTokenApi(data)
          .then(data => {
            if (data.code === 0) {
              setToken(data.data);
              resolve(data);
            } else {
              reject(data.message);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
