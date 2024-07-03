// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';

import { encryptNotification } from './notif-crypto-utils.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => {
    const { body, type } = await encryptNotification(
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
};

export default encryptedNotifUtilsAPI;
