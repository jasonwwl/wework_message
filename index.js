const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const wework = require("./build/Release/wework.node");

class WeWork {
  constructor(config) {
    const { corpid, secret, pk } = config;
    this.pk = pk;
    this.corpid = corpid;

    wework.init(
      corpid,
      secret,
      path.resolve(__dirname, "./lib/libWeWorkFinanceSdk_C.so")
    );
  }

  getChatData(seq, limit = 1000, timeout = 60) {
    const data = wework.getChatData(
      this.corpid,
      BigInt(seq),
      BigInt(limit),
      BigInt(timeout)
    );
    const parsedData = JSON.parse(data);
    const { errcode, errmsg, chatdata } = parsedData;
    if (errcode !== 0) {
      throw new Error(`GetChatData Error: #${errcode}-${errmsg}`);
    }
    return chatdata;
  }

  getDecryptedChatData(seq, limit = 1000, timeout = 60) {
    const chatdata = this.getChatData(seq, limit, timeout);
    const message = [];
    for (let msg of chatdata) {
      const decodeMsg = this.decryptData(msg);
      message.push({
        ...decodeMsg,
        seq: msg.seq,
        raw: msg,
      });
    }
    return message;
  }

  decryptData(msg) {
    const { encrypt_random_key, encrypt_chat_msg } = msg;
    const randomKey = crypto
      .privateDecrypt(
        {
          key: this.pk,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(encrypt_random_key, "base64")
      )
      .toString("utf-8");
    const decryptData = wework.decryptData(randomKey, encrypt_chat_msg);
    const decryptMsg = JSON.parse(decryptData);
    decryptMsg.seq = msg.seq;
    decryptMsg.raw = msg;
    return decryptMsg;
  }

  getMediaData(id, savedFilepath) {
    wework.getMediaData(this.corpid, id, savedFilepath);
    return savedFilepath;
  }
}

module.exports = WeWork;
