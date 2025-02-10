// @flow

import type { EncryptResult } from '@commapp/olm';

import type { EncryptedNotifUtilsAPI } from 'lib/types/notif-types.js';
import { getOlmUtility } from 'lib/utils/olm-utility.js';

import { blobServiceUpload } from './utils.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';
import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';

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
  getBlobHash: async (blob: Uint8Array) => {
    return getOlmUtility().sha256(new Uint8Array(blob.buffer));
  },
  generateAESKey: async () => {
    const aesKeyBytes = await generateKey();
    return Buffer.from(aesKeyBytes).toString('base64');
  },
  encryptWithAESKey: async (encryptionKey: string, unencryptedData: string) => {
    const encryptionKeyBytes = new Uint8Array(
      Buffer.from(encryptionKey, 'base64'),
    );
    const unencryptedDataBytes = new TextEncoder().encode(unencryptedData);
    return await encrypt(encryptionKeyBytes, unencryptedDataBytes);
  },
  normalizeUint8ArrayForBlobUpload: (uint8Array: Uint8Array) =>
    new Blob([uint8Array]),
};

export default encryptedNotifUtilsAPI;
