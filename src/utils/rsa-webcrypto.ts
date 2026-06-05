// RSA加密工具 - 使用Web Crypto API
// 绕过JSEncrypt的问题

/**
 * Web Crypto API RSA加密工具
 * 使用浏览器原生API，避免JSEncrypt兼容性问题
 */
export class RSAWebCrypto {
  private publicKey: CryptoKey | null = null;
  private publicKeyBase64: string = "";

  /**
   * 设置公钥
   * @param base64PublicKey 后端提供的Base64格式公钥
   */
  async setPublicKey(base64PublicKey: string): Promise<boolean> {
    console.log("[RSA-WebCrypto] 设置公钥，长度:", base64PublicKey.length);

    this.publicKeyBase64 = base64PublicKey;

    try {
      // 将Base64转换为ArrayBuffer
      const binaryString = atob(base64PublicKey);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 导入公钥
      // 注意：Web Crypto API需要SPKI格式的公钥
      this.publicKey = await window.crypto.subtle.importKey(
        "spki",
        bytes,
        {
          name: "RSA-OAEP",
          hash: { name: "SHA-256" }
        },
        true,
        ["encrypt"]
      );

      console.log("[RSA-WebCrypto] 公钥导入成功");
      return true;
    } catch (error: any) {
      console.error("[RSA-WebCrypto] 公钥导入失败:", error.message);

      // 尝试使用JSEncrypt作为备用方案
      console.log("[RSA-WebCrypto] 尝试使用JSEncrypt作为备用方案...");
      return this.tryJsEncryptFallback(base64PublicKey);
    }
  }

  /**
   * 尝试使用JSEncrypt作为备用方案
   */
  private tryJsEncryptFallback(base64PublicKey: string): boolean {
    try {
      // 动态导入JSEncrypt
      import("jsencrypt").then(JSEncrypt => {
        const encryptor = new JSEncrypt.default();

        // 尝试多种格式
        const formats = [
          `-----BEGIN PUBLIC KEY-----\n${this.formatBase64(base64PublicKey)}\n-----END PUBLIC KEY-----`,
          `-----BEGIN RSA PUBLIC KEY-----\n${this.formatBase64(base64PublicKey)}\n-----END RSA PUBLIC KEY-----`,
          `-----BEGIN PUBLIC KEY-----${base64PublicKey}-----END PUBLIC KEY-----`,
          `-----BEGIN RSA PUBLIC KEY-----${base64PublicKey}-----END RSA PUBLIC KEY-----`,
          base64PublicKey
        ];

        for (const format of formats) {
          try {
            encryptor.setPublicKey(format);
            const testResult = encryptor.encrypt("test");
            if (testResult) {
              console.log("[RSA-WebCrypto] JSEncrypt备用方案成功");
              // 存储加密器供后续使用
              (window as any).__rsaFallbackEncryptor = encryptor;
              break;
            }
          } catch {
            // 继续尝试
          }
        }
      });

      return true; // 返回true，让前端继续尝试
    } catch (error) {
      console.error("[RSA-WebCrypto] JSEncrypt备用方案也失败:", error);
      return false;
    }
  }

  /**
   * 格式化Base64字符串
   */
  private formatBase64(base64: string): string {
    const chunkSize = 64;
    let result = "";

    for (let i = 0; i < base64.length; i += chunkSize) {
      result += base64.substring(i, i + chunkSize) + "\n";
    }

    return result.trim();
  }

  /**
   * 加密数据
   */
  async encrypt(data: string): Promise<string> {
    if (!this.publicKey) {
      throw new Error("RSA加密器未初始化");
    }

    console.log(`[RSA-WebCrypto] 加密数据: "${data}"`);

    try {
      // 使用Web Crypto API加密
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        this.publicKey,
        encodedData
      );

      // 将加密结果转换为Base64
      const encryptedBytes = new Uint8Array(encrypted);
      let binaryString = "";

      for (let i = 0; i < encryptedBytes.length; i++) {
        binaryString += String.fromCharCode(encryptedBytes[i]);
      }

      const base64Encrypted = btoa(binaryString);

      console.log(`[RSA-WebCrypto] 加密成功，长度: ${base64Encrypted.length}`);
      return base64Encrypted;
    } catch (error: any) {
      console.error("[RSA-WebCrypto] 加密失败:", error.message);

      // 尝试使用JSEncrypt备用方案
      return this.tryJsEncryptEncrypt(data);
    }
  }

  /**
   * 尝试使用JSEncrypt加密
   */
  private async tryJsEncryptEncrypt(data: string): Promise<string> {
    try {
      const encryptor = (window as any).__rsaFallbackEncryptor;
      if (encryptor) {
        const encrypted = encryptor.encrypt(data);
        if (encrypted) {
          console.log("[RSA-WebCrypto] 使用JSEncrypt备用方案加密成功");
          return encrypted;
        }
      }

      throw new Error("没有可用的加密器");
    } catch (error: any) {
      throw new Error(`RSA加密失败: ${error.message}`);
    }
  }

  /**
   * 加密密码
   */
  async encryptPassword(password: string): Promise<string> {
    return this.encrypt(password);
  }
}

// 创建单例
export const rsaWebCrypto = new RSAWebCrypto();

export default rsaWebCrypto;
