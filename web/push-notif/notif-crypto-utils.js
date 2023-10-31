// @flow

import olm from '@commapp/olm';
import localforage from 'localforage';

import type { PickledOLMSession } from 'lib/types/crypto-types.js';
import type {
  PlainTextWebNotification,
  EncryptedWebNotification,
} from 'lib/types/notif-types.js';

import { decryptData, encryptData } from '../crypto/aes-gcm-crypto-utils.js';
import {
  NOTIFICATIONS_OLM_SESSION_CONTENT,
  NOTIFICATIONS_OLM_SESSION_ENCRYPTION_KEY,
} from '../database/utils/constants.js';

type PlainTextWebNotificationPayload = $Diff<
  PlainTextWebNotification,
  { +id: string },
>;

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

  const [encryptedOlmSession, encryptionKey, utilsData] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_SESSION_CONTENT),
    localforage.getItem(NOTIFICATIONS_OLM_SESSION_ENCRYPTION_KEY),
    localforage.getItem(WEB_NOTIFS_SERVICE_UTILS_KEY),
  ]);

  if (!utilsData) {
    return { id, error: 'Necessary data not received from the main app' };
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
      session.decrypt(1, encryptedPayload),
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
      error: e,
      displayErrorMessage: staffCanSee,
    };
  }
}

export { decryptWebNotification };
