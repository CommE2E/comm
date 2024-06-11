// @flow

import type { EncryptResult } from '@commapp/olm';

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';

import { blobServiceUpload } from './utils.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

const encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI = {
  encryptSerializedNotifPayload: async (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (encryptedPayload: string) => boolean,
  ) => {
    let dbPersistCondition;
    if (encryptedPayloadSizeValidator) {
      dbPersistCondition = ({
        serializedPayload,
      }: {
        +[string]: EncryptResult,
      }) => encryptedPayloadSizeValidator(serializedPayload.body);
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
};

export default encryptedNotifUtilsAPI;
