<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <!-- 主题切换 -->
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="dayIcon"
        :inactive-icon="darkIcon"
        @change="dataThemeChange"
      />
      <!-- 国际化 -->
      <el-dropdown trigger="click">
        <globalization
          class="hover:text-primary hover:bg-[transparent]! w-[20px] h-[20px] ml-1.5 cursor-pointer outline-hidden duration-300"
        />
        <template #dropdown>
          <el-dropdown-menu class="translation">
            <el-dropdown-item @click="translationCh">
              简体中文
            </el-dropdown-item>
            <el-dropdown-item @click="translationEn">
              English
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <avatar class="avatar" />
          <Motion>
            <h2 class="outline-hidden">
              {{ title }}
            </h2>
          </Motion>

          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item prop="username">
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="用户名"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="200">
              <el-form-item prop="verifyCode">
                <el-input
                  v-model="ruleForm.verifyCode"
                  clearable
                  :placeholder="captchaPlaceholder"
                  :prefix-icon="useRenderIcon(Keyhole)"
                >
                  <template v-slot:append>
                    <div class="flex items-center h-full">
                      <!-- 显示后端验证码图片 -->
                      <img
                        v-if="verifyCodeImg"
                        :src="verifyCodeImg"
                        class="h-8 w-20 cursor-pointer"
                        title="点击刷新验证码"
                        @click="getBackendVerifyCode"
                      />
                      <!-- 加载中显示 -->
                      <div
                        v-else
                        class="h-8 w-20 flex items-center justify-center bg-gray-100"
                      >
                        <el-icon v-if="verifyCodeLoading" class="is-loading">
                          <Refresh />
                        </el-icon>
                        <span v-else class="text-gray-400 text-sm">
                          加载验证码
                        </span>
                      </div>
                      <!-- 刷新按钮 -->
                      <el-button
                        type="primary"
                        link
                        :loading="verifyCodeLoading"
                        class="ml-1"
                        @click="getBackendVerifyCode"
                      >
                        <el-icon>
                          <Refresh />
                        </el-icon>
                      </el-button>
                    </div>
                  </template>
                </el-input>
              </el-form-item>
            </Motion>

            <Motion :delay="250">
              <el-form-item>
                <div class="w-full h-[20px] flex justify-between items-center">
                  <el-checkbox v-model="checked">
                    <span class="flex"> 记住我 </span>
                  </el-checkbox>
                  <el-button link type="primary"> 忘记密码 </el-button>
                </div>
                <!-- 开发环境显示密码提示 -->
                <div v-if="isDev" class="mt-2 text-xs text-gray-500">
                  测试账号: admin / 123456
                </div>
                <!-- 验证码提示 -->
                <div class="mt-1 text-xs text-blue-500">
                  提示：{{ captchaTip }}
                </div>
                <el-button
                  class="w-full mt-4!"
                  size="default"
                  type="primary"
                  :loading="loading"
                  :disabled="disabled"
                  @click="onLogin(ruleFormRef)"
                >
                  登录
                </el-button>
              </el-form-item>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
    <div
      class="w-full flex-c absolute bottom-3 text-sm text-[rgba(0,0,0,0.6)] dark:text-[rgba(220,220,242,0.8)]"
    >
      品格 © 2025-2026{{ title }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { operates, thirdParty } from "./utils/enums";
import { useLayout } from "@/layout/hooks/useLayout";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import { bg, avatar, illustration } from "./utils/static";
import { ref, toRaw, reactive, watch, computed, onMounted } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useTranslationLang } from "@/layout/hooks/useTranslationLang";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { getAuthCode, getRsaPublicKey } from "@/api/user";
import { rsaSimple } from "@/utils/rsa-simple";
import {
  getCaptchaTip,
  getCaptchaPlaceholder,
  validateCaptchaInput
} from "@/config/captcha";

import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import globalization from "@/assets/svg/globalization.svg?component";
import Lock from "~icons/ri/lock-fill";
import User from "~icons/ri/user-3-fill";
import Keyhole from "~icons/ri/shield-keyhole-line";
import Refresh from "~icons/ep/refresh";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);
const checked = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

// 后端验证码相关
const verifyCodeImg = ref(""); // base64图片
const verifyUuid = ref(""); // 验证码UUID
const verifyCodeLoading = ref(false); // 获取验证码loading

// RSA加密相关
const rsaInitialized = ref(false); // RSA是否已初始化
const rsaLoading = ref(false); // 获取RSA公钥loading

const { initStorage } = useLayout();
initStorage();
const { dataTheme, themeMode, dataThemeChange } = useDataThemeChange();
dataThemeChange(themeMode.value);
const { title, getDropdownItemStyle, getDropdownItemClass } = useNav();
const { locale, translationCh, translationEn } = useTranslationLang();

// 判断是否为开发环境
const isDev = computed(() => import.meta.env.DEV);

// 验证码相关计算属性
const captchaTip = computed(() => getCaptchaTip());
const captchaPlaceholder = computed(() => getCaptchaPlaceholder());

// 获取后端验证码
const getBackendVerifyCode = async () => {
  verifyCodeLoading.value = true;
  try {
    devLog("正在获取验证码...");
    const res = await getAuthCode();
    devLog("验证码接口响应:", res);

    if (res.img && res.uuid) {
      verifyCodeImg.value = res.img;
      // 直接使用后端返回的UUID，不添加前缀
      // 后端返回格式: codeKey_1234567890abcdef
      verifyUuid.value = res.uuid;
      ruleForm.verifyCode = ""; // 清空用户输入的验证码
      devLog("验证码图片base64长度:", res.img?.length);
      devLog("验证码UUID:", res.uuid);
      devLog(
        "UUID格式:",
        res.uuid.startsWith("codeKey_") ? "后端标准格式" : "其他格式"
      );
    } else {
      console.error("验证码接口返回数据格式错误:", res);
      message("验证码格式错误，请刷新重试", { type: "error" });
    }
  } catch (error) {
    console.error("获取验证码失败:", error);
    message("获取验证码失败，请检查网络", { type: "error" });
  } finally {
    verifyCodeLoading.value = false;
  }
};

// 获取RSA公钥
const getRsaPublicKeyFromServer = async () => {
  rsaLoading.value = true;
  try {
    devLog("正在获取RSA公钥...");
    const res = await getRsaPublicKey();
    devLog("RSA公钥获取成功:", res.publicKey?.substring(0, 50) + "...");

    // 设置RSA公钥 - 使用简化版本
    const success = rsaSimple.setPublicKey(res.publicKey);
    rsaInitialized.value = success;

    if (!success) {
      console.error("RSA公钥设置失败，请检查公钥格式");
      message("RSA公钥设置失败，请检查公钥格式", { type: "error" });
    }

    // 存储到localStorage备用
    localStorage.setItem("rsaPublicKey", res.publicKey);
  } catch (error) {
    console.error("获取RSA公钥失败:", error);
    message("获取加密密钥失败，请刷新重试", { type: "error" });

    // 尝试从localStorage获取缓存的公钥
    const cachedKey = localStorage.getItem("rsaPublicKey");
    if (cachedKey) {
      devLog("使用缓存的RSA公钥");
      const success = rsaSimple.setPublicKey(cachedKey);
      rsaInitialized.value = success;
    }
  } finally {
    rsaLoading.value = false;
  }
};

// 页面加载时获取验证码和RSA公钥
onMounted(() => {
  getBackendVerifyCode();
  getRsaPublicKeyFromServer();

  // 开发环境：暴露测试函数到全局
  if (import.meta.env.DEV) {
    // @ts-ignore
    window.testLogin = () => {
      devLog("=== 测试登录 ===");
      devLog("用户名:", ruleForm.username);
      devLog("密码:", ruleForm.password);
      devLog("验证码:", ruleForm.verifyCode);
      devLog("UUID:", verifyUuid.value);
      devLog("RSA初始化:", rsaInitialized.value);

      // 测试RSA加密
      if (rsaInitialized.value) {
        try {
          const encrypted = rsaSimple.encryptPassword(ruleForm.password);
          devLog("RSA加密结果:", encrypted.substring(0, 50) + "...");
          devLog("加密长度:", encrypted.length);
        } catch (error) {
          console.error("RSA加密测试失败:", error);
        }
      }

      // 触发登录
      onLogin(ruleFormRef.value);
    };

    // @ts-ignore
    window.testRSA = () => {
      devLog("=== 测试RSA加密 ===");
      const testData = ["123456", "admin", "password", "test"];
      testData.forEach(data => {
        try {
          const encrypted = rsaSimple.encryptPassword(data);
          devLog(`明文: ${data} -> 加密长度: ${encrypted.length}`);
        } catch (error) {
          console.error(`加密失败 ${data}:`, error.message);
        }
      });
    };
  }
});

const ruleForm = reactive({
  username: import.meta.env.PROD ? "" : "admin",
  password: import.meta.env.PROD ? "" : "123456",
  verifyCode: ""
});

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;

  devLog("=== 登录开始 ===");
  devLog("验证码值:", ruleForm.verifyCode);
  devLog("UUID值:", verifyUuid.value);
  devLog("UUID包含前缀:", verifyUuid.value.includes("captcha_code:"));

  await formEl.validate(async valid => {
    devLog("表单验证结果:", valid);

    if (!valid) return;

    // 检查验证码是否为空
    if (!ruleForm.verifyCode) {
      devLog("验证码为空，阻止登录");
      message("请输入验证码", { type: "warning" });
      return;
    }

    // 验证验证码输入格式（算术验证码必须是数字）
    if (!validateCaptchaInput(ruleForm.verifyCode)) {
      devLog("验证码格式错误:", ruleForm.verifyCode);
      message("验证码必须是数字，请重新输入", { type: "warning" });
      return;
    }

    // 检查UUID是否存在
    if (!verifyUuid.value) {
      devLog("UUID为空，刷新验证码");
      message("验证码已失效，请刷新验证码", { type: "warning" });
      getBackendVerifyCode();
      return;
    }

    // 记录验证码输入时间（用于调试）
    const inputTime = new Date().toISOString();
    devLog("验证码输入时间:", inputTime);

    // 不再检查UUID格式，直接使用后端返回的UUID
    // 后端返回什么就用什么

    // 检查RSA是否已初始化
    if (!rsaInitialized.value) {
      console.error("RSA加密未初始化");
      message("加密系统未就绪，请刷新页面重试", { type: "error" });
      return;
    }

    loading.value = true;
    disabled.value = true;

    try {
      // 密码处理
      devLog("处理密码...");
      let passwordToSend = ruleForm.password;

      // 尝试RSA加密
      if (rsaInitialized.value) {
        devLog("尝试RSA加密...");
        try {
          passwordToSend = rsaSimple.encryptPassword(ruleForm.password);
          devLog("RSA加密成功，加密后长度:", passwordToSend.length);
          devLog("加密结果前50字符:", passwordToSend.substring(0, 50));
        } catch (rsaError: any) {
          console.error("RSA加密失败:", rsaError.message);
          devLog("使用明文密码");
          passwordToSend = ruleForm.password;
        }
      } else {
        devLog("RSA未初始化，使用明文密码");
      }

      // 使用完整的UUID（包含captcha_code:前缀）
      const uuid = verifyUuid.value;
      devLog("发送的UUID:", uuid);
      devLog("发送的用户名:", ruleForm.username);
      devLog("发送的验证码:", ruleForm.verifyCode);
      devLog(
        "发送的密码类型:",
        passwordToSend === ruleForm.password ? "明文" : "加密"
      );

      // 发送登录请求
      await useUserStoreHook().loginByUsername({
        username: ruleForm.username,
        password: passwordToSend,
        code: ruleForm.verifyCode,
        uuid: uuid
      });

      // 登录成功
      devLog("✅ 登录成功！");
      message("登录成功", { type: "success" });

      // 初始化动态路由
      devLog("正在初始化动态路由...");
      await initRouter();

      // 获取顶部菜单并跳转
      const topMenu = getTopMenu(true);
      devLog("顶部菜单:", topMenu);

      // 跳转到首页
      router
        .push(topMenu.path)
        .then(() => {
          devLog("跳转成功");
        })
        .catch(error => {
          console.error("路由跳转失败:", error);
          // 备用方案：跳转到根路径
          router.push("/");
        });
    } catch (error: any) {
      console.error("登录失败:", error);

      // 安全地获取错误信息
      let errorMessage = "登录失败";
      let shouldRefreshCaptcha = true;

      if (error && typeof error === "object") {
        // 尝试从不同位置获取错误信息
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
          console.error("错误响应:", error.response.data);

          // 检查是否是验证码错误
          if (
            errorMessage.includes("验证码") ||
            errorMessage.includes("captcha") ||
            errorMessage.includes("code")
          ) {
            errorMessage = "验证码错误或已过期，请重新输入";
            // 立即刷新验证码
            getBackendVerifyCode();
            shouldRefreshCaptcha = false; // 已经刷新过了
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      console.error("错误信息:", errorMessage);
      message(errorMessage, { type: "error" });

      // 登录失败时刷新验证码（如果没有已经刷新）
      if (shouldRefreshCaptcha) {
        getBackendVerifyCode();
      }
    } finally {
      loading.value = false;
      disabled.value = false;
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});

watch(checked, bool => {
  useUserStoreHook().SET_ISREMEMBERED(bool);
});
</script>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}

.translation {
  :deep(.el-dropdown-menu__item) {
    padding: 5px 40px;
  }
}
</style>
