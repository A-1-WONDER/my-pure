// RSA加密工具 - PKCS#1格式修复
// 针对后端提供的PKCS#1格式Base64公钥

import JSEncrypt from "jsencrypt";

/**
 * PKCS#1格式RSA加密工具
 * 后端提供的是Base64编码的PKCS#1格式公钥
 * 需要转换为PEM格式供JSEncrypt使用
 */
export class RSAPkcs1Encrypt {
  private encryptor: JSEncrypt | null = null;
  private publicKey: string = "";

  /**
   * 将Base64 PKCS#1公钥转换为PEM格式
   * 后端提供的是：Base64编码的X509公钥（PKCS#1）
   * JSEncrypt需要：PEM格式的PKCS#8公钥
   */
  private convertPkcs1ToPem(base64Key: string): string {
    // PKCS#1格式的PEM
    // 注意：JSEncrypt可能无法直接解析PKCS#1格式
    // 所以我们需要尝试多种格式

    const formats = [
      {
        name: "PKCS#8标准PEM",
        // 标准的PKCS#8 PEM格式
        key: `-----BEGIN PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64Key)}\n-----END PUBLIC KEY-----`
      },
      {
        name: "PKCS#1 RSA格式",
        // 有些库需要RSA特定的PEM格式
        key: `-----BEGIN RSA PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64Key)}\n-----END RSA PUBLIC KEY-----`
      },
      {
        name: "紧凑PEM格式",
        // 不带换行的PEM格式
        key: `-----BEGIN PUBLIC KEY-----${base64Key}-----END PUBLIC KEY-----`
      },
      {
        name: "原始Base64",
        // 直接使用Base64
        key: base64Key
      }
    ];

    return formats[0].key; // 默认使用PKCS#8格式
  }

  /**
   * 格式化Base64字符串，每64字符加换行
   */
  private formatBase64WithLineBreaks(base64: string): string {
    const chunkSize = 64;
    let result = "";

    for (let i = 0; i < base64.length; i += chunkSize) {
      result += base64.substring(i, i + chunkSize) + "\n";
    }

    return result.trim();
  }

  /**
   * 设置公钥
   * @param base64PublicKey 后端提供的Base64格式公钥
   */
  setPublicKey(base64PublicKey: string): boolean {
    console.log("[RSA-PKCS1] 设置公钥，长度:", base64PublicKey.length);
    console.log("[RSA-PKCS1] 公钥:", base64PublicKey);

    this.publicKey = base64PublicKey;

    // 尝试多种格式
    const testFormats = [
      {
        name: "PKCS#8 PEM格式",
        key: `-----BEGIN PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64PublicKey)}\n-----END PUBLIC KEY-----`
      },
      {
        name: "PKCS#1 RSA格式",
        key: `-----BEGIN RSA PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64PublicKey)}\n-----END RSA PUBLIC KEY-----`
      },
      {
        name: "紧凑PKCS#8格式",
        key: `-----BEGIN PUBLIC KEY-----${base64PublicKey}-----END PUBLIC KEY-----`
      },
      {
        name: "紧凑PKCS#1格式",
        key: `-----BEGIN RSA PUBLIC KEY-----${base64PublicKey}-----END RSA PUBLIC KEY-----`
      },
      {
        name: "原始Base64",
        key: base64PublicKey
      }
    ];

    for (const format of testFormats) {
      console.log(`[RSA-PKCS1] 尝试格式: ${format.name}`);
      console.log(`[RSA-PKCS1] 格式示例: ${format.key.substring(0, 80)}...`);

      try {
        this.encryptor = new JSEncrypt();
        this.encryptor.setPublicKey(format.key);

        // 检查是否设置成功
        const key = this.encryptor.getKey();
        if (key) {
          const keySize = key.getKeySize();
          console.log(
            `[RSA-PKCS1] ${format.name} 成功，密钥大小: ${keySize}位`
          );

          // 测试加密
          const testResult = this.encryptor.encrypt("test");
          if (testResult) {
            console.log(`[RSA-PKCS1] 测试加密成功，使用格式: ${format.name}`);
            return true;
          } else {
            console.log(`[RSA-PKCS1] 测试加密返回null`);
          }
        } else {
          console.log(`[RSA-PKCS1] getKey()返回null`);
        }
      } catch (error: any) {
        console.log(`[RSA-PKCS1] ${format.name} 失败:`, error.message);
      }
    }

    console.error("[RSA-PKCS1] 所有格式尝试都失败");
    return false;
  }

  /**
   * 加密数据
   */
  encrypt(data: string): string {
    if (!this.encryptor) {
      throw new Error("RSA加密器未初始化");
    }

    console.log(`[RSA-PKCS1] 加密数据: "${data}"`);

    const encrypted = this.encryptor.encrypt(data);

    if (!encrypted) {
      throw new Error("RSA加密失败：返回null");
    }

    console.log(`[RSA-PKCS1] 加密成功，长度: ${encrypted.length}`);
    return encrypted;
  }

  /**
   * 加密密码
   */
  encryptPassword(password: string): string {
    return this.encrypt(password);
  }

  /**
   * 测试公钥有效性
   */
  testPublicKey(base64PublicKey: string): {
    success: boolean;
    message: string;
    workingFormat?: string;
    keySize?: number;
  } {
    const formats = [
      {
        name: "PKCS#8 PEM",
        key: `-----BEGIN PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64PublicKey)}\n-----END PUBLIC KEY-----`
      },
      {
        name: "PKCS#1 RSA",
        key: `-----BEGIN RSA PUBLIC KEY-----\n${this.formatBase64WithLineBreaks(base64PublicKey)}\n-----END RSA PUBLIC KEY-----`
      },
      {
        name: "紧凑PKCS#8",
        key: `-----BEGIN PUBLIC KEY-----${base64PublicKey}-----END PUBLIC KEY-----`
      },
      {
        name: "紧凑PKCS#1",
        key: `-----BEGIN RSA PUBLIC KEY-----${base64PublicKey}-----END RSA PUBLIC KEY-----`
      },
      { name: "Base64", key: base64PublicKey }
    ];

    for (const format of formats) {
      try {
        const encryptor = new JSEncrypt();
        encryptor.setPublicKey(format.key);

        const key = encryptor.getKey();
        if (key) {
          const keySize = key.getKeySize();
          const testEncrypted = encryptor.encrypt("test123");

          if (testEncrypted) {
            return {
              success: true,
              message: `成功！使用格式: ${format.name}`,
              workingFormat: format.name,
              keySize
            };
          }
        }
      } catch {
        // 继续尝试
      }
    }

    return {
      success: false,
      message: "所有格式都失败，请检查公钥"
    };
  }
}

// 创建单例
export const rsaPkcs1 = new RSAPkcs1Encrypt();

export default rsaPkcs1;
