// @flow

import olm from '@commapp/olm';
import localforage from 'localforage';

import {
  type PickledOLMSession,
  olmEncryptedMessageTypes,
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
  NOTIFICATIONS_OLM_SESSION_CONTENT,
  NOTIFICATIONS_OLM_SESSION_ENCRYPTION_KEY,
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

export const WEB_NOTIFS_SERVICE_UTILS_KEY = 'webNotifsServiceUtils';

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification | WebNotifDecryptionError> {
  const { id, encryptedPayload } = encryptedNotification;

  const retrieveEncryptionKeyPromise: Promise<?CryptoKey> = (async () => {
    const persistedCryptoKey = await localforage.getItem(
      NOTIFICATIONS_OLM_SESSION_ENCRYPTION_KEY,
    );
    if (isDesktopSafari && persistedCryptoKey) {
      // Safari doesn't support structured clone algorithm in service
      // worker context so we have to store CryptoKey as JSON
      return await importJWKKey(persistedCryptoKey);
    }
    return persistedCryptoKey;
  })();

  const [encryptedOlmSession, encryptionKey, utilsData] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_SESSION_CONTENT),
    retrieveEncryptionKeyPromise,
    localforage.getItem(WEB_NOTIFS_SERVICE_UTILS_KEY),
  ]);

  if (!utilsData) {
    return { id, error: 'Necessary data not found in IndexedDB' };
  }

  const { olmWasmPath, staffCanSee } = (utilsData: WebNotifsServiceUtilsData);
  if (!encryptionKey || !encryptedOlmSession) {
    return {
      id,
      error: 'Received encrypted notification but olm session was not created',
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    await olm.init({ locateFile: () => olmWasmPath });

    const serializedSession = await decryptData(
      encryptedOlmSession,
      encryptionKey,
    );
    const { picklingKey, pickledSession }: PickledOLMSession = JSON.parse(
      new TextDecoder().decode(serializedSession),
    );

    const session = new olm.Session();
    session.unpickle(picklingKey, pickledSession);

    const decryptedNotification: PlainTextWebNotificationPayload = JSON.parse(
      session.decrypt(olmEncryptedMessageTypes.TEXT, encryptedPayload),
    );

    const updatedPickledSession = {
      picklingKey,
      pickledSession: session.pickle(picklingKey),
    };
    const updatedEncryptedSession = await encryptData(
      new TextEncoder().encode(JSON.stringify(updatedPickledSession)),
      encryptionKey,
    );

    await localforage.setItem(
      NOTIFICATIONS_OLM_SESSION_CONTENT,
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

export { decryptWebNotification };
