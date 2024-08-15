// @flow

import olm, { type Utility } from '@commapp/olm';
import localforage from 'localforage';
import uuid from 'uuid';

import { initialEncryptedMessageContent } from 'lib/shared/crypto-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import {
  type OLMIdentityKeys,
  type PickledOLMAccount,
  type IdentityKeysBlob,
  type SignedIdentityKeysBlob,
  type OlmAPI,
  type OneTimeKeysResultValues,
  type ClientPublicKeys,
  type NotificationsOlmDataType,
  type EncryptedData,
  type OutboundSessionCreationResult,
} from 'lib/types/crypto-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import type {
  IdentityNewDeviceKeyUpload,
  IdentityExistingDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import type { InboundP2PMessage } from 'lib/types/sqlite-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { entries } from 'lib/utils/objects.js';
import {
  retrieveAccountKeysSet,
  getAccountOneTimeKeys,
  getAccountPrekeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
  retrieveIdentityKeysAndPrekeys,
  olmSessionErrors,
} from 'lib/utils/olm-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { getIdentityClient } from './identity-client.js';
import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import {
  getDBModule,
  getSQLiteQueryExecutor,
  getPlatformDetails,
} from './worker-database.js';
import {
  getOlmDataKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
  getOlmDataKeyForDeviceID,
  getOlmEncryptionKeyDBLabelForDeviceID,
  encryptNotification,
  type NotificationAccountWithPicklingKey,
  getNotifsCryptoAccount,
  persistNotifsAccountWithOlmData,
  getAllNotifsOlmSessionDBKeys,
  persistNotifsAccountWithOlmDataInputValidator,
} from '../../push-notif/notif-crypto-utils.js';
import {
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type LegacyCryptoStore,
} from '../../types/worker-types.js';
import type { OlmPersistSession } from '../types/sqlite-query-executor.js';

type OlmSession = { +session: olm.Session, +version: number };
type OlmSessions = {
  [deviceID: string]: OlmSession,
};

type WorkerCryptoStore = {
  +contentAccountPickleKey: string,
  +contentAccount: olm.Account,
  +contentSessions: OlmSessions,
};

let cryptoStore: ?WorkerCryptoStore = null;
let olmUtility: ?Utility = null;

function clearCryptoStore() {
  cryptoStore = null;
}

async function persistCryptoStore(
  notifsCryptoAccount?: NotificationAccountWithPicklingKey,
  withoutTransaction: boolean = false,
) {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      "Couldn't persist crypto store because database is not initialized",
    );
  }
  if (!cryptoStore) {
    throw new Error("Couldn't persist crypto store because it doesn't exist");
  }

  const { contentAccountPickleKey, contentAccount, contentSessions } =
    cryptoStore;

  const pickledContentAccount: PickledOLMAccount = {
    picklingKey: contentAccountPickleKey,
    pickledAccount: contentAccount.pickle(contentAccountPickleKey),
  };

  const pickledContentSessions: OlmPersistSession[] = entries(
    contentSessions,
  ).map(([targetDeviceID, sessionData]) => ({
    targetDeviceID,
    sessionData: sessionData.session.pickle(contentAccountPickleKey),
    version: sessionData.version,
  }));

  try {
    if (!withoutTransaction) {
      sqliteQueryExecutor.beginTransaction();
    }
    sqliteQueryExecutor.storeOlmPersistAccount(
      sqliteQueryExecutor.getContentAccountID(),
      JSON.stringify(pickledContentAccount),
    );
    for (const pickledSession of pickledContentSessions) {
      sqliteQueryExecutor.storeOlmPersistSession(pickledSession);
    }
    if (notifsCryptoAccount) {
      const {
        notificationAccount,
        picklingKey,
        synchronizationValue,
        accountEncryptionKey,
      } = notifsCryptoAccount;

      const pickledAccount = notificationAccount.pickle(picklingKey);
      const accountWithPicklingKey: PickledOLMAccount = {
        pickledAccount,
        picklingKey,
      };

      await persistNotifsAccountWithOlmData({
        accountEncryptionKey,
        accountWithPicklingKey,
        synchronizationValue,
        forceWrite: true,
      });
    }
    if (!withoutTransaction) {
      sqliteQueryExecutor.commitTransaction();
    }
  } catch (err) {
    if (!withoutTransaction) {
      sqliteQueryExecutor.rollbackTransaction();
    }
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }
}

async function createNotificationsOutboundSession(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  dataPersistenceKey: string,
  dataEncryptionKeyDBLabel: string,
): Promise<{
  +accountEncryptionKey?: ?CryptoKey,
  +accountWithPicklingKey?: PickledOLMAccount,
  +encryptionKey?: ?CryptoKey,
  +olmData?: ?NotificationsOlmDataType,
  +olmDataKey?: string,
  +olmEncryptionKeyDBLabel?: string,
  +synchronizationValue: ?string,
  +initialEncryptedData: EncryptedData,
}> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const notificationAccountWithPicklingKey = await getNotifsCryptoAccount();
  const {
    notificationAccount,
    picklingKey,
    synchronizationValue,
    accountEncryptionKey,
  } = notificationAccountWithPicklingKey;

  const notificationsPrekey = notificationsInitializationInfo.prekey;
  const session = new olm.Session();
  if (notificationsInitializationInfo.oneTimeKey) {
    session.create_outbound(
      notificationAccount,
      notificationsIdentityKeys.curve25519,
      notificationsIdentityKeys.ed25519,
      notificationsPrekey,
      notificationsInitializationInfo.prekeySignature,
      notificationsInitializationInfo.oneTimeKey,
    );
  } else {
    session.create_outbound_without_otk(
      notificationAccount,
      notificationsIdentityKeys.curve25519,
      notificationsIdentityKeys.ed25519,
      notificationsPrekey,
      notificationsInitializationInfo.prekeySignature,
    );
  }
  const { body: message, type: messageType } = session.encrypt(
    JSON.stringify(initialEncryptedMessageContent),
  );

  const mainSession = session.pickle(
    notificationAccountWithPicklingKey.picklingKey,
  );
  const notificationsOlmData: NotificationsOlmDataType = {
    mainSession,
    pendingSessionUpdate: mainSession,
    updateCreationTimestamp: Date.now(),
    picklingKey,
  };

  const pickledAccount = notificationAccount.pickle(picklingKey);
  const accountWithPicklingKey: PickledOLMAccount = {
    pickledAccount,
    picklingKey,
  };

  return {
    accountEncryptionKey,
    accountWithPicklingKey,
    olmDataKey: dataPersistenceKey,
    olmData: notificationsOlmData,
    olmEncryptionKeyDBLabel: dataEncryptionKeyDBLabel,
    synchronizationValue,
    initialEncryptedData: { message, messageType },
  };
}

async function createAndPersistNotificationsOutboundSession(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  dataPersistenceKey: string,
  dataEncryptionKeyDBLabel: string,
): Promise<EncryptedData> {
  const sessionCreationOutput = await createNotificationsOutboundSession(
    notificationsIdentityKeys,
    notificationsInitializationInfo,
    dataPersistenceKey,
    dataEncryptionKeyDBLabel,
  );

  const { initialEncryptedData, ...rest } = sessionCreationOutput;
  await persistNotifsAccountWithOlmData({
    ...rest,
    forceWrite: true,
  });

  return initialEncryptedData;
}

async function getOrCreateOlmAccount(accountIDInDB: number): Promise<{
  +picklingKey: string,
  +account: olm.Account,
  +synchronizationValue?: ?string,
}> {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error('Database not initialized');
  }

  const account = new olm.Account();
  let picklingKey;

  let accountDBString;
  try {
    accountDBString =
      sqliteQueryExecutor.getOlmPersistAccountDataWeb(accountIDInDB);
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  const maybeNotifsCryptoAccount: ?NotificationAccountWithPicklingKey =
    await (async () => {
      if (accountIDInDB !== sqliteQueryExecutor.getNotifsAccountID()) {
        return undefined;
      }
      try {
        return await getNotifsCryptoAccount();
      } catch (e) {
        return undefined;
      }
    })();

  if (maybeNotifsCryptoAccount) {
    const {
      notificationAccount,
      picklingKey: notificationAccountPicklingKey,
      synchronizationValue,
    } = maybeNotifsCryptoAccount;
    return {
      account: notificationAccount,
      picklingKey: notificationAccountPicklingKey,
      synchronizationValue,
    };
  }

  if (accountDBString.isNull) {
    picklingKey = uuid.v4();
    account.create();
  } else {
    const dbAccount: PickledOLMAccount = JSON.parse(accountDBString.value);
    picklingKey = dbAccount.picklingKey;
    account.unpickle(picklingKey, dbAccount.pickledAccount);
  }

  if (accountIDInDB === sqliteQueryExecutor.getNotifsAccountID()) {
    return { picklingKey, account, synchronizationValue: uuid.v4() };
  }

  return { picklingKey, account };
}

function getOlmSessions(picklingKey: string): OlmSessions {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error(
      "Couldn't get olm sessions because database is not initialized",
    );
  }

  let dbSessionsData;
  try {
    dbSessionsData = sqliteQueryExecutor.getOlmPersistSessionsData();
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  const sessionsData: OlmSessions = {};
  for (const persistedSession: OlmPersistSession of dbSessionsData) {
    const { sessionData, version } = persistedSession;
    const session = new olm.Session();
    session.unpickle(picklingKey, sessionData);
    sessionsData[persistedSession.targetDeviceID] = {
      session,
      version,
    };
  }

  return sessionsData;
}

function unpickleInitialCryptoStoreAccount(
  account: PickledOLMAccount,
): olm.Account {
  const { picklingKey, pickledAccount } = account;
  const olmAccount = new olm.Account();
  olmAccount.unpickle(picklingKey, pickledAccount);
  return olmAccount;
}

async function initializeCryptoAccount(
  olmWasmPath: string,
  initialCryptoStore: ?LegacyCryptoStore,
) {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  if (!sqliteQueryExecutor) {
    throw new Error('Database not initialized');
  }

  await olm.init({ locateFile: () => olmWasmPath });
  olmUtility = new olm.Utility();

  if (initialCryptoStore) {
    cryptoStore = {
      contentAccountPickleKey: initialCryptoStore.primaryAccount.picklingKey,
      contentAccount: unpickleInitialCryptoStoreAccount(
        initialCryptoStore.primaryAccount,
      ),
      contentSessions: {},
    };
    const notifsCryptoAccount = {
      picklingKey: initialCryptoStore.notificationAccount.picklingKey,
      notificationAccount: unpickleInitialCryptoStoreAccount(
        initialCryptoStore.notificationAccount,
      ),
      synchronizationValue: uuid.v4(),
    };
    await persistCryptoStore(notifsCryptoAccount);
    return;
  }

  await olmAPI.initializeCryptoAccount();
}

async function processAppOlmApiRequest(
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (message.type === workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT) {
    await initializeCryptoAccount(
      message.olmWasmPath,
      message.initialCryptoStore,
    );
  } else if (message.type === workerRequestMessageTypes.CALL_OLM_API_METHOD) {
    const method: (...$ReadOnlyArray<mixed>) => mixed = (olmAPI[
      message.method
    ]: any);
    // Flow doesn't allow us to bind the (stringified) method name with
    // the argument types so we need to pass the args as mixed.
    const result = await method(...message.args);
    return {
      type: workerResponseMessageTypes.CALL_OLM_API_METHOD,
      result,
    };
  }
  return undefined;
}

async function getSignedIdentityKeysBlob(): Promise<SignedIdentityKeysBlob> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const { contentAccount } = cryptoStore;
  const { notificationAccount } = await getNotifsCryptoAccount();

  const identityKeysBlob: IdentityKeysBlob = {
    notificationIdentityPublicKeys: JSON.parse(
      notificationAccount.identity_keys(),
    ),
    primaryIdentityPublicKeys: JSON.parse(contentAccount.identity_keys()),
  };

  const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: payloadToBeSigned,
    signature: contentAccount.sign(payloadToBeSigned),
  };

  return signedIdentityKeysBlob;
}

async function getNewDeviceKeyUpload(): Promise<IdentityNewDeviceKeyUpload> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { contentAccount } = cryptoStore;
  const [notifsCryptoAccount, signedIdentityKeysBlob] = await Promise.all([
    getNotifsCryptoAccount(),
    getSignedIdentityKeysBlob(),
  ]);

  const primaryAccountKeysSet = retrieveAccountKeysSet(contentAccount);
  const notificationAccountKeysSet = retrieveAccountKeysSet(
    notifsCryptoAccount.notificationAccount,
  );

  contentAccount.mark_keys_as_published();
  notifsCryptoAccount.notificationAccount.mark_keys_as_published();

  await persistCryptoStore(notifsCryptoAccount);

  return {
    keyPayload: signedIdentityKeysBlob.payload,
    keyPayloadSignature: signedIdentityKeysBlob.signature,
    contentPrekey: primaryAccountKeysSet.prekey,
    contentPrekeySignature: primaryAccountKeysSet.prekeySignature,
    notifPrekey: notificationAccountKeysSet.prekey,
    notifPrekeySignature: notificationAccountKeysSet.prekeySignature,
    contentOneTimeKeys: primaryAccountKeysSet.oneTimeKeys,
    notifOneTimeKeys: notificationAccountKeysSet.oneTimeKeys,
  };
}

async function getExistingDeviceKeyUpload(): Promise<IdentityExistingDeviceKeyUpload> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { contentAccount } = cryptoStore;
  const [notifsCryptoAccount, signedIdentityKeysBlob] = await Promise.all([
    getNotifsCryptoAccount(),
    getSignedIdentityKeysBlob(),
  ]);

  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    retrieveIdentityKeysAndPrekeys(contentAccount);
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    retrieveIdentityKeysAndPrekeys(notifsCryptoAccount.notificationAccount);

  await persistCryptoStore(notifsCryptoAccount);

  return {
    keyPayload: signedIdentityKeysBlob.payload,
    keyPayloadSignature: signedIdentityKeysBlob.signature,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  };
}

function getNotifsPersistenceKeys(
  cookie: ?string,
  keyserverID: string,
  platformDetails: PlatformDetails,
) {
  if (hasMinCodeVersion(platformDetails, { majorDesktop: 12 })) {
    return {
      notifsOlmDataEncryptionKeyDBLabel: getOlmEncryptionKeyDBLabelForCookie(
        cookie,
        keyserverID,
      ),
      notifsOlmDataContentKey: getOlmDataKeyForCookie(cookie, keyserverID),
    };
  } else {
    return {
      notifsOlmDataEncryptionKeyDBLabel:
        getOlmEncryptionKeyDBLabelForCookie(cookie),
      notifsOlmDataContentKey: getOlmDataKeyForCookie(cookie),
    };
  }
}

async function reassignLocalForageItem(source: string, destination: string) {
  const value = await localforage.getItem<mixed>(source);
  if (!value) {
    return;
  }
  const valueAtDestination = await localforage.getItem<mixed>(destination);
  if (!valueAtDestination) {
    await localforage.setItem(destination, value);
  }
  await localforage.removeItem(source);
}

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    if (!sqliteQueryExecutor) {
      throw new Error('Database not initialized');
    }

    const [contentAccountResult, notificationAccountResult] = await Promise.all(
      [
        getOrCreateOlmAccount(sqliteQueryExecutor.getContentAccountID()),
        getOrCreateOlmAccount(sqliteQueryExecutor.getNotifsAccountID()),
      ],
    );

    const contentSessions = getOlmSessions(contentAccountResult.picklingKey);

    cryptoStore = {
      contentAccountPickleKey: contentAccountResult.picklingKey,
      contentAccount: contentAccountResult.account,
      contentSessions,
    };
    const notifsCryptoAccount = {
      picklingKey: notificationAccountResult.picklingKey,
      notificationAccount: notificationAccountResult.account,
      synchronizationValue: notificationAccountResult.synchronizationValue,
    };

    await persistCryptoStore(notifsCryptoAccount);
  },
  async getUserPublicKey(): Promise<ClientPublicKeys> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const [{ notificationAccount }, { payload, signature }] = await Promise.all(
      [getNotifsCryptoAccount(), getSignedIdentityKeysBlob()],
    );

    return {
      primaryIdentityPublicKeys: JSON.parse(contentAccount.identity_keys()),
      notificationIdentityPublicKeys: JSON.parse(
        notificationAccount.identity_keys(),
      ),
      blobPayload: payload,
      signature,
    };
  },
  async encrypt(content: string, deviceID: string): Promise<EncryptedData> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExists);
    }
    const encryptedContent = olmSession.session.encrypt(content);

    await persistCryptoStore();

    return {
      message: encryptedContent.body,
      messageType: encryptedContent.type,
    };
  },
  async encryptAndPersist(
    content: string,
    deviceID: string,
    messageID: string,
  ): Promise<EncryptedData> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExists);
    }

    const encryptedContent = olmSession.session.encrypt(content);

    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    const dbModule = getDBModule();
    if (!sqliteQueryExecutor || !dbModule) {
      throw new Error(
        "Couldn't persist crypto store because database is not initialized",
      );
    }

    const result: EncryptedData = {
      message: encryptedContent.body,
      messageType: encryptedContent.type,
    };

    sqliteQueryExecutor.beginTransaction();
    try {
      sqliteQueryExecutor.setCiphertextForOutboundP2PMessage(
        messageID,
        deviceID,
        JSON.stringify(result),
      );
      await persistCryptoStore(undefined, true);
      sqliteQueryExecutor.commitTransaction();
    } catch (e) {
      sqliteQueryExecutor.rollbackTransaction();
      throw e;
    }

    return result;
  },
  async encryptNotification(
    payload: string,
    deviceID: string,
  ): Promise<EncryptedData> {
    const { body: message, type: messageType } = await encryptNotification(
      payload,
      deviceID,
    );
    return { message, messageType };
  },
  async decrypt(
    encryptedData: EncryptedData,
    deviceID: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExists);
    }

    const result = olmSession.session.decrypt(
      encryptedData.messageType,
      encryptedData.message,
    );

    await persistCryptoStore();

    return result;
  },
  async decryptAndPersist(
    encryptedData: EncryptedData,
    deviceID: string,
    messageID: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExists);
    }

    const result = olmSession.session.decrypt(
      encryptedData.messageType,
      encryptedData.message,
    );

    const sqliteQueryExecutor = getSQLiteQueryExecutor();
    const dbModule = getDBModule();
    if (!sqliteQueryExecutor || !dbModule) {
      throw new Error(
        "Couldn't persist crypto store because database is not initialized",
      );
    }

    const receivedMessage: InboundP2PMessage = {
      messageID,
      senderDeviceID: deviceID,
      plaintext: result,
      status: 'decrypted',
    };

    sqliteQueryExecutor.beginTransaction();
    try {
      sqliteQueryExecutor.addInboundP2PMessage(receivedMessage);
      await persistCryptoStore(undefined, true);
      sqliteQueryExecutor.commitTransaction();
    } catch (e) {
      sqliteQueryExecutor.rollbackTransaction();
      throw e;
    }

    return result;
  },
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedData: EncryptedData,
    sessionVersion: number,
    overwrite: boolean,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;

    const existingSession = contentSessions[contentIdentityKeys.ed25519];
    if (existingSession) {
      if (!overwrite && existingSession.version > sessionVersion) {
        throw new Error(olmSessionErrors.alreadyCreated);
      } else if (!overwrite && existingSession.version === sessionVersion) {
        throw new Error(olmSessionErrors.raceCondition);
      }
    }

    const session = new olm.Session();
    session.create_inbound_from(
      contentAccount,
      contentIdentityKeys.curve25519,
      initialEncryptedData.message,
    );

    contentAccount.remove_one_time_keys(session);
    const initialEncryptedMessage = session.decrypt(
      initialEncryptedData.messageType,
      initialEncryptedData.message,
    );

    contentSessions[contentIdentityKeys.ed25519] = {
      session,
      version: sessionVersion,
    };
    await persistCryptoStore();

    return initialEncryptedMessage;
  },
  async contentOutboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    contentInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<OutboundSessionCreationResult> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount, contentSessions } = cryptoStore;
    const existingSession = contentSessions[contentIdentityKeys.ed25519];

    const session = new olm.Session();
    if (contentInitializationInfo.oneTimeKey) {
      session.create_outbound(
        contentAccount,
        contentIdentityKeys.curve25519,
        contentIdentityKeys.ed25519,
        contentInitializationInfo.prekey,
        contentInitializationInfo.prekeySignature,
        contentInitializationInfo.oneTimeKey,
      );
    } else {
      session.create_outbound_without_otk(
        contentAccount,
        contentIdentityKeys.curve25519,
        contentIdentityKeys.ed25519,
        contentInitializationInfo.prekey,
        contentInitializationInfo.prekeySignature,
      );
    }
    const initialEncryptedData = session.encrypt(
      JSON.stringify(initialEncryptedMessageContent),
    );

    const newSessionVersion = existingSession ? existingSession.version + 1 : 1;
    contentSessions[contentIdentityKeys.ed25519] = {
      session,
      version: newSessionVersion,
    };
    await persistCryptoStore();

    const encryptedData: EncryptedData = {
      message: initialEncryptedData.body,
      messageType: initialEncryptedData.type,
    };

    return { encryptedData, sessionVersion: newSessionVersion };
  },
  async isContentSessionInitialized(deviceID: string) {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    return !!cryptoStore.contentSessions[deviceID];
  },
  async notificationsOutboundSessionCreator(
    deviceID: string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
  ): Promise<EncryptedData> {
    const dataPersistenceKey = getOlmDataKeyForDeviceID(deviceID);
    const dataEncryptionKeyDBLabel =
      getOlmEncryptionKeyDBLabelForDeviceID(deviceID);

    return createAndPersistNotificationsOutboundSession(
      notificationsIdentityKeys,
      notificationsInitializationInfo,
      dataPersistenceKey,
      dataEncryptionKeyDBLabel,
    );
  },
  async isKeyserverNotificationsSessionInitialized(keyserverID: string) {
    try {
      const allNotifsKeys = await getAllNotifsOlmSessionDBKeys(keyserverID);
      return !!allNotifsKeys;
    } catch (e) {
      console.log(
        `Detected inconsistency with notifs olm data with keyserver ${keyserverID}. Details ${
          getMessageForException(e) ?? ''
        }`,
      );
      return false;
    }
  },
  async isDeviceNotificationsSessionInitialized(deviceID: string) {
    const dataPersistenceKey = getOlmDataKeyForDeviceID(deviceID);
    const dataEncryptionKeyDBLabel =
      getOlmEncryptionKeyDBLabelForDeviceID(deviceID);

    const allKeys = await localforage.keys();
    const allKeysSet = new Set(allKeys);
    return (
      allKeysSet.has(dataPersistenceKey) &&
      allKeysSet.has(dataEncryptionKeyDBLabel)
    );
  },
  async isNotificationsSessionInitializedWithDevices(
    deviceIDs: $ReadOnlyArray<string>,
  ) {
    const allKeys = await localforage.keys();
    const allKeysSet = new Set(allKeys);

    const deviceInfoPairs = deviceIDs.map(deviceID => {
      const dataPersistenceKey = getOlmDataKeyForDeviceID(deviceID);
      const dataEncryptionKeyDBLabel =
        getOlmEncryptionKeyDBLabelForDeviceID(deviceID);
      return [
        deviceID,
        allKeysSet.has(dataPersistenceKey) &&
          allKeysSet.has(dataEncryptionKeyDBLabel),
      ];
    });

    return Object.fromEntries(deviceInfoPairs);
  },
  async keyserverNotificationsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ): Promise<string> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    const { notifsOlmDataContentKey, notifsOlmDataEncryptionKeyDBLabel } =
      getNotifsPersistenceKeys(cookie, keyserverID, platformDetails);

    const { message } = await createAndPersistNotificationsOutboundSession(
      notificationsIdentityKeys,
      notificationsInitializationInfo,
      notifsOlmDataContentKey,
      notifsOlmDataEncryptionKeyDBLabel,
    );

    return message;
  },
  async ephemeralKeyserverNotifsSessionCreator(
    cookie: ?string,
    notificationsIdentityKeys: OLMIdentityKeys,
    notificationsInitializationInfo: OlmSessionInitializationInfo,
    keyserverID: string,
  ): Promise<{
    +initialEncryptedMessage: string,
    +sessionPersistenceData: { +[string]: mixed },
  }> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    const { notifsOlmDataContentKey, notifsOlmDataEncryptionKeyDBLabel } =
      getNotifsPersistenceKeys(cookie, keyserverID, platformDetails);

    const sessionCreationOutput = await createNotificationsOutboundSession(
      notificationsIdentityKeys,
      notificationsInitializationInfo,
      notifsOlmDataContentKey,
      notifsOlmDataEncryptionKeyDBLabel,
    );

    const {
      initialEncryptedData: { message: initialEncryptedMessage },
      ...rest
    } = sessionCreationOutput;

    const sessionPersistenceData = {
      ...rest,
      forceWrite: false,
    };

    return { initialEncryptedMessage, sessionPersistenceData };
  },
  async persistEphemeralKeyserverNotifsSession(sessionPersistenceData: {
    +[string]: mixed,
  }): Promise<void> {
    const persistNotifsAccountWithOlmDataInput = assertWithValidator(
      sessionPersistenceData,
      persistNotifsAccountWithOlmDataInputValidator,
    );
    await persistNotifsAccountWithOlmData(persistNotifsAccountWithOlmDataInput);
  },
  async reassignNotificationsSession(
    prevCookie: ?string,
    newCookie: ?string,
    keyserverID: string,
  ): Promise<void> {
    const platformDetails = getPlatformDetails();
    if (!platformDetails) {
      throw new Error('Worker not initialized');
    }

    const prevPersistenceKeys = getNotifsPersistenceKeys(
      prevCookie,
      keyserverID,
      platformDetails,
    );

    const newPersistenceKeys = getNotifsPersistenceKeys(
      newCookie,
      keyserverID,
      platformDetails,
    );

    await Promise.all([
      reassignLocalForageItem(
        prevPersistenceKeys.notifsOlmDataContentKey,
        newPersistenceKeys.notifsOlmDataContentKey,
      ),
      reassignLocalForageItem(
        prevPersistenceKeys.notifsOlmDataEncryptionKeyDBLabel,
        newPersistenceKeys.notifsOlmDataEncryptionKeyDBLabel,
      ),
    ]);
  },
  async getOneTimeKeys(numberOfKeys: number): Promise<OneTimeKeysResultValues> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const notifsCryptoAccount = await getNotifsCryptoAccount();

    const contentOneTimeKeys = getAccountOneTimeKeys(
      contentAccount,
      numberOfKeys,
    );
    contentAccount.mark_keys_as_published();

    const notificationsOneTimeKeys = getAccountOneTimeKeys(
      notifsCryptoAccount.notificationAccount,
      numberOfKeys,
    );
    notifsCryptoAccount.notificationAccount.mark_keys_as_published();

    await persistCryptoStore(notifsCryptoAccount);

    return { contentOneTimeKeys, notificationsOneTimeKeys };
  },
  async validateAndUploadPrekeys(authMetadata): Promise<void> {
    const { userID, deviceID, accessToken } = authMetadata;
    if (!userID || !deviceID || !accessToken) {
      return;
    }
    const identityClient = getIdentityClient();

    if (!identityClient) {
      throw new Error('Identity client not initialized');
    }

    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const notifsCryptoAccount = await getNotifsCryptoAccount();

    // Content and notification accounts' keys are always rotated at the same
    // time so we only need to check one of them.
    if (shouldRotatePrekey(contentAccount)) {
      contentAccount.generate_prekey();
      notifsCryptoAccount.notificationAccount.generate_prekey();
    }
    if (shouldForgetPrekey(contentAccount)) {
      contentAccount.forget_old_prekey();
      notifsCryptoAccount.notificationAccount.forget_old_prekey();
    }
    await persistCryptoStore(notifsCryptoAccount);

    if (!contentAccount.unpublished_prekey()) {
      return;
    }

    const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
      getAccountPrekeysSet(notifsCryptoAccount.notificationAccount);
    const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
      getAccountPrekeysSet(contentAccount);

    if (!notifPrekeySignature || !contentPrekeySignature) {
      throw new Error('Prekey signature is missing');
    }

    await identityClient.publishWebPrekeys({
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
    });
    contentAccount.mark_prekey_as_published();
    notifsCryptoAccount.notificationAccount.mark_prekey_as_published();

    await persistCryptoStore(notifsCryptoAccount);
  },
  async signMessage(message: string): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    return contentAccount.sign(message);
  },
  async verifyMessage(
    message: string,
    signature: string,
    signingPublicKey: string,
  ): Promise<boolean> {
    if (!olmUtility) {
      throw new Error('Crypto account not initialized');
    }
    try {
      olmUtility.ed25519_verify(signingPublicKey, message, signature);
      return true;
    } catch (err) {
      const isSignatureInvalid =
        getMessageForException(err)?.includes('BAD_MESSAGE_MAC');
      if (isSignatureInvalid) {
        return false;
      }
      throw err;
    }
  },
  async markPrekeysAsPublished(): Promise<void> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const notifsCryptoAccount = await getNotifsCryptoAccount();

    contentAccount.mark_prekey_as_published();
    notifsCryptoAccount.notificationAccount.mark_prekey_as_published();

    await persistCryptoStore(notifsCryptoAccount);
  },
};

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getNewDeviceKeyUpload,
  getExistingDeviceKeyUpload,
};
