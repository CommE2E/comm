// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';
import { getConfig } from 'lib/utils/config.js';

import { commUtilsModule } from '../native-modules.js';
import {
  encrypt,
  generateKey,
  generateIV,
} from '../utils/aes-crypto-module.js';

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
  generateAESIV: async () => {
    const ivBytes = await generateIV();
    return commUtilsModule.base64EncodeBuffer(ivBytes.buffer);
  },
  encryptWithAESKey: async (
    encryptionKey: string,
    initializationVector: string,
    unencrypotedData: string,
  ) => {
    const [
      encryptionKeyBytes,
      unencrypotedDataBytes,
      initializationVectorBytes,
    ] = await Promise.all([
      commUtilsModule.base64DecodeBuffer(encryptionKey),
      commUtilsModule.encodeStringToUTF8ArrayBuffer(unencrypotedData),
      commUtilsModule.base64DecodeBuffer(initializationVector),
    ]);

    return await encrypt(
      new Uint8Array(encryptionKeyBytes),
      new Uint8Array(unencrypotedDataBytes),
      new Uint8Array(initializationVectorBytes),
    );
  },
};

export default encryptedNotifUtilsAPI;
