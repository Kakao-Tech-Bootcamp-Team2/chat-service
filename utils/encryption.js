const crypto = require("crypto");
const { promisify } = require("util");
const config = require("../config/keys");

class Encryption {
  static getKey() {
    let key = config.encryptionKey;

    if (!key) {
      throw new Error("Encryption key is not set");
    }

    if (typeof key === "string") {
      key = Buffer.from(key, "hex");
    }

    if (key.length !== 32) {
      key = crypto.createHash("sha256").update(String(key)).digest();
    }

    return key;
  }

  static getSalt() {
    let salt = config.passwordSalt;

    if (!salt) {
      throw new Error("Password salt is not set");
    }

    if (typeof salt === "string") {
      salt = Buffer.from(salt, "hex");
    }

    return salt;
  }

  static generateKey() {
    return crypto.randomBytes(32);
  }

  static generateSalt() {
    return crypto.randomBytes(16);
  }

  static async encrypt(text) {
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("암호화 중 오류가 발생했습니다.");
    }
  }

  static async decrypt(text) {
    try {
      const key = this.getKey();
      const textParts = text.split(":");
      const iv = Buffer.from(textParts.shift(), "hex");
      const encryptedText = textParts.join(":");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("복호화 중 오류가 발생했습니다.");
    }
  }
}

module.exports = Encryption;
