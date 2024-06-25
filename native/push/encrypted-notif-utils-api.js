// @flow

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';

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
    // The "mock" implementation below will be replaced with proper
    // implementation after olm notif sessions initialization is
    // implemented. for now it is actually beneficial to return
    // original string as encrypted string since it allows for
    // better testing as we can verify which data are encrypted
    // and which aren't.
    return {
      encryptedData: { body: unencryptedPayload, type: 1 },
      sizeLimitViolated: encryptedPayloadSizeValidator
        ? !encryptedPayloadSizeValidator(unencryptedPayload, '1')
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
