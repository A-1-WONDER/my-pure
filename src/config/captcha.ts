// 验证码类型枚举 - 与后端保持一致
export const LoginCodeEnum = {
  ARITHMETIC: "ARITHMETIC", // 算术验证码
  CHINESE: "CHINESE", // 中文验证码
  CHINESE_GIF: "CHINESE_GIF", // 中文GIF验证码
  GIF: "GIF", // GIF验证码
  SPEC: "SPEC" // 特殊字符验证码
} as const;

// 验证码类型配置
export const CaptchaConfig = {
  // 当前使用的验证码类型（根据后端配置）
  CURRENT_TYPE: LoginCodeEnum.ARITHMETIC,

  // 各类型验证码的提示信息
  TYPE_TIPS: {
    [LoginCodeEnum.ARITHMETIC]: "算术题，请输入计算结果（数字）",
    [LoginCodeEnum.CHINESE]: "中文验证码，请输入图片中的汉字",
    [LoginCodeEnum.CHINESE_GIF]: "中文GIF验证码，请输入图片中的汉字",
    [LoginCodeEnum.GIF]: "GIF验证码，请输入图片中的字符",
    [LoginCodeEnum.SPEC]: "特殊字符验证码，请输入图片中的字符"
  },

  // 各类型验证码的输入框placeholder
  TYPE_PLACEHOLDER: {
    [LoginCodeEnum.ARITHMETIC]: "请输入算术题计算结果",
    [LoginCodeEnum.CHINESE]: "请输入图片中的汉字",
    [LoginCodeEnum.CHINESE_GIF]: "请输入图片中的汉字",
    [LoginCodeEnum.GIF]: "请输入图片中的字符",
    [LoginCodeEnum.SPEC]: "请输入图片中的字符"
  },

  // 验证码输入验证规则
  getValidationRules: (type: string) => {
    switch (type) {
      case LoginCodeEnum.ARITHMETIC:
        return {
          pattern: /^\d+$/, // 只能是数字
          message: "计算结果必须是数字",
          required: true
        };
      case LoginCodeEnum.CHINESE:
      case LoginCodeEnum.CHINESE_GIF:
        return {
          pattern: /^[\u4e00-\u9fa5]+$/, // 只能是汉字
          message: "请输入汉字",
          required: true
        };
      default:
        return {
          pattern: /^[A-Za-z0-9]+$/, // 字母数字
          message: "请输入字母或数字",
          required: true
        };
    }
  }
};

// 获取当前验证码类型的提示
export function getCaptchaTip(): string {
  return CaptchaConfig.TYPE_TIPS[CaptchaConfig.CURRENT_TYPE] || "请输入验证码";
}

// 获取当前验证码类型的placeholder
export function getCaptchaPlaceholder(): string {
  return (
    CaptchaConfig.TYPE_PLACEHOLDER[CaptchaConfig.CURRENT_TYPE] || "请输入验证码"
  );
}

// 检查验证码输入是否有效
export function validateCaptchaInput(
  input: string,
  type: string = CaptchaConfig.CURRENT_TYPE
): boolean {
  const rules = CaptchaConfig.getValidationRules(type);
  return rules.pattern.test(input);
}

export default CaptchaConfig;
