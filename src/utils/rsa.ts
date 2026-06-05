// RSA加密工具
// 注意：需要后端的RSA公钥才能正常工作
// 请联系后端开发人员获取公钥

// 直接导入jsencrypt
import JSEncrypt from "jsencrypt";

export class RSAEncrypt {
  // 测试公钥（仅用于测试，实际使用时需要替换为后端提供的公钥）
  private static readonly TEST_PUBLIC_KEY = `
    -----BEGIN PUBLIC KEY-----
    MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1u5gV...（此处需要真实公钥）
    -----END PUBLIC KEY-----
  `;

  private static encryptor: any = null;
  private static publicKey: string = "";

  /**
   * 设置RSA公钥
   * @param publicKey RSA公钥字符串
   */
  static setPublicKey(publicKey: string): void {
    this.publicKey = publicKey;

    // 检查公钥格式
    console.log("设置RSA公钥，长度:", publicKey.length);
    console.log("公钥前100字符:", publicKey.substring(0, 100));
    console.log("公钥后50字符:", publicKey.substring(publicKey.length - 50));

    // 检查是否是PEM格式
    const isPemFormat = publicKey.includes("-----BEGIN PUBLIC KEY-----");
    console.log("是否是PEM格式:", isPemFormat);

    this.encryptor = new JSEncrypt();

    try {
      // 如果是Base64格式但没有PEM头尾，添加它们
      let keyToUse = publicKey;
      if (!isPemFormat && publicKey && !publicKey.includes("\n")) {
        console.log("检测到Base64格式公钥，添加PEM格式头尾");
        keyToUse = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
        console.log("转换后的PEM格式公钥:", keyToUse);
      }

      this.encryptor.setPublicKey(keyToUse);
      console.log("RSA公钥设置成功");

      // 验证公钥是否有效
      const key = this.encryptor.getKey();
      if (key) {
        const keySize = key.getKeySize();
        console.log("RSA密钥大小:", keySize, "位");
      } else {
        console.warn("警告：无法获取密钥大小，getKey()返回null");
      }

      // 测试加密
      const testEncrypt = this.encryptor.encrypt("test");
      console.log("测试加密结果:", testEncrypt ? "成功" : "失败");
      if (!testEncrypt) {
        console.warn("警告：测试加密返回null，公钥可能有问题");
      }
    } catch (error) {
      console.error("设置RSA公钥失败:", error);
      console.error("错误详情:", error.message);

      // 尝试其他格式
      console.log("尝试其他格式...");

      // 尝试直接使用Base64
      try {
        console.log("尝试直接使用Base64格式...");
        this.encryptor.setPublicKey(publicKey);
        console.log("直接使用Base64格式成功");
      } catch (e2) {
        console.error("直接使用Base64也失败:", e2);

        // 尝试添加PEM格式头尾（不带换行）
        try {
          console.log("尝试添加PEM格式头尾（不带换行）...");
          const pemKey = `-----BEGIN PUBLIC KEY-----${publicKey}-----END PUBLIC KEY-----`;
          this.encryptor.setPublicKey(pemKey);
          console.log("添加PEM格式头尾（不带换行）成功");
          this.publicKey = pemKey;
        } catch (e3) {
          console.error("所有格式尝试都失败:", e3);
          throw error;
        }
      }
    }
  }

  /**
   * 获取当前公钥
   */
  static getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * RSA加密
   * @param data 要加密的数据
   * @returns 加密后的字符串
   */
  static encrypt(data: string): string {
    if (!this.encryptor) {
      throw new Error("RSA加密器未初始化，请先调用setPublicKey设置公钥");
    }

    console.log("正在加密数据，长度:", data.length);
    console.log("加密数据:", data);

    try {
      const encrypted = this.encryptor.encrypt(data);

      if (!encrypted) {
        console.error("RSA加密返回null或undefined");
        console.error("加密器状态:", {
          hasPublicKey: this.encryptor.getPublicKey() !== null,
          keySize: this.encryptor.getKey()?.getKeySize()
        });

        // 尝试获取更详细的错误信息
        try {
          const publicKey = this.encryptor.getPublicKey();
          console.error("当前公钥:", publicKey);
          console.error("公钥类型:", typeof publicKey);
          console.error("公钥长度:", publicKey?.length);
        } catch (e) {
          console.error("获取公钥详情失败:", e);
        }

        throw new Error("RSA加密失败：加密器返回null");
      }

      console.log("加密成功，加密后长度:", encrypted.length);
      console.log("加密结果前50字符:", encrypted.substring(0, 50));

      return encrypted;
    } catch (error) {
      console.error("RSA加密过程中出错:", error);
      console.error("错误信息:", error.message);
      console.error("错误堆栈:", error.stack);

      // 检查是否是toString()错误
      if (
        error.message.includes("toString") ||
        error.message.includes("null")
      ) {
        console.error("检测到toString()错误，可能是加密器返回null");
        console.error("尝试重新初始化加密器...");

        // 尝试重新初始化
        if (this.publicKey) {
          try {
            this.encryptor = new JSEncrypt();
            this.encryptor.setPublicKey(this.publicKey);
            console.log("加密器重新初始化成功");

            // 重试加密
            const retryEncrypted = this.encryptor.encrypt(data);
            if (retryEncrypted) {
              console.log("重试加密成功");
              return retryEncrypted;
            } else {
              throw new Error("重试加密仍然返回null");
            }
          } catch (retryError) {
            console.error("重试失败:", retryError);
            throw new Error(`RSA加密失败：${retryError.message}`);
          }
        }
      }

      throw new Error(`RSA加密失败: ${error.message}`);
    }
  }

  /**
   * RSA加密密码
   * @param password 明文密码
   * @param publicKey RSA公钥（可选，默认使用测试公钥）
   * @returns 加密后的密码
   */
  static encryptPassword(password: string, publicKey?: string): string {
    // 如果没有提供公钥，使用测试公钥
    const key = publicKey || this.TEST_PUBLIC_KEY;

    // 如果加密器未初始化或公钥不同，重新初始化
    if (!this.encryptor || this.publicKey !== key) {
      this.setPublicKey(key);
    }

    return this.encrypt(password);
  }

  /**
   * 检查是否已初始化
   */
  static isInitialized(): boolean {
    return !!this.encryptor && !!this.publicKey;
  }

  /**
   * 检查是否需要RSA加密
   * 根据后端错误信息判断
   */
  static needsEncryption(errorMessage?: string): boolean {
    if (!errorMessage) return false;

    const keywords = [
      "RSA",
      "加密",
      "encrypt",
      "password must be encrypted",
      "密码需要加密"
    ];

    return keywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 测试公钥是否有效
   * @param publicKey 公钥字符串
   * @returns 测试结果
   */
  static testPublicKey(publicKey: string): {
    valid: boolean;
    message: string;
    keySize?: number;
  } {
    console.log("测试公钥有效性...");
    console.log("公钥长度:", publicKey.length);
    console.log("公钥前50字符:", publicKey.substring(0, 50));

    const encryptor = new JSEncrypt();

    try {
      // 尝试不同格式
      let keyToUse = publicKey;
      let format = "原始格式";

      // 检查是否是PEM格式
      const isPemFormat = publicKey.includes("-----BEGIN PUBLIC KEY-----");

      if (!isPemFormat) {
        // 尝试添加PEM格式
        console.log("尝试转换为PEM格式...");
        keyToUse = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
        format = "PEM格式（带换行）";
      }

      console.log("使用格式:", format);
      encryptor.setPublicKey(keyToUse);

      const key = encryptor.getKey();
      if (!key) {
        return { valid: false, message: "公钥设置失败：getKey()返回null" };
      }

      const keySize = key.getKeySize();
      console.log("密钥大小:", keySize, "位");

      // 测试加密
      const testData = "test123";
      const encrypted = encryptor.encrypt(testData);

      if (!encrypted) {
        return { valid: false, message: "加密测试失败：encrypt()返回null" };
      }

      return {
        valid: true,
        message: `公钥有效，${keySize}位，加密测试成功`,
        keySize
      };
    } catch (error) {
      console.error("公钥测试失败:", error);
      return {
        valid: false,
        message: `公钥测试失败: ${error.message}`
      };
    }
  }
}

export default RSAEncrypt;
