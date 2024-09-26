// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';
import { getConfig } from 'lib/utils/config.js';

import { commUtilsModule } from '../native-modules.js';
import { encrypt, generateKey } from '../utils/aes-crypto-module.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => {
    const { encryptNotification } = getConfig().olmAPI;
    const { message: body, messageType: type } = await encryptNotification(
      unencryptedPayload,
      cryptoID,
    );
    return {
      encryptedData: { body, type },
      sizeLimitViolated: encryptedPayloadSizeValidator
        ? !encryptedPayloadSizeValidator(body, type ? '1' : '0')
        : false,
    };
  },
  uploadLargeNotifPayload: async () => ({ blobUploadError: 'not_implemented' }),
  getNotifByteSize: (serializedNotification: string) => {
    return commUtilsModule.encodeStringToUTF8ArrayBuffer(serializedNotification)
      .byteLength;
  },
  getEncryptedNotifHash: async (serializedNotification: string) => {
    const notifAsArrayBuffer = commUtilsModule.encodeStringToUTF8ArrayBuffer(
      serializedNotification,
    );
    return commUtilsModule.sha256(notifAsArrayBuffer);
  },
  getBlobHash: async (blob: Uint8Array) => {
    return commUtilsModule.sha256(blob.buffer);
  },
  generateAESKey: async () => {
    const aesKeyBytes = await generateKey();
    return await commUtilsModule.base64EncodeBuffer(aesKeyBytes.buffer);
  },
  encryptWithAESKey: async (encryptionKey: string, unencryptedData: string) => {
    const [encryptionKeyBytes, unencryptedDataBytes] = await Promise.all([
      commUtilsModule.base64DecodeBuffer(encryptionKey),
      commUtilsModule.encodeStringToUTF8ArrayBuffer(unencryptedData),
    ]);

    return await encrypt(
      new Uint8Array(encryptionKeyBytes),
      new Uint8Array(unencryptedDataBytes),
    );
  },
  normalizeUint8ArrayForBlobUpload: (array: Uint8Array) =>
    commUtilsModule.base64EncodeBuffer(array.buffer),
};

export default encryptedNotifUtilsAPI;
