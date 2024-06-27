// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
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
import { initOlm } from '../olm/olm-utils.js';
import {
  NOTIFICATIONS_OLM_DATA_CONTENT,
  NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
} from '../shared-worker/utils/constants.js';
import { isDesktopSafari } from '../shared-worker/utils/db-utils.js';

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
const INDEXED_DB_KEYSERVER_PREFIX = 'keyserver';
const INDEXED_DB_KEY_SEPARATOR = ':';
const INDEXED_DB_DEVICE_PREFIX = 'device';

// This constant is only used to migrate the existing notifications
// session with production keyserver to new IndexedDB key format. This
// migration will fire when user updates the app. It will also fire
// on dev env provided old keyserver set up is used. Developers willing
// to use new keyserver set up must log out before updating the app.
// Do not introduce new usages of this constant in the code!!!
const ASHOAT_KEYSERVER_ID_USED_ONLY_FOR_MIGRATION_FROM_LEGACY_NOTIF_STORAGE =
  '256';

const INDEXED_DB_UNREAD_COUNT_SUFFIX = 'unreadCount';

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification | WebNotifDecryptionError> {
  const { id, keyserverID, encryptedPayload } = encryptedNotification;
  invariant(keyserverID, 'KeyserverID must be present to decrypt a notif');
  const utilsData = await localforage.getItem<WebNotifsServiceUtilsData>(
    WEB_NOTIFS_SERVICE_UTILS_KEY,
  );

  if (!utilsData) {
    return { id, error: 'Necessary data not found in IndexedDB' };
  }
  const { olmWasmPath, staffCanSee } = (utilsData: WebNotifsServiceUtilsData);

  let olmDBKeys;
  try {
    olmDBKeys = await getNotifsOlmSessionDBKeys(keyserverID);
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

    const { unreadCount } = decryptedNotification;

    invariant(keyserverID, 'Keyserver ID must be set to update badge counts');
    await updateNotifsUnreadCountStorage({
      [keyserverID]: unreadCount,
    });

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
  keyserverID?: string,
): Promise<{ +[string]: mixed }> {
  let encryptedOlmData, encryptionKey, olmDataContentKey;
  try {
    const { olmDataContentKey: olmDataContentKeyValue, encryptionKeyDBKey } =
      await getNotifsOlmSessionDBKeys(keyserverID);

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

  let decryptedNotification;
  try {
    decryptedNotification = await commonDecrypt<{ +[string]: mixed }>(
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

  if (!keyserverID) {
    return decryptedNotification;
  }

  // iOS notifications require that unread count is set under
  // `badge` key. Since MacOS notifications are created by the
  // same function the unread count is also set under `badge` key
  const { badge } = decryptedNotification;
  if (typeof badge === 'number') {
    await updateNotifsUnreadCountStorage({ [(keyserverID: string)]: badge });
    return decryptedNotification;
  }

  const { unreadCount } = decryptedNotification;
  if (typeof unreadCount === 'number') {
    await updateNotifsUnreadCountStorage({
      [(keyserverID: string)]: unreadCount,
    });
  }
  return decryptedNotification;
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

async function getNotifsOlmSessionDBKeys(keyserverID?: string): Promise<{
  +olmDataContentKey: string,
  +encryptionKeyDBKey: string,
}> {
  const olmDataContentKeyForKeyserverPrefix = getOlmDataContentKeyForCookie(
    undefined,
    keyserverID,
  );

  const olmEncryptionKeyDBLabelForKeyserverPrefix =
    getOlmEncryptionKeyDBLabelForCookie(undefined, keyserverID);

  const dbKeys = await localforage.keys();
  const olmDataContentKeys = sortOlmDBKeysArray(
    dbKeys.filter(key => key.startsWith(olmDataContentKeyForKeyserverPrefix)),
  );
  const encryptionKeyDBLabels = sortOlmDBKeysArray(
    dbKeys.filter(key =>
      key.startsWith(olmEncryptionKeyDBLabelForKeyserverPrefix),
    ),
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

function getOlmDataContentKeyForCookie(
  cookie: ?string,
  keyserverID?: string,
): string {
  let olmDataContentKeyBase;
  if (keyserverID) {
    olmDataContentKeyBase = [
      INDEXED_DB_KEYSERVER_PREFIX,
      keyserverID,
      NOTIFICATIONS_OLM_DATA_CONTENT,
    ].join(INDEXED_DB_KEY_SEPARATOR);
  } else {
    olmDataContentKeyBase = NOTIFICATIONS_OLM_DATA_CONTENT;
  }

  if (!cookie) {
    return olmDataContentKeyBase;
  }
  const cookieID = getCookieIDFromCookie(cookie);
  return [olmDataContentKeyBase, cookieID].join(INDEXED_DB_KEY_SEPARATOR);
}

function getOlmDataContentKeyForDeviceID(deviceID: string): string {
  return [
    INDEXED_DB_DEVICE_PREFIX,
    deviceID,
    NOTIFICATIONS_OLM_DATA_CONTENT,
  ].join(INDEXED_DB_KEY_SEPARATOR);
}

function getOlmEncryptionKeyDBLabelForCookie(
  cookie: ?string,
  keyserverID?: string,
): string {
  let olmEncryptionKeyDBLabelBase;
  if (keyserverID) {
    olmEncryptionKeyDBLabelBase = [
      INDEXED_DB_KEYSERVER_PREFIX,
      keyserverID,
      NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
    ].join(INDEXED_DB_KEY_SEPARATOR);
  } else {
    olmEncryptionKeyDBLabelBase = NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY;
  }

  if (!cookie) {
    return olmEncryptionKeyDBLabelBase;
  }
  const cookieID = getCookieIDFromCookie(cookie);
  return [olmEncryptionKeyDBLabelBase, cookieID].join(INDEXED_DB_KEY_SEPARATOR);
}

function getOlmEncryptionKeyDBLabelForDeviceID(deviceID: string): string {
  return [
    INDEXED_DB_DEVICE_PREFIX,
    deviceID,
    NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
  ].join(INDEXED_DB_KEY_SEPARATOR);
}

function getCookieIDFromOlmDBKey(olmDBKey: string): string | '0' {
  // Olm DB keys comply to one of the following formats:
  // KEYSERVER:<id>:(OLM_CONTENT | OLM_ENCRYPTION_KEY):<cookie id>
  // or legacy (OLM_CONTENT | OLM_ENCRYPTION_KEY):<cookie id>.
  // Legacy format may be used in case a new version of the web app
  // is running on a old desktop version that uses legacy key format.
  const cookieID = olmDBKey.split(INDEXED_DB_KEY_SEPARATOR).slice(-1)[0];
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

async function migrateLegacyOlmNotificationsSessions() {
  const keyValuePairsToInsert: { [key: string]: EncryptedData | CryptoKey } =
    {};
  const keysToDelete = [];

  await localforage.iterate((value: EncryptedData | CryptoKey, key) => {
    let keyToInsert;
    if (key.startsWith(NOTIFICATIONS_OLM_DATA_CONTENT)) {
      const cookieID = getCookieIDFromOlmDBKey(key);
      keyToInsert = getOlmDataContentKeyForCookie(
        cookieID,
        ASHOAT_KEYSERVER_ID_USED_ONLY_FOR_MIGRATION_FROM_LEGACY_NOTIF_STORAGE,
      );
    } else if (key.startsWith(NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY)) {
      const cookieID = getCookieIDFromOlmDBKey(key);
      keyToInsert = getOlmEncryptionKeyDBLabelForCookie(
        cookieID,
        ASHOAT_KEYSERVER_ID_USED_ONLY_FOR_MIGRATION_FROM_LEGACY_NOTIF_STORAGE,
      );
    } else {
      return undefined;
    }

    keyValuePairsToInsert[keyToInsert] = value;
    keysToDelete.push(key);
    return undefined;
  });

  const insertionPromises = Object.entries(keyValuePairsToInsert).map(
    ([key, value]) =>
      (async () => {
        await localforage.setItem(key, value);
      })(),
  );

  const deletionPromises = keysToDelete.map(key =>
    (async () => await localforage.removeItem(key))(),
  );

  await Promise.all([...insertionPromises, ...deletionPromises]);
}

// Multiple keyserver unread count utilities
function getKeyserverUnreadCountKey(keyserverID: string) {
  return [
    INDEXED_DB_KEYSERVER_PREFIX,
    keyserverID,
    INDEXED_DB_UNREAD_COUNT_SUFFIX,
  ].join(INDEXED_DB_KEY_SEPARATOR);
}

async function updateNotifsUnreadCountStorage(perKeyserverUnreadCount: {
  +[keyserverID: string]: number,
}) {
  const unreadCountUpdatePromises: Array<Promise<number>> = Object.entries(
    perKeyserverUnreadCount,
  ).map(([keyserverID, unreadCount]) => {
    const keyserverUnreadCountKey = getKeyserverUnreadCountKey(keyserverID);
    return localforage.setItem<number>(keyserverUnreadCountKey, unreadCount);
  });

  await Promise.all(unreadCountUpdatePromises);
}

async function queryNotifsUnreadCountStorage(
  keyserverIDs: $ReadOnlyArray<string>,
): Promise<{
  +[keyserverID: string]: ?number,
}> {
  const queryUnreadCountPromises: Array<Promise<[string, ?number]>> =
    keyserverIDs.map(async keyserverID => {
      const keyserverUnreadCountKey = getKeyserverUnreadCountKey(keyserverID);
      const unreadCount = await localforage.getItem<number>(
        keyserverUnreadCountKey,
      );
      return [keyserverID, unreadCount];
    });

  const queriedUnreadCounts: $ReadOnlyArray<[string, ?number]> =
    await Promise.all(queryUnreadCountPromises);
  return Object.fromEntries(queriedUnreadCounts);
}

export {
  decryptWebNotification,
  decryptDesktopNotification,
  getOlmDataContentKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
  getOlmDataContentKeyForDeviceID,
  getOlmEncryptionKeyDBLabelForDeviceID,
  migrateLegacyOlmNotificationsSessions,
  updateNotifsUnreadCountStorage,
  queryNotifsUnreadCountStorage,
};
