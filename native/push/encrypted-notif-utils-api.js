// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';

import { commUtilsModule, commCoreModule } from '../native-modules.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => {
    const { message: body, messageType: type } =
      await commCoreModule.encryptNotification(unencryptedPayload, cryptoID);
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
