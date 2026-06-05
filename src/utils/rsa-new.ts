// RSA加密工具 - 修复版本
// 解决JSEncrypt返回null和toString错误的问题

import JSEncrypt from "jsencrypt";

export class RSAEncrypt {
  private static encryptor: JSEncrypt | null = null;
  private static publicKey: string = "";
  private static isInitialized: boolean = false;

  /**
   * 设置RSA公钥
   * @param publicKey RSA公钥字符串
   */
  static setPublicKey(publicKey: string): void {
    console.log("[RSA] 设置公钥，长度:", publicKey.length);
    console.log("[RSA] 公钥前50字符:", publicKey.substring(0, 50));

    this.publicKey = publicKey;

    // 清除旧的加密器
    this.encryptor = null;
    this.isInitialized = false;

    // 创建新的加密器
    this.encryptor = new JSEncrypt();

    // 用户提供的公钥是Base64格式，需要转换为PEM格式
    // JSEncrypt需要PEM格式：-----BEGIN PUBLIC KEY-----
    //                        Base64内容
    //                        -----END PUBLIC KEY-----
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

    console.log("[RSA] 转换为PEM格式");

    try {
      // 首先尝试PEM格式
      this.encryptor.setPublicKey(pemKey);
      console.log("[RSA] PEM格式设置成功");
      this.isInitialized = true;

      // 验证密钥
      const key = this.encryptor.getKey();
      if (key) {
        const keySize = key.getKeySize();
        console.log(`[RSA] 密钥大小: ${keySize}位`);
      }
    } catch (error: any) {
      console.error("[RSA] PEM格式失败:", error.message);

      // 如果PEM格式失败，尝试原始Base64格式
      try {
        console.log("[RSA] 尝试原始Base64格式");
        this.encryptor = new JSEncrypt();
        this.encryptor.setPublicKey(publicKey);
        console.log("[RSA] 原始Base64格式设置成功");
        this.isInitialized = true;
      } catch (e2: any) {
        console.error("[RSA] 原始Base64格式也失败:", e2.message);

        // 最后尝试不带换行的PEM格式
        try {
          console.log("[RSA] 尝试不带换行的PEM格式");
          this.encryptor = new JSEncrypt();
          const pemKeyNoNewline = `-----BEGIN PUBLIC KEY-----${publicKey}-----END PUBLIC KEY-----`;
          this.encryptor.setPublicKey(pemKeyNoNewline);
          console.log("[RSA] 不带换行的PEM格式设置成功");
          this.isInitialized = true;
        } catch (e3: any) {
          console.error("[RSA] 所有格式都失败:", e3.message);
          throw new Error(`RSA公钥设置失败: ${e3.message}`);
        }
      }
    }
  }

  /**
   * RSA加密
   * @param data 要加密的数据
   * @returns 加密后的字符串
   */
  static encrypt(data: string): string {
    if (!this.encryptor || !this.isInitialized) {
      throw new Error("RSA加密器未初始化，请先调用setPublicKey设置公钥");
    }

    console.log(`[RSA] 加密数据: "${data}" (${data.length}字符)`);

    // 直接调用encrypt，如果返回null，直接处理
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
    } else if (!this.isInitialized && this.publicKey) {
      this.setPublicKey(this.publicKey);
    }

    return this.encrypt(password);
  }

  /**
   * 检查是否已初始化
   */
  static checkInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取当前公钥
   */
  static getPublicKey(): string {
    return this.publicKey;
  }
}

export default RSAEncrypt;
