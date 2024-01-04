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
import { getCookieIDFromCookie } from 'lib/utils/cookie-utils.js';

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
  const utilsData = await localforage.getItem<WebNotifsServiceUtilsData>(
    WEB_NOTIFS_SERVICE_UTILS_KEY,
  );

  if (!utilsData) {
    return { id, error: 'Necessary data not found in IndexedDB' };
  }
  const { olmWasmPath, staffCanSee } = (utilsData: WebNotifsServiceUtilsData);

  let olmDBKeys;
  try {
    olmDBKeys = await getNotifsOlmSessionDBKeys();
  } catch (e) {
    return {
      id,
      error: e.message,
      displayErrorMessage: staffCanSee,
    };
  }
  const { olmDataContentKey, encryptionKeyDBKey } = olmDBKeys;
  const [encryptedOlmData, encryptionKey] = await Promise.all([
    localforage.getItem<EncryptedData>(olmDataContentKey),
    retrieveEncryptionKey(encryptionKeyDBKey),
  ]);

  if (!encryptionKey || !encryptedOlmData) {
    return {
      id,
      error: 'Received encrypted notification but olm session was not created',
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    await olm.init({ locateFile: () => olmWasmPath });

    const decryptedNotification = await commonDecrypt<PlainTextWebNotification>(
      encryptedOlmData,
      olmDataContentKey,
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
  let encryptedOlmData, encryptionKey, olmDataContentKey;
  try {
    const { olmDataContentKey: olmDataContentKeyValue, encryptionKeyDBKey } =
      await getNotifsOlmSessionDBKeys();

    olmDataContentKey = olmDataContentKeyValue;

    [encryptedOlmData, encryptionKey] = await Promise.all([
      localforage.getItem<EncryptedData>(olmDataContentKey),
      retrieveEncryptionKey(encryptionKeyDBKey),
      initOlm(),
    ]);
  } catch (e) {
    return {
      error: e.message,
      displayErrorMessage: staffCanSee,
    };
  }

  if (!encryptionKey || !encryptedOlmData) {
    return {
      error: 'Received encrypted notification but olm session was not created',
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    return await commonDecrypt(
      encryptedOlmData,
      olmDataContentKey,
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
  olmDataContentKey: string,
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

  const decryptionWithPendingSessionResult = decryptWithPendingSession<T>(
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
    } = decryptWithSession<T>(mainSession, picklingKey, encryptedPayload);

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

  await localforage.setItem(olmDataContentKey, updatedEncryptedSession);

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
    } = decryptWithSession<T>(
      pendingSessionUpdate,
      picklingKey,
      encryptedPayload,
    );
    return {
      newPendingSessionUpdate,
      newUpdateCreationTimestamp,
      decryptedNotification,
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function retrieveEncryptionKey(
  encryptionKeyDBLabel: string,
): Promise<?CryptoKey> {
  if (!isDesktopSafari) {
    return await localforage.getItem<CryptoKey>(encryptionKeyDBLabel);
  }
  // Safari doesn't support structured clone algorithm in service
  // worker context so we have to store CryptoKey as JSON
  const persistedCryptoKey =
    await localforage.getItem<SubtleCrypto$JsonWebKey>(encryptionKeyDBLabel);
  if (!persistedCryptoKey) {
    return null;
  }
  return await importJWKKey(persistedCryptoKey);
}

async function getNotifsOlmSessionDBKeys(): Promise<{
  +olmDataContentKey: string,
  +encryptionKeyDBKey: string,
}> {
  const dbKeys = await localforage.keys();
  const olmDataContentKeys = sortOlmDBKeysArray(
    dbKeys.filter(key => key.startsWith(NOTIFICATIONS_OLM_DATA_CONTENT)),
  );
  const encryptionKeyDBLabels = sortOlmDBKeysArray(
    dbKeys.filter(key => key.startsWith(NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY)),
  );

  if (olmDataContentKeys.length === 0 || encryptionKeyDBLabels.length === 0) {
    throw new Error(
      'Received encrypted notification but olm session was not created',
    );
  }

  const latestDataContentKey =
    olmDataContentKeys[olmDataContentKeys.length - 1];
  const latestEncryptionKeyDBKey =
    encryptionKeyDBLabels[encryptionKeyDBLabels.length - 1];

  const latestDataContentCookieID =
    getCookieIDFromOlmDBKey(latestDataContentKey);
  const latestEncryptionKeyCookieID = getCookieIDFromOlmDBKey(
    latestEncryptionKeyDBKey,
  );

  if (latestDataContentCookieID !== latestEncryptionKeyCookieID) {
    throw new Error(
      'Olm sessions and their encryption keys out of sync. Latest cookie ' +
        `id for olm sessions ${latestDataContentCookieID}. Latest cookie ` +
        `id for olm session encryption keys ${latestEncryptionKeyCookieID}`,
    );
  }

  const olmDBKeys = {
    olmDataContentKey: latestDataContentKey,
    encryptionKeyDBKey: latestEncryptionKeyDBKey,
  };

  const keysToDelete: $ReadOnlyArray<string> = [
    ...olmDataContentKeys.slice(0, olmDataContentKeys.length - 1),
    ...encryptionKeyDBLabels.slice(0, encryptionKeyDBLabels.length - 1),
  ];

  await Promise.all(keysToDelete.map(key => localforage.removeItem(key)));
  return olmDBKeys;
}

function getOlmDataContentKeyForCookie(cookie: ?string): string {
  if (!cookie) {
    return NOTIFICATIONS_OLM_DATA_CONTENT;
  }
  const cookieID = getCookieIDFromCookie(cookie);
  return `${NOTIFICATIONS_OLM_DATA_CONTENT}:${cookieID}`;
}

function getOlmEncryptionKeyDBLabelForCookie(cookie: ?string): string {
  if (!cookie) {
    return NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY;
  }
  const cookieID = getCookieIDFromCookie(cookie);
  return `${NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY}:${cookieID}`;
}

function getCookieIDFromOlmDBKey(olmDBKey: string): string | '0' {
  const cookieID = olmDBKey.split(':')[1];
  return cookieID ?? '0';
}

function sortOlmDBKeysArray(
  olmDBKeysArray: $ReadOnlyArray<string>,
): $ReadOnlyArray<string> {
  return olmDBKeysArray
    .map(key => ({
      cookieID: Number(getCookieIDFromOlmDBKey(key)),
      key,
    }))
    .sort(
      ({ cookieID: cookieID1 }, { cookieID: cookieID2 }) =>
        cookieID1 - cookieID2,
    )
    .map(({ key }) => key);
}

export {
  decryptWebNotification,
  decryptDesktopNotification,
  getOlmDataContentKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
};
