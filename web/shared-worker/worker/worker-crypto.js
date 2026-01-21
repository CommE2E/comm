// @flow

import initVodozemac, {
  Account,
  type Account as VodozemacAccount,
  OlmMessage,
  Session,
  Utility,
} from '@commapp/vodozemac';
import base64 from 'base-64';
import localforage from 'localforage';
import uuid from 'uuid';

import { initialEncryptedMessageContent } from 'lib/shared/crypto-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import {
  type ClientPublicKeys,
  type EncryptedData,
  type IdentityKeysBlob,
  type NotificationsOlmDataType,
  type OlmAPI,
  type OLMIdentityKeys,
  type OneTimeKeysResultValues,
  type OutboundSessionCreationResult,
  type PickledOLMAccount,
  type SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import type { IdentityNewDeviceKeyUpload } from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/olm-session-types.js';
import type { InboundP2PMessage } from 'lib/types/sqlite-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { entries } from 'lib/utils/objects.js';
import { getOlmUtility } from 'lib/utils/olm-utility.js';
import {
  getAccountOneTimeKeys,
  getAccountPrekeysSet,
  OLM_ERROR_FLAG,
  olmSessionErrors,
  retrieveAccountKeysSet,
  shouldForgetPrekey,
  shouldRotatePrekey,
} from 'lib/utils/olm-utils.js';
import {
  getVodozemacPickleKey,
  unpickleVodozemacAccount,
  unpickleVodozemacSession,
} from 'lib/utils/vodozemac-utils.js';

import { getIdentityClient } from './identity-client.js';
import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import {
  getDBModule,
  getPlatformDetails,
  getSQLiteQueryExecutor,
} from './worker-database.js';
import {
  encryptNotification,
  getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT,
  getOlmDataKeyForCookie,
  getOlmDataKeyForDeviceID,
  getOlmEncryptionKeyDBLabelForCookie,
  getOlmEncryptionKeyDBLabelForDeviceID,
  type NotificationAccountWithPicklingKey,
  persistNotifsAccountWithOlmData,
} from '../../push-notif/notif-crypto-utils.js';
import {
  type LegacyCryptoStore,
  type WorkerRequestMessage,
  workerRequestMessageTypes,
  type WorkerResponseMessage,
  workerResponseMessageTypes,
} from '../../types/worker-types.js';
import type { OlmPersistSession } from '../types/sqlite-query-executor.js';

type OlmSession = { +session: Session, +version: number };
type OlmSessions = {
  [deviceID: string]: OlmSession,
};

type WorkerCryptoStore = {
  +contentAccountPickleKey: string,
  +contentAccount: VodozemacAccount,
  +contentSessions: OlmSessions,
};

let cryptoStore: ?WorkerCryptoStore = null;

function clearCryptoStore() {
  if (!cryptoStore) {
    return;
  }

  const { contentSessions, contentAccount } = cryptoStore;
  contentAccount.free();
  for (const deviceID in contentSessions) {
    contentSessions[deviceID].session.free();
  }

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
    pickledAccount: contentAccount.pickle(
      getVodozemacPickleKey(contentAccountPickleKey),
    ),
  };

  const pickledContentSessions: OlmPersistSession[] = entries(
    contentSessions,
  ).map(([targetDeviceID, sessionData]) => ({
    targetDeviceID,
    sessionData: sessionData.session.pickle(
      getVodozemacPickleKey(contentAccountPickleKey),
    ),
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

      const pickledAccount = notificationAccount.pickle(
        getVodozemacPickleKey(picklingKey),
      );
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

async function createAndPersistNotificationsOutboundSession(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  dataPersistenceKey: string,
  dataEncryptionKeyDBLabel: string,
): Promise<EncryptedData> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }

  const notificationAccountWithPicklingKey =
    await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();
  const {
    notificationAccount,
    picklingKey,
    synchronizationValue,
    accountEncryptionKey,
  } = notificationAccountWithPicklingKey;

  const notificationsPrekey = notificationsInitializationInfo.prekey;

  // Memory is freed below after persisting.
  const session = notificationAccount.create_outbound_session(
    notificationsIdentityKeys.curve25519,
    notificationsIdentityKeys.ed25519,
    notificationsInitializationInfo.oneTimeKey || '',
    notificationsPrekey,
    notificationsInitializationInfo.prekeySignature,
  );

  const encryptedMessage = session.encrypt(
    JSON.stringify(initialEncryptedMessageContent),
  );
  const message = encryptedMessage.ciphertext;
  const messageType = encryptedMessage.message_type;

  const mainSession = session.pickle(
    getVodozemacPickleKey(notificationAccountWithPicklingKey.picklingKey),
  );
  const notificationsOlmData: NotificationsOlmDataType = {
    mainSession,
    pendingSessionUpdate: mainSession,
    updateCreationTimestamp: Date.now(),
    picklingKey,
  };

  const pickledAccount = notificationAccount.pickle(
    getVodozemacPickleKey(picklingKey),
  );
  const accountWithPicklingKey: PickledOLMAccount = {
    pickledAccount,
    picklingKey,
  };

  await persistNotifsAccountWithOlmData({
    accountEncryptionKey,
    accountWithPicklingKey,
    olmDataKey: dataPersistenceKey,
    olmData: notificationsOlmData,
    olmEncryptionKeyDBLabel: dataEncryptionKeyDBLabel,
    synchronizationValue,
    forceWrite: true,
  });

  notificationAccount.free();
  session.free();

  return { message, messageType };
}

async function getOrCreateOlmAccount(accountIDInDB: number): Promise<{
  +picklingKey: string,
  +account: VodozemacAccount,
  +synchronizationValue?: ?string,
}> {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  const dbModule = getDBModule();
  if (!sqliteQueryExecutor || !dbModule) {
    throw new Error('Database not initialized');
  }

  let accountDBString;
  try {
    accountDBString =
      sqliteQueryExecutor.getOlmPersistAccountData(accountIDInDB);
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  const maybeNotifsCryptoAccount: ?NotificationAccountWithPicklingKey =
    await (async () => {
      if (accountIDInDB !== sqliteQueryExecutor.getNotifsAccountID()) {
        return undefined;
      }
      try {
        return await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();
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

  // This `Account` is created once and is cached for the entire
  // program lifetime. Freeing is done as part of `clearCryptoStore`.
  let account;
  let picklingKey;

  if (!accountDBString) {
    picklingKey = uuid.v4();
    account = new Account();
  } else {
    const dbAccount: PickledOLMAccount = JSON.parse(accountDBString);
    picklingKey = dbAccount.picklingKey;
    account = unpickleVodozemacAccount(dbAccount);
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
    // This `Session` is created once and is cached for the entire
    // program lifetime. Freeing is done as part of `clearCryptoStore`.
    const session = unpickleVodozemacSession({
      picklingKey,
      pickledSession: sessionData,
    });
    sessionsData[persistedSession.targetDeviceID] = {
      session,
      version,
    };
  }

  return sessionsData;
}

async function initializeCryptoAccount(
  vodozemacWasmPath: string,
  initialCryptoStore: ?LegacyCryptoStore,
) {
  const sqliteQueryExecutor = getSQLiteQueryExecutor();
  if (!sqliteQueryExecutor) {
    throw new Error('Database not initialized');
  }

  await initVodozemac(vodozemacWasmPath);

  if (initialCryptoStore) {
    clearCryptoStore();
    cryptoStore = {
      contentAccountPickleKey: initialCryptoStore.primaryAccount.picklingKey,
      contentAccount: unpickleVodozemacAccount(
        initialCryptoStore.primaryAccount,
      ),
      contentSessions: {},
    };
    const notifsCryptoAccount = {
      picklingKey: initialCryptoStore.notificationAccount.picklingKey,
      notificationAccount: unpickleVodozemacAccount(
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
      message.vodozemacWasmPath,
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
  const { notificationAccount } =
    await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();

  const identityKeysBlob: IdentityKeysBlob = {
    notificationIdentityPublicKeys: {
      ed25519: notificationAccount.ed25519_key,
      curve25519: notificationAccount.curve25519_key,
    },
    primaryIdentityPublicKeys: {
      ed25519: contentAccount.ed25519_key,
      curve25519: contentAccount.curve25519_key,
    },
  };

  const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: payloadToBeSigned,
    signature: contentAccount.sign(payloadToBeSigned),
  };

  notificationAccount.free();

  return signedIdentityKeysBlob;
}

// sync version of olmAPI.verifyMessage()
function olmVerifyMessage(
  message: string | Uint8Array,
  signature: string,
  signingPublicKey: string,
) {
  const olmUtility: Utility = getOlmUtility();
  try {
    olmUtility.ed25519_verify(signingPublicKey, message, signature);
    return true;
  } catch (err) {
    const isSignatureInvalid = getMessageForException(err)?.includes(
      'The signature was invalid',
    );
    if (isSignatureInvalid) {
      return false;
    }
    throw err;
  }
}

function isPrekeySignatureValid(account: VodozemacAccount): boolean {
  const signingPublicKey = account.ed25519_key;
  const { prekey, prekeySignature } = getAccountPrekeysSet(account);
  if (!prekey || !prekeySignature) {
    return false;
  }

  const prekeyRawUTFString = base64.decode(prekey);
  const prekeyBytes = new Uint8Array(
    prekeyRawUTFString.split('').map(c => c.charCodeAt(0)),
  );

  return olmVerifyMessage(prekeyBytes, prekeySignature, signingPublicKey);
}

async function getNewDeviceKeyUpload(): Promise<IdentityNewDeviceKeyUpload> {
  if (!cryptoStore) {
    throw new Error('Crypto account not initialized');
  }
  const { contentAccount } = cryptoStore;
  const [notifsCryptoAccount, signedIdentityKeysBlob] = await Promise.all([
    getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT(),
    getSignedIdentityKeysBlob(),
  ]);

  const primaryAccountKeysSet = retrieveAccountKeysSet(contentAccount);
  const notificationAccountKeysSet = retrieveAccountKeysSet(
    notifsCryptoAccount.notificationAccount,
  );

  contentAccount.mark_keys_as_published();
  notifsCryptoAccount.notificationAccount.mark_keys_as_published();

  await persistCryptoStore(notifsCryptoAccount);

  notifsCryptoAccount.notificationAccount.free();

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

    clearCryptoStore();
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

    notifsCryptoAccount.notificationAccount.free();
  },
  async getUserPublicKey(): Promise<ClientPublicKeys> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const [{ notificationAccount }, { payload, signature }] = await Promise.all(
      [
        getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT(),
        getSignedIdentityKeysBlob(),
      ],
    );

    const result = {
      primaryIdentityPublicKeys: {
        ed25519: contentAccount.ed25519_key,
        curve25519: contentAccount.curve25519_key,
      },
      notificationIdentityPublicKeys: {
        ed25519: notificationAccount.ed25519_key,
        curve25519: notificationAccount.curve25519_key,
      },
      blobPayload: payload,
      signature,
    };

    notificationAccount.free();
    return result;
  },
  async encrypt(content: string, deviceID: string): Promise<EncryptedData> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExist);
    }
    const olmMessage = olmSession.session.encrypt(content);
    const encryptedData = {
      message: olmMessage.ciphertext,
      messageType: olmMessage.message_type,
      sessionVersion: olmSession.version,
    };
    olmMessage.free();

    await persistCryptoStore();

    return encryptedData;
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
      throw new Error(olmSessionErrors.sessionDoesNotExist);
    }
    const olmMessage = olmSession.session.encrypt(content);
    const encryptedContent = {
      body: olmMessage.ciphertext,
      type: olmMessage.message_type,
    };
    olmMessage.free();

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
      sessionVersion: olmSession.version,
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
      throw new Error(olmSessionErrors.sessionDoesNotExist);
    }

    if (
      encryptedData.sessionVersion &&
      encryptedData.sessionVersion < olmSession.version
    ) {
      throw new Error(olmSessionErrors.invalidSessionVersion);
    }

    const olmMessage = new OlmMessage(
      encryptedData.messageType,
      encryptedData.message,
    );

    let result;
    try {
      result = olmSession.session.decrypt(olmMessage);
    } catch (e) {
      throw new Error(`error decrypt => ${OLM_ERROR_FLAG} ` + e.message);
    } finally {
      olmMessage.free();
    }

    await persistCryptoStore();

    return result;
  },
  async decryptAndPersist(
    encryptedData: EncryptedData,
    deviceID: string,
    userID: string,
    messageID: string,
  ): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }

    const olmSession = cryptoStore.contentSessions[deviceID];
    if (!olmSession) {
      throw new Error(olmSessionErrors.sessionDoesNotExist);
    }

    if (
      encryptedData.sessionVersion &&
      encryptedData.sessionVersion < olmSession.version
    ) {
      throw new Error(olmSessionErrors.invalidSessionVersion);
    }

    const olmMessage = new OlmMessage(
      encryptedData.messageType,
      encryptedData.message,
    );

    let result;
    try {
      result = olmSession.session.decrypt(olmMessage);
    } catch (e) {
      throw new Error(`error decrypt => ${OLM_ERROR_FLAG} ` + e.message);
    } finally {
      olmMessage.free();
    }

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
      senderUserID: userID,
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

    // This `Session` is created once and is cached for the entire
    // program lifetime. Freeing is done as part of `clearCryptoStore`.
    const olmMessage = new OlmMessage(
      initialEncryptedData.messageType,
      initialEncryptedData.message,
    );

    let inboundCreationResult;
    try {
      inboundCreationResult = contentAccount.create_inbound_session(
        contentIdentityKeys.curve25519,
        olmMessage,
      );
    } catch (e) {
      throw new Error(`error decrypt => ${OLM_ERROR_FLAG} ` + e.message);
    } finally {
      olmMessage.free();
    }

    // into_session() is consuming object.
    // There is no need to call free() on inboundCreationResult
    const initialEncryptedMessage = inboundCreationResult.plaintext;
    const session = inboundCreationResult.into_session();

    if (existingSession) {
      existingSession.session.free();
    }
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

    // This `Session` is created once and is cached for the entire
    // program lifetime. Freeing is done as part of `clearCryptoStore`.
    const session = contentAccount.create_outbound_session(
      contentIdentityKeys.curve25519,
      contentIdentityKeys.ed25519,
      contentInitializationInfo.oneTimeKey || '',
      contentInitializationInfo.prekey,
      contentInitializationInfo.prekeySignature,
    );

    const olmMessage = session.encrypt(
      JSON.stringify(initialEncryptedMessageContent),
    );
    const initialEncryptedData = {
      body: olmMessage.ciphertext,
      type: olmMessage.message_type,
    };
    olmMessage.free();

    const newSessionVersion = existingSession ? existingSession.version + 1 : 1;
    if (existingSession) {
      existingSession.session.free();
    }
    contentSessions[contentIdentityKeys.ed25519] = {
      session,
      version: newSessionVersion,
    };
    await persistCryptoStore();

    const encryptedData: EncryptedData = {
      message: initialEncryptedData.body,
      messageType: initialEncryptedData.type,
      sessionVersion: newSessionVersion,
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
    const notifsCryptoAccount =
      await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();

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

    notifsCryptoAccount.notificationAccount.free();

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
    const notifsCryptoAccount =
      await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();

    const isPrekeyCorrupt =
      !isPrekeySignatureValid(contentAccount) ||
      !isPrekeySignatureValid(notifsCryptoAccount.notificationAccount);

    // Content and notification accounts' keys are always rotated at the same
    // time so we only need to check one of them.
    if (shouldRotatePrekey(contentAccount) || isPrekeyCorrupt) {
      contentAccount.generate_prekey();
      notifsCryptoAccount.notificationAccount.generate_prekey();
    }
    if (shouldForgetPrekey(contentAccount)) {
      contentAccount.forget_old_prekey();
      notifsCryptoAccount.notificationAccount.forget_old_prekey();
    }
    await persistCryptoStore(notifsCryptoAccount);

    if (!contentAccount.unpublished_prekey()) {
      notifsCryptoAccount.notificationAccount.free();
      return;
    }

    const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
      getAccountPrekeysSet(notifsCryptoAccount.notificationAccount);
    const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
      getAccountPrekeysSet(contentAccount);

    if (!notifPrekeySignature || !contentPrekeySignature) {
      notifsCryptoAccount.notificationAccount.free();
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
    notifsCryptoAccount.notificationAccount.free();
  },
  async signMessage(message: string): Promise<string> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    return contentAccount.sign(message);
  },
  async verifyMessage(
    message: string | Uint8Array,
    signature: string,
    signingPublicKey: string,
  ): Promise<boolean> {
    return olmVerifyMessage(message, signature, signingPublicKey);
  },
  async markPrekeysAsPublished(): Promise<void> {
    if (!cryptoStore) {
      throw new Error('Crypto account not initialized');
    }
    const { contentAccount } = cryptoStore;
    const notifsCryptoAccount =
      await getNotifsCryptoAccount_WITH_MANUAL_MEMORY_MANAGEMENT();

    contentAccount.mark_prekey_as_published();
    notifsCryptoAccount.notificationAccount.mark_prekey_as_published();

    await persistCryptoStore(notifsCryptoAccount);
    notifsCryptoAccount.notificationAccount.free();
  },
};

export {
  clearCryptoStore,
  processAppOlmApiRequest,
  getSignedIdentityKeysBlob,
  getNewDeviceKeyUpload,
};
