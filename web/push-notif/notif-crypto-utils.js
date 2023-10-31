// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
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

export const OLM_WASM_PATH_KEY = 'olmWasmPath';

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification> {
  const { id, encryptedPayload } = encryptedNotification;

  const olmInitPromise = (async () => {
    const olmWasmFilePath = await localforage.getItem(OLM_WASM_PATH_KEY);
    await olm.init({ locateFile: () => olmWasmFilePath });
  })();
  const [encryptedOlmSession, encryptionKey] = await Promise.all([
    localforage.getItem(NOTIFICATIONS_OLM_SESSION_CONTENT),
    localforage.getItem(NOTIFICATIONS_OLM_SESSION_ENCRYPTION_KEY),
    olmInitPromise,
  ]);

  // This is indeed an error since it means that the keyserver
  // has established notification session, but the client hasn't
  invariant(
    encryptionKey && encryptedOlmSession,
    'Received encrypted notification but olm session was not created',
  );

  const serializedSession = await decryptData(
    encryptedOlmSession,
    encryptionKey,
  );
  const { picklingKey, pickledSession }: PickledOLMSession = JSON.parse(
    new TextDecoder().decode(serializedSession),
  );

  const session = new olm.Session();
  session.unpickle(picklingKey, pickledSession);

  const decryptedSerializedNotification = session.decrypt(1, encryptedPayload);
  const decryptedNotification: PlainTextWebNotificationPayload = JSON.parse(
    decryptedSerializedNotification,
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
}

export { decryptWebNotification };
