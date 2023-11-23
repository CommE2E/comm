// @flow

import olm from '@commapp/olm';
import localforage from 'localforage';

import {
  olmEncryptedMessageTypes,
  type NotificationsOlmDataType,
} from 'lib/types/crypto-types.js';
import type {
  PlainTextWebNotification,
  EncryptedWebNotification,
} from 'lib/types/notif-types.js';

import {
  type EncryptedData,
  decryptData,
  encryptData,
  importJWKKey,
} from '../crypto/aes-gcm-crypto-utils.js';
import {
  NOTIFICATIONS_OLM_DATA_CONTENT,
  NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
} from '../database/utils/constants.js';
import { isDesktopSafari } from '../database/utils/db-utils.js';
import { initOlm } from '../olm/olm-utils.js';

export type WebNotifDecryptionError = {
  +id: string,
  +error: string,
  +displayErrorMessage?: boolean,
};

export type WebNotifsServiceUtilsData = {
  +olmWasmPath: string,
  +staffCanSee: boolean,
};

type DecryptionResult<T> = {
  +newPendingSessionUpdate: string,
  +newUpdateCreationTimestamp: number,
  +decryptedNotification: T,
};

export const WEB_NOTIFS_SERVICE_UTILS_KEY = 'webNotifsServiceUtils';

const SESSION_UPDATE_MAX_PENDING_TIME = 10 * 1000;

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification | WebNotifDecryptionError> {
  const { id, encryptedPayload } = encryptedNotification;

  const [encryptedOlmData, encryptionKey, utilsData] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_DATA_CONTENT),
    retrieveEncryptionKey(),
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

    const decryptedNotification = await commonDecrypt(
      encryptedOlmData,
      encryptionKey,
      encryptedPayload,
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

async function decryptDesktopNotification(
  encryptedPayload: string,
  staffCanSee: boolean,
): Promise<{ +[string]: mixed }> {
  const [encryptedOlmData, encryptionKey] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_DATA_CONTENT),
    retrieveEncryptionKey(),
  ]);

  if (!encryptionKey || !encryptedOlmData) {
    return {
      error: 'Received encrypted notification but olm session was not created',
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    await initOlm();
    return await commonDecrypt(
      encryptedOlmData,
      encryptionKey,
      encryptedPayload,
    );
  } catch (e) {
    return {
      error: e.message,
      staffCanSee,
    };
  }
}

async function commonDecrypt<T>(
  encryptedOlmData: EncryptedData,
  encryptionKey: CryptoKey,
  encryptedPayload: string,
): Promise<T> {
  const serializedOlmData = await decryptData(encryptedOlmData, encryptionKey);
  const {
    mainSession,
    picklingKey,
    pendingSessionUpdate,
    updateCreationTimestamp,
  }: NotificationsOlmDataType = JSON.parse(
    new TextDecoder().decode(serializedOlmData),
  );

  let updatedOlmData: NotificationsOlmDataType;
  let decryptedNotification: T;

  const shouldUpdateMainSession =
    Date.now() - updateCreationTimestamp > SESSION_UPDATE_MAX_PENDING_TIME;

  const decryptionWithPendingSessionResult = decryptWithPendingSession(
    pendingSessionUpdate,
    picklingKey,
    encryptedPayload,
  );

  if (decryptionWithPendingSessionResult.decryptedNotification) {
    const {
      decryptedNotification: notifDecryptedWithPendingSession,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
    } = decryptionWithPendingSessionResult;

    decryptedNotification = notifDecryptedWithPendingSession;
    updatedOlmData = {
      mainSession: shouldUpdateMainSession ? pendingSessionUpdate : mainSession,
      pendingSessionUpdate: newPendingSessionUpdate,
      updateCreationTimestamp: newUpdateCreationTimestamp,
      picklingKey,
    };
  } else {
    const {
      newUpdateCreationTimestamp,
      decryptedNotification: notifDecryptedWithMainSession,
    } = decryptWithSession(mainSession, picklingKey, encryptedPayload);

    decryptedNotification = notifDecryptedWithMainSession;
    updatedOlmData = {
      mainSession: mainSession,
      pendingSessionUpdate,
      updateCreationTimestamp: newUpdateCreationTimestamp,
      picklingKey,
    };
  }

  const updatedEncryptedSession = await encryptData(
    new TextEncoder().encode(JSON.stringify(updatedOlmData)),
    encryptionKey,
  );

  await localforage.setItem(
    NOTIFICATIONS_OLM_DATA_CONTENT,
    updatedEncryptedSession,
  );

  return decryptedNotification;
}

function decryptWithSession<T>(
  pickledSession: string,
  picklingKey: string,
  encryptedPayload: string,
): DecryptionResult<T> {
  const session = new olm.Session();

  session.unpickle(picklingKey, pickledSession);
  const decryptedNotification: T = JSON.parse(
    session.decrypt(olmEncryptedMessageTypes.TEXT, encryptedPayload),
  );

  const newPendingSessionUpdate = session.pickle(picklingKey);
  const newUpdateCreationTimestamp = Date.now();

  return {
    decryptedNotification,
    newUpdateCreationTimestamp,
    newPendingSessionUpdate,
  };
}

function decryptWithPendingSession<T>(
  pendingSessionUpdate: string,
  picklingKey: string,
  encryptedPayload: string,
): DecryptionResult<T> | { +error: string } {
  try {
    const {
      decryptedNotification,
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
    } = decryptWithSession(pendingSessionUpdate, picklingKey, encryptedPayload);
    return {
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
      decryptedNotification,
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function retrieveEncryptionKey(): Promise<?CryptoKey> {
  const persistedCryptoKey = await localforage.getItem(
    NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
  );
  if (isDesktopSafari && persistedCryptoKey) {
    // Safari doesn't support structured clone algorithm in service
    // worker context so we have to store CryptoKey as JSON
    return await importJWKKey(persistedCryptoKey);
  }
  return persistedCryptoKey;
}

export { decryptWebNotification, decryptDesktopNotification };
