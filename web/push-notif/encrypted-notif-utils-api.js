// @flow

import {
  generateKeyCommon,
  encryptCommon,
  generateIVCommon,
} from 'lib/media/aes-crypto-utils-common.js';
import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';
import { getConfig } from 'lib/utils/config.js';

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
    return new Blob([serializedNotification]).size;
  },
  getEncryptedNotifHash: async (serializedNotification: string) => {
    const notificationBytes = new TextEncoder().encode(serializedNotification);
    const hashBytes = await crypto.subtle.digest('SHA-256', notificationBytes);
    return btoa(String.fromCharCode(...new Uint8Array(hashBytes)));
  },
  getBlobHash: async (blob: Uint8Array) => {
    const hashBytes = await crypto.subtle.digest('SHA-256', blob.buffer);
    return btoa(String.fromCharCode(...new Uint8Array(hashBytes)));
  },
  generateAESKey: async () => {
    const aesKeyBytes = await generateKeyCommon(crypto);
    return Buffer.from(aesKeyBytes).toString('base64');
  },
  generateAESIV: async () => {
    const ivBytes = await generateIVCommon(crypto);
    return Buffer.from(ivBytes).toString('base64');
  },
  encryptWithAESKey: async (
    encryptionKey: string,
    initializationVector: string,
    unencrypotedData: string,
  ) => {
    const encryptionKeyBytes = new Uint8Array(
      Buffer.from(encryptionKey, 'base64'),
    );
    const unencrypotedDataBytes = new TextEncoder().encode(unencrypotedData);
    const initializationVectorBytes = new Uint8Array(
      Buffer.from(initializationVector, 'base64'),
    );
    return await encryptCommon(
      crypto,
      encryptionKeyBytes,
      unencrypotedDataBytes,
      initializationVectorBytes,
    );
  },
};

export default encryptedNotifUtilsAPI;
