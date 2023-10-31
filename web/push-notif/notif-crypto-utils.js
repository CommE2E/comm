// @flow

import olm from '@commapp/olm';
import localforage from 'localforage';

import {
  olmEncryptedMessageTypes,
  type NotificationsOlmDataType,
} from 'lib/types/crypto-types.js';
import type {
  PlainTextWebNotification,
  PlainTextWebNotificationPayload,
  EncryptedWebNotification,
} from 'lib/types/notif-types.js';

import {
  decryptData,
  encryptData,
  importJWKKey,
} from '../crypto/aes-gcm-crypto-utils.js';
import {
  NOTIFICATIONS_OLM_DATA_CONTENT,
  NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
} from '../database/utils/constants.js';
import { isDesktopSafari } from '../database/utils/db-utils.js';

export type WebNotifDecryptionError = {
  +id: string,
  +error: string,
  +displayErrorMessage?: boolean,
};

export type WebNotifsServiceUtilsData = {
  +olmWasmPath: string,
  +staffCanSee: boolean,
};

type DecryptionResult = {
  +newMainSession: string,
  +newPendingSessionUpdate: string,
  +newUpdateCreationTimestamp: number,
  +decryptedNotification: PlainTextWebNotificationPayload,
};

export const WEB_NOTIFS_SERVICE_UTILS_KEY = 'webNotifsServiceUtils';

const SESSION_UPDATE_MAX_PENDING_TIME = 10 * 1000;

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification | WebNotifDecryptionError> {
  const { id, encryptedPayload } = encryptedNotification;

  const retrieveEncryptionKeyPromise: Promise<?CryptoKey> = (async () => {
    const persistedCryptoKey = await localforage.getItem(
      NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
    );
    if (isDesktopSafari && persistedCryptoKey) {
      // Safari doesn't support structured clone algorithm in service
      // worker context so we have to store CryptoKey as JSON
      return await importJWKKey(persistedCryptoKey);
    }
    return persistedCryptoKey;
  })();

  const [encryptedOlmData, encryptionKey, utilsData] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_DATA_CONTENT),
    retrieveEncryptionKeyPromise,
    localforage.getItem(WEB_NOTIFS_SERVICE_UTILS_KEY),
  ]);

  if (!utilsData) {
    return { id, error: 'Necessary data not found in IndexedDB' };
  }

  const { olmWasmPath, staffCanSee } = (utilsData: WebNotifsServiceUtilsData);
  if (!encryptionKey || !encryptedOlmData) {
    return {
      id,
      error: 'Received encrypted notification but olm session was not created',
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    await olm.init({ locateFile: () => olmWasmPath });

    const serializedOlmData = await decryptData(
      encryptedOlmData,
      encryptionKey,
    );
    const {
      mainSession,
      picklingKey,
      pendingSessionUpdate,
      updateCreationTimestamp,
    }: NotificationsOlmDataType = JSON.parse(
      new TextDecoder().decode(serializedOlmData),
    );

    let decryptionResult: DecryptionResult;
    if (
      updateCreationTimestamp &&
      pendingSessionUpdate &&
      Date.now() - updateCreationTimestamp > SESSION_UPDATE_MAX_PENDING_TIME
    ) {
      decryptionResult = decryptWithPendingSession(
        mainSession,
        pendingSessionUpdate,
        picklingKey,
        encryptedPayload,
      );
    } else {
      decryptionResult = decryptWithSession(
        mainSession,
        picklingKey,
        encryptedPayload,
      );
    }

    const {
      newMainSession,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
      decryptedNotification,
    } = decryptionResult;
    const updatedOlmData: NotificationsOlmDataType = {
      mainSession: newMainSession,
      pendingSessionUpdate: newPendingSessionUpdate,
      updateCreationTimestamp: newUpdateCreationTimestamp,
      picklingKey,
    };

    const updatedEncryptedSession = await encryptData(
      new TextEncoder().encode(JSON.stringify(updatedOlmData)),
      encryptionKey,
    );

    await localforage.setItem(
      NOTIFICATIONS_OLM_DATA_CONTENT,
      updatedEncryptedSession,
    );

    return { id, ...decryptedNotification };
  } catch (e) {
    return {
      id,
      error: e.message,
      displayErrorMessage: staffCanSee,
    };
  }
}

function decryptWithSession(
  pickledSession: string,
  picklingKey: string,
  encryptedPayload: string,
): DecryptionResult {
  const session = new olm.Session();

  session.unpickle(picklingKey, pickledSession);
  const decryptedNotification: PlainTextWebNotificationPayload = JSON.parse(
    session.decrypt(olmEncryptedMessageTypes.TEXT, encryptedPayload),
  );

  const newPendingSessionUpdate = session.pickle(picklingKey);
  const newUpdateCreationTimestamp = Date.now();

  return {
    newMainSession: pickledSession,
    decryptedNotification,
    newUpdateCreationTimestamp,
    newPendingSessionUpdate,
  };
}

function decryptWithPendingSession(
  mainSession: string,
  pendingSessionUpdate: string,
  picklingKey: string,
  encryptedPayload: string,
): DecryptionResult {
  try {
    const {
      decryptedNotification,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
    } = decryptWithSession(pendingSessionUpdate, picklingKey, encryptedPayload);
    return {
      newMainSession: pendingSessionUpdate,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
      decryptedNotification,
    };
  } catch (e) {
    console.log('Failed to decrypt with pending session.', e);
    const {
      decryptedNotification,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
    } = decryptWithSession(mainSession, picklingKey, encryptedPayload);
    return {
      newMainSession: mainSession,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
      decryptedNotification,
    };
  }
}
export { decryptWebNotification };
