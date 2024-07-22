// @flow

import olm from '@commapp/olm';
import type { EncryptResult } from '@commapp/olm';
import invariant from 'invariant';
import localforage from 'localforage';
import uuid from 'uuid';

import {
  olmEncryptedMessageTypes,
  type NotificationsOlmDataType,
  type PickledOLMAccount,
} from 'lib/types/crypto-types.js';
import type {
  PlainTextWebNotification,
  EncryptedWebNotification,
  SenderDeviceDescriptor,
} from 'lib/types/notif-types.js';
import { getCookieIDFromCookie } from 'lib/utils/cookie-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';

import {
  fetchAuthMetadata,
  getNotifsInboundKeysForDeviceID,
} from './services-client.js';
import {
  type EncryptedData,
  decryptData,
  encryptData,
  importJWKKey,
  exportKeyToJWK,
  generateCryptoKey,
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

export type NotificationAccountWithPicklingKey = {
  +notificationAccount: olm.Account,
  +picklingKey: string,
  +synchronizationValue: ?string,
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
const INDEXED_DB_NOTIFS_SYNC_KEY = 'notifsSyncKey';

// This constant is only used to migrate the existing notifications
// session with production keyserver to new IndexedDB key format. This
// migration will fire when user updates the app. It will also fire
// on dev env provided old keyserver set up is used. Developers willing
// to use new keyserver set up must log out before updating the app.
// Do not introduce new usages of this constant in the code!!!
const ASHOAT_KEYSERVER_ID_USED_ONLY_FOR_MIGRATION_FROM_LEGACY_NOTIF_STORAGE =
  '256';

const INDEXED_DB_UNREAD_COUNT_SUFFIX = 'unreadCount';
const INDEXED_DB_NOTIFS_ACCOUNT_KEY = 'notificationAccount';
const INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL =
  'notificationAccountEncryptionKey';

async function deserializeEncryptedData<T>(
  encryptedData: ?EncryptedData,
  encryptionKey: ?CryptoKey,
): Promise<?T> {
  if (!encryptedData || !encryptionKey) {
    return undefined;
  }
  const serializedData = await decryptData(encryptedData, encryptionKey);
  const data: T = JSON.parse(new TextDecoder().decode(serializedData));
  return data;
}

async function serializeUnencryptedData<T>(
  data: T,
  encryptionKey: CryptoKey,
): Promise<EncryptedData> {
  const dataAsString = JSON.stringify(data);
  invariant(
    dataAsString,
    'Attempt to serialize null or undefined is forbidden',
  );
  return await encryptData(
    new TextEncoder().encode(dataAsString),
    encryptionKey,
  );
}

async function validateCryptoKey(
  cryptoKey: ?CryptoKey | ?SubtleCrypto$JsonWebKey,
): Promise<?CryptoKey> {
  if (!cryptoKey) {
    return cryptoKey;
  }

  if (!isDesktopSafari) {
    return ((cryptoKey: any): CryptoKey);
  }
  return await importJWKKey(((cryptoKey: any): SubtleCrypto$JsonWebKey));
}

async function getCryptoKeyPersistentForm(
  cryptoKey: CryptoKey,
): Promise<CryptoKey | SubtleCrypto$JsonWebKey> {
  if (!isDesktopSafari) {
    return cryptoKey;
  }

  // Safari doesn't support structured clone algorithm in service
  // worker context so we have to store CryptoKey as JSON
  return await exportKeyToJWK(cryptoKey);
}

async function getOlmDataForKeyserverSession(keyserverID?: string): Promise<{
  +encryptionKey: ?CryptoKey,
  +encryptedOlmData: ?EncryptedData,
  +olmDataKey: string,
  +encryptionKeyDBLabel: string,
}> {
  const olmDBKeys = await getNotifsOlmSessionDBKeys(keyserverID);
  const { olmDataKey, encryptionKeyDBKey } = olmDBKeys;
  const [encryptedOlmData, encryptionKey] = await Promise.all([
    localforage.getItem<EncryptedData>(olmDataKey),
    retrieveEncryptionKey(encryptionKeyDBKey),
  ]);
  return {
    encryptedOlmData,
    encryptionKey,
    olmDataKey,
    encryptionKeyDBLabel: encryptionKeyDBKey,
  };
}

async function getOlmDataForSessionWithDevice(senderDeviceID: string): Promise<{
  +encryptedOlmData: ?EncryptedData,
  +encryptionKey: ?CryptoKey,
  +olmDataKey: string,
  +encryptionKeyDBLabel: string,
  +encryptedOlmAccount: ?EncryptedData,
  +accountEncryptionKey: ?CryptoKey,
  +synchronizationValue: ?string,
}> {
  const olmDataKey = getOlmDataKeyForDeviceID(senderDeviceID);
  const olmDataEncryptionKeyDBLabel =
    getOlmEncryptionKeyDBLabelForDeviceID(senderDeviceID);

  const queryResult = await localforage.getMultipleItems<{
    notificationAccount: ?EncryptedData,
    notificationAccountEncryptionKey: ?CryptoKey,
    synchronizationValue: ?number,
    [string]: ?CryptoKey | ?EncryptedData,
  }>(
    [
      INDEXED_DB_NOTIFS_ACCOUNT_KEY,
      INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL,
      olmDataEncryptionKeyDBLabel,
      olmDataKey,
    ],
    INDEXED_DB_NOTIFS_SYNC_KEY,
  );

  const {
    notificationAccount,
    notificationAccountEncryptionKey,
    synchronizationValue,
  } = queryResult;

  if (!notificationAccount || !notificationAccountEncryptionKey) {
    throw new Error(
      'Attempt to decrypt notification but olm account not initialized.',
    );
  }

  const olmData = queryResult[olmDataKey];
  const olmDataEncryptionKey = queryResult[olmDataEncryptionKeyDBLabel];

  // type refinement
  if (
    (olmData && !olmData.ciphertext) ||
    (olmDataEncryptionKey && !olmDataEncryptionKey.algorithm)
  ) {
    throw new Error(
      'IndexedDB returned invalid data types for olm data and olm data encryption key',
    );
  }

  const [encryptionKey, accountEncryptionKey] = await Promise.all([
    validateCryptoKey(olmDataEncryptionKey),
    validateCryptoKey(notificationAccountEncryptionKey),
  ]);

  return {
    encryptedOlmData: olmData,
    encryptionKey,
    encryptionKeyDBLabel: olmDataEncryptionKeyDBLabel,
    encryptedOlmAccount: notificationAccount,
    olmDataKey,
    accountEncryptionKey,
    synchronizationValue,
  };
}

async function persistKeyserverOlmData(
  olmDataKey: string,
  encryptionKey: CryptoKey,
  olmData: NotificationsOlmDataType,
): Promise<void> {
  const updatedEncryptedSession =
    await serializeUnencryptedData<NotificationsOlmDataType>(
      olmData,
      encryptionKey,
    );

  await localforage.setItem(olmDataKey, updatedEncryptedSession);
}

async function persistPeerOlmData(input: {
  olmDataKey: string,
  olmEncryptionKeyDBLabel: string,
  encryptionKey: ?CryptoKey,
  olmData: ?NotificationsOlmDataType,
  accountEncryptionKey: ?CryptoKey,
  accountWithPicklingKey?: PickledOLMAccount,
  synchronizationValue: ?string,
}): Promise<void> {
  const {
    olmData,
    olmDataKey,
    accountEncryptionKey,
    accountWithPicklingKey,
    encryptionKey,
    synchronizationValue,
    olmEncryptionKeyDBLabel,
  } = input;

  const shouldPersistOlmData = olmData && encryptionKey;
  const shouldPersistAccount = accountWithPicklingKey && accountEncryptionKey;

  if (!shouldPersistOlmData && !shouldPersistAccount) {
    return;
  }

  const serializationPromises: {
    [string]: Promise<EncryptedData | CryptoKey | SubtleCrypto$JsonWebKey>,
  } = {};

  if (!olmData && !accountWithPicklingKey) {
    return;
  }

  if (olmData && encryptionKey) {
    serializationPromises[olmDataKey] =
      serializeUnencryptedData<NotificationsOlmDataType>(
        olmData,
        encryptionKey,
      );
  } else if (olmData) {
    const newEncryptionKey = await generateCryptoKey({
      extractable: isDesktopSafari,
    });

    serializationPromises[olmDataKey] =
      serializeUnencryptedData<NotificationsOlmDataType>(
        olmData,
        newEncryptionKey,
      );

    serializationPromises[olmEncryptionKeyDBLabel] =
      getCryptoKeyPersistentForm(newEncryptionKey);
  }

  if (accountWithPicklingKey && accountEncryptionKey) {
    serializationPromises[INDEXED_DB_NOTIFS_ACCOUNT_KEY] =
      serializeUnencryptedData<PickledOLMAccount>(
        accountWithPicklingKey,
        accountEncryptionKey,
      );
  }

  const setMultipleItemsInput = await promiseAll(serializationPromises);
  const newSynchronizationValue = uuid.v4();
  try {
    await localforage.setMultipleItems(
      setMultipleItemsInput,
      INDEXED_DB_NOTIFS_SYNC_KEY,
      synchronizationValue,
      newSynchronizationValue,
      false,
    );
  } catch (e) {
    // likely worker crypt persisted its own data
    console.log(e);
  }
}

async function decryptWebNotification(
  encryptedNotification: EncryptedWebNotification,
): Promise<PlainTextWebNotification | WebNotifDecryptionError> {
  const {
    id,
    keyserverID,
    senderDeviceID,
    encryptedPayload,
    type: messageType,
  } = encryptedNotification;

  const utilsData = await localforage.getItem<WebNotifsServiceUtilsData>(
    WEB_NOTIFS_SERVICE_UTILS_KEY,
  );

  if (!utilsData) {
    return { id, error: 'Necessary data not found in IndexedDB' };
  }
  const { olmWasmPath, staffCanSee } = (utilsData: WebNotifsServiceUtilsData);

  let encryptionKey;
  let olmEncryptionKeyDBLabel;
  let encryptedOlmData;
  let olmDataKey;
  let accountEncryptionKey;
  let encryptedOlmAccount;
  let synchronizationValue;

  let getOlmDataPromise;
  if (keyserverID) {
    getOlmDataPromise = getOlmDataForKeyserverSession(keyserverID);
  } else if (senderDeviceID) {
    getOlmDataPromise = getOlmDataForSessionWithDevice(senderDeviceID);
  } else {
    // we will never reach this branch
    throw new Error(
      'keyserverID or SenderDeviceID must be present to decrypt a notif',
    );
  }

  try {
    const {
      encryptionKey: fetchedEncryptionKey,
      encryptedOlmData: fetchedEncryptedOlmData,
      olmDataKey: fetchedOlmDataKey,
      encryptionKeyDBLabel: fetchedOlmEncryptionKeyDBLabel,
      accountEncryptionKey: fetchedAccountEncryptionKey,
      encryptedOlmAccount: fetchedEncryptedOlmAccount,
      synchronizationValue: fetchedSynchronizationValue,
    } = await getOlmDataPromise;
    encryptionKey = fetchedEncryptionKey;
    encryptedOlmData = fetchedEncryptedOlmData;
    olmDataKey = fetchedOlmDataKey;
    accountEncryptionKey = fetchedAccountEncryptionKey;
    encryptedOlmAccount = fetchedEncryptedOlmAccount;
    synchronizationValue = fetchedSynchronizationValue;
    olmEncryptionKeyDBLabel = fetchedOlmEncryptionKeyDBLabel;
  } catch (e) {
    return {
      id,
      error: e.message,
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    const [notificationsOlmData, accountWithPicklingKey] = await Promise.all([
      deserializeEncryptedData<NotificationsOlmDataType>(
        encryptedOlmData,
        encryptionKey,
      ),
      deserializeEncryptedData<PickledOLMAccount>(
        encryptedOlmAccount,
        accountEncryptionKey,
      ),
      olm.init({ locateFile: () => olmWasmPath }),
    ]);

    let decryptedNotification;
    let updatedOlmData;
    let updatedNotifsAccount;

    if (keyserverID) {
      invariant(
        notificationsOlmData && encryptionKey,
        'Received encrypted notification but keyserver olm session was not created',
      );

      const {
        decryptedNotification: resultDecryptedNotification,
        updatedOlmData: resultUpdatedOlmData,
      } = await commonDecrypt<PlainTextWebNotification>(
        notificationsOlmData,
        encryptedPayload,
      );

      decryptedNotification = resultDecryptedNotification;
      updatedOlmData = resultUpdatedOlmData;
      const { unreadCount } = decryptedNotification;

      invariant(keyserverID, 'Keyserver ID must be set to update badge counts');
      await Promise.all([
        persistKeyserverOlmData(olmDataKey, encryptionKey, updatedOlmData),
        updateNotifsUnreadCountStorage({
          [keyserverID]: unreadCount,
        }),
      ]);

      return { id, ...decryptedNotification };
    } else if (senderDeviceID) {
      invariant(
        accountWithPicklingKey,
        'Received encrypted notification but notifs olm account not created',
      );

      const {
        decryptedNotification: resultDecryptedNotification,
        updatedOlmData: resultUpdatedOlmData,
        updatedNotifsAccount: resultUpdatedNotifsAccount,
      } = await commonPeerDecrypt<PlainTextWebNotification>(
        senderDeviceID,
        notificationsOlmData,
        accountWithPicklingKey,
        messageType,
        encryptedPayload,
      );

      decryptedNotification = resultDecryptedNotification;
      updatedOlmData = resultUpdatedOlmData;
      updatedNotifsAccount = resultUpdatedNotifsAccount;

      await persistPeerOlmData({
        accountWithPicklingKey: updatedNotifsAccount,
        accountEncryptionKey,
        encryptionKey,
        olmData: updatedOlmData,
        olmDataKey,
        olmEncryptionKeyDBLabel,
        synchronizationValue,
      });

      return { id, ...decryptedNotification };
    } else {
      // we will never reach this branch
      throw new Error(
        'keyserverID or SenderDeviceID must be present to decrypt a notif',
      );
    }
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
  messageType: string,
  staffCanSee: boolean,
  senderDeviceDescriptor: SenderDeviceDescriptor,
): Promise<{ +[string]: mixed }> {
  const { keyserverID, senderDeviceID } = senderDeviceDescriptor;

  let encryptionKey;
  let olmEncryptionKeyDBLabel;
  let encryptedOlmData;
  let olmDataKey;
  let accountEncryptionKey;
  let encryptedOlmAccount;
  let synchronizationValue;

  let getOlmDataPromise;
  if (keyserverID) {
    getOlmDataPromise = getOlmDataForKeyserverSession(keyserverID);
  } else if (senderDeviceID) {
    getOlmDataPromise = getOlmDataForSessionWithDevice(senderDeviceID);
  } else {
    // we will never reach this branch
    throw new Error(
      'keyserverID or SenderDeviceID must be present to decrypt a notif',
    );
  }

  try {
    const {
      encryptionKey: fetchedEncryptionKey,
      encryptedOlmData: fetchedEncryptedOlmData,
      olmDataKey: fetchedOlmDataKey,
      encryptionKeyDBLabel: fetchedOlmEncryptionKeyDBLabel,
      accountEncryptionKey: fetchedAccountEncryptionKey,
      encryptedOlmAccount: fetchedEncryptedOlmAccount,
      synchronizationValue: fetchedSynchronizationValue,
    } = await getOlmDataPromise;
    await initOlm();

    encryptionKey = fetchedEncryptionKey;
    encryptedOlmData = fetchedEncryptedOlmData;
    olmDataKey = fetchedOlmDataKey;
    accountEncryptionKey = fetchedAccountEncryptionKey;
    encryptedOlmAccount = fetchedEncryptedOlmAccount;
    synchronizationValue = fetchedSynchronizationValue;
    olmEncryptionKeyDBLabel = fetchedOlmEncryptionKeyDBLabel;
  } catch (e) {
    return {
      error: e.message,
      displayErrorMessage: staffCanSee,
    };
  }

  try {
    const [notificationsOlmData, accountWithPicklingKey] = await Promise.all([
      deserializeEncryptedData<NotificationsOlmDataType>(
        encryptedOlmData,
        encryptionKey,
      ),
      deserializeEncryptedData<PickledOLMAccount>(
        encryptedOlmAccount,
        accountEncryptionKey,
      ),
    ]);

    invariant(
      accountWithPicklingKey,
      'Received encrypted notification but notifs olm account not created',
    );

    if (keyserverID) {
      invariant(
        notificationsOlmData && encryptionKey,
        'Received encrypted notification but keyserver olm session was not created',
      );

      const { decryptedNotification, updatedOlmData } = await commonDecrypt<{
        +[string]: mixed,
      }>(notificationsOlmData, encryptedPayload);

      const updatedOlmDataPersistencePromise = persistKeyserverOlmData(
        olmDataKey,
        encryptionKey,
        updatedOlmData,
      );
      // iOS notifications require that unread count is set under
      // `badge` key. Since MacOS notifications are created by the
      // same function the unread count is also set under `badge` key
      const { badge } = decryptedNotification;
      if (typeof badge === 'number') {
        await Promise.all([
          updateNotifsUnreadCountStorage({ [(keyserverID: string)]: badge }),
          updatedOlmDataPersistencePromise,
        ]);
        return decryptedNotification;
      }

      const { unreadCount } = decryptedNotification;
      if (typeof unreadCount === 'number') {
        await Promise.all([
          updateNotifsUnreadCountStorage({
            [(keyserverID: string)]: unreadCount,
          }),
          updatedOlmDataPersistencePromise,
        ]);
      }

      return decryptedNotification;
    } else if (senderDeviceID) {
      const { decryptedNotification, updatedOlmData, updatedNotifsAccount } =
        await commonPeerDecrypt<{
          +[string]: mixed,
        }>(
          senderDeviceID,
          notificationsOlmData,
          accountWithPicklingKey,
          messageType,
          encryptedPayload,
        );

      await persistPeerOlmData({
        accountWithPicklingKey: updatedNotifsAccount,
        accountEncryptionKey,
        encryptionKey,
        olmData: updatedOlmData,
        olmDataKey,
        olmEncryptionKeyDBLabel,
        synchronizationValue,
      });

      return decryptedNotification;
    } else {
      // we will never reach this branch
      throw new Error(
        'keyserverID or SenderDeviceID must be present to decrypt a notif',
      );
    }
  } catch (e) {
    return {
      error: e.message,
      staffCanSee,
    };
  }
}

async function commonDecrypt<T>(
  notificationsOlmData: NotificationsOlmDataType,
  encryptedPayload: string,
): Promise<{
  +decryptedNotification: T,
  +updatedOlmData: NotificationsOlmDataType,
}> {
  const {
    mainSession,
    picklingKey,
    pendingSessionUpdate,
    updateCreationTimestamp,
  } = notificationsOlmData;

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

  return { decryptedNotification, updatedOlmData };
}

async function commonPeerDecrypt<T>(
  senderDeviceID: string,
  notificationsOlmData: ?NotificationsOlmDataType,
  notificationAccount: PickledOLMAccount,
  messageType: string,
  encryptedPayload: string,
): Promise<{
  +decryptedNotification: T,
  +updatedOlmData?: NotificationsOlmDataType,
  +updatedNotifsAccount?: PickledOLMAccount,
}> {
  if (
    messageType !== olmEncryptedMessageTypes.PREKEY.toString() &&
    messageType !== olmEncryptedMessageTypes.TEXT.toString()
  ) {
    throw new Error(
      `Received message of invalid type from device: ${senderDeviceID}`,
    );
  }

  let isSenderChainEmpty = true;
  let hasReceivedMessage = false;
  const sessionExists = !!notificationsOlmData;

  if (notificationsOlmData) {
    const session = new olm.Session();
    session.unpickle(
      notificationsOlmData.picklingKey,
      notificationsOlmData.pendingSessionUpdate,
    );

    isSenderChainEmpty = session.is_sender_chain_empty();
    hasReceivedMessage = session.has_received_message();
  }

  // regular message
  const isRegularMessage =
    !!notificationsOlmData &&
    messageType === olmEncryptedMessageTypes.TEXT.toString();

  const isRegularPrekeyMessage =
    !!notificationsOlmData &&
    messageType === olmEncryptedMessageTypes.TEXT.toString() &&
    isSenderChainEmpty &&
    hasReceivedMessage;

  if (!!notificationsOlmData && (isRegularMessage || isRegularPrekeyMessage)) {
    return await commonDecrypt<T>(notificationsOlmData, encryptedPayload);
  }

  // At this point we either face race condition or session reset attempt or
  // session initialization attempt. For each of this scenario new inbound
  // session must be created in order to decrypt message
  const authMetadata = await fetchAuthMetadata();
  const notifInboundKeys = await getNotifsInboundKeysForDeviceID(
    senderDeviceID,
    authMetadata,
  );

  const account = new olm.Account();
  const session = new olm.Session();

  account.unpickle(
    notificationAccount.picklingKey,
    notificationAccount.pickledAccount,
  );

  if (notifInboundKeys.error) {
    throw new Error(notifInboundKeys.error);
  }

  invariant(
    notifInboundKeys.curve25519,
    'curve25519 must be present in notifs inbound keys',
  );

  session.create_inbound_from(
    account,
    notifInboundKeys.curve25519,
    encryptedPayload,
  );

  const decryptedNotification: T = JSON.parse(
    session.decrypt(Number(messageType), encryptedPayload),
  );

  // session reset attempt or session initialization - handled the same
  const sessionResetAttempt =
    sessionExists && !isSenderChainEmpty && hasReceivedMessage;

  // race condition
  const raceCondition =
    sessionExists && !isSenderChainEmpty && !hasReceivedMessage;
  const { deviceID: ourDeviceID } = authMetadata;
  invariant(ourDeviceID, 'Session creation attempt but no device id');

  const thisDeviceWinsRaceCondition = ourDeviceID > senderDeviceID;

  if (
    !sessionExists ||
    sessionResetAttempt ||
    (raceCondition && !thisDeviceWinsRaceCondition)
  ) {
    const pickledOlmSession = session.pickle(notificationAccount.picklingKey);
    const updatedOlmData = {
      mainSession: pickledOlmSession,
      pendingSessionUpdate: pickledOlmSession,
      updateCreationTimestamp: Date.now(),
      picklingKey: notificationAccount.picklingKey,
    };
    const updatedNotifsAccount = {
      pickledAccount: account.pickle(notificationAccount.picklingKey),
      picklingKey: notificationAccount.picklingKey,
    };
    return {
      decryptedNotification,
      updatedOlmData,
      updatedNotifsAccount,
    };
  }

  return { decryptedNotification };
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

async function encryptNotification(
  payload: string,
  deviceID: string,
): Promise<EncryptResult> {
  const olmDataKey = getOlmDataKeyForDeviceID(deviceID);
  const olmEncryptionKeyDBLabel =
    getOlmEncryptionKeyDBLabelForDeviceID(deviceID);

  let encryptedOlmData, encryptionKey, synchronizationValue;
  try {
    const {
      [olmDataKey]: fetchedEncryptedOlmData,
      [olmEncryptionKeyDBLabel]: fetchedEncryptionKey,
      synchronizationValue: fetchedSynchronizationValue,
    } = await localforage.getMultipleItems<{
      +[string]: ?EncryptedData | ?CryptoKey | ?SubtleCrypto$JsonWebKey,
    }>([olmDataKey, olmEncryptionKeyDBLabel], INDEXED_DB_NOTIFS_SYNC_KEY);

    encryptedOlmData = fetchedEncryptedOlmData;
    encryptionKey = fetchedEncryptionKey;
    synchronizationValue = fetchedSynchronizationValue;
  } catch (e) {
    throw new Error(
      `Failed to fetch olm session from IndexedDB for device: ${deviceID}. Details: ${
        getMessageForException(e) ?? ''
      }`,
    );
  }

  if (!encryptionKey || !encryptedOlmData) {
    throw new Error(`Session with device: ${deviceID} not initialized.`);
  }

  // type refinement
  if (!encryptedOlmData.ciphertext) {
    throw new Error('Invalid encrypted olm data format');
  }

  if (encryptionKey.ciphertext) {
    throw new Error('Invalid encryption key format');
  }

  const validatedEncryptionKey = await validateCryptoKey(encryptionKey);
  if (!validatedEncryptionKey) {
    throw new Error(`Session with device: ${deviceID} not initialized.`);
  }

  let encryptedNotification;
  try {
    encryptedNotification = await encryptNotificationWithOlmSession(
      payload,
      encryptedOlmData,
      olmDataKey,
      validatedEncryptionKey,
      synchronizationValue,
    );
  } catch (e) {
    throw new Error(
      `Failed encrypt notification for device: ${deviceID}. Details: ${
        getMessageForException(e) ?? ''
      }`,
    );
  }
  return encryptedNotification;
}

async function encryptNotificationWithOlmSession(
  payload: string,
  encryptedOlmData: EncryptedData,
  olmDataKey: string,
  encryptionKey: CryptoKey,
  synchronizationValue: ?string,
): Promise<EncryptResult> {
  const serializedOlmData = await decryptData(encryptedOlmData, encryptionKey);
  const {
    mainSession,
    picklingKey,
    pendingSessionUpdate,
    updateCreationTimestamp,
  }: NotificationsOlmDataType = JSON.parse(
    new TextDecoder().decode(serializedOlmData),
  );

  const session = new olm.Session();
  session.unpickle(picklingKey, pendingSessionUpdate);
  const encryptedNotification = session.encrypt(payload);

  const newPendingSessionUpdate = session.pickle(picklingKey);
  const updatedOlmData: NotificationsOlmDataType = {
    mainSession,
    pendingSessionUpdate: newPendingSessionUpdate,
    picklingKey,
    updateCreationTimestamp,
  };
  const updatedEncryptedSession = await encryptData(
    new TextEncoder().encode(JSON.stringify(updatedOlmData)),
    encryptionKey,
  );

  const newSynchronizationValue = uuid.v4();
  await localforage.setMultipleItems(
    { [olmDataKey]: updatedEncryptedSession },
    INDEXED_DB_NOTIFS_SYNC_KEY,
    synchronizationValue,
    newSynchronizationValue,
    // This method (encryptNotification) is expected to be called
    // exclusively from shared worker-crypto which must always win race
    // condition against push notifications service-worker
    true,
  );

  return encryptedNotification;
}

// notifications account manipulation

async function isNotifsCryptoAccountInitialized(): Promise<boolean> {
  const {
    notificationAccount: encryptedNotifsAccount,
    notificationAccountEncryptionKey: notifsAccountEncryptionKey,
  } = await localforage.getMultipleItems<{
    +notificationAccount: ?EncryptedData,
    +notificationAccountEncryptionKey: ?CryptoKey,
  }>(
    [
      INDEXED_DB_NOTIFS_ACCOUNT_KEY,
      INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL,
    ],
    INDEXED_DB_NOTIFS_SYNC_KEY,
  );
  return !!encryptedNotifsAccount && !!notifsAccountEncryptionKey;
}

async function getNotifsCryptoAccount(): Promise<NotificationAccountWithPicklingKey> {
  const {
    [INDEXED_DB_NOTIFS_ACCOUNT_KEY]: encryptedNotifsAccount,
    [INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL]:
      notifsAccountEncryptionKey,
    synchronizationValue,
  } = await localforage.getMultipleItems<{
    +notificationAccount: ?EncryptedData,
    +notificationAccountEncryptionKey: ?CryptoKey,
  }>(
    [
      INDEXED_DB_NOTIFS_ACCOUNT_KEY,
      INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL,
    ],
    INDEXED_DB_NOTIFS_SYNC_KEY,
  );

  const validatedNotifsAccountEncryptionKey = await validateCryptoKey(
    notifsAccountEncryptionKey,
  );

  const pickledOLMAccount = await deserializeEncryptedData<PickledOLMAccount>(
    encryptedNotifsAccount,
    validatedNotifsAccountEncryptionKey,
  );

  if (!pickledOLMAccount) {
    throw new Error(
      'Attempt to retrieve notifs olm account but account not created.',
    );
  }

  const { pickledAccount, picklingKey } = pickledOLMAccount;

  const notificationAccount = new olm.Account();
  notificationAccount.unpickle(picklingKey, pickledAccount);

  return { notificationAccount, picklingKey, synchronizationValue };
}

async function persistNotifsCryptoAccount(
  notificationAccountWithPicklingKey: NotificationAccountWithPicklingKey,
  createEncryptionKeyIfNotExist?: boolean = false,
): Promise<void> {
  let encryptionKey = await retrieveEncryptionKey(
    INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL,
  );

  const dataToPersist: {
    [string]: EncryptedData | CryptoKey | SubtleCrypto$JsonWebKey,
  } = {};

  if (!encryptionKey && !createEncryptionKeyIfNotExist) {
    throw new Error(
      'Attempt to persist notification olm account before it was initialized',
    );
  } else if (!encryptionKey) {
    encryptionKey = await generateCryptoKey({ extractable: isDesktopSafari });
    const encryptionKeyPersistentForm =
      await getCryptoKeyPersistentForm(encryptionKey);
    dataToPersist[INDEXED_DB_NOTIFS_ACCOUNT_ENCRYPTION_KEY_DB_LABEL] =
      encryptionKeyPersistentForm;
  }

  const { notificationAccount, picklingKey, synchronizationValue } =
    notificationAccountWithPicklingKey;

  const pickledOLMAccount: PickledOLMAccount = {
    pickledAccount: notificationAccount.pickle(picklingKey),
    picklingKey,
  };

  const encryptedData = await serializeUnencryptedData<PickledOLMAccount>(
    pickledOLMAccount,
    encryptionKey,
  );
  dataToPersist[INDEXED_DB_NOTIFS_ACCOUNT_KEY] = encryptedData;

  const newSynchronizationValue = uuid.v4();
  await localforage.setMultipleItems(
    dataToPersist,
    INDEXED_DB_NOTIFS_SYNC_KEY,
    synchronizationValue,
    newSynchronizationValue,
    // This method (persistNotifsCryptoAccount) is expected to be called
    // exclusively from shared worker-crypto which must always win race
    // condition against push notifications service-worker
    true,
  );
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

async function persistEncryptionKey(
  encryptionKeyDBLabel: string,
  encryptionKey: CryptoKey,
): Promise<void> {
  let cryptoKeyPersistentForm;
  if (isDesktopSafari) {
    // Safari doesn't support structured clone algorithm in service
    // worker context so we have to store CryptoKey as JSON
    cryptoKeyPersistentForm = await exportKeyToJWK(encryptionKey);
  } else {
    cryptoKeyPersistentForm = encryptionKey;
  }

  await localforage.setItem(encryptionKeyDBLabel, cryptoKeyPersistentForm);
}

async function getNotifsOlmSessionDBKeys(keyserverID?: string): Promise<{
  +olmDataKey: string,
  +encryptionKeyDBKey: string,
}> {
  const olmDataKeyForKeyserverPrefix = getOlmDataKeyForCookie(
    undefined,
    keyserverID,
  );

  const olmEncryptionKeyDBLabelForKeyserverPrefix =
    getOlmEncryptionKeyDBLabelForCookie(undefined, keyserverID);

  const dbKeys = await localforage.keys();
  const olmDataKeys = sortOlmDBKeysArray(
    dbKeys.filter(key => key.startsWith(olmDataKeyForKeyserverPrefix)),
  );
  const encryptionKeyDBLabels = sortOlmDBKeysArray(
    dbKeys.filter(key =>
      key.startsWith(olmEncryptionKeyDBLabelForKeyserverPrefix),
    ),
  );

  if (olmDataKeys.length === 0 || encryptionKeyDBLabels.length === 0) {
    throw new Error(
      'Received encrypted notification but olm session was not created',
    );
  }

  const latestDataKey = olmDataKeys[olmDataKeys.length - 1];
  const latestEncryptionKeyDBKey =
    encryptionKeyDBLabels[encryptionKeyDBLabels.length - 1];

  const latestDataCookieID = getCookieIDFromOlmDBKey(latestDataKey);
  const latestEncryptionKeyCookieID = getCookieIDFromOlmDBKey(
    latestEncryptionKeyDBKey,
  );

  if (latestDataCookieID !== latestEncryptionKeyCookieID) {
    throw new Error(
      'Olm sessions and their encryption keys out of sync. Latest cookie ' +
        `id for olm sessions ${latestDataCookieID}. Latest cookie ` +
        `id for olm session encryption keys ${latestEncryptionKeyCookieID}`,
    );
  }

  const olmDBKeys = {
    olmDataKey: latestDataKey,
    encryptionKeyDBKey: latestEncryptionKeyDBKey,
  };

  const keysToDelete: $ReadOnlyArray<string> = [
    ...olmDataKeys.slice(0, olmDataKeys.length - 1),
    ...encryptionKeyDBLabels.slice(0, encryptionKeyDBLabels.length - 1),
  ];

  await Promise.all(keysToDelete.map(key => localforage.removeItem(key)));
  return olmDBKeys;
}

function getOlmDataKeyForCookie(cookie: ?string, keyserverID?: string): string {
  let olmDataKeyBase;
  if (keyserverID) {
    olmDataKeyBase = [
      INDEXED_DB_KEYSERVER_PREFIX,
      keyserverID,
      NOTIFICATIONS_OLM_DATA_CONTENT,
    ].join(INDEXED_DB_KEY_SEPARATOR);
  } else {
    olmDataKeyBase = NOTIFICATIONS_OLM_DATA_CONTENT;
  }

  if (!cookie) {
    return olmDataKeyBase;
  }
  const cookieID = getCookieIDFromCookie(cookie);
  return [olmDataKeyBase, cookieID].join(INDEXED_DB_KEY_SEPARATOR);
}

function getOlmDataKeyForDeviceID(deviceID: string): string {
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
      keyToInsert = getOlmDataKeyForCookie(
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
  encryptNotification,
  getOlmDataKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
  getOlmDataKeyForDeviceID,
  getOlmEncryptionKeyDBLabelForDeviceID,
  migrateLegacyOlmNotificationsSessions,
  updateNotifsUnreadCountStorage,
  queryNotifsUnreadCountStorage,
  isNotifsCryptoAccountInitialized,
  getNotifsCryptoAccount,
  persistNotifsCryptoAccount,
  persistEncryptionKey,
  retrieveEncryptionKey,
};
