// RSA加密工具 - 简化版本
// 直接处理Base64格式公钥

import JSEncrypt from "jsencrypt";

/**
 * 简化版RSA加密工具
 * 专注于解决当前问题
 */
export class RSASimple {
  private encryptor: JSEncrypt | null = null;
  private publicKey: string = "";

  /**
   * 设置公钥
   * @param base64PublicKey 后端提供的Base64格式公钥
   */
  setPublicKey(base64PublicKey: string): boolean {
    console.log("[RSA-Simple] 设置公钥，长度:", base64PublicKey.length);

    this.publicKey = base64PublicKey;

    // 只尝试最可能成功的格式
    const formats = [
      {
        name: "PKCS#8 PEM格式（带换行）",
        key: this.createPemKey(base64PublicKey, "PUBLIC KEY", true)
      },
      {
        name: "PKCS#1 RSA格式（带换行）",
        key: this.createPemKey(base64PublicKey, "RSA PUBLIC KEY", true)
      },
      {
        name: "PKCS#8 PEM格式（紧凑）",
        key: this.createPemKey(base64PublicKey, "PUBLIC KEY", false)
      },
      {
        name: "PKCS#1 RSA格式（紧凑）",
        key: this.createPemKey(base64PublicKey, "RSA PUBLIC KEY", false)
      }
    ];

    for (const format of formats) {
      console.log(`[RSA-Simple] 尝试格式: ${format.name}`);

      try {
        this.encryptor = new JSEncrypt();
        this.encryptor.setPublicKey(format.key);

        // 测试加密
        const testResult = this.encryptor.encrypt("test");
        if (testResult) {
          console.log(`[RSA-Simple] 成功！使用格式: ${format.name}`);
          console.log(`[RSA-Simple] 测试加密结果长度: ${testResult.length}`);
          return true;
        }
      } catch (error: any) {
        console.log(`[RSA-Simple] ${format.name} 失败:`, error.message);
      }
    }

    console.error("[RSA-Simple] 所有格式尝试都失败，将使用明文密码");
    this.encryptor = null; // 设置为null，表示使用明文
    return false; // 返回false，但允许继续使用
  }

  /**
   * 创建PEM格式密钥
   */
  private createPemKey(
    base64Key: string,
    keyType: string,
    withLineBreaks: boolean
  ): string {
    if (withLineBreaks) {
      // 每64字符换行
      const chunkSize = 64;
      let formattedKey = "";

      for (let i = 0; i < base64Key.length; i += chunkSize) {
        formattedKey += base64Key.substring(i, i + chunkSize) + "\n";
      }

      return `-----BEGIN ${keyType}-----\n${formattedKey.trim()}\n-----END ${keyType}-----`;
    } else {
      // 紧凑格式
      return `-----BEGIN ${keyType}-----${base64Key}-----END ${keyType}-----`;
    }
  }

  /**
   * 加密数据
   */
  encrypt(data: string): string {
    if (!this.encryptor) {
      console.warn("[RSA-Simple] 加密器未初始化，返回明文密码");
      return data; // 返回明文
    }

    console.log(`[RSA-Simple] 加密数据: "${data}"`);

    const encrypted = this.encryptor.encrypt(data);

    if (!encrypted) {
      console.warn("[RSA-Simple] RSA加密失败，返回明文密码");
      return data; // 返回明文
    }

    console.log(`[RSA-Simple] 加密成功，长度: ${encrypted.length}`);
    return encrypted;
  }

  /**
   * 加密密码
   */
  encryptPassword(password: string): string {
    return this.encrypt(password);
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.encryptor !== null;
  }
}

// 创建单例
export const rsaSimple = new RSASimple();

export default rsaSimple;
