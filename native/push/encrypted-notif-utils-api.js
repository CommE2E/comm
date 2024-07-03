// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';
import { getConfig } from 'lib/utils/config.js';

import { commUtilsModule } from '../native-modules.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => {
    const { initializeCryptoAccount, encryptNotification } = getConfig().olmAPI;
    await initializeCryptoAccount();
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
};

export default encryptedNotifUtilsAPI;
