// RSA加密工具 - 修复版本
// 解决JSEncrypt返回null的问题

import JSEncrypt from "jsencrypt";

export class RSAEncryptFixed {
  private static encryptor: JSEncrypt | null = null;
  private static publicKey: string = "";
  private static isInitializedFlag: boolean = false;

  /**
   * 设置RSA公钥
   * @param publicKey RSA公钥字符串
   */
  static setPublicKey(publicKey: string): void {
    console.log("[RSA] 设置公钥，长度:", publicKey.length);

    this.publicKey = publicKey;
    this.encryptor = new JSEncrypt();

    // 尝试不同格式
    const formats = [
      { name: "原始格式", key: publicKey },
      {
        name: "PEM格式（带换行）",
        key: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
      },
      {
        name: "PEM格式（不带换行）",
        key: `-----BEGIN PUBLIC KEY-----${publicKey}-----END PUBLIC KEY-----`
      }
    ];

    let success = false;

    for (const format of formats) {
      try {
        console.log(`[RSA] 尝试格式: ${format.name}`);
        this.encryptor.setPublicKey(format.key);

        // 验证是否设置成功
        const key = this.encryptor.getKey();
        if (key) {
          const keySize = key.getKeySize();
          console.log(`[RSA] 公钥设置成功，密钥大小: ${keySize}位`);

          // 测试加密
          const testResult = this.encryptor.encrypt("test");
          if (testResult) {
            console.log(`[RSA] 测试加密成功`);
            success = true;
            this.isInitializedFlag = true;
            break;
          } else {
            console.log(`[RSA] 测试加密返回null`);
          }
        }
      } catch (error) {
        console.log(`[RSA] 格式 ${format.name} 失败:`, error.message);
      }
    }

    if (!success) {
      console.error("[RSA] 所有格式尝试都失败");
      this.isInitializedFlag = false;
      throw new Error("RSA公钥设置失败，请检查公钥格式");
    }
  }

  /**
   * RSA加密
   * @param data 要加密的数据
   * @returns 加密后的字符串
   */
  static encrypt(data: string): string {
    if (!this.encryptor || !this.isInitializedFlag) {
      throw new Error("RSA加密器未初始化，请先调用setPublicKey设置公钥");
    }

    console.log(`[RSA] 加密数据: "${data}" (${data.length}字符)`);

    try {
      // 使用try-catch包装，防止toString()错误
      const encrypted = this.encryptor.encrypt(data);

      if (!encrypted) {
        console.error("[RSA] 加密返回null");

        // 尝试重新初始化
        if (this.publicKey) {
          console.log("[RSA] 尝试重新初始化加密器");
          this.setPublicKey(this.publicKey);

          // 重试加密
          const retryEncrypted = this.encryptor.encrypt(data);
          if (retryEncrypted) {
            console.log(`[RSA] 重试加密成功，长度: ${retryEncrypted.length}`);
            return retryEncrypted;
          }
        }

        throw new Error("RSA加密失败：加密器返回null");
      }

      console.log(`[RSA] 加密成功，长度: ${encrypted.length}`);
      return encrypted;
    } catch (error) {
      console.error("[RSA] 加密错误:", error.message);

      // 检查是否是toString错误
      if (
        error.message.includes("toString") ||
        error.message.includes("null")
      ) {
        throw new Error("RSA加密失败：加密器返回null，无法调用toString()方法");
      }

      throw new Error(`RSA加密失败: ${error.message}`);
    }
  }

  /**
   * RSA加密密码
   * @param password 明文密码
   * @param publicKey RSA公钥（可选）
   * @returns 加密后的密码
   */
  static encryptPassword(password: string, publicKey?: string): string {
    // 如果没有提供公钥，使用已设置的公钥
    if (publicKey && publicKey !== this.publicKey) {
      this.setPublicKey(publicKey);
    } else if (!this.isInitializedFlag && this.publicKey) {
      this.setPublicKey(this.publicKey);
    }

    return this.encrypt(password);
  }

  /**
   * 检查是否已初始化
   */
  static isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  /**
   * 获取当前公钥
   */
  static getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * 测试公钥是否有效
   */
  static testPublicKey(publicKey: string): {
    valid: boolean;
    message: string;
    keySize?: number;
  } {
    const encryptor = new JSEncrypt();

    try {
      // 尝试PEM格式
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      encryptor.setPublicKey(pemKey);

      const key = encryptor.getKey();
      if (!key) {
        return { valid: false, message: "公钥设置失败：getKey()返回null" };
      }

      const keySize = key.getKeySize();

      // 测试加密
      const encrypted = encryptor.encrypt("test123");
      if (!encrypted) {
        return { valid: false, message: "加密测试失败：encrypt()返回null" };
      }

      return { valid: true, message: `公钥有效，${keySize}位`, keySize };
    } catch (error) {
      return { valid: false, message: `公钥测试失败: ${error.message}` };
    }
  }
}

export default RSAEncryptFixed;
