// @flow

import type { EncryptResult } from '@commapp/olm';

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';

import { blobServiceUpload } from './utils.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';
import { getOlmUtility } from '../utils/olm-utils.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => {
    let dbPersistCondition;
    if (encryptedPayloadSizeValidator) {
      dbPersistCondition = ({
        serializedPayload,
      }: {
        +[string]: EncryptResult,
      }) =>
        encryptedPayloadSizeValidator(
          serializedPayload.body,
          serializedPayload.type ? '1' : '0',
        );
    }

    const {
      encryptedMessages: { serializedPayload },
      dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptAndUpdateOlmSession(
      cryptoID,
      'notifications',
      {
        serializedPayload: unencryptedPayload,
      },
      dbPersistCondition,
    );

    return {
      encryptedData: serializedPayload,
      sizeLimitViolated: dbPersistConditionViolated,
      encryptionOrder,
    };
  },
  uploadLargeNotifPayload: blobServiceUpload,
  getNotifByteSize: (serializedPayload: string) =>
    Buffer.byteLength(serializedPayload),
  getEncryptedNotifHash: async (serializedNotification: string) =>
    getOlmUtility().sha256(serializedNotification),
};

export default encryptedNotifUtilsAPI;
